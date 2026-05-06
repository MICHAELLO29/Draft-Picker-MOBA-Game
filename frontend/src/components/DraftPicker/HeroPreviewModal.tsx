import { useEffect, useCallback } from 'react';
import { X, Swords, ShieldBan } from 'lucide-react';
import type { CounterPick } from '../../types';
import { useDraftStore } from '../../store/draftStore';
import { useHeroImage } from '../../utils/imageUtils';
import { useImageStore } from '../../store/imageStore';
import { useCounters } from '../../hooks/useApi';

/** Small counter card inside the preview modal */
function MiniCounterCard({ counter }: { counter: CounterPick }) {
  const imageUrl = useImageStore((s) => s.images[counter.heroName]);
  const wrClass = counter.matchupWinRate >= 52 ? 'wr-high' : counter.matchupWinRate >= 48 ? 'wr-mid' : 'wr-low';

  return (
    <div className="flex items-center gap-4 py-2 hover:bg-navy-800/30 rounded-lg transition-all px-2 -mx-2">
      <div className="w-14 h-14 min-w-[56px] rounded-full overflow-hidden bg-navy-900 border-2 border-navy-600 shadow-lg">
        {imageUrl ? (
          <img src={imageUrl} alt={counter.heroName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gold-500">
            {counter.heroName.charAt(0)}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-lg font-bold text-white truncate leading-tight">{counter.heroName}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className={`text-xs font-bold ${wrClass}`}>
            {counter.matchupWinRate.toFixed(1)}% WR
          </span>
          <div className="flex gap-1.5">
            {counter.phaseStrengths.slice(0,1).map((phase) => (
              <span key={phase} className={`phase-tag phase-${phase.toLowerCase()} !text-[10px] !px-2 !py-0.5 rounded`}>
                {phase}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Hero Preview Modal — shows hero info + counters before pick/ban */
export default function HeroPreviewModal() {
  const previewHero = useDraftStore((s) => s.previewHero);
  const setPreviewHero = useDraftStore((s) => s.setPreviewHero);
  const assignHero = useDraftStore((s) => s.assignHero);
  const getCurrentStep = useDraftStore((s) => s.getCurrentStep);
  const mode = useDraftStore((s) => s.mode);

  const heroImageUrl = useHeroImage(previewHero?.name ?? '');

  // Fetch counters for the previewed hero
  const { data: counterData, isLoading: countersLoading } = useCounters(previewHero?.slug ?? null);
  const counters = counterData?.data ?? [];

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewHero(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [setPreviewHero]);

  const handlePick = useCallback(() => {
    if (!previewHero) return;
    assignHero(previewHero);
    setPreviewHero(null);
  }, [previewHero, assignHero, setPreviewHero]);

  const handleBan = useCallback(() => {
    if (!previewHero) return;
    // Find the next ban slot and assign there
    const state = useDraftStore.getState();
    
    if (mode === 'manual') {
      // In manual mode, find the first empty ban slot
      const emptyBanSlot = state.slots.find(
        (s) => s.type === 'ban' && !s.hero
      );
      if (emptyBanSlot) {
        assignHero(previewHero, emptyBanSlot.id);
      }
    } else {
      // In ranked mode, assign to the current slot (which may be a ban slot)
      assignHero(previewHero);
    }
    setPreviewHero(null);
  }, [previewHero, assignHero, setPreviewHero, mode]);

  if (!previewHero) return null;

  const isBanPhase = getCurrentStep()?.type === 'ban';

  // Determine the WR class
  const wrClass = previewHero.winRate
    ? previewHero.winRate >= 52 ? 'wr-high' : previewHero.winRate >= 48 ? 'wr-mid' : 'wr-low'
    : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={() => setPreviewHero(null)}
      id="hero-preview-overlay"
    >
      <div
        className="relative w-full max-w-3xl mx-4 glass-panel p-0 overflow-hidden rounded-2xl shadow-2xl border border-gold-500/20 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        id="hero-preview-modal"
      >
        {/* Close button */}
        <button
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-navy-800/80 hover:bg-navy-700 flex items-center justify-center transition-colors"
          onClick={() => setPreviewHero(null)}
          aria-label="Close preview"
        >
          <X className="w-4 h-4 text-steel-400" />
        </button>

        {/* Hero Header */}
        <div className="p-8 pb-6 bg-gradient-to-b from-navy-800/80 to-transparent">
          <div className="flex items-start gap-6">
            <div className="w-32 h-32 rounded-xl overflow-hidden bg-navy-900 shadow-inner flex-shrink-0 border border-gold-500/30">
              {heroImageUrl ? (
                <img src={heroImageUrl} alt={previewHero.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gold-500">
                  {previewHero.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 pt-2">
              <h2 className="text-4xl font-black text-white tracking-tight leading-none mb-3">{previewHero.name}</h2>
              <div className="flex flex-wrap items-center gap-3">
                {previewHero.roles.slice(0,2).map((role) => (
                  <span key={role} className="text-sm font-bold text-steel-400 uppercase tracking-widest">{role}</span>
                ))}
                {previewHero.tier && (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-steel-600"></span>
                    <span className={`text-sm font-bold ${previewHero.tier === 'S' || previewHero.tier === 'S+' ? 'text-gold-400' : 'text-steel-300'}`}>
                      {previewHero.tier}-Tier
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Main Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="bg-navy-900/60 border border-white/5 rounded-xl p-4 text-center">
              <div className="text-sm text-steel-500 font-semibold mb-1">Win Rate</div>
              <div className={`text-2xl font-black ${wrClass}`}>
                {previewHero.winRate !== undefined ? `${previewHero.winRate.toFixed(1)}%` : 'N/A'}
              </div>
            </div>
            <div className="bg-navy-900/60 border border-white/5 rounded-xl p-4 text-center">
              <div className="text-sm text-steel-500 font-semibold mb-1">Pick Rate</div>
              <div className="text-2xl font-black text-white">
                {previewHero.pickRate !== undefined ? `${previewHero.pickRate.toFixed(1)}%` : 'N/A'}
              </div>
            </div>
            <div className="bg-navy-900/60 border border-white/5 rounded-xl p-4 text-center">
              <div className="text-sm text-steel-500 font-semibold mb-1">Ban Rate</div>
              <div className="text-2xl font-black text-white">
                {previewHero.banRate !== undefined ? `${previewHero.banRate.toFixed(1)}%` : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-8 h-px bg-gradient-to-r from-transparent via-steel-700 to-transparent opacity-50"></div>

        {/* Counter Info Section */}
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-steel-400 uppercase tracking-widest">
              {isBanPhase ? 'Recommended Bans' : 'Strong Counters'}
            </h3>
          </div>

          {countersLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : counters.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {counters.slice(0, 4).map((counter) => (
                <MiniCounterCard key={counter.heroSlug} counter={counter} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-steel-500 text-center py-6 bg-navy-900/30 rounded-xl">
              No counter data available
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 px-8 pb-8">
          {!isBanPhase ? (
            <button
              className="flex-1 py-5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-lg font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] active:scale-95 flex items-center justify-center gap-3 border border-blue-400/30"
              onClick={handlePick}
              id="preview-pick-btn"
            >
              <Swords className="w-6 h-6" />
              Select Hero for Pick
            </button>
          ) : (
            <button
              className="flex-1 py-5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white text-lg font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] active:scale-95 flex items-center justify-center gap-3 border border-red-400/30"
              onClick={handleBan}
              id="preview-ban-btn"
            >
              <ShieldBan className="w-6 h-6" />
              Confirm Ban Selection
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
