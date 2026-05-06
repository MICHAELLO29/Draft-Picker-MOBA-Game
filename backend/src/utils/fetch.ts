import config from '../config/index.js';

/**
 * Fetch HTML from a URL with timeout.
 * Returns null on failure so scrapers can fallback to cache.
 */
export async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.scrapeTimeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'MLBBDraftStrategizer/1.0 (+https://github.com/mlbb-draft-strategizer)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
