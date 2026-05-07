import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Shield, AlertTriangle, Zap, Info, Swords, Target } from 'lucide-react';
import { useCounters, useHeroes } from '../../hooks/useApi';
import { useDraftStore } from '../../store/draftStore';
import { detectSynergies, detectCompWarnings, detectThreats } from '../../utils/synergyRules';
import type { CounterPick, Hero } from '../../types';
import { useHeroImage } from '../../utils/imageUtils';
import { fetchCounters } from '../../services/api';

/** Counter pick card */
function CounterCard({ counter }: { counter: CounterPick }) {
  const [imgError, setImgError] = useState(false);
  const heroImageUrl = useHeroImage(counter.heroName);
  const wrClass = counter.matchupWinRate >= 52 ? 'wr-high' : counter.matchupWinRate >= 48 ? 'wr-mid' : 'wr-low';

  return (
    <div className="glass-panel p-3 flex gap-3 items-start animate-fade-in">
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

  // Get all hero data for meta suggestions
  const { data: heroesData } = useHeroes();
  const allHeroes = heroesData?.data ?? [];

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
  // CORE LOGIC: Determine what to anchor the panel on
  // ═══════════════════════════════════════════════════════════════
  // Rule: NEVER anchor on a banned hero. Always anchor on the
  // most dangerous ENEMY PICKED hero. If no enemy picks exist,
  // show meta-based suggestions.

  // Find the most dangerous enemy (red) picked hero by win rate
  const primaryEnemyThreat = useMemo(() => {
    if (redPicks.length === 0) return null;
    // Sort by win rate descending, pick the strongest
    return [...redPicks].sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))[0] ?? null;
  }, [redPicks]);

  // Fetch counters ONLY for the primary enemy threat (a PICKED hero, never a banned one)
  const { data: counterData, isLoading: countersLoading } = useCounters(primaryEnemyThreat?.slug ?? null);

  // Filter counter suggestions: only show heroes still available in the pool
  const strongCounters = useMemo(() => {
    if (!counterData?.data) return [];
    return (counterData.data.strongAgainst ?? []).filter((c) => !usedSlugs.has(c.heroSlug));
  }, [counterData, usedSlugs]);

  const weakCounters = useMemo(() => {
    if (!counterData?.data) return [];
    return (counterData.data.weakAgainst ?? []).filter((c) => !usedSlugs.has(c.heroSlug));
  }, [counterData, usedSlugs]);

  // Meta-based ban suggestions (when no enemy picks exist)
  // Show top tier heroes with highest ban rates that are still available
  const metaBanSuggestions = useMemo(() => {
    if (primaryEnemyThreat) return []; // Not needed when we have enemy picks
    return allHeroes
      .filter((h) => !usedSlugs.has(h.slug))
      .filter((h) => h.tier === 'S' || h.tier === 'S+' || (h.banRate ?? 0) > 10)
      .sort((a, b) => (b.banRate ?? 0) - (a.banRate ?? 0))
      .slice(0, 5);
  }, [allHeroes, usedSlugs, primaryEnemyThreat]);

  // Meta-based pick suggestions (when in pick phase, no enemy picks yet)
  // Show top win rate heroes that are still available — safe/flex first picks
  const metaPickSuggestions = useMemo(() => {
    return allHeroes
      .filter((h) => !usedSlugs.has(h.slug))
      .filter((h) => (h.winRate ?? 0) > 49)
      .sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))
      .slice(0, 5);
  }, [allHeroes, usedSlugs]);

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

  // Combine weakAgainst from ALL banned heroes:
  // Heroes that appear in multiple banned heroes' weakAgainst lists
  // are EXTRA advantaged (multiple threats removed)
  const advantagedByBans = useMemo(() => {
    const heroScores = new Map<string, { counter: CounterPick; freedFromCount: number; freedFrom: string[] }>();

    banCounterQueries.forEach((query, idx) => {
      if (!query.data?.data) return;
      const bannedName = bannedHeroes[idx]?.name ?? 'Unknown';
      const weakList = query.data.data.weakAgainst ?? [];

      for (const counter of weakList) {
        // Skip heroes already picked or banned
        if (usedSlugs.has(counter.heroSlug)) continue;

        const existing = heroScores.get(counter.heroSlug);
        if (existing) {
          existing.freedFromCount += 1;
          existing.freedFrom.push(bannedName);
          // Average the win rates from different matchups
          existing.counter = {
            ...existing.counter,
            matchupWinRate: (existing.counter.matchupWinRate + counter.matchupWinRate) / 2,
          };
        } else {
          heroScores.set(counter.heroSlug, {
            counter: { ...counter },
            freedFromCount: 1,
            freedFrom: [bannedName],
          });
        }
      }
    });

    // Sort: heroes freed from multiple bans first, then by win rate
    return Array.from(heroScores.values())
      .sort((a, b) => b.freedFromCount - a.freedFromCount || b.counter.matchupWinRate - a.counter.matchupWinRate)
      .slice(0, 5);
  }, [banCounterQueries, bannedHeroes, usedSlugs]);

  // Heroes that counter our ally picks (threats to be aware of)
  const allyThreatHero = useMemo(() => {
    if (bluePicks.length === 0) return null;
    return bluePicks[bluePicks.length - 1] ?? null;
  }, [bluePicks]);

  const { data: allyCounterData } = useCounters(allyThreatHero?.slug ?? null);

  const allyThreats = useMemo(() => {
    if (!allyCounterData?.data) return [];
    return (allyCounterData.data.strongAgainst ?? []).filter((c) => !usedSlugs.has(c.heroSlug));
  }, [allyCounterData, usedSlugs]);

  // Detect synergies for blue team
  const synergies = useMemo(() => detectSynergies(bluePicks), [bluePicks]);
  const warnings = useMemo(() => detectCompWarnings(bluePicks), [bluePicks]);
  const threats = useMemo(() => detectThreats(redPicks), [redPicks]);

  const isStale = counterData?.meta?.isStale ?? false;

  // ═══════════════════════════════════════════════════════════════
  // DETERMINE PANEL STATE (per ML1.md state machine)
  // ═══════════════════════════════════════════════════════════════
  type PanelState = 'IDLE' | 'META_BANS' | 'ENEMY_PICKED' | 'PICK_RECOMMENDATIONS';

  const hasAnyHeroes = usedSlugs.size > 0;

  let panelState: PanelState = 'IDLE';
  if (!hasAnyHeroes && !isInBanPhase) {
    panelState = 'IDLE';
  } else if (primaryEnemyThreat) {
    panelState = 'ENEMY_PICKED';
  } else if (!isInBanPhase) {
    // We're in pick phase but no enemy picks yet — show pick recommendations
    panelState = 'PICK_RECOMMENDATIONS';
  } else {
    // We're in ban phase — show meta ban suggestions
    panelState = 'META_BANS';
  }

  // Panel title based on state
  const panelTitle = panelState === 'META_BANS'
    ? 'Ban Suggestions'
    : panelState === 'ENEMY_PICKED'
      ? 'Threat Analysis'
      : panelState === 'PICK_RECOMMENDATIONS'
        ? 'Pick Recommendations'
        : 'Draft Intel';

  const panelIcon = panelState === 'META_BANS'
    ? 'text-red-400'
    : panelState === 'ENEMY_PICKED'
      ? 'text-orange-400'
      : 'text-gold-500';

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto" id="counter-panel">

      {/* ══════ PRIMARY PANEL ══════ */}
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
              Top meta threats — consider banning these:
            </p>
            {metaBanSuggestions.length > 0 ? (
              metaBanSuggestions.slice(0, 5).map((hero) => (
                <MetaBanCard key={hero.slug} hero={hero} />
              ))
            ) : (
              <p className="text-xs text-steel-500 py-4 text-center">
                Loading hero data...
              </p>
            )}
          </div>
        )}

        {/* ─── STATE: ENEMY_PICKED ─── */}
        {panelState === 'ENEMY_PICKED' && primaryEnemyThreat && (
          <div className="flex flex-col gap-5">
            {/* Counter Picks vs enemy */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Swords className="w-3.5 h-3.5 text-gold-500" />
                <p className="text-[0.65rem] text-steel-400 font-bold uppercase tracking-wider">
                  Counter Picks (Strong vs {primaryEnemyThreat.name})
                </p>
              </div>
              {countersLoading ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
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

            {/* Counter Bans — heroes that enable the enemy threat */}
            {weakCounters.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-3.5 h-3.5 text-red-400" />
                  <p className="text-[0.65rem] text-steel-400 font-bold uppercase tracking-wider">
                    {primaryEnemyThreat.name} is Weak Against
                  </p>
                </div>
                {weakCounters.slice(0, 3).map((counter) => (
                  <CounterCard key={counter.heroSlug} counter={counter} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── STATE: PICK_RECOMMENDATIONS ─── */}
        {panelState === 'PICK_RECOMMENDATIONS' && (
          <div className="flex flex-col gap-5">
            {primaryEnemyThreat ? (
              <div className="space-y-2">
                <p className="text-[0.65rem] text-steel-500">
                  Counter picks vs {primaryEnemyThreat.name}:
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
                        Advantaged by Bans
                      </p>
                    </div>
                    <p className="text-[0.65rem] text-steel-500">
                      These heroes benefit from the current bans:
                    </p>
                    {advantagedByBans.map(({ counter, freedFrom }) => (
                      <div key={counter.heroSlug}>
                        <CounterCard counter={counter} />
                        <p className="text-[0.55rem] text-green-400/70 mt-0.5 ml-[52px]">
                          Freed from: {freedFrom.join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Meta Picks */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Swords className="w-3.5 h-3.5 text-gold-500" />
                    <p className="text-[0.65rem] text-steel-400 font-bold uppercase tracking-wider">
                      Meta Picks
                    </p>
                  </div>
                  <p className="text-[0.65rem] text-steel-500">
                    Top win rate heroes still available:
                  </p>
                  {metaPickSuggestions.length > 0 ? (
                    metaPickSuggestions.slice(0, 5).map((hero) => (
                      <MetaBanCard key={hero.slug} hero={hero} />
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

      {/* ══════ ALLY PROTECTION PANEL ══════ */}
      {allyThreatHero && allyThreats.length > 0 && !isInBanPhase && (
        <div className="glass-panel p-4 flex flex-col gap-3 animate-slide-in">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold">Protect {allyThreatHero.name}</h3>
          </div>
          <p className="text-[0.65rem] text-steel-500">
            These heroes counter your {allyThreatHero.name} — consider banning:
          </p>
          {allyThreats.slice(0, 3).map((counter) => (
            <CounterCard key={counter.heroSlug} counter={counter} />
          ))}
        </div>
      )}

      {/* ══════ SYNERGY TAGS ══════ */}
      {synergies.length > 0 && (
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

      {/* ══════ COMP WARNINGS ══════ */}
      {warnings.length > 0 && (
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

      {/* ══════ THREAT DETECTION ══════ */}
      {threats.length > 0 && (
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
