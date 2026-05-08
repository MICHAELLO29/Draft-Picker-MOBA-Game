/**
 * Draft Intelligence Engine
 * 
 * Phase-aware pick recommendations, flex detection,
 * damage balance warnings, and power spike analysis.
 */

import { HERO_INTEL, type HeroIntel } from '../data/heroIntel';
import type { Hero } from '../types';

// ── TYPES ──

export interface DraftPhaseInfo {
  phase: 'ban1' | 'pick1' | 'ban2' | 'pick2' | 'pick3';
  pickNumber: number;  // 1-5 within the team
  isEarlyPick: boolean;
  isLastPick: boolean;
}

export interface FlexPickAlert {
  hero: Hero;
  flexRoles: string[];
  lanes: string[];
  reason: string;
}

export interface DamageBalanceWarning {
  type: 'all-physical' | 'all-magic' | 'no-physical' | 'no-magic';
  message: string;
  severity: 'warning' | 'critical';
}

export interface PowerSpikeSummary {
  early: number;   // 0-100
  mid: number;
  late: number;
  peakPhase: 'Early' | 'Mid' | 'Late';
  warning: string | null;
}

export interface PhaseRecommendation {
  hero: Hero;
  intel: HeroIntel | null;
  phaseScore: number;
  reason: string;
  tag: string;
}

// ── FUNCTIONS ──

/** Get intel for a hero, returns null if not in database */
export function getHeroIntel(slug: string): HeroIntel | null {
  return HERO_INTEL[slug] ?? null;
}

/** Determine the current draft phase context */
export function getDraftPhase(
  stepIndex: number,
  draftOrder: Array<{ team: string; type: string; slotIndex: number }>
): DraftPhaseInfo {
  const step = draftOrder[stepIndex];
  if (!step) return { phase: 'ban1', pickNumber: 0, isEarlyPick: true, isLastPick: false };

  const teamPicksSoFar = draftOrder
    .slice(0, stepIndex)
    .filter((s) => s.team === step.team && s.type === 'pick').length;
  const pickNumber = teamPicksSoFar + 1;

  // Determine phase based on step type and position
  const isBan = step.type === 'ban';
  const bansSoFar = draftOrder.slice(0, stepIndex).filter((s) => s.type === 'ban').length;

  let phase: DraftPhaseInfo['phase'];
  if (isBan && bansSoFar < 6) phase = 'ban1';
  else if (isBan) phase = 'ban2';
  else if (pickNumber <= 2) phase = 'pick1';
  else if (pickNumber <= 4) phase = 'pick2';
  else phase = 'pick3';

  return {
    phase,
    pickNumber,
    isEarlyPick: pickNumber <= 2,
    isLastPick: pickNumber === 5,
  };
}

/** Detect flex picks from a list of heroes */
export function detectFlexPicks(heroes: Hero[]): FlexPickAlert[] {
  const alerts: FlexPickAlert[] = [];

  for (const hero of heroes) {
    const intel = getHeroIntel(hero.slug);
    if (!intel) continue;

    if (intel.flexRoles.length >= 3 || (intel.flexRoles.length >= 2 && intel.laneAssignment.length >= 2)) {
      alerts.push({
        hero,
        flexRoles: intel.flexRoles,
        lanes: intel.laneAssignment,
        reason: `Can play ${intel.flexRoles.join('/')} across ${intel.laneAssignment.join(', ')} — hides your strategy`,
      });
    }
  }

  return alerts.sort((a, b) => b.flexRoles.length - a.flexRoles.length);
}

/** Check damage type balance for a team */
export function checkDamageBalance(teamHeroes: Hero[]): DamageBalanceWarning[] {
  if (teamHeroes.length < 3) return [];

  const warnings: DamageBalanceWarning[] = [];
  let physical = 0;
  let magic = 0;

  for (const hero of teamHeroes) {
    const intel = getHeroIntel(hero.slug);
    if (!intel) {
      // Guess from roles
      if (hero.roles.some((r) => ['Marksman', 'Fighter', 'Assassin'].includes(r))) physical++;
      if (hero.roles.some((r) => ['Mage', 'Support'].includes(r))) magic++;
      continue;
    }
    if (intel.damageType === 'Physical') physical++;
    else if (intel.damageType === 'Magic') magic++;
    else { physical++; magic++; } // Mixed counts for both
  }

  const total = teamHeroes.length;

  if (physical >= total - 1 && magic <= 1) {
    warnings.push({
      type: 'all-physical',
      message: `${physical}/${total} heroes deal physical damage — enemy can stack physical defense items`,
      severity: total >= 4 && magic === 0 ? 'critical' : 'warning',
    });
  }
  if (magic >= total - 1 && physical <= 1) {
    warnings.push({
      type: 'all-magic',
      message: `${magic}/${total} heroes deal magic damage — enemy can stack magic defense items`,
      severity: total >= 4 && physical === 0 ? 'critical' : 'warning',
    });
  }

  return warnings;
}

