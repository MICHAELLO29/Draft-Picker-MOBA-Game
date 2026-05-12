import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Shield, AlertTriangle, Zap, Info, Swords, Trophy, Compass, Target } from 'lucide-react';

type PanelTab = 'intel' | 'strategy' | 'counters';
import { useCounters, useHeroes, useProMeta } from '../../hooks/useApi';
import { useDraftStore } from '../../store/draftStore';
import { detectSynergies, detectCompWarnings, detectThreats } from '../../utils/synergyRules';
import { getTopStrategies } from '../../utils/strategyEngine';
import { getDraftPhase, checkDamageBalance, analyzeTeamPowerSpike, detectFlexPicks, detectFormingArchetypes, getResponseBans, buildLaneMatchups } from '../../utils/draftIntelEngine';
import type { CounterPick, Hero } from '../../types';
import { useHeroImage } from '../../utils/imageUtils';
import { fetchCounters } from '../../services/api';

/** Reusable small hero portrait with image — used in all suggestion panels */
function MiniHeroPortrait({ heroName, badge, badgeColor }: { heroName: string; badge?: string; badgeColor?: string }) {
  const imageUrl = useHeroImage(heroName);
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[52px]">
      <div className="relative w-9 h-9 rounded-md overflow-hidden bg-navy-700 border border-steel-700/40">
        {imageUrl ? (
          <img src={imageUrl} alt={heroName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[0.6rem] font-bold text-gold-500">
            {heroName.charAt(0)}
          </div>
        )}
        {badge && (
          <div className={`absolute bottom-0 left-0 right-0 text-center text-[0.4rem] font-bold py-px ${badgeColor || 'bg-navy-900/80 text-steel-300'}`}>
            {badge}
          </div>
        )}
      </div>
      <span className="text-[0.5rem] text-steel-300 text-center leading-tight max-w-[56px] truncate">
        {heroName}
      </span>
    </div>
  );
}

/** Expandable role slot — shows 3 portraits, click +N to reveal all */
function ExpandableRoleSlot({ sf }: { sf: { role: string; available: string[]; required: boolean } }) {
  const [expanded, setExpanded] = useState(false);
  const visibleCount = expanded ? sf.available.length : 3;
  const hiddenCount = sf.available.length - 3;

  return (
    <div>
      <span className={`text-[0.55rem] px-1.5 py-0.5 rounded font-semibold inline-block mb-1.5 ${
        sf.required ? 'bg-gold-500/20 text-gold-400' : 'bg-steel-700/30 text-steel-400'
      }`}>
        {sf.role}
      </span>
      <div className="flex gap-1.5 flex-wrap items-center">
        {sf.available.slice(0, visibleCount).map((slug) => (
          <MiniHeroPortrait
            key={slug}
            heroName={slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          />
        ))}
        {hiddenCount > 0 && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="w-10 h-10 rounded-md bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-[0.65rem] text-gold-400 font-bold hover:bg-gold-500/20 hover:border-gold-500/50 transition-all cursor-pointer"
            title={`Show ${hiddenCount} more heroes`}
          >
            +{hiddenCount}
          </button>
        )}
        {expanded && hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(false)}
            className="w-10 h-10 rounded-md bg-steel-700/20 border border-steel-700/30 flex items-center justify-center text-[0.55rem] text-steel-400 hover:text-steel-300 transition-all cursor-pointer"
            title="Show less"
          >
            ▲
          </button>
        )}
      </div>
    </div>
  );
}

