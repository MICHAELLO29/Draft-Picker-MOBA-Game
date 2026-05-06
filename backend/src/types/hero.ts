/** Represents a single MLBB hero in the roster */
export type Hero = {
  name: string;
  slug: string;
  roles: string[];
  portraitUrl: string;
  tier?: string;
  winRate?: number;
  pickRate?: number;
  banRate?: number;
};

/** A counter pick suggestion for a specific hero */
export type CounterPick = {
  heroName: string;
  heroSlug: string;
  portraitUrl: string;
  matchupWinRate: number;
  winRateDelta: number;
  phaseStrengths: ('Early' | 'Mid' | 'Late')[];
  difficulty?: string;
  description?: string;
  scrapeTimestamp: string;
  sourceUrl: string;
};

/** Hero statistics from the stats page */
export type HeroStats = {
  heroName: string;
  heroSlug: string;
  roles: string[];
  winRate: number;
  pickRate: number;
  banRate: number;
  tier?: string;
  rankFilter: string;
  patch?: string;
};

/** Entry from the tier list page */
export type TierEntry = {
  heroName: string;
  heroSlug: string;
  portraitUrl: string;
  tier: string;
  roles: string[];
};
