import { useMemo, useState } from 'react';
import { Shield, AlertTriangle, Zap, Info } from 'lucide-react';
import { useCounters } from '../../hooks/useApi';
import { useDraftStore } from '../../store/draftStore';
import { detectSynergies, detectCompWarnings, detectThreats } from '../../utils/synergyRules';
import type { CounterPick } from '../../types';
import { getHeroImageUrl } from '../../utils/imageUtils';

/** Counter pick card */
function CounterCard({ counter }: { counter: CounterPick }) {
  const [imgError, setImgError] = useState(false);
  const wrClass = counter.matchupWinRate >= 52 ? 'wr-high' : counter.matchupWinRate >= 48 ? 'wr-mid' : 'wr-low';

  return (
    <div className="glass-panel p-3 flex gap-3 items-start animate-fade-in">
      <div className="relative w-10 h-10 min-w-[40px] rounded overflow-hidden bg-navy-600">
        {!imgError ? (
          <img
            src={getHeroImageUrl(counter.heroName)}
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
          <p className="text-[0.65rem] text-steel-400 mt-1.5 line-clamp-2">
            {counter.description}
          </p>
        )}
      </div>
    </div>
  );
}

/** Main counter panel */
export default function CounterPanel() {
  const slots = useDraftStore((s) => s.slots);
  const activeTargetId = useDraftStore((s) => s.activeTargetId);

  // Derive used slugs from slots (must NOT call store methods in selector — returns new Set each time)
  const usedSlugs = useMemo(() => {
    const slugs = new Set<string>();
    slots.filter((s) => s.hero).forEach((s) => slugs.add(s.hero!.slug));
    return slugs;
  }, [slots]);

  const redPicks = slots
    .filter((s) => s.team === 'red' && s.type === 'pick' && s.hero)
    .map((s) => s.hero!);

  const bluePicks = slots
    .filter((s) => s.team === 'blue' && s.type === 'pick' && s.hero)
    .map((s) => s.hero!);

  // Determine active target for counters
  const activeSlot = activeTargetId ? slots.find((s) => s.id === activeTargetId) : null;
  const activeHero = activeSlot?.hero ?? (redPicks.length > 0 ? redPicks[redPicks.length - 1] : null);
  
  // If we are checking counters for a Blue team hero, these are "Counter Bans" (heroes that counter us)
  const isCounterBan = activeSlot ? activeSlot.team === 'blue' : false;

  const { data: counterData, isLoading, error } = useCounters(activeHero?.slug ?? null);

  // Filter out already picked/banned heroes from counter suggestions
  const filteredCounters = useMemo(() => {
    if (!counterData?.data) return [];
    return counterData.data.filter((c) => !usedSlugs.has(c.heroSlug));
  }, [counterData, usedSlugs]);

  // Detect synergies for blue team
  const synergies = useMemo(() => detectSynergies(bluePicks), [bluePicks]);
  const warnings = useMemo(() => detectCompWarnings(bluePicks), [bluePicks]);
  const threats = useMemo(() => detectThreats(redPicks), [redPicks]);

  const isStale = counterData?.meta?.isStale ?? false;

  return (
    <div className="flex flex-col gap-4 h-full" id="counter-panel">
      {/* Counter Suggestions */}
      <div className="glass-panel p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className={`w-4 h-4 ${isCounterBan ? 'text-red-400' : 'text-gold-500'}`} />
            <h3 className="text-sm font-bold">{isCounterBan ? 'Counter Bans' : 'Counter Picks'}</h3>
          </div>
          {isStale && (
            <span className="stale-indicator">
              <Info className="w-3 h-3" />
              Stale
            </span>
          )}
        </div>

        {!activeHero && (
          <p className="text-xs text-steel-500 py-4 text-center">
            Pick or click a hero to see counters
          </p>
        )}

        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400 py-2 text-center">
            Failed to load counters
          </p>
        )}

        {filteredCounters.length > 0 && (
          <div className="space-y-2">
            <p className="text-[0.65rem] text-steel-500">
              vs {activeHero?.name}
            </p>
            {filteredCounters.slice(0, 5).map((counter) => (
              <CounterCard key={counter.heroSlug} counter={counter} />
            ))}
          </div>
        )}
      </div>

      {/* Synergy Tags */}
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

      {/* Comp Warnings */}
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

      {/* Threat Detection */}
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
