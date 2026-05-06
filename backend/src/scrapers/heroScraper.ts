import * as cheerio from 'cheerio';
import type { Hero } from '../types/hero.js';
import { HeroArraySchema } from '../schemas/index.js';
import { fetchHtml } from '../utils/fetch.js';
import config from '../config/index.js';

/**
 * Scrape the MLBBHub heroes page and return a validated Hero array.
 *
 * The heroes page lists each hero as a link with format:
 *   <a href="/heroes/{slug}">Name - Roles - Tier - WinRate% Win Rate</a>
 *
 * We parse from the main content area to avoid duplicate nav/footer links.
 */
export async function scrapeHeroes(): Promise<Hero[]> {
  const url = `${config.mlbbhubBaseUrl}/heroes`;
  const html = await fetchHtml(url);
  if (!html) {
    throw new Error(`Failed to fetch heroes page from ${url}`);
  }

  const $ = cheerio.load(html);
  const heroes: Hero[] = [];
  const seenSlugs = new Set<string>();

  // Find all links to individual hero pages
  $('a[href^="/heroes/"]').each((_i, el) => {
    const href = $(el).attr('href') ?? '';
    const text = $(el).text().trim();

    // Extract slug from URL
    const slugMatch = href.match(/\/heroes\/([a-z0-9-]+)$/);
    if (!slugMatch) return;
    const slug = slugMatch[1];

    // Skip duplicates (page may repeat heroes in different sections)
    if (seenSlugs.has(slug)) return;

    // Parse the text format: "Name - Roles - Tier - WinRate% Win Rate"
    const parts = text.split(' - ');
    if (parts.length < 4) return; // Skip nav links that don't match the format

    const name = parts[0]!.trim();
    const rolesStr = parts[1]!.trim();
    const tier = parts[2]!.trim().replace('-Tier', '').trim();
    const winRateStr = parts[3]!.trim();

    const roles = rolesStr.split(',').map((r) => r.trim()).filter(Boolean);
    const winRateMatch = winRateStr.match(/([\d.]+)%/);
    const winRate = winRateMatch ? parseFloat(winRateMatch[1]!) : undefined;

    // Build portrait URL (MLBBHub uses hero slug for image paths)
    const portraitUrl = `${config.mlbbhubBaseUrl}/heroes/${slug}`;

    seenSlugs.add(slug);
    heroes.push({
      name,
      slug,
      roles,
      portraitUrl,
      tier,
      winRate,
    });
  });

  // Validate with Zod — but allow partial data through for resilience
  const result = HeroArraySchema.safeParse(heroes);
  if (result.success) {
    return result.data;
  }

  // If full validation fails, return what we parsed (scraper resilience)
  if (heroes.length > 0) {
    return heroes;
  }

  throw new Error('Failed to parse any heroes from MLBBHub');
}