/** Analyze team power spike distribution */
export function analyzeTeamPowerSpike(teamHeroes: Hero[]): PowerSpikeSummary {
  let early = 0, mid = 0, late = 0;

  for (const hero of teamHeroes) {
    const intel = getHeroIntel(hero.slug);
    if (!intel) { mid++; continue; }
    if (intel.powerSpike === 'Early') early++;
    else if (intel.powerSpike === 'Mid') mid++;
    else late++;
  }

  const total = Math.max(teamHeroes.length, 1);
  const earlyPct = Math.round((early / total) * 100);
  const midPct = Math.round((mid / total) * 100);
  const latePct = Math.round((late / total) * 100);

  const peakPhase = earlyPct >= midPct && earlyPct >= latePct ? 'Early'
    : latePct > midPct ? 'Late' : 'Mid';

  let warning: string | null = null;
  if (late >= 3 && teamHeroes.length >= 4) {
    warning = 'Heavy late-game comp — vulnerable to early aggression. Survive until 15+ minutes.';
  } else if (early >= 3 && teamHeroes.length >= 4) {
    warning = 'Heavy early-game comp — must snowball before enemies scale. Close before 18 minutes.';
  }

  return { early: earlyPct, mid: midPct, late: latePct, peakPhase, warning };
}

/** Score hero recommendations based on draft phase */
export function getPhaseAwareRecommendations(
  availableHeroes: Hero[],
  phaseInfo: DraftPhaseInfo,
  teamHeroes: Hero[],
  usedSlugs: Set<string>,
  limit = 5,
): PhaseRecommendation[] {
  const results: PhaseRecommendation[] = [];

  for (const hero of availableHeroes) {
    if (usedSlugs.has(hero.slug)) continue;

    const intel = getHeroIntel(hero.slug);
    let phaseScore = 50; // Base score
    let reason = '';
    let tag = '';

    if (!intel) {
      results.push({ hero, intel: null, phaseScore: 30, reason: 'No competitive data', tag: 'Unknown' });
      continue;
    }

    // Phase-specific scoring
    if (phaseInfo.isEarlyPick) {
      // P1-P2: Prioritize flex picks and contested heroes
      if (intel.draftPriority === 'flex') {
        phaseScore += 30;
        reason = `Flex pick — hides your ${intel.laneAssignment.join('/')} assignment`;
        tag = 'FLEX';
      } else if (intel.draftPriority === 'first-pick') {
        phaseScore += 25;
        reason = 'Contested hero — secure before enemy takes it';
        tag = 'CONTESTED';
      } else if (intel.draftPriority === 'last-pick') {
        phaseScore -= 20;
        reason = 'Better saved for later — reveals strategy early';
        tag = 'SAVE FOR LATER';
      } else if (intel.draftPriority === 'counter') {
        phaseScore -= 10;
        reason = 'Counter pick — more valuable after seeing enemy picks';
        tag = 'COUNTER';
      }
    } else if (phaseInfo.isLastPick) {
      // P5: Prioritize hard counters
      if (intel.draftPriority === 'last-pick') {
        phaseScore += 30;
        reason = 'Last-pick specialist — devastating counter';
        tag = 'LAST PICK';
      } else if (intel.draftPriority === 'counter') {
        phaseScore += 20;
        reason = 'Strong counter pick for this phase';
        tag = 'COUNTER';
      } else if (intel.draftPriority === 'flex') {
        phaseScore -= 5;
        reason = 'Flex value wasted on last pick — role is already known';
        tag = 'FLEX';
      }
    } else {
      // P3-P4: Counter picks and role fills
      if (intel.draftPriority === 'counter') {
        phaseScore += 20;
        reason = 'Good counter timing — enemy has revealed their core';
        tag = 'COUNTER';
      } else if (intel.draftPriority === 'flex') {
        phaseScore += 10;
        reason = 'Still has flex value at this stage';
        tag = 'FLEX';
      }
    }

    // Role-fill bonus: does this hero fill a missing role?
    const teamRoles = new Set(teamHeroes.flatMap((h) => h.roles));
    const fillsNewRole = intel.flexRoles.some((r) => !teamRoles.has(r));
    if (fillsNewRole) phaseScore += 10;

    // Damage balance bonus
    const teamDamage = teamHeroes.map((h) => getHeroIntel(h.slug)?.damageType ?? 'Physical');
    const physCount = teamDamage.filter((d) => d === 'Physical').length;
    const magCount = teamDamage.filter((d) => d === 'Magic').length;
    if (physCount > magCount && intel.damageType === 'Magic') phaseScore += 8;
    if (magCount > physCount && intel.damageType === 'Physical') phaseScore += 8;

    results.push({ hero, intel, phaseScore, reason, tag });
  }

  return results
    .filter((r) => r.phaseScore > 40)
    .sort((a, b) => b.phaseScore - a.phaseScore)
    .slice(0, limit);
}

