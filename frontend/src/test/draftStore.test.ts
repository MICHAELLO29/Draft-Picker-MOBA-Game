import { describe, it, expect, beforeEach } from 'vitest';
import { useDraftStore } from '../store/draftStore';
import type { Hero } from '../types';

// ─── Test heroes ───
const makeHero = (name: string, slug: string, roles: string[], opts?: Partial<Hero>): Hero => ({
  name,
  slug,
  roles,
  portraitUrl: '',
  tier: 'S',
  winRate: 52,
  banRate: 10,
  pickRate: 15,
  ...opts,
});

const harley = makeHero('Harley', 'harley', ['Assassin', 'Mage']);
const valentina = makeHero('Valentina', 'valentina', ['Mage']);
const masha = makeHero('Masha', 'masha', ['Fighter', 'Tank']);
const freya = makeHero('Freya', 'freya', ['Fighter']);
const bruno = makeHero('Bruno', 'bruno', ['Marksman']);
const gatotkaca = makeHero('Gatotkaca', 'gatotkaca', ['Tank', 'Fighter']);

describe('Draft Store', () => {
  beforeEach(() => {
    useDraftStore.getState().reset();
  });

  describe('assignHero', () => {
    it('should assign hero to the current step slot', () => {
      const store = useDraftStore.getState();
      // First step is blue ban 0
      store.assignHero(freya);
      const slots = useDraftStore.getState().slots;
      const blueBan0 = slots.find(s => s.id === 'blue-ban-0');
      expect(blueBan0?.hero?.name).toBe('Freya');
    });

    it('should advance to the next step after assigning', () => {
      const store = useDraftStore.getState();
      store.assignHero(freya); // blue ban 0
      const nextStep = useDraftStore.getState().getCurrentStep();
      expect(nextStep?.team).toBe('red');
      expect(nextStep?.type).toBe('ban');
    });

    it('should not allow assigning the same hero twice', () => {
      const store = useDraftStore.getState();
      store.assignHero(freya); // blue ban 0
      store.assignHero(freya); // try again for red ban 0 — should fail
      const state = useDraftStore.getState();
      const redBan0 = state.slots.find(s => s.id === 'red-ban-0');
      // The hero should NOT be assigned to red ban since it's already used
      expect(redBan0?.hero).toBeNull();
    });
  });

  describe('undo/redo', () => {
    it('should undo the last assignment', () => {
      const store = useDraftStore.getState();
      store.assignHero(freya);
      expect(useDraftStore.getState().slots.find(s => s.id === 'blue-ban-0')?.hero?.name).toBe('Freya');
      store.undo();
      expect(useDraftStore.getState().slots.find(s => s.id === 'blue-ban-0')?.hero).toBeNull();
    });

    it('should redo after undo', () => {
      const store = useDraftStore.getState();
      store.assignHero(freya);
      store.undo();
      store.redo();
      expect(useDraftStore.getState().slots.find(s => s.id === 'blue-ban-0')?.hero?.name).toBe('Freya');
    });
  });

  describe('analysisHero', () => {
    it('should start with null analysis hero', () => {
      expect(useDraftStore.getState().analysisHero).toBeNull();
      expect(useDraftStore.getState().analysisTeam).toBeNull();
    });

    it('should set analysis hero and team correctly', () => {
      useDraftStore.getState().setAnalysisHero(harley, 'blue');
      const state = useDraftStore.getState();
      expect(state.analysisHero?.name).toBe('Harley');
      expect(state.analysisTeam).toBe('blue');
    });

    it('should clear analysis hero when set to null', () => {
      useDraftStore.getState().setAnalysisHero(harley, 'blue');
      useDraftStore.getState().setAnalysisHero(null, null);
      const state = useDraftStore.getState();
      expect(state.analysisHero).toBeNull();
      expect(state.analysisTeam).toBeNull();
    });

    it('should switch analysis to different team hero', () => {
      useDraftStore.getState().setAnalysisHero(harley, 'blue');
      useDraftStore.getState().setAnalysisHero(valentina, 'red');
      const state = useDraftStore.getState();
      expect(state.analysisHero?.name).toBe('Valentina');
      expect(state.analysisTeam).toBe('red');
    });
  });

  describe('getTeamPicks', () => {
    it('should return picks for the correct team', () => {
      const store = useDraftStore.getState();
      // Fill through ban phase to reach picks
      // 6 bans: blue, red, blue, red, blue, red
      store.assignHero(freya);      // blue ban 0
      store.assignHero(masha);      // red ban 0
      store.assignHero(bruno);      // blue ban 1
      store.assignHero(gatotkaca);  // red ban 1
      store.assignHero(valentina);  // blue ban 2
      store.assignHero(makeHero('Fanny', 'fanny', ['Assassin'])); // red ban 2
      // Now picks start
      store.assignHero(harley);     // blue pick 0

      const bluePicks = useDraftStore.getState().getTeamPicks('blue');
      expect(bluePicks[0]?.name).toBe('Harley');
    });
  });

  describe('reset', () => {
    it('should clear all slots and reset step index', () => {
      const store = useDraftStore.getState();
      store.assignHero(freya);
      store.reset();
      const state = useDraftStore.getState();
      expect(state.currentStepIndex).toBe(0);
      expect(state.slots.every(s => s.hero === null)).toBe(true);
      expect(state.analysisHero).toBeNull();
    });
  });

  describe('usedSlugs', () => {
    it('should track all assigned hero slugs', () => {
      const store = useDraftStore.getState();
      store.assignHero(freya);
      store.assignHero(masha);
      const slugs = useDraftStore.getState().getAllUsedHeroSlugs();
      expect(slugs.has('freya')).toBe(true);
      expect(slugs.has('masha')).toBe(true);
      expect(slugs.has('harley')).toBe(false);
    });
  });
});
