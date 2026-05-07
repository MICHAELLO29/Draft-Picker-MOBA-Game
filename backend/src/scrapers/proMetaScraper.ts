import * as cheerio from 'cheerio';
import { fetchHtml } from '../utils/fetch.js';
import pino from 'pino';
import config from '../config/index.js';

const logger = pino({ level: config.logLevel });

/**
 * Pro meta data from MPL PH (Mobile Legends Professional League Philippines)
 * Source: https://ph-mpl.com/data
 */
export interface ProMetaEntry {
  heroName: string;
  heroSlug: string;
  /** Number of times picked in pro play */
  pickCount?: number;
  /** Number of times banned in pro play */
  banCount?: number;
  /** Win rate in pro play (percentage) */
  proWinRate?: number;
  /** Category: 'pick' | 'ban' | 'winrate' */
  category: 'pick' | 'ban' | 'winrate';
}

export interface ProMetaData {
  topPicks: ProMetaEntry[];
  topBans: ProMetaEntry[];
  topWinRates: ProMetaEntry[];
  scrapeTimestamp: string;
  source: string;
}

/**
 * Scrape pro meta data from MPL PH data page.
 * Returns top 5 hero picks, top 5 hero bans, and top 5 win rates
 * from professional tournament play.
 */
export async function scrapeProMeta(): Promise<ProMetaData> {
  const url = 'https://ph-mpl.com/data';
  const html = await fetchHtml(url);
  if (!html) {
    throw new Error('Failed to fetch MPL PH data page');
  }

  const $ = cheerio.load(html);
  const timestamp = new Date().toISOString();

  const topPicks: ProMetaEntry[] = [];
  const topBans: ProMetaEntry[] = [];
  const topWinRates: ProMetaEntry[] = [];

  // Parse hero data from image cards
  // Each hero card has: <img alt="HeroName"> and adjacent text with the stat
  const heroCards: Array<{ name: string; stat: string }> = [];

  $('img').each((_i, el) => {
    const alt = $(el).attr('alt') ?? '';
    const src = $(el).attr('src') ?? '';

    // Skip non-hero images (logos, flags, sponsors, player photos)
    if (!alt || alt === 'EN' || alt === 'PH') return;
    if (src.includes('logo') || src.includes('flag') || src.includes('player')) return;
    if (src.includes('sponsor') || src.includes('partner')) return;

    // Get the closest div container and extract the stat number
    const card = $(el).closest('div');
    const cardText = card.text().trim();

    // Extract the stat (number or percentage) from the card text
    // Card format is: "HeroName\n            stat"
    const lines = cardText.split(/\s+/).filter(Boolean);
    // The stat is the last token that's a number or percentage
    const statToken = lines.find((t) => /^\d+(\.\d+)?%?$/.test(t));

    if (statToken && alt.length > 1) {
      heroCards.push({ name: alt, stat: statToken });
    }
  });

  // Filter out sponsor images
  const sponsorNames = ['Infinix', 'Smart', 'Clear Men', 'TT Racing', 'Lenovo', 'GCash'];
  const filteredCards = heroCards.filter((c) => !sponsorNames.includes(c.name));

  // The order is: first 5 = picks, next 5 = bans, last 5 = win rates
  for (let i = 0; i < filteredCards.length; i++) {
    const card = filteredCards[i]!;
    const slug = heroNameToSlug(card.name);

    if (i < 5) {
      // Top picks
      topPicks.push({
        heroName: card.name,
        heroSlug: slug,
        pickCount: parseInt(card.stat, 10),
        category: 'pick',
      });
    } else if (i < 10) {
      // Top bans
      topBans.push({
        heroName: card.name,
        heroSlug: slug,
        banCount: parseInt(card.stat, 10),
        category: 'ban',
      });
    } else if (i < 15) {
      // Top win rates
      topWinRates.push({
        heroName: card.name,
        heroSlug: slug,
        proWinRate: parseFloat(card.stat.replace('%', '')),
        category: 'winrate',
      });
    }
  }

  logger.info(
    {
      picks: topPicks.map((p) => p.heroName),
      bans: topBans.map((b) => b.heroName),
      winRates: topWinRates.map((w) => w.heroName),
    },
    'Scraped MPL PH pro meta data'
  );

  return {
    topPicks,
    topBans,
    topWinRates,
    scrapeTimestamp: timestamp,
    source: url,
  };
}

/** Convert hero name to URL slug */
function heroNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}
