import * as cheerio from 'cheerio';
import type { TierEntry } from '../types/hero.js';
import { TierEntryArraySchema } from '../schemas/index.js';
import { fetchHtml } from '../utils/fetch.js';
import config from '../config/index.js';

/**
 * Scrape tier list from MLBBHub /tier-list page.
 * Groups heroes by tier (S, A, B, C, D).
 */
export async function scrapeTierList(): Promise<TierEntry[]> {
  const url = `${config.mlbbhubBaseUrl}/tier-list`;
  const html = await fetchHtml(url);
  if (!html) {
    throw new Error('Failed to fetch tier list page');
  }

  const $ = cheerio.load(html);
  const entries: TierEntry[] = [];
  const seenSlugs = new Set<string>();

  // The tier list groups heroes by tier. Parse links with context for tier grade.
  // Look for tier indicators in headings or nearby text.

  $('a[href^="/heroes/"]').each((_i, el) => {
    const href = $(el).attr('href') ?? '';
    const slugMatch = href.match(/\/heroes\/([a-z0-9-]+)$/);
    if (!slugMatch) return;

    const slug = slugMatch[1]!;
    if (seenSlugs.has(slug)) return;

    const text = $(el).text().trim();
    if (!text || text.length < 2) return;

    // Parse name and potential tier/role from text
    // Format may be: "HeroName" or "HeroNameTierWR%"
    let name = text;
    let tier = '';
    const roles: string[] = [];

    // Check for tier in surrounding context
    const parentText = $(el).closest('li, div, section').text().trim();

    // Look for tier grade (S, A, B, C, D) in nearby text
    const tierMatch = parentText.match(/\b([SABCD])\s*(?:-?\s*[Tt]ier|(?=\d+\.?\d*%))/);
    if (tierMatch) {
      tier = tierMatch[1]!;
    }

    // Extract roles from text
    const rolePattern = /(?:Fighter|Mage|Marksman|Assassin|Tank|Support)/gi;
    const roleMatches = parentText.match(rolePattern);
    if (roleMatches) {
      roleMatches.forEach((r) => {
        const role = r.charAt(0).toUpperCase() + r.slice(1).toLowerCase();
        if (!roles.includes(role)) roles.push(role);
      });
    }

    // Clean hero name
    name = name
      .replace(/\d+\.?\d*%.*$/, '')
      .replace(/(?:Fighter|Mage|Marksman|Assassin|Tank|Support)/gi, '')
      .replace(/[SABCD]-?Tier/gi, '')
      .replace(/^\d+\.?\s*/, '')
      .trim();

    if (!name || name.length < 2) return;

    // Skip non-hero entries
    if (name.includes('Browse') || name.includes('Find') || name.includes('Compare')) return;

    seenSlugs.add(slug);
    entries.push({
      heroName: name,
      heroSlug: slug,
      portraitUrl: `${config.mlbbhubBaseUrl}/heroes/${slug}`,
      tier: tier || 'B', // Default to B if tier not detected
      roles: roles.length > 0 ? roles : ['Unknown'],
    });
  });

  // Validate
  const result = TierEntryArraySchema.safeParse(entries);
  if (result.success) {
    return result.data;
  }

  if (entries.length > 0) {
    return entries;
  }

  throw new Error('Failed to parse tier list from MLBBHub');
}
