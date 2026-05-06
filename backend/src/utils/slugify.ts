/**
 * Normalizes a hero name into a URL-safe kebab-case slug.
 * Handles MLBB-specific edge cases: dots (X.Borg), hyphens (Yi Sun-shin),
 * multi-word names (Popol and Kupa), and apostrophes (Chang'e).
 *
 * @example
 * normalizeHeroSlug("Popol and Kupa") // "popol-and-kupa"
 * normalizeHeroSlug("X.Borg")         // "x-borg"
 * normalizeHeroSlug("Yi Sun-shin")    // "yi-sun-shin"
 * normalizeHeroSlug("Luo Yi")         // "luo-yi"
 * normalizeHeroSlug("Chang'e")        // "chang-e"
 */
export function normalizeHeroSlug(heroName: string): string {
  return heroName
    .toLowerCase()
    .trim()
    // Replace dots, apostrophes, and other punctuation with hyphens
    .replace(/[.'`]/g, '-')
    // Replace whitespace and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Collapse consecutive hyphens into one
    .replace(/-{2,}/g, '-')
    // Strip leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}
