import * as cheerio from 'cheerio';
import type { CounterPick } from '../types/hero.js';
import { CounterPickArraySchema } from '../schemas/index.js';
import { fetchHtml } from '../utils/fetch.js';
import config from '../config/index.js';

/**
 * Scrape counter picks for a specific hero from MLBBHub.
 *
 * The counter page shows:
 * - "How to Counter {Hero}" section with top counters
 * - Each counter has: name, win rate, win rate delta, description
 * - Phase strength tags derived from description text
 */
export async function scrapeCounters(heroSlug: string): Promise<CounterPick[]> {
  const url = `${config.mlbbhubBaseUrl}/counter/${heroSlug}`;
  const html = await fetchHtml(url);
  if (!html) {
    throw new Error(`Failed to fetch counter page for ${heroSlug}`);
  }

  const $ = cheerio.load(html);
  const counters: CounterPick[] = [];
  const timestamp = new Date().toISOString();

  // The counter page has sections with counter hero links and stats.
  // Parse the "How to Counter" section — links to /counter/{slug} with win rate data.
  // The structure has counter hero links followed by description and win rate text.

  const mainContent = $('main, #main-content, [role="main"], body');
  const fullText = mainContent.text();

  // Strategy: find all /counter/ links within the main content area,
  // then extract the adjacent text for win rates and descriptions.
  // We need to be selective — only the first section (counters FOR the hero, not BY the hero).

  const counterSection = $('h2:contains("How to Counter")').first();
  let sectionEl = counterSection.length > 0
    ? counterSection.parent()
    : mainContent;

  // Find counter links — these are <a> tags linking to /counter/{slug}
  const counterLinks: Array<{
    name: string;
    slug: string;
    description: string;
    winRate: number;
  }> = [];

  // Parse text blocks that contain counter info
  // From the scraped content, pattern is:
  // [HeroName](link)
  // Description text
  // WinRate%
  // "win rate delta"

  const textBlocks = fullText.split(/\n+/);
  let currentSection = '';

  // Use link-based parsing as primary approach
  $('a[href*="/counter/"]').each((_i, el) => {
    const href = $(el).attr('href') ?? '';
    const linkSlugMatch = href.match(/\/counter\/([a-z0-9-]+)$/);
    if (!linkSlugMatch) return;

    const counterSlug = linkSlugMatch[1]!;
    // Skip self-reference and navigation links
    if (counterSlug === heroSlug) return;

    const linkText = $(el).text().trim();
    if (!linkText || linkText.length < 2) return;

    // Get the surrounding text for context (description and win rate)
    // The win rate is often higher up in the DOM structure
    const parent = $(el).parent();
    const blockText = parent.parent().parent().text().trim(); // Go up a few levels to capture the whole block

    // Extract win rate percentage from nearby text
    // We look for patterns like "51.6%+" or "51.6%-"
    const winRateMatch = blockText.match(/([\d.]+)%[+-]/);
    const winRate = winRateMatch ? parseFloat(winRateMatch[1]!) : 50.0;

    // Look for description text (usually ends before "EarlyMidLate" or percentage)
    let description = '';
    const descMatch = blockText.match(/(?:Assassin|Fighter|Mage|Marksman|Support|Tank)(.*?)(?:Early|Mid|Late|[\d.]+%)/);
    if (descMatch && descMatch[1] && descMatch[1].length > 10) {
      description = descMatch[1].trim();
    } else {
      description = blockText.replace(/^.*?#\d+[A-Za-z]+/, '').substring(0, 100);
    }

    // Avoid duplicates
    if (counterLinks.some((c) => c.slug === counterSlug)) return;

    counterLinks.push({
      name: linkText,
      slug: counterSlug,
      description,
      winRate,
    });
  });

  // Take the first 5 entries as counter picks (the "How to Counter" section)
  const topCounters = counterLinks.slice(0, 5);

  for (const counter of topCounters) {
    // Determine phase strengths from description text
    const phaseStrengths = extractPhaseStrengths(counter.description);

    counters.push({
      heroName: counter.name,
      heroSlug: counter.slug,
      portraitUrl: `${config.mlbbhubBaseUrl}/heroes/${counter.slug}`,
      matchupWinRate: counter.winRate,
      winRateDelta: counter.winRate - 50, // Delta from average
      phaseStrengths,
      description: counter.description || undefined,
      scrapeTimestamp: timestamp,
      sourceUrl: url,
    });
  }

  // Sort by win rate descending
  counters.sort((a, b) => b.matchupWinRate - a.matchupWinRate);

  // Validate
  const result = CounterPickArraySchema.safeParse(counters);
  if (result.success) {
    return result.data;
  }

  // Return raw if validation fails but we have data
  if (counters.length > 0) {
    return counters;
  }

  return [];
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

  // Default to Mid if no phase detected
  if (strengths.length === 0) {
    strengths.push('Mid');
  }

  return strengths;
}
