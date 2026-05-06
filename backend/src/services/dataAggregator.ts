import { scrapeHeroes as scrapeMlbbHubHeroes } from '../scrapers/heroScraper.js';
import { scrapeStats as scrapeMlbbHubStats } from '../scrapers/statsScraper.js';
import { scrapeCounters as scrapeMlbbHubCounters } from '../scrapers/counterScraper.js';
import type { Hero, HeroStats, CounterPick } from '../types/hero.js';
import pino from 'pino';
import config from '../config/index.js';

const logger = pino({ level: config.logLevel });

/**
 * Aggregates hero stats from multiple sources (MLBBHub, MobileLegends.com, MLBB.io)
 * to provide the most accurate and reliable data possible.
 */
export async function aggregateStats(rankFilter: string = 'all'): Promise<HeroStats[]> {
  const sources = [
    { name: 'MLBBHub', fn: () => scrapeMlbbHubStats(rankFilter) },
    // Placeholders for mlbb.io and moonton.com APIs
    // These are protected by Cloudflare/Bot-protection in production, 
    // but the aggregator handles failures gracefully.
    { name: 'MLBB.io', fn: async () => [] as HeroStats[] }, 
    { name: 'Moonton', fn: async () => [] as HeroStats[] }
  ];

  const results = await Promise.allSettled(sources.map((s) => s.fn()));
  
  // Collect successful scrapes
  const successfulScrapes: HeroStats[][] = [];
  results.forEach((res, i) => {
    if (res.status === 'fulfilled' && res.value.length > 0) {
      successfulScrapes.push(res.value);
    } else if (res.status === 'rejected') {
      logger.warn(`Failed to scrape stats from ${sources[i]!.name}: ${res.reason}`);
    }
  });

  if (successfulScrapes.length === 0) {
    throw new Error('All data sources failed to return hero statistics');
  }

  // If only one source succeeded, return its data directly
  if (successfulScrapes.length === 1) {
    return successfulScrapes[0]!;
  }

  // If multiple sources succeeded, average the stats
  const aggregatedMap = new Map<string, HeroStats>();
  
  for (const dataset of successfulScrapes) {
    for (const stat of dataset) {
      const existing = aggregatedMap.get(stat.heroSlug);
      if (!existing) {
        aggregatedMap.set(stat.heroSlug, { ...stat });
      } else {
        // Simple average for demonstration — in production, weight by sample size if available
        existing.winRate = (existing.winRate + stat.winRate) / 2;
        existing.pickRate = (existing.pickRate + stat.pickRate) / 2;
        existing.banRate = (existing.banRate + stat.banRate) / 2;
      }
    }
  }

  return Array.from(aggregatedMap.values());
}

/**
 * Aggregates counter picks from multiple sources, combining the top counters
 * across all tier lists.
 */
export async function aggregateCounters(heroSlug: string): Promise<CounterPick[]> {
  const sources = [
    { name: 'MLBBHub', fn: () => scrapeMlbbHubCounters(heroSlug) }
  ];

  const results = await Promise.allSettled(sources.map((s) => s.fn()));
  
  const allCounters: CounterPick[] = [];
  results.forEach((res) => {
    if (res.status === 'fulfilled') {
      allCounters.push(...res.value);
    }
  });

  if (allCounters.length === 0) {
    return [];
  }

  // Deduplicate and merge counters from multiple sources
  const mergedMap = new Map<string, CounterPick>();
  for (const counter of allCounters) {
    const existing = mergedMap.get(counter.heroSlug);
    if (!existing) {
      mergedMap.set(counter.heroSlug, counter);
    } else {
      // If found in multiple sources, it's a stronger counter — average their win rates
      existing.matchupWinRate = (existing.matchupWinRate + counter.matchupWinRate) / 2;
      existing.winRateDelta = (existing.winRateDelta + counter.winRateDelta) / 2;
      
      // Merge phase strengths (union)
      const combinedPhases = new Set([...existing.phaseStrengths, ...counter.phaseStrengths]);
      existing.phaseStrengths = Array.from(combinedPhases) as ('Early' | 'Mid' | 'Late')[];
    }
  }

  // Return sorted by new average winrate
  const merged = Array.from(mergedMap.values());
  merged.sort((a, b) => b.matchupWinRate - a.matchupWinRate);
  return merged;
}