// ── PROGRESSIVE ARCHETYPE DETECTION ──

export interface ArchetypeMatch {
  name: string;
  tag: string;
  progress: number;      // 0-100 how close to completing
  matchedRoles: string[];
  missingRoles: string[];
  description: string;
}

const ARCHETYPES = [
  {
    name: 'UBE Strat',
    tag: 'Sustain',
    roles: ['Tank Jungler', 'Healer', 'Healer/Support', 'Tank', 'DPS'],
    detect: (heroes: Hero[]) => {
      const hasHealer = heroes.some((h) => ['estes', 'floryn', 'rafaela', 'angela'].includes(h.slug));
      const hasTankJg = heroes.some((h) => ['akai', 'baxia', 'hylos', 'hilda', 'barats'].includes(h.slug));
      const hasTank = heroes.some((h) => h.roles.includes('Tank'));
      return { healer: hasHealer, tankJg: hasTankJg, tank: hasTank };
    },
    score: (heroes: Hero[]) => {
      let s = 0;
      const healers = heroes.filter((h) => ['estes', 'floryn', 'rafaela', 'angela'].includes(h.slug));
      const tankJgs = heroes.filter((h) => ['akai', 'baxia', 'hylos', 'hilda', 'barats'].includes(h.slug));
      s += Math.min(healers.length, 2) * 30;
      s += tankJgs.length > 0 ? 25 : 0;
      s += heroes.some((h) => h.roles.includes('Tank')) ? 15 : 0;
      return Math.min(s, 100);
    },
  },
  {
    name: 'Pickoff Comp',
    tag: 'Burst',
    roles: ['Assassin Core', 'Setup Tank', 'Burst Mage', 'Support', 'Flex'],
    detect: (heroes: Hero[]) => ({
      assassin: heroes.some((h) => h.roles.includes('Assassin')),
      setup: heroes.some((h) => ['atlas', 'tigreal', 'khufra', 'franco'].includes(h.slug)),
    }),
    score: (heroes: Hero[]) => {
      let s = 0;
      s += heroes.some((h) => h.roles.includes('Assassin')) ? 35 : 0;
      s += heroes.some((h) => ['atlas', 'tigreal', 'khufra', 'franco'].includes(h.slug)) ? 30 : 0;
      s += heroes.some((h) => h.roles.includes('Mage')) ? 20 : 0;
      s += heroes.some((h) => h.roles.includes('Support')) ? 15 : 0;
      return Math.min(s, 100);
    },
  },
  {
    name: 'Protect the Carry',
    tag: 'Late Game',
    roles: ['Hyper Carry MM', 'Support', 'Tank/Peeler', 'Off-Tank', 'Mid Mage'],
    detect: (heroes: Hero[]) => ({
      carry: heroes.some((h) => h.roles.includes('Marksman')),
      support: heroes.some((h) => h.roles.includes('Support')),
      tank: heroes.some((h) => h.roles.includes('Tank')),
    }),
    score: (heroes: Hero[]) => {
      let s = 0;
      s += heroes.some((h) => h.roles.includes('Marksman')) ? 30 : 0;
      s += heroes.filter((h) => h.roles.includes('Support')).length > 0 ? 25 : 0;
      s += heroes.filter((h) => h.roles.includes('Tank')).length > 0 ? 20 : 0;
      s += heroes.filter((h) => h.roles.includes('Tank')).length > 1 ? 15 : 0;
      return Math.min(s, 100);
    },
  },
  {
    name: 'Full Dive',
    tag: 'Aggressive',
    roles: ['Engage Tank', 'Dive Fighter', 'Burst Jungler', 'Mid Mage', 'Follow-up'],
    detect: (heroes: Hero[]) => ({
      engage: heroes.some((h) => ['atlas', 'tigreal', 'khufra', 'johnson', 'gatotkaca'].includes(h.slug)),
      diver: heroes.some((h) => h.roles.includes('Fighter') || h.roles.includes('Assassin')),
    }),
    score: (heroes: Hero[]) => {
      let s = 0;
      s += heroes.some((h) => ['atlas', 'tigreal', 'khufra', 'johnson', 'gatotkaca'].includes(h.slug)) ? 30 : 0;
      s += heroes.filter((h) => h.roles.includes('Fighter')).length > 0 ? 20 : 0;
      s += heroes.filter((h) => h.roles.includes('Assassin')).length > 0 ? 25 : 0;
      s += heroes.some((h) => h.roles.includes('Mage')) ? 15 : 0;
      return Math.min(s, 100);
    },
  },
  {
    name: 'Wombo Combo',
    tag: 'Teamfight',
    roles: ['AoE Engage', 'AoE Mage', 'AoE Fighter', 'Follow-up', 'Support'],
    detect: (heroes: Hero[]) => ({
      aoeEngage: heroes.some((h) => ['atlas', 'tigreal', 'gatotkaca'].includes(h.slug)),
      aoeMage: heroes.some((h) => ['yve', 'vale', 'pharsa', 'kadita', 'cecilion'].includes(h.slug)),
    }),
    score: (heroes: Hero[]) => {
      let s = 0;
      s += heroes.some((h) => ['atlas', 'tigreal', 'gatotkaca'].includes(h.slug)) ? 35 : 0;
      s += heroes.some((h) => ['yve', 'vale', 'pharsa', 'kadita', 'cecilion'].includes(h.slug)) ? 30 : 0;
      s += heroes.some((h) => h.roles.includes('Fighter')) ? 15 : 0;
      s += heroes.some((h) => h.roles.includes('Support')) ? 15 : 0;
      return Math.min(s, 100);
    },
  },
];

