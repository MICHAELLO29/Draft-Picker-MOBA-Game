import * as cheerio from 'cheerio';
import type { HeroStats } from '../types/hero.js';
import { HeroStatsArraySchema } from '../schemas/index.js';
import { fetchHtml } from '../utils/fetch.js';
import config from '../config/index.js';

/**
 * Scrape hero statistics from MLBBHub /statistics page.
 * Extracts win rates, pick rates, ban rates for each hero.
 */
export async function scrapeStats(rankFilter: string = 'all'): Promise<HeroStats[]> {
  const url = `${config.mlbbhubBaseUrl}/statistics`;
  const html = await fetchHtml(url);
  if (!html) {
    throw new Error('Failed to fetch statistics page');
  }

  const $ = cheerio.load(html);
  const stats: HeroStats[] = [];
  const seenSlugs = new Set<string>();

  // The statistics page lists heroes as links to /heroes/{slug}
  // with win rate, pick rate, and ban rate data nearby.
  // Parse from the main hero list area.

  $('a[href^="/heroes/"]').each((_i, el) => {
    const href = $(el).attr('href') ?? '';
    const slugMatch = href.match(/\/heroes\/([a-z0-9-]+)$/);
    if (!slugMatch) return;

    const slug = slugMatch[1]!;
    if (seenSlugs.has(slug)) return;

    const text = $(el).text().trim();
    if (!text || text.length < 2) return;

    // Parse text — may contain name, role, win rate, etc.
    // Format varies: "Hero Name" or "Hero Name Role WR%"
    const parts = text.split(' - ');
    const name = parts[0]!.trim().replace(/^\d+/, '').trim(); // Remove leading numbers

    // Look for percentage values in text and siblings
    const parentText = $(el).parent().text().trim();
    const allText = parentText + ' ' + $(el).closest('li, div, tr').text().trim();

    // Extract stats from surrounding text
    // The new layout has strings like "55.71%—0.12%0.55%" (WR, PR, BR)
    const percentages = [...allText.matchAll(/([\d.]+)%/g)].map((m) => parseFloat(m[1]!));
    
    let winRate = 50.0;
    let pickRate = 0;
    let banRate = 0;

    if (percentages.length >= 3) {
      // Typically WR, PR, BR
      winRate = percentages[0]!;
      pickRate = percentages[1]!;
      banRate = percentages[2]!;
    } else if (percentages.length > 0) {
      winRate = percentages[0]!;
      if (percentages.length === 2) pickRate = percentages[1]!;
    }

    // Skip if this looks like a nav link (no meaningful data)
    if (name.length < 2 || name.includes('Browse') || name.includes('Find') || name.includes('Gem') || name.includes('Star') || name.includes('Off')) return;

    // Clean hero name — remove common suffixes and random text
    const cleanName = name
      .replace(/(?:Fighter|Mage|Marksman|Assassin|Tank|Support|Roamer|EXP Lane|Gold Lane|Mid Lane|Jungler).*$/i, '')
      .replace(/\d+\.?\d*%.*$/, '')
      .trim();

    if (!cleanName || cleanName.length < 2) return;

    seenSlugs.add(slug);
    stats.push({
      heroName: cleanName,
      heroSlug: slug,
      roles: [], // Will be enriched from hero data
      winRate,
      pickRate,
      banRate,
      rankFilter,
    });
  });

  // Validate
  const result = HeroStatsArraySchema.safeParse(stats);
  if (result.success) {
    return result.data;
  }

  if (stats.length > 0) {
    return stats;
  }

  throw new Error('Failed to parse statistics from MLBBHub');
}
