import * as cheerio from 'cheerio';
import type { CounterPick } from '../types/hero.js';
import { fetchHtml } from '../utils/fetch.js';
import config from '../config/index.js';

/**
 * Result containing both counter directions:
 * - strongAgainst: heroes that BEAT the target hero (pick these to counter them)
 * - weakAgainst: heroes the target hero BEATS (these are weak vs the target)
 */
export type CounterResult = {
  strongAgainst: CounterPick[];
  weakAgainst: CounterPick[];
};

/**
 * Scrape counter picks for a specific hero from MLBBHub.
 *
 * The counter page has two sections:
 * 1. "How to Counter {Hero}" — heroes that beat the target (strongAgainst)
 * 2. "Heroes {Hero} Counters" — heroes the target beats (weakAgainst)
 *
 * We differentiate by the win rate delta sign:
 * - Entries with "%+" delta → strongAgainst (they beat X)
 * - Entries without "+" delta → weakAgainst (X beats them)
 */
export async function scrapeCounters(heroSlug: string): Promise<CounterResult> {
  const url = `${config.mlbbhubBaseUrl}/counter/${heroSlug}`;
  const html = await fetchHtml(url);
  if (!html) {
    throw new Error(`Failed to fetch counter page for ${heroSlug}`);
  }

  const $ = cheerio.load(html);
  const timestamp = new Date().toISOString();

  // Collect all counter links with their metadata
  const counterLinks: Array<{
    name: string;
    slug: string;
    description: string;
    winRate: number;
    hasPositiveDelta: boolean;
  }> = [];

  $('a[href*="/counter/"]').each((_i, el) => {
    const href = $(el).attr('href') ?? '';
    const linkSlugMatch = href.match(/\/counter\/([a-z0-9-]+)$/);
    if (!linkSlugMatch) return;

    const counterSlug = linkSlugMatch[1]!;
    if (counterSlug === heroSlug) return;

    const linkText = $(el).text().trim();
    if (!linkText || linkText.length < 2) return;

    // Avoid duplicates
    if (counterLinks.some((c) => c.slug === counterSlug)) return;

    const parent = $(el).parent();
    const blockText = parent.parent().parent().text().trim();

    // Check if this entry has a positive delta sign (%+)
    // "strongAgainst" entries have patterns like "51.6%+2.5%win rate delta"
    // "weakAgainst" entries have patterns like "55.8%3.0%win rate delta" (no + sign)
    const hasPositiveDelta = /[\d.]+%\+/.test(blockText);

    // Extract win rate
    const winRateMatch = blockText.match(/([\d.]+)%[+-]/);
    const winRateAlt = blockText.match(/([\d.]+)%/);
    const winRate = winRateMatch
      ? parseFloat(winRateMatch[1]!)
      : winRateAlt
        ? parseFloat(winRateAlt[1]!)
        : 50.0;

    // Extract description
    let description = '';
    const descMatch = blockText.match(
      /(?:Assassin|Fighter|Mage|Marksman|Support|Tank)(.*?)(?:Early|Mid|Late|[\d.]+%)/
    );
    if (descMatch && descMatch[1] && descMatch[1].length > 10) {
      description = descMatch[1].trim();
    } else {
      description = blockText.replace(/^.*?#\d+[A-Za-z]+/, '').substring(0, 150);
    }

    counterLinks.push({
      name: linkText,
      slug: counterSlug,
      description,
      winRate,
      hasPositiveDelta,
    });
  });

  // Split into two groups based on delta sign
  const strongRaw = counterLinks.filter((c) => c.hasPositiveDelta);
  const weakRaw = counterLinks.filter((c) => !c.hasPositiveDelta);

  // If the delta-based split didn't work (all same), fall back to positional split
  // First half = strongAgainst, second half = weakAgainst
  let strongList = strongRaw;
  let weakList = weakRaw;
  if (strongRaw.length === 0 && weakRaw.length > 5) {
    strongList = counterLinks.slice(0, 5);
    weakList = counterLinks.slice(5, 10);
  } else if (weakRaw.length === 0 && strongRaw.length > 5) {
    strongList = counterLinks.slice(0, 5);
    weakList = counterLinks.slice(5, 10);
  }

  // Convert to CounterPick format
  function toCounterPicks(entries: typeof counterLinks): CounterPick[] {
    const picks: CounterPick[] = entries.slice(0, 5).map((counter) => ({
      heroName: counter.name,
      heroSlug: counter.slug,
      portraitUrl: `${config.mlbbhubBaseUrl}/heroes/${counter.slug}`,
      matchupWinRate: counter.winRate,
      winRateDelta: counter.winRate - 50,
      phaseStrengths: extractPhaseStrengths(counter.description),
      description: counter.description || undefined,
      scrapeTimestamp: timestamp,
      sourceUrl: url,
    }));

    picks.sort((a, b) => b.matchupWinRate - a.matchupWinRate);
    return picks;
  }

  return {
    strongAgainst: toCounterPicks(strongList),
    weakAgainst: toCounterPicks(weakList),
  };
}

/**
 * Legacy wrapper: returns only the "strongAgainst" list for backward compatibility.
 */
export async function scrapeCountersLegacy(heroSlug: string): Promise<CounterPick[]> {
  const result = await scrapeCounters(heroSlug);
  return result.strongAgainst;
}

/** Extract phase strength tags from description text */
function extractPhaseStrengths(text: string): ('Early' | 'Mid' | 'Late')[] {
  const strengths: ('Early' | 'Mid' | 'Late')[] = [];
  const lower = text.toLowerCase();

  if (lower.includes('early game') || lower.includes('early')) {
    strengths.push('Early');
  }
  if (lower.includes('mid game') || lower.includes('mid')) {
    strengths.push('Mid');
  }
  if (lower.includes('late game') || lower.includes('late') || lower.includes('outscale')) {
    strengths.push('Late');
  }

  if (strengths.length === 0) {
    strengths.push('Mid');
  }

  return strengths;
}