/** Detect which archetypes are forming based on current picks */
export function detectFormingArchetypes(teamHeroes: Hero[]): ArchetypeMatch[] {
  if (teamHeroes.length === 0) return [];

  return ARCHETYPES
    .map((arch) => {
      const progress = arch.score(teamHeroes);
      if (progress < 20) return null;

      const matchedRoles: string[] = [];
      const missingRoles: string[] = [];
      const detected = arch.detect(teamHeroes);
      for (const [key, val] of Object.entries(detected)) {
        if (val) matchedRoles.push(key);
        else missingRoles.push(key);
      }

      return {
        name: arch.name,
        tag: arch.tag,
        progress,
        matchedRoles,
        missingRoles,
        description: progress >= 60
          ? `${arch.name} forming — ${missingRoles.length > 0 ? `need ${missingRoles.join(', ')}` : 'nearly complete'}`
          : `Early signs of ${arch.name}`,
      };
    })
    .filter((a): a is ArchetypeMatch => a !== null)
    .sort((a, b) => b.progress - a.progress);
}

// ── RESPONSE BANS (Ban Phase 2) ──

export interface ResponseBanSuggestion {
  hero: Hero;
  reason: string;
  priority: 'high' | 'medium';
  countersSlug: string; // which enemy hero this counters
}

