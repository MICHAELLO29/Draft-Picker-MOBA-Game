/**
 * Strategy Recommendation Engine
 * 
 * Scores draft strategies based on:
 * - Counters banned → strategy becomes STRONGER
 * - Key heroes banned → strategy becomes WEAKER
 * - Key heroes available → strategy is VIABLE
 * 
 * Only recommends strategies that are still executable.
 */

import { MPL_STRATEGIES, type DraftStrategy } from '../data/strategies';
import type { Hero } from '../types';

export interface StrategyRecommendation {
  strategy: DraftStrategy;
  score: number;
  viability: 'strong' | 'viable' | 'weakened';
  reason: string;
  countersBanned: string[];    // Names of counters that were banned
  availableHeroes: StrategySlotFill[]; // Which heroes can fill each slot
}

export interface StrategySlotFill {
  role: string;
  available: string[];  // Hero slugs still available for this slot
  required: boolean;
}

/**
 * Evaluate all strategies against the current draft state.
 * Returns ranked recommendations.
 */
export function evaluateStrategies(
  bannedSlugs: Set<string>,
  pickedSlugs: Set<string>,
  allHeroes: Hero[],
): StrategyRecommendation[] {
  const usedSlugs = new Set([...bannedSlugs, ...pickedSlugs]);
  const bannedNames = new Map<string, string>();

  // Build slug-to-name map for display
  for (const hero of allHeroes) {
    if (bannedSlugs.has(hero.slug)) {
      bannedNames.set(hero.slug, hero.name);
    }
  }

  const results: StrategyRecommendation[] = [];
  // Build a set of slugs that actually exist in the hero pool
  const poolSlugs = new Set(allHeroes.map((h) => h.slug));

  for (const strategy of MPL_STRATEGIES) {
    // 1. Check slot viability — can we still fill required roles?
    //    Only count heroes that exist in the pool AND are not banned/picked
    const slotFills: StrategySlotFill[] = strategy.slots.map((slot) => ({
      role: slot.role,
      available: slot.heroSlugs.filter((s) => !usedSlugs.has(s) && poolSlugs.has(s)),
      required: slot.required,
    }));

    // If any REQUIRED slot has 0 available heroes → strategy is NOT viable
    const requiredSlotsFailed = slotFills.filter((sf) => sf.required && sf.available.length === 0);
    if (requiredSlotsFailed.length > 0) continue;

    // 2. Count key heroes that are banned (weakens the strat)
    const keyHeroesBanned = strategy.keyHeroes.filter((s) => bannedSlugs.has(s));

    // 3. Count counters that are banned (STRENGTHENS the strat)
    const countersBanned = strategy.counteredBy.filter((s) => bannedSlugs.has(s));
    const countersBannedNames = countersBanned
      .map((s) => bannedNames.get(s) ?? s)
      .filter(Boolean);

    // 4. Calculate score
    //    + counters banned (big bonus — this strategy is now safer to run)
    //    + available heroes in required slots (more options = more flexible)
    //    - key heroes banned (penalty)
    const counterBonus = countersBanned.length * 25;
    const flexibilityBonus = slotFills.reduce((sum, sf) => sum + sf.available.length, 0) * 2;
    const keyHeroPenalty = keyHeroesBanned.length * 15;
    const requiredSlotBonus = slotFills
      .filter((sf) => sf.required && sf.available.length > 0)
      .length * 10;

    const score = counterBonus + flexibilityBonus + requiredSlotBonus - keyHeroPenalty;

    // 5. Determine viability label
    let viability: 'strong' | 'viable' | 'weakened';
    let reason: string;

    if (countersBanned.length >= 2) {
      viability = 'strong';
      reason = `${countersBannedNames.join(' & ')} banned — counters eliminated!`;
    } else if (countersBanned.length === 1) {
      viability = 'strong';
      reason = `${countersBannedNames[0]} banned — a key counter is gone.`;
    } else if (keyHeroesBanned.length === 0) {
      viability = 'viable';
      reason = 'All core heroes available — safe to draft.';
    } else if (keyHeroesBanned.length <= 1) {
      viability = 'viable';
      reason = `Still executable but ${keyHeroesBanned.length} key hero banned.`;
    } else {
      viability = 'weakened';
      reason = `${keyHeroesBanned.length} key heroes banned — consider alternatives.`;
    }

    results.push({
      strategy,
      score,
      viability,
      reason,
      countersBanned: countersBannedNames,
      availableHeroes: slotFills,
    });
  }

  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Get top strategy recommendations (only strong/viable ones).
 */
export function getTopStrategies(
  bannedSlugs: Set<string>,
  pickedSlugs: Set<string>,
  allHeroes: Hero[],
  limit = 3,
): StrategyRecommendation[] {
  const all = evaluateStrategies(bannedSlugs, pickedSlugs, allHeroes);
  // Only show strong/viable, filter out weakened
  return all
    .filter((r) => r.viability !== 'weakened')
    .slice(0, limit);
}
