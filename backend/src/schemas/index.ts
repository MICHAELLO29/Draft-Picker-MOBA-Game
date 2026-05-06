import { z } from 'zod';

/** Zod schema for a single hero in the roster */
export const HeroSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  roles: z.array(z.string()).min(1),
  portraitUrl: z.string().url(),
  tier: z.string().optional(),
  winRate: z.number().min(0).max(100).optional(),
  pickRate: z.number().min(0).max(100).optional(),
  banRate: z.number().min(0).max(100).optional(),
});

/** Zod schema for a counter pick entry */
export const CounterPickSchema = z.object({
  heroName: z.string().min(1),
  heroSlug: z.string().min(1),
  portraitUrl: z.string(),
  matchupWinRate: z.number().min(0).max(100),
  winRateDelta: z.number(),
  phaseStrengths: z.array(z.enum(['Early', 'Mid', 'Late'])),
  difficulty: z.string().optional(),
  description: z.string().optional(),
  scrapeTimestamp: z.string(),
  sourceUrl: z.string(),
});

/** Zod schema for hero statistics */
export const HeroStatsSchema = z.object({
  heroName: z.string().min(1),
  heroSlug: z.string().min(1),
  roles: z.array(z.string()).min(1),
  winRate: z.number().min(0).max(100),
  pickRate: z.number().min(0).max(100),
  banRate: z.number().min(0).max(100),
  tier: z.string().optional(),
  rankFilter: z.string(),
  patch: z.string().optional(),
});

/** Zod schema for a tier list entry */
export const TierEntrySchema = z.object({
  heroName: z.string().min(1),
  heroSlug: z.string().min(1),
  portraitUrl: z.string(),
  tier: z.string().min(1),
  roles: z.array(z.string()),
});

export const HeroArraySchema = z.array(HeroSchema);
export const CounterPickArraySchema = z.array(CounterPickSchema);
export const HeroStatsArraySchema = z.array(HeroStatsSchema);
export const TierEntryArraySchema = z.array(TierEntrySchema);