/** Suggest response bans based on enemy's revealed picks */
export function getResponseBans(
  enemyPicks: Hero[],
  allHeroes: Hero[],
  usedSlugs: Set<string>,
  limit = 3,
): ResponseBanSuggestion[] {
  if (enemyPicks.length === 0) return [];

  const suggestions: ResponseBanSuggestion[] = [];

  // For each enemy hero, find heroes that synergize with them that we should ban
  const enemyRoles = new Set(enemyPicks.flatMap((h) => h.roles));
  const enemyLanes = new Set(
    enemyPicks.map((h) => getHeroIntel(h.slug)?.laneAssignment ?? []).flat()
  );

  for (const hero of allHeroes) {
    if (usedSlugs.has(hero.slug)) continue;
    const intel = getHeroIntel(hero.slug);
    if (!intel) continue;

    // Ban supports/healers if enemy is building sustain comp
    const enemyHealers = enemyPicks.filter((h) =>
      ['estes', 'floryn', 'rafaela', 'angela'].includes(h.slug)
    );
    if (enemyHealers.length > 0 && ['estes', 'floryn', 'rafaela', 'angela'].includes(hero.slug)) {
      suggestions.push({
        hero,
        reason: `Ban to break enemy sustain comp — they already have ${enemyHealers[0].name}`,
        priority: 'high',
        countersSlug: enemyHealers[0].slug,
      });
      continue;
    }

    // Ban heroes that fill enemy's missing roles
    const missingLanes = ['EXP', 'MID', 'GOLD', 'JG', 'ROAM'].filter((l) => !enemyLanes.has(l));
    const fillsEnemyGap = intel.laneAssignment.some((l) => missingLanes.includes(l));
    if (fillsEnemyGap && intel.draftPriority === 'first-pick') {
      suggestions.push({
        hero,
        reason: `Contested hero that fills enemy's open ${intel.laneAssignment.filter((l) => missingLanes.includes(l)).join('/')} lane`,
        priority: 'high',
        countersSlug: '',
      });
      continue;
    }

    // Ban hard counters to YOUR team's likely picks
    if (intel.draftPriority === 'counter' && enemyRoles.has('Assassin') && hero.roles.includes('Tank')) {
      suggestions.push({
        hero,
        reason: `Strong tank option for enemy's assassin comp — deny them`,
        priority: 'medium',
        countersSlug: '',
      });
    }
  }

  return suggestions
    .sort((a, b) => (a.priority === 'high' ? 0 : 1) - (b.priority === 'high' ? 0 : 1))
    .slice(0, limit);
}

// ── LANE MATCHUP BOARD ──

export interface LaneMatchup {
  lane: string;
  yourHero: Hero | null;
  enemyHero: Hero | null;
  advantage: 'advantage' | 'even' | 'disadvantage' | 'unknown';
  reason: string;
}

/** Build lane matchup assignments */
export function buildLaneMatchups(
  bluePicks: Hero[],
  redPicks: Hero[],
): LaneMatchup[] {
  const lanes = ['EXP', 'MID', 'GOLD', 'JG', 'ROAM'];
  const matchups: LaneMatchup[] = [];

  // Assign heroes to lanes based on intel
  const assignToLane = (heroes: Hero[]): Map<string, Hero> => {
    const assigned = new Map<string, Hero>();
    const unassigned = [...heroes];

    // First pass: heroes with only one lane assignment
    for (const hero of [...unassigned]) {
      const intel = getHeroIntel(hero.slug);
      if (!intel) continue;
      if (intel.laneAssignment.length === 1 && !assigned.has(intel.laneAssignment[0])) {
        assigned.set(intel.laneAssignment[0], hero);
        unassigned.splice(unassigned.indexOf(hero), 1);
      }
    }

    // Second pass: fill remaining lanes
    for (const hero of [...unassigned]) {
      const intel = getHeroIntel(hero.slug);
      if (!intel) continue;
      for (const lane of intel.laneAssignment) {
        if (!assigned.has(lane)) {
          assigned.set(lane, hero);
          unassigned.splice(unassigned.indexOf(hero), 1);
          break;
        }
      }
    }

    return assigned;
  };

  const blueAssigned = assignToLane(bluePicks);
  const redAssigned = assignToLane(redPicks);

  for (const lane of lanes) {
    const yours = blueAssigned.get(lane) ?? null;
    const theirs = redAssigned.get(lane) ?? null;

    let advantage: LaneMatchup['advantage'] = 'unknown';
    let reason = '';

    if (yours && theirs) {
      const yourIntel = getHeroIntel(yours.slug);
      const theirIntel = getHeroIntel(theirs.slug);

      if (yourIntel && theirIntel) {
        // Compare power spikes for lane phase
        if (yourIntel.powerSpike === 'Early' && theirIntel.powerSpike === 'Late') {
          advantage = 'advantage';
          reason = `${yours.name} dominates early — pressure before ${theirs.name} scales`;
        } else if (yourIntel.powerSpike === 'Late' && theirIntel.powerSpike === 'Early') {
          advantage = 'disadvantage';
          reason = `${theirs.name} has early pressure — play safe until ${yours.name} scales`;
        } else {
          advantage = 'even';
          reason = `Similar power timing — skill matchup`;
        }
      } else {
        advantage = 'unknown';
        reason = 'No matchup data available';
      }
    } else if (yours && !theirs) {
      advantage = 'advantage';
      reason = 'Enemy lane not yet assigned';
    } else if (!yours && theirs) {
      advantage = 'disadvantage';
      reason = 'Your lane not yet assigned';
    }

    matchups.push({ lane, yourHero: yours, enemyHero: theirs, advantage, reason });
  }

  return matchups.filter((m) => m.yourHero || m.enemyHero);
}