/** Counter pick card */
function CounterCard({ counter }: { counter: CounterPick }) {
  const [imgError, setImgError] = useState(false);
  const heroImageUrl = useHeroImage(counter.heroName);
  const wrClass = counter.matchupWinRate >= 52 ? 'wr-high' : counter.matchupWinRate >= 48 ? 'wr-mid' : 'wr-low';

  return (
    <div className="glass-panel p-3 flex gap-3 items-start animate-counter-reveal">
      <div className="relative w-10 h-10 min-w-[40px] rounded overflow-hidden bg-navy-600">
        {heroImageUrl && !imgError ? (
          <img
            src={heroImageUrl}
            alt={counter.heroName}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gold-500">
            {counter.heroName.charAt(0)}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{counter.heroName}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-xs font-bold ${wrClass}`}>
            {counter.matchupWinRate.toFixed(1)}%
          </span>
          <span className="text-[0.6rem] text-steel-500">
            ({counter.winRateDelta > 0 ? '+' : ''}{counter.winRateDelta.toFixed(1)}%)
          </span>
        </div>
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {counter.phaseStrengths.map((phase) => (
            <span key={phase} className={`phase-tag phase-${phase.toLowerCase()}`}>
              {phase}
            </span>
          ))}
        </div>
        {counter.description && (
          <p className="text-xs text-steel-400 mt-2 leading-relaxed">
            {counter.description}
          </p>
        )}
      </div>
    </div>
  );
}

/** Small meta hero card for suggested bans */
function MetaBanCard({ hero }: { hero: Hero }) {
  const heroImageUrl = useHeroImage(hero.name);

  return (
    <div className="glass-panel p-3 flex gap-3 items-center animate-fade-in">
      <div className="relative w-10 h-10 min-w-[40px] rounded overflow-hidden bg-navy-600">
        {heroImageUrl ? (
          <img src={heroImageUrl} alt={hero.name} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gold-500">
            {hero.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{hero.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {hero.tier && (
            <span className={`text-[0.6rem] font-bold ${hero.tier === 'S' || hero.tier === 'S+' ? 'text-gold-400' : 'text-steel-400'}`}>
              {hero.tier}-Tier
            </span>
          )}
          {hero.winRate !== undefined && (
            <span className={`text-[0.6rem] font-bold ${hero.winRate >= 52 ? 'wr-high' : hero.winRate >= 48 ? 'wr-mid' : 'wr-low'}`}>
              {hero.winRate.toFixed(1)}% WR
            </span>
          )}
          {hero.banRate !== undefined && hero.banRate > 5 && (
            <span className="text-[0.6rem] text-red-400 font-bold">
              {hero.banRate.toFixed(1)}% BR
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Main counter panel — Implements ML1.md logic:
 *
 * - Banned heroes are IMMEDIATELY removed from all calculations
 * - Panel anchors on ENEMY PICKED heroes, never banned heroes
 * - When no enemy picks exist, show meta-based suggestions
 * - All suggestions only reference heroes still AVAILABLE in the pool
 */
export default function CounterPanel() {
  const slots = useDraftStore((s) => s.slots);
  const getCurrentStep = useDraftStore((s) => s.getCurrentStep);

  // Get clicked hero for analysis (from DraftSlot clicks)
  const analysisHero = useDraftStore((s) => s.analysisHero);
  const analysisTeam = useDraftStore((s) => s.analysisTeam);

  // Get all hero data for meta suggestions
  const { data: heroesData } = useHeroes();
  const allHeroes = heroesData?.data ?? [];

  // Get MPL PH pro tournament meta data
  const { data: proMetaData } = useProMeta();
  const proMeta = proMetaData?.data ?? null;

  // Derive used slugs (both picked AND banned heroes)
  const usedSlugs = useMemo(() => {
    const slugs = new Set<string>();
    slots.filter((s) => s.hero).forEach((s) => slugs.add(s.hero!.slug));
    return slugs;
  }, [slots]);

  // Extract picks by team (only PICK slots, not ban slots)
  const redPicks = useMemo(() =>
    slots.filter((s) => s.team === 'red' && s.type === 'pick' && s.hero).map((s) => s.hero!),
    [slots]
  );

  const bluePicks = useMemo(() =>
    slots.filter((s) => s.team === 'blue' && s.type === 'pick' && s.hero).map((s) => s.hero!),
    [slots]
  );

  // Determine the current draft phase
  const currentStep = getCurrentStep();
  const isInBanPhase = currentStep?.type === 'ban';

  // ═══════════════════════════════════════════════════════════════
  // CORE LOGIC: Click-based threat analysis
  // ═══════════════════════════════════════════════════════════════
  // analysisHero is set when user clicks a pick slot on the board.
  // analysisTeam tells which team owns the hero (blue/red).
  // Shows counter analysis for that specific clicked hero.

  // Fetch counters for the clicked analysis hero
  const { data: counterData, isLoading: countersLoading } = useCounters(analysisHero?.slug ?? null);

  // Filter counter suggestions: only show heroes still available
  const strongCounters = useMemo(() => {
    if (!counterData?.data) return [];
    return (counterData.data.strongAgainst ?? []).filter((c) => !usedSlugs.has(c.heroSlug));
  }, [counterData, usedSlugs]);



  // Meta-based ban suggestions — PRIORITIZE PRO DATA
  // Cross-reference MPL pro bans/picks with ladder data for non-biased suggestions
  const metaBanSuggestions = useMemo(() => {
    if (analysisHero) return []; // Don't show ban suggestions while analyzing a hero

    // Build a score map: pro ban count + pro pick count + ladder ban rate
    const heroScoreMap = new Map<string, { hero: Hero; proScore: number; proBanCount?: number; proPickCount?: number; proWinRate?: number; source: string }>();

    // Add pro ban data (highest priority — these are what pros ban)
    if (proMeta) {
      for (const entry of proMeta.topBans) {
        const hero = allHeroes.find((h) => h.slug === entry.heroSlug || h.name.toLowerCase() === entry.heroName.toLowerCase());
        if (hero && !usedSlugs.has(hero.slug)) {
          heroScoreMap.set(hero.slug, {
            hero,
            proScore: (entry.banCount ?? 0) * 2, // Pro bans weighted heavily
            proBanCount: entry.banCount,
            source: 'MPL Pro Ban',
          });
        }
      }
      // Add pro pick data (if pros pick it a lot, it's strong — consider banning)
      for (const entry of proMeta.topPicks) {
        const hero = allHeroes.find((h) => h.slug === entry.heroSlug || h.name.toLowerCase() === entry.heroName.toLowerCase());
        if (hero && !usedSlugs.has(hero.slug)) {
          const existing = heroScoreMap.get(hero.slug);
          if (existing) {
            existing.proScore += (entry.pickCount ?? 0);
            existing.proPickCount = entry.pickCount;
          } else {
            heroScoreMap.set(hero.slug, {
              hero,
              proScore: entry.pickCount ?? 0,
              proPickCount: entry.pickCount,
              source: 'MPL Pro Pick',
            });
          }
        }
      }
      // Add pro win rate data
      for (const entry of proMeta.topWinRates) {
        const hero = allHeroes.find((h) => h.slug === entry.heroSlug || h.name.toLowerCase() === entry.heroName.toLowerCase());
        if (hero && !usedSlugs.has(hero.slug)) {
          const existing = heroScoreMap.get(hero.slug);
          if (existing) {
            existing.proScore += ((entry.proWinRate ?? 50) - 50) * 2;
            existing.proWinRate = entry.proWinRate;
          } else {
            heroScoreMap.set(hero.slug, {
              hero,
              proScore: ((entry.proWinRate ?? 50) - 50) * 2,
              proWinRate: entry.proWinRate,
              source: 'MPL Pro WR',
            });
          }
        }
      }
    }

    // Fallback: add ladder S-tier heroes not already in pro data
    for (const h of allHeroes) {
      if (usedSlugs.has(h.slug)) continue;
      if (heroScoreMap.has(h.slug)) continue;
      if (h.tier === 'S' || h.tier === 'S+' || (h.banRate ?? 0) > 15) {
        heroScoreMap.set(h.slug, {
          hero: h,
          proScore: (h.banRate ?? 0) * 0.5,
          source: 'Ladder Meta',
        });
      }
    }

    return Array.from(heroScoreMap.values())
      .sort((a, b) => b.proScore - a.proScore)
      .slice(0, 5);
  }, [allHeroes, usedSlugs, analysisHero, proMeta]);

  // Meta-based pick suggestions — PRIORITIZE PRO DATA
  // Show heroes that pros pick most + highest win rate, still available
  const metaPickSuggestions = useMemo(() => {
    const heroScoreMap = new Map<string, { hero: Hero; proScore: number; proPickCount?: number; proWinRate?: number; source: string }>();

    if (proMeta) {
      // Pro picks are top priority for pick recommendations
      for (const entry of proMeta.topPicks) {
        const hero = allHeroes.find((h) => h.slug === entry.heroSlug || h.name.toLowerCase() === entry.heroName.toLowerCase());
        if (hero && !usedSlugs.has(hero.slug)) {
          heroScoreMap.set(hero.slug, {
            hero,
            proScore: (entry.pickCount ?? 0) * 2,
            proPickCount: entry.pickCount,
            source: 'MPL Pro Pick',
          });
        }
      }
      // Pro win rate heroes
      for (const entry of proMeta.topWinRates) {
        const hero = allHeroes.find((h) => h.slug === entry.heroSlug || h.name.toLowerCase() === entry.heroName.toLowerCase());
        if (hero && !usedSlugs.has(hero.slug)) {
          const existing = heroScoreMap.get(hero.slug);
          if (existing) {
            existing.proScore += ((entry.proWinRate ?? 50) - 50) * 3;
            existing.proWinRate = entry.proWinRate;
          } else {
            heroScoreMap.set(hero.slug, {
              hero,
              proScore: ((entry.proWinRate ?? 50) - 50) * 3,
              proWinRate: entry.proWinRate,
              source: 'MPL Pro WR',
            });
          }
        }
      }
    }

    // Fill with ladder high WR heroes
    for (const h of allHeroes) {
      if (usedSlugs.has(h.slug)) continue;
      if (heroScoreMap.has(h.slug)) continue;
      if ((h.winRate ?? 0) > 50) {
        heroScoreMap.set(h.slug, {
          hero: h,
          proScore: (h.winRate ?? 50) - 50,
          source: 'Ladder Meta',
        });
      }
    }

    return Array.from(heroScoreMap.values())
      .sort((a, b) => b.proScore - a.proScore)
      .slice(0, 5);
  }, [allHeroes, usedSlugs, proMeta]);

  // ═══════════════════════════════════════════════════════════════
  // BAN ADVANTAGE: Fetch counter data for ALL banned heroes
  // ═══════════════════════════════════════════════════════════════
  const bannedHeroes = useMemo(() =>
    slots.filter((s) => s.type === 'ban' && s.hero).map((s) => s.hero!),
    [slots]
  );

  const bannedSlugs = useMemo(() =>
    bannedHeroes.map((h) => h.slug),
    [bannedHeroes]
  );

  // Fetch counter data for ALL banned heroes in parallel
  const banCounterQueries = useQueries({
    queries: bannedSlugs.map((slug) => ({
      queryKey: ['counters', slug],
      queryFn: () => fetchCounters(slug),
      enabled: !!slug,
      staleTime: 6 * 60 * 60 * 1000,
      retry: 1,
    })),
  });

  // Show ALL available pro meta picks when bans exist.
  // Heroes with direct counter advantage from bans get a bonus score.
  // This ensures the section always shows meaningful pro recommendations.
  const advantagedByBans = useMemo(() => {
    if (bannedHeroes.length === 0) return [];

    // Build freed heroes map from counter data (for bonus scoring)
    const freedHeroes = new Map<string, string[]>();
    banCounterQueries.forEach((query, idx) => {
      if (!query.data?.data) return;
      const bannedName = bannedHeroes[idx]?.name ?? 'Unknown';
      for (const counter of (query.data.data.weakAgainst ?? [])) {
        if (usedSlugs.has(counter.heroSlug)) continue;
        const existing = freedHeroes.get(counter.heroSlug);
        if (existing) existing.push(bannedName);
        else freedHeroes.set(counter.heroSlug, [bannedName]);
      }
    });

    // Build ALL available pro heroes
    type AdvantagedEntry = { hero: Hero; freedFrom: string[]; proPickCount?: number; proBanCount?: number; proWinRate?: number; score: number; isPro: true };
    const results: AdvantagedEntry[] = [];

    if (!proMeta) return [];

    const proHeroInfo = new Map<string, { pickCount?: number; banCount?: number; proWinRate?: number }>();
    for (const entry of proMeta.topPicks) {
      const hero = allHeroes.find((h) => h.slug === entry.heroSlug || h.name.toLowerCase() === entry.heroName.toLowerCase());
      if (hero && !usedSlugs.has(hero.slug)) {
        proHeroInfo.set(hero.slug, { pickCount: entry.pickCount });
      }
    }
    for (const entry of proMeta.topBans) {
      const hero = allHeroes.find((h) => h.slug === entry.heroSlug || h.name.toLowerCase() === entry.heroName.toLowerCase());
      if (hero && !usedSlugs.has(hero.slug)) {
        const e = proHeroInfo.get(hero.slug);
        if (e) e.banCount = entry.banCount;
        else proHeroInfo.set(hero.slug, { banCount: entry.banCount });
      }
    }
    for (const entry of proMeta.topWinRates) {
      const hero = allHeroes.find((h) => h.slug === entry.heroSlug || h.name.toLowerCase() === entry.heroName.toLowerCase());
      if (hero && !usedSlugs.has(hero.slug)) {
        const e = proHeroInfo.get(hero.slug);
        if (e) e.proWinRate = entry.proWinRate;
        else proHeroInfo.set(hero.slug, { proWinRate: entry.proWinRate });
      }
    }

    for (const [slug, proInfo] of proHeroInfo) {
      const hero = allHeroes.find((h) => h.slug === slug);
      if (!hero) continue;

      const freedFrom = freedHeroes.get(slug) ?? [];
      // Score: pro pick count + pro ban count + bonus if directly freed
      const score =
        (proInfo.pickCount ?? 0) * 3 +
        (proInfo.banCount ?? 0) * 2 +
        freedFrom.length * 15;

      results.push({
        hero,
        freedFrom,
        proPickCount: proInfo.pickCount,
        proBanCount: proInfo.banCount,
        proWinRate: proInfo.proWinRate,
        score,
        isPro: true,
      });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 5);
  }, [banCounterQueries, bannedHeroes, usedSlugs, proMeta, allHeroes]);

  // Pro synergy picks — pro meta heroes that complement the CURRENT TEAM's picks
  // Uses currentStep.team to determine which team is picking
  const currentTeam = currentStep?.team ?? 'blue';
  const currentTeamPicks = currentTeam === 'blue' ? bluePicks : redPicks;

  const proSynergyPicks = useMemo(() => {
    if (currentTeamPicks.length === 0) return [];

    // Analyze current team roles
    const teamRoles = new Set(currentTeamPicks.flatMap((h) => h.roles));
    const needsRoles: string[] = [];
    if (!teamRoles.has('Tank')) needsRoles.push('Tank');
    if (!teamRoles.has('Mage')) needsRoles.push('Mage');
    if (!teamRoles.has('Marksman')) needsRoles.push('Marksman');
    if (!teamRoles.has('Assassin')) needsRoles.push('Assassin');
    if (!teamRoles.has('Fighter')) needsRoles.push('Fighter');
    if (!teamRoles.has('Support')) needsRoles.push('Support');

    // Build pro hero candidate pool
    type SynergyEntry = { hero: Hero; proPickCount?: number; proWinRate?: number; fillsRole: string; isPro: boolean; score: number };
    const results: SynergyEntry[] = [];

    if (proMeta) {
      // Combine all pro heroes
      const proHeroes = new Map<string, { pickCount?: number; proWinRate?: number }>();
      for (const entry of proMeta.topPicks) {
        const hero = allHeroes.find((h) => h.slug === entry.heroSlug || h.name.toLowerCase() === entry.heroName.toLowerCase());
        if (hero && !usedSlugs.has(hero.slug)) {
          proHeroes.set(hero.slug, { pickCount: entry.pickCount });
        }
      }
      for (const entry of proMeta.topWinRates) {
        const hero = allHeroes.find((h) => h.slug === entry.heroSlug || h.name.toLowerCase() === entry.heroName.toLowerCase());
        if (hero && !usedSlugs.has(hero.slug)) {
          const existing = proHeroes.get(hero.slug);
          if (existing) {
            existing.proWinRate = entry.proWinRate;
          } else {
            proHeroes.set(hero.slug, { proWinRate: entry.proWinRate });
          }
        }
      }

      // Score pro heroes by how well they fill team gaps
      for (const [slug, proInfo] of proHeroes) {
        const hero = allHeroes.find((h) => h.slug === slug);
        if (!hero) continue;

        // Check if this hero fills a needed role
        const filledRole = hero.roles.find((r) => needsRoles.includes(r));
        if (!filledRole && needsRoles.length > 0) continue; // Only show role-fillers when team has gaps

        const score =
          (proInfo.pickCount ?? 0) * 3 +
          (filledRole ? 20 : 0) +
          (needsRoles.length === 0 ? (proInfo.pickCount ?? 0) : 0); // If team is complete, just rank by pro picks

        results.push({
          hero,
          proPickCount: proInfo.pickCount,
          proWinRate: proInfo.proWinRate,
          fillsRole: filledRole ?? hero.roles[0] ?? 'Flex',
          isPro: true,
          score,
        });
      }
    }

    // If no pro data, fall back to available meta heroes that fill gaps
    if (results.length === 0 && needsRoles.length > 0) {
      for (const h of allHeroes) {
        if (usedSlugs.has(h.slug)) continue;
        const filledRole = h.roles.find((r) => needsRoles.includes(r));
        if (!filledRole) continue;
        if (h.tier === 'S' || h.tier === 'S+' || h.tier === 'A') {
          results.push({
            hero: h,
            fillsRole: filledRole,
            isPro: false,
            score: h.tier === 'S+' ? 15 : h.tier === 'S' ? 10 : 5,
          });
        }
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 3);
  }, [currentTeamPicks, allHeroes, usedSlugs, proMeta]);

  // Detect synergies for blue team
  const synergies = useMemo(() => detectSynergies(bluePicks), [bluePicks]);
  const warnings = useMemo(() => detectCompWarnings(bluePicks), [bluePicks]);
  const threats = useMemo(() => detectThreats(redPicks), [redPicks]);

  // ═══════════════════════════════════════════════════════════════
  // STRATEGY RECOMMENDATIONS: Suggest team comps based on bans
  // ═══════════════════════════════════════════════════════════════
  const bannedSlugSet = useMemo(() => new Set(bannedSlugs), [bannedSlugs]);

  const pickedSlugSet = useMemo(() => {
    const slugs = new Set<string>();
    slots.filter((s) => s.type === 'pick' && s.hero).forEach((s) => slugs.add(s.hero!.slug));
    return slugs;
  }, [slots]);

  const strategyRecommendations = useMemo(
    () => getTopStrategies(bannedSlugSet, pickedSlugSet, allHeroes, 3),
    [bannedSlugSet, pickedSlugSet, allHeroes]
  );

  // ═══════════════════════════════════════════════════════════════
  // DRAFT INTELLIGENCE: Phase awareness, damage balance, power spikes
  // ═══════════════════════════════════════════════════════════════
  const draftOrder = useDraftStore((s) => s.draftOrder);
  const currentStepIndex = useDraftStore((s) => s.currentStepIndex);

  const draftPhase = useMemo(
    () => getDraftPhase(currentStepIndex, draftOrder),
    [currentStepIndex, draftOrder]
  );

  const damageWarnings = useMemo(
    () => checkDamageBalance(bluePicks),
    [bluePicks]
  );

  const powerSpike = useMemo(
    () => analyzeTeamPowerSpike(bluePicks),
    [bluePicks]
  );

  const flexPicks = useMemo(
    () => detectFlexPicks(allHeroes.filter((h) => !usedSlugs.has(h.slug))),
    [allHeroes, usedSlugs]
  );

  const formingArchetypes = useMemo(
    () => detectFormingArchetypes(bluePicks),
    [bluePicks]
  );

  const redFormingArchetypes = useMemo(
    () => detectFormingArchetypes(redPicks),
    [redPicks]
  );

  const responseBans = useMemo(
    () => getResponseBans(redPicks, allHeroes, usedSlugs),
    [redPicks, allHeroes, usedSlugs]
  );

  const laneMatchups = useMemo(
    () => buildLaneMatchups(bluePicks, redPicks),
    [bluePicks, redPicks]
  );

  const isStale = counterData?.meta?.isStale ?? false;

  // ═══════════════════════════════════════════════════════════════
  // DETERMINE PANEL STATE (per ML1.md state machine)
  // ═══════════════════════════════════════════════════════════════
  type PanelState = 'IDLE' | 'META_BANS' | 'ENEMY_PICKED' | 'PICK_RECOMMENDATIONS';

  const hasAnyHeroes = usedSlugs.size > 0;

  let panelState: PanelState = 'IDLE';
  if (analysisHero) {
    // User clicked a hero on the board — show threat analysis for that hero
    panelState = 'ENEMY_PICKED';
  } else if (!hasAnyHeroes && !isInBanPhase) {
    panelState = 'IDLE';
  } else if (!isInBanPhase) {
    panelState = 'PICK_RECOMMENDATIONS';
  } else {
    panelState = 'META_BANS';
  }

  // Panel title based on state
  const analysisLabel = analysisHero
    ? `${analysisHero.name} (${analysisTeam === 'blue' ? 'Blue' : 'Red'} Team)`
    : '';
  const panelTitle = panelState === 'META_BANS'
    ? 'Ban Suggestions'
    : panelState === 'ENEMY_PICKED'
      ? `Threat Analysis — ${analysisLabel}`
      : panelState === 'PICK_RECOMMENDATIONS'
        ? 'Pick Recommendations'
        : 'Draft Intel';

  const panelIcon = panelState === 'META_BANS'
    ? 'text-red-400'
    : panelState === 'ENEMY_PICKED'
      ? 'text-orange-400'
      : 'text-gold-500';

  const [panelTab, setPanelTab] = useState<PanelTab>('intel');

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto" id="counter-panel">

      {/* ══════ TAB BAR ══════ */}
      <div className="flex border-b border-steel-700/30 mb-1 shrink-0">
        {([
          { id: 'intel' as PanelTab, label: 'INTEL', icon: Shield },
          { id: 'strategy' as PanelTab, label: 'STRATEGY', icon: Compass },
          { id: 'counters' as PanelTab, label: 'COUNTERS', icon: Target },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setPanelTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-bold tracking-wide transition-all border-b-2 min-h-[36px] overflow-visible ${
              panelTab === id
                ? 'border-gold-500 text-gold-400'
                : 'border-transparent text-steel-500 hover:text-steel-300'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {/* ══════ INTEL TAB: Primary panel ══════ */}
      {panelTab === 'intel' && (
      <div className="glass-panel p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className={`w-4 h-4 ${panelIcon}`} />
            <h3 className="text-sm font-bold">{panelTitle}</h3>
          </div>
          {isStale && (
            <span className="stale-indicator">
              <Info className="w-3 h-3" />
              Stale
            </span>
          )}
        </div>

        {/* ─── STATE: IDLE ─── */}
        {panelState === 'IDLE' && (
          <p className="text-xs text-steel-500 py-4 text-center">
            Pick or ban a hero to begin draft analysis
          </p>
        )}

        {/* ─── STATE: META_BANS (no enemy picks yet) ─── */}
        {panelState === 'META_BANS' && (
          <div className="space-y-2">
            <p className="text-[0.65rem] text-steel-500">
              {proMeta ? 'MPL Pro + Ladder meta threats — consider banning:' : 'Top meta threats — consider banning these:'}
            </p>
            {metaBanSuggestions.length > 0 ? (
              metaBanSuggestions.map((entry) => (
                <div key={entry.hero.slug}>
                  <MetaBanCard hero={entry.hero} />
                  <div className="flex items-center gap-2 mt-0.5 ml-[52px]">
                    {entry.source.startsWith('MPL') && (
                      <span className="text-[0.55rem] bg-gold-500/20 text-gold-400 px-1.5 py-0.5 rounded font-bold">
                        MPL PRO
                      </span>
                    )}
                    {entry.proBanCount && (
                      <span className="text-[0.55rem] text-red-400/70">
                        {entry.proBanCount}× banned
                      </span>
                    )}
                    {entry.proPickCount && (
                      <span className="text-[0.55rem] text-blue-400/70">
                        {entry.proPickCount}× picked
                      </span>
                    )}
                    {entry.proWinRate && (
                      <span className="text-[0.55rem] text-green-400/70">
                        {entry.proWinRate.toFixed(1)}% pro WR
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col gap-2">
                {[1, 2].map((i) => (
                  <div key={i} className="glass-panel p-3 flex gap-3 items-start">
                    <div className="skeleton skeleton-circle" />
                    <div className="flex-1">
                      <div className="skeleton skeleton-bar" />
                      <div className="skeleton skeleton-bar-short" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── STATE: ENEMY_PICKED ─── */}
        {panelState === 'ENEMY_PICKED' && analysisHero && (
          <div className="flex flex-col gap-5">
            {/* Counter Picks vs selected hero */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Swords className="w-3.5 h-3.5 text-gold-500" />
                <p className="text-[0.65rem] text-steel-400 font-bold uppercase tracking-wider">
                  Counter Picks (Strong vs {analysisHero.name})
                </p>
              </div>
              {countersLoading ? (
                <div className="flex flex-col gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="glass-panel p-3 flex gap-3 items-start">
                      <div className="skeleton skeleton-circle" />
                      <div className="flex-1">
                        <div className="skeleton skeleton-bar" />
                        <div className="skeleton skeleton-bar-short" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : strongCounters.length > 0 ? (
                strongCounters.slice(0, 3).map((counter) => (
                  <CounterCard key={counter.heroSlug} counter={counter} />
                ))
              ) : (
                <p className="text-xs text-steel-500 py-2 text-center bg-navy-900/30 rounded-lg">
                  No counter data available
                </p>
              )}
            </div>

            {/* Duplicate removed — Pro Synergy Picks shown in dedicated panel below */}
          </div>
        )}

        {/* ─── STATE: PICK_RECOMMENDATIONS ─── */}
        {panelState === 'PICK_RECOMMENDATIONS' && (
          <div className="flex flex-col gap-5">
            {analysisHero ? (
              <div className="space-y-2">
                <p className="text-[0.65rem] text-steel-500">
                  Counter picks vs {analysisHero.name}:
                </p>
                {strongCounters.length > 0 ? (
                  strongCounters.slice(0, 5).map((counter) => (
                    <CounterCard key={counter.heroSlug} counter={counter} />
                  ))
                ) : (
                  <p className="text-xs text-steel-500 py-4 text-center">
                    No counter data available
                  </p>
                )}
              </div>
            ) : (
              <>
                {/* Advantaged by Bans */}
                {advantagedByBans.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-3.5 h-3.5 text-green-400" />
                      <p className="text-[0.65rem] text-steel-400 font-bold uppercase tracking-wider">
                        Pro Pick Recommendations
                      </p>
                    </div>
                    <p className="text-[0.65rem] text-steel-500">
                      MPL pro heroes available with current bans:
                    </p>
                    {advantagedByBans.map((entry) => (
                      <div key={entry.hero.slug}>
                        <MetaBanCard hero={entry.hero} />
                        <div className="flex items-center gap-2 mt-0.5 ml-[52px] flex-wrap">
                          <span className="text-[0.55rem] bg-gold-500/20 text-gold-400 px-1.5 py-0.5 rounded font-bold">
                            MPL PRO
                          </span>
                          {entry.proPickCount && (
                            <span className="text-[0.55rem] text-blue-400/70">
                              {entry.proPickCount}× picked
                            </span>
                          )}
                          {entry.freedFrom.length > 0 && (
                            <span className="text-[0.55rem] text-emerald-400/70">
                              Freed from: {entry.freedFrom.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Meta Picks */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="w-3.5 h-3.5 text-gold-500" />
                    <p className="text-[0.65rem] text-steel-400 font-bold uppercase tracking-wider">
                      {proMeta ? 'Pro + Ladder Picks' : 'Meta Picks'}
                    </p>
                  </div>
                  <p className="text-[0.65rem] text-steel-500">
                    {proMeta ? 'MPL Pro picks + top win rate heroes:' : 'Top win rate heroes still available:'}
                  </p>
                  {metaPickSuggestions.length > 0 ? (
                    metaPickSuggestions.map((entry) => (
                      <div key={entry.hero.slug}>
                        <MetaBanCard hero={entry.hero} />
                        <div className="flex items-center gap-2 mt-0.5 ml-[52px]">
                          {entry.source.startsWith('MPL') && (
                            <span className="text-[0.55rem] bg-gold-500/20 text-gold-400 px-1.5 py-0.5 rounded font-bold">
                              MPL PRO
                            </span>
                          )}
                          {entry.proPickCount && (
                            <span className="text-[0.55rem] text-blue-400/70">
                              {entry.proPickCount}× pro picked
                            </span>
                          )}
                          {entry.proWinRate && (
                            <span className="text-[0.55rem] text-green-400/70">
                              {entry.proWinRate.toFixed(1)}% pro WR
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-steel-500 py-4 text-center">
                      Loading hero data...
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      )}

      {/* ══════ INTEL TAB: Pro Synergy Picks ══════ */}
      {panelTab === 'intel' && currentTeamPicks.length > 0 && proSynergyPicks.length > 0 && !isInBanPhase && (
        <div className="glass-panel p-4 flex flex-col gap-3 animate-slide-in">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-gold-400" />
            <h3 className="text-sm font-bold">Pro Synergy Picks ({currentTeam === 'blue' ? 'Blue' : 'Red'} Team)</h3>
          </div>
          <p className="text-[0.65rem] text-steel-500">
            Pro meta heroes that complement {currentTeamPicks.map(h => h.name).join(', ')}:
          </p>
          {proSynergyPicks.map((entry) => (
            <div key={entry.hero.slug}>
              <MetaBanCard hero={entry.hero} />
              <div className="flex items-center gap-2 mt-0.5 ml-[52px] flex-wrap">
                {entry.isPro && (
                  <span className="text-[0.55rem] bg-gold-500/20 text-gold-400 px-1.5 py-0.5 rounded font-bold">
                    MPL PRO
                  </span>
                )}
                {entry.proPickCount && (
                  <span className="text-[0.55rem] text-blue-400/70">
                    {entry.proPickCount}× pro picked
                  </span>
                )}
                <span className="text-[0.55rem] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">
                  Fills: {entry.fillsRole}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════ STRATEGY TAB ══════ */}
      {panelTab === 'strategy' && strategyRecommendations.length > 0 && bannedSlugSet.size > 0 && (
        <div className="flex flex-col gap-3 animate-slide-in">
          <div className="glass-panel p-3">
            <div className="flex items-center gap-2 mb-1">
              <Compass className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold">Draft Strategy Suggestions</h3>
            </div>
            <p className="text-[0.55rem] text-steel-500">
              Team compositions that benefit from current bans:
            </p>
          </div>
          {strategyRecommendations.map((rec) => (
            <div
              key={rec.strategy.id}
              className={`rounded-xl p-3 strategy-stagger ${
                rec.viability === 'strong'
                  ? 'strategy-card-strong'
                  : 'strategy-card-viable'
              }`}
            >
              {/* Strategy header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-white">
                  {rec.strategy.name}
                </span>
                <span className={`text-[0.5rem] px-1.5 py-0.5 rounded font-bold uppercase ${
                  rec.viability === 'strong'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {rec.viability === 'strong' ? 'STRONG' : 'VIABLE'}
                </span>
                <span className="text-[0.5rem] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">
                  {rec.strategy.tag}
                </span>
              </div>

              {/* Reason */}
              <div className="flex items-center gap-1 mb-3">
                <Info className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                <span className="text-[0.55rem] text-emerald-400/90">{rec.reason}</span>
              </div>

              {/* Hero cards per role */}
              <div className="flex flex-col gap-2">
                {rec.availableHeroes
                  .filter((sf) => sf.available.length > 0)
                  .slice(0, 4)
                  .map((sf) => (
                  <ExpandableRoleSlot key={sf.role} sf={sf} />
                ))}
              </div>

              {/* Playstyle */}
              <p className="text-[0.5rem] text-steel-500 mt-2 pt-2 border-t border-steel-700/20 italic">
                {rec.strategy.playstyle}
              </p>
            </div>
          ))}
        </div>
      )}

      {panelTab === 'strategy' && strategyRecommendations.length === 0 && (
        <div className="glass-panel p-6 text-center">
          <Compass className="w-6 h-6 text-steel-600 mx-auto mb-2" />
          <p className="text-xs text-steel-500">Ban heroes to see strategy suggestions</p>
          <p className="text-[0.6rem] text-steel-600 mt-1">Strategies are scored based on which counters get banned</p>
        </div>
      )}

      {/* ══════ STRATEGY TAB: Comp Forming (Both Teams) ══════ */}
      {panelTab === 'strategy' && (formingArchetypes.length > 0 || redFormingArchetypes.length > 0) && (
        <div className="glass-panel p-4 animate-slide-in">
          <div className="flex items-center gap-2 mb-3">
            <Compass className="w-4 h-4 text-steel-300" />
            <h3 className="text-sm font-bold">Comp Forming</h3>
          </div>

          {/* Blue Team Section */}
          {formingArchetypes.length > 0 && (
            <div className="mb-3">
              <p className="text-[0.6rem] font-semibold text-blue-400 mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                BLUE TEAM
              </p>
              <div className="flex flex-col gap-2 pl-3 border-l-2 border-blue-500/30">
                {formingArchetypes.slice(0, 2).map((arch) => (
                  <div key={`blue-${arch.name}`} className={`rounded-lg border p-2.5 ${arch.progress >= 60 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-steel-700/30 bg-navy-800/20'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[0.7rem] font-bold text-white truncate mr-2">{arch.name}</span>
                      <span className={`text-[0.6rem] font-bold shrink-0 ${arch.progress >= 60 ? 'text-emerald-400' : 'text-steel-400'}`}>
                        {arch.progress}%
                      </span>
                    </div>
                    <div className="mb-1.5">
                      <span className="text-[0.5rem] bg-purple-500/15 text-purple-300 px-1.5 py-0.5 rounded">{arch.tag}</span>
                    </div>
                    <div className="w-full h-1.5 bg-navy-700/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${arch.progress >= 60 ? 'bg-blue-500' : 'bg-steel-500'}`}
                        style={{ width: `${arch.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Red Team Section */}
          {redFormingArchetypes.length > 0 && (
            <div>
              <p className="text-[0.6rem] font-semibold text-red-400 mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                RED TEAM
              </p>
              <div className="flex flex-col gap-2 pl-3 border-l-2 border-red-500/30">
                {redFormingArchetypes.slice(0, 2).map((arch) => (
                  <div key={`red-${arch.name}`} className={`rounded-lg border p-2.5 ${arch.progress >= 60 ? 'border-amber-500/30 bg-amber-500/5' : 'border-steel-700/30 bg-navy-800/20'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[0.7rem] font-bold text-white truncate mr-2">{arch.name}</span>
                      <span className={`text-[0.6rem] font-bold shrink-0 ${arch.progress >= 60 ? 'text-amber-400' : 'text-steel-400'}`}>
                        {arch.progress}%
                      </span>
                    </div>
                    <div className="mb-1.5">
                      <span className="text-[0.5rem] bg-purple-500/15 text-purple-300 px-1.5 py-0.5 rounded">{arch.tag}</span>
                    </div>
                    <div className="w-full h-1.5 bg-navy-700/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${arch.progress >= 60 ? 'bg-red-500' : 'bg-steel-500'}`}
                        style={{ width: `${arch.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════ INTEL TAB: Response Bans ══════ */}
      {panelTab === 'intel' && responseBans.length > 0 && !isInBanPhase && (
        <div className="glass-panel p-4 animate-slide-in">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-bold">Response Ban Targets</h3>
          </div>
          <p className="text-[0.6rem] text-steel-500 mb-2">Ban these to disrupt enemy's draft plan:</p>
          <div className="flex flex-col gap-2">
            {responseBans.map((rb) => (
              <div key={rb.hero.slug} className={`flex gap-3 items-center p-2 rounded-lg ${rb.priority === 'high' ? 'bg-red-500/8 border border-red-500/20' : 'bg-amber-500/8 border border-amber-500/20'}`}>
                <MiniHeroPortrait
                  heroName={rb.hero.name}
                  badge={rb.priority === 'high' ? 'HIGH' : 'MED'}
                  badgeColor={rb.priority === 'high' ? 'bg-red-500/90 text-white' : 'bg-amber-500/90 text-white'}
                />
                <p className="text-[0.55rem] text-steel-400 flex-1 leading-relaxed">{rb.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════ COUNTERS TAB: Phase bar + flex picks + empty state ══════ */}
      {panelTab === 'counters' && (() => {
        // Compute actual total picks to determine real phase
        const totalPicks = bluePicks.length + redPicks.length;
        const isBanPhase = draftPhase.phase === 'ban1' || draftPhase.phase === 'ban2';
        const isEarly = !isBanPhase && totalPicks < 4;
        const isMid = !isBanPhase && totalPicks >= 4 && totalPicks < 8;
        const isLate = !isBanPhase && totalPicks >= 8;

        const phaseLabel = isBanPhase ? 'BAN PHASE'
          : isEarly ? 'EARLY PICK'
          : isMid ? 'MID PICK'
          : isLate ? 'LAST PICK — Counter window'
          : `PICK ${draftPhase.pickNumber}`;

        const phaseHint = isBanPhase ? 'Remove meta threats'
          : isEarly ? 'Prioritize flex picks to hide your strategy'
          : isMid ? 'Lock core carries and watch damage balance'
          : isLate ? 'Counter-pick the enemy comp weaknesses'
          : '';

        const phaseColorClass = isBanPhase ? 'bg-red-500/20 text-red-400'
          : isEarly ? 'bg-blue-500/20 text-blue-400'
          : isMid ? 'bg-gold-500/20 text-gold-400'
          : 'bg-amber-500/20 text-amber-400';

        return (
          <>
            {/* Compact phase bar */}
            <div className="flex items-center justify-between bg-navy-800/40 rounded-lg px-3 py-2">
              <div className="flex flex-col">
                <span className="text-[0.6rem] text-steel-400 font-bold uppercase tracking-wider">
                  Draft Phase
                </span>
                {phaseHint && (
                  <span className="text-[0.5rem] text-steel-600 mt-0.5">{phaseHint}</span>
                )}
              </div>
              <span className={`text-[0.55rem] px-2 py-0.5 rounded font-bold ${phaseColorClass}`}>
                {phaseLabel}
              </span>
            </div>

            {/* Flex picks (only during early pick phase — before 4 total picks) */}
            {flexPicks.length > 0 && isEarly && (
              <div className="glass-panel p-3">
                <p className="text-[0.55rem] text-steel-500 mb-2">Recommended flex picks:</p>
                <div className="flex gap-2 flex-wrap">
                  {flexPicks.slice(0, 5).map((fp) => (
                    <MiniHeroPortrait
                      key={fp.hero.slug}
                      heroName={fp.hero.name}
                      badge={fp.flexRoles.length + ' ROLES'}
                      badgeColor="bg-blue-500/80 text-white"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Mid pick guidance — show damage balance warning inline */}
            {isMid && damageWarnings.length === 0 && bluePicks.length >= 2 && (
              <div className="flex items-center gap-2 bg-emerald-500/8 border border-emerald-500/15 rounded-lg px-3 py-2">
                <Shield className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="text-[0.55rem] text-emerald-400">Damage balance is healthy — pick your core carry</span>
              </div>
            )}

            {/* Empty state when no data yet */}
            {bluePicks.length === 0 && redPicks.length === 0 && synergies.length === 0 && !isBanPhase && (
              <div className="glass-panel p-4 text-center">
                <Target className="w-5 h-5 text-steel-600 mx-auto mb-2" />
                <p className="text-xs text-steel-500">Start picking heroes to see counters</p>
                <p className="text-[0.55rem] text-steel-600 mt-1">Damage balance, power curve, and lane matchups appear as you draft</p>
              </div>
            )}
          </>
        );
      })()}

      {/* ══════ COUNTERS TAB: Damage Balance ══════ */}
      {panelTab === 'counters' && damageWarnings.length > 0 && (
        <div className="glass-panel p-3 animate-slide-in">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`w-3.5 h-3.5 ${damageWarnings[0].severity === 'critical' ? 'text-red-400' : 'text-amber-400'}`} />
            <span className="text-[0.65rem] text-steel-400 font-bold uppercase tracking-wider">Damage Balance</span>
          </div>
          {damageWarnings.map((w) => (
            <div key={w.type} className={`text-[0.6rem] px-2 py-1.5 rounded ${
              w.severity === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {w.message}
            </div>
          ))}
        </div>
      )}

      {/* ══════ COUNTERS TAB: Power Spike ══════ */}
      {panelTab === 'counters' && bluePicks.length >= 2 && (
        <div className="glass-panel p-3 animate-slide-in">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-3.5 h-3.5 text-gold-400" />
            <span className="text-[0.65rem] text-steel-400 font-bold uppercase tracking-wider">
              Team Power Curve
            </span>
            <span className="text-[0.5rem] bg-gold-500/15 text-gold-400 px-1.5 py-0.5 rounded ml-auto">
              Peaks {powerSpike.peakPhase}
            </span>
          </div>
          <div className="flex gap-1 items-end h-8">
            {[
              { label: 'Early', pct: powerSpike.early, color: 'bg-emerald-500' },
              { label: 'Mid', pct: powerSpike.mid, color: 'bg-gold-500' },
              { label: 'Late', pct: powerSpike.late, color: 'bg-purple-500' },
            ].map((bar) => (
              <div key={bar.label} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full rounded-t overflow-hidden bg-navy-700/50" style={{ height: '24px' }}>
                  <div
                    className={`${bar.color}/60 w-full rounded-t transition-all`}
                    style={{ height: `${Math.max(bar.pct, 5)}%`, marginTop: `${100 - Math.max(bar.pct, 5)}%` }}
                  />
                </div>
                <span className="text-[0.45rem] text-steel-500">{bar.label}</span>
              </div>
            ))}
          </div>
          {powerSpike.warning && (
            <p className="text-[0.55rem] text-amber-400/80 mt-2 leading-relaxed">
              {powerSpike.warning}
            </p>
          )}
        </div>
      )}

      {/* ══════ COUNTERS TAB: Lane Matchup Board ══════ */}
      {panelTab === 'counters' && laneMatchups.length > 0 && bluePicks.length >= 2 && redPicks.length >= 2 && (
        <div className="glass-panel p-3 animate-slide-in">
          <div className="flex items-center gap-2 mb-3">
            <Swords className="w-3.5 h-3.5 text-gold-400" />
            <span className="text-[0.65rem] text-steel-400 font-bold uppercase tracking-wider">Lane Matchups</span>
          </div>
          <div className="flex flex-col gap-2">
            {laneMatchups.map((mu) => (
              <div key={mu.lane} className="flex items-center gap-1.5 bg-navy-800/30 rounded-lg px-2 py-1.5">
                <span className="text-[0.55rem] text-steel-500 font-bold min-w-[32px]">{mu.lane}</span>
                <div className="flex-1 flex items-center justify-center gap-1.5">
                  {mu.yourHero ? (
                    <MiniHeroPortrait heroName={mu.yourHero.name} />
                  ) : (
                    <div className="w-9 h-9 rounded-md bg-navy-700 border border-steel-700/30 flex items-center justify-center text-[0.5rem] text-steel-600">?</div>
                  )}
                  <span className={`text-[0.5rem] px-1.5 py-0.5 rounded font-bold min-w-[36px] text-center ${
                    mu.advantage === 'advantage' ? 'bg-emerald-500/20 text-emerald-400'
                      : mu.advantage === 'disadvantage' ? 'bg-red-500/20 text-red-400'
                      : mu.advantage === 'even' ? 'bg-gold-500/20 text-gold-400'
                      : 'bg-steel-700/30 text-steel-500'
                  }`}>
                    {mu.advantage === 'advantage' ? 'WIN' : mu.advantage === 'disadvantage' ? 'LOSE' : mu.advantage === 'even' ? 'EVEN' : 'VS'}
                  </span>
                  {mu.enemyHero ? (
                    <MiniHeroPortrait heroName={mu.enemyHero.name} />
                  ) : (
                    <div className="w-9 h-9 rounded-md bg-navy-700 border border-red-500/20 flex items-center justify-center text-[0.5rem] text-steel-600">?</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════ COUNTERS TAB: Synergy Tags ══════ */}
      {panelTab === 'counters' && synergies.length > 0 && (
        <div className="glass-panel p-4 animate-slide-in">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold">Synergies</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {synergies.map((tag) => (
              <span key={tag.label} className={`synergy-tag synergy-${tag.type}`} title={tag.description}>
                {tag.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ══════ COUNTERS TAB: Comp Warnings ══════ */}
      {panelTab === 'counters' && warnings.length > 0 && (
        <div className="glass-panel p-4 animate-slide-in">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold">Comp Warnings</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {warnings.map((tag) => (
              <span key={tag.label} className={`synergy-tag synergy-${tag.type}`} title={tag.description}>
                {tag.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ══════ COUNTERS TAB: Threat Detection ══════ */}
      {panelTab === 'counters' && threats.length > 0 && (
        <div className="glass-panel p-4 animate-slide-in">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-bold">Enemy Threats</h3>
          </div>
          <div className="space-y-2">
            {threats.map((threat) => (
              <div key={threat.label} className={`threat-banner threat-${threat.severity}`}>
                <p className="font-semibold">{threat.label}</p>
                <p className="text-[0.65rem] opacity-80 mt-0.5">{threat.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
