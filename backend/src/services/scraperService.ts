import { cacheManager } from '../cache/cacheManager.js';
import { scrapeHeroes } from '../scrapers/heroScraper.js';
import { scrapeTierList } from '../scrapers/tierScraper.js';
import { aggregateStats, aggregateCounters } from './dataAggregator.js';
import type { Hero, CounterPick, HeroStats, TierEntry } from '../types/hero.js';
import type { ApiEnvelope } from '../types/api.js';
import config from '../config/index.js';
import pino from 'pino';

const logger = pino({ level: config.logLevel });

/** Build a standard API envelope response */
function envelope<T>(
  data: T,
  source: string,
  cacheStatus: 'hit' | 'miss' | 'stale',
  lastUpdated: string,
  isStale: boolean,
): ApiEnvelope<T> {
  return {
    data,
    meta: {
      source,
      lastUpdated,
      cacheStatus,
      isStale,
    },
  };
}

/** Get heroes: check cache → scrape → cache → return */
export async function getHeroes(): Promise<ApiEnvelope<Hero[]>> {
  const cacheKey = 'heroes';
  const source = `${config.mlbbhubBaseUrl}/heroes`;

  // 1. Check cache
  const cached = await cacheManager.get<Hero[]>(cacheKey);
  if (cached?.isFresh) {
    logger.info({ cacheKey, status: 'hit' }, 'Cache hit for heroes');
    return envelope(cached.data, source, 'hit', new Date(cached.timestamp).toISOString(), false);
  }

  // 2. Try scraping
  try {
    const startTime = Date.now();
    const heroes = await scrapeHeroes();
    
    // Enrich heroes with stats
    try {
      const stats = await aggregateStats('all');
      const statsMap = new Map(stats.map((s) => [s.heroSlug, s]));
      
      for (const hero of heroes) {
        const heroStats = statsMap.get(hero.slug);
        if (heroStats) {
          hero.winRate = heroStats.winRate;
          hero.pickRate = heroStats.pickRate;
          hero.banRate = heroStats.banRate;
        }
      }
    } catch (e) {
      logger.warn('Failed to enrich heroes with aggregated stats, continuing with base data', e);
    }

    const duration = Date.now() - startTime;
    logger.info({ cacheKey, duration, heroCount: heroes.length }, 'Scraped and enriched heroes');

    await cacheManager.set(cacheKey, heroes, source);
    return envelope(heroes, source, 'miss', new Date().toISOString(), false);
  } catch (error) {
    logger.error({ cacheKey, error }, 'Scrape failed for heroes');

    // 3. Return stale cache if available
    if (cached) {
      logger.warn({ cacheKey }, 'Returning stale cache for heroes');
      return envelope(cached.data, source, 'stale', new Date(cached.timestamp).toISOString(), true);
    }

    throw error;
  }
}

/** Get counter picks for a specific hero */
export async function getCounters(heroSlug: string): Promise<ApiEnvelope<CounterPick[]>> {
  const cacheKey = `counter_${heroSlug}`;
  const source = `${config.mlbbhubBaseUrl}/counter/${heroSlug}`;

  const cached = await cacheManager.get<CounterPick[]>(cacheKey);
  if (cached?.isFresh) {
    logger.info({ cacheKey, status: 'hit' }, 'Cache hit for counters');
    return envelope(cached.data, source, 'hit', new Date(cached.timestamp).toISOString(), false);
  }

  try {
    const startTime = Date.now();
    const counters = await aggregateCounters(heroSlug);
    const duration = Date.now() - startTime;
    logger.info({ cacheKey, duration, counterCount: counters.length }, 'Aggregated counters');

    await cacheManager.set(cacheKey, counters, source);
    return envelope(counters, source, 'miss', new Date().toISOString(), false);
  } catch (error) {
    logger.error({ cacheKey, error }, 'Scrape failed for counters');

    if (cached) {
      return envelope(cached.data, source, 'stale', new Date(cached.timestamp).toISOString(), true);
    }

    // Return empty array instead of crashing — the draft UI must remain functional
    return envelope([], source, 'stale', new Date().toISOString(), true);
  }
}

/** Get hero statistics */
export async function getStats(rankFilter: string = 'all'): Promise<ApiEnvelope<HeroStats[]>> {
  const cacheKey = `stats_${rankFilter}`;
  const source = `${config.mlbbhubBaseUrl}/statistics`;

  const cached = await cacheManager.get<HeroStats[]>(cacheKey);
  if (cached?.isFresh) {
    return envelope(cached.data, source, 'hit', new Date(cached.timestamp).toISOString(), false);
  }

  try {
    const stats = await aggregateStats(rankFilter);
    await cacheManager.set(cacheKey, stats, source);
    return envelope(stats, source, 'miss', new Date().toISOString(), false);
  } catch (error) {
    logger.error({ cacheKey, error }, 'Scrape failed for stats');

    if (cached) {
      return envelope(cached.data, source, 'stale', new Date(cached.timestamp).toISOString(), true);
    }

    return envelope([], source, 'stale', new Date().toISOString(), true);
  }
}

/** Get tier list */
export async function getTierList(): Promise<ApiEnvelope<TierEntry[]>> {
  const cacheKey = 'tierlist';
  const source = `${config.mlbbhubBaseUrl}/tier-list`;

  const cached = await cacheManager.get<TierEntry[]>(cacheKey);
  if (cached?.isFresh) {
    return envelope(cached.data, source, 'hit', new Date(cached.timestamp).toISOString(), false);
  }

  try {
    const tierList = await scrapeTierList();
    await cacheManager.set(cacheKey, tierList, source);
    return envelope(tierList, source, 'miss', new Date().toISOString(), false);
  } catch (error) {
    logger.error({ cacheKey, error }, 'Scrape failed for tier list');

    if (cached) {
      return envelope(cached.data, source, 'stale', new Date(cached.timestamp).toISOString(), true);
    }

    return envelope([], source, 'stale', new Date().toISOString(), true);
  }
}

/** Force refresh all caches */
export async function refreshAll(): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    await cacheManager.clear();
  } catch {
    errors.push('Failed to clear cache');
  }

  const tasks = [
    getHeroes().catch((e: Error) => { errors.push(`Heroes: ${e.message}`); }),
    getTierList().catch((e: Error) => { errors.push(`TierList: ${e.message}`); }),
    getStats('all').catch((e: Error) => { errors.push(`Stats: ${e.message}`); }),
  ];

  await Promise.allSettled(tasks);

  return { success: errors.length === 0, errors };
}
