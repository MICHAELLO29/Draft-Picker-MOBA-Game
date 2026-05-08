import { create } from 'zustand';
import type { Hero, DraftSlot, DraftAction, DraftOrderStep, TeamSide, SlotType } from '../types';

/** Standard 5-ban ranked draft order (MLBB format) */
const RANKED_DRAFT_ORDER: DraftOrderStep[] = [
  // Ban phase 1 (alternating)
  { team: 'blue', type: 'ban', slotIndex: 0 },
  { team: 'red', type: 'ban', slotIndex: 0 },
  { team: 'blue', type: 'ban', slotIndex: 1 },
  { team: 'red', type: 'ban', slotIndex: 1 },
  { team: 'blue', type: 'ban', slotIndex: 2 },
  { team: 'red', type: 'ban', slotIndex: 2 },
  // Pick phase 1
  { team: 'blue', type: 'pick', slotIndex: 0 },
  { team: 'red', type: 'pick', slotIndex: 0 },
  { team: 'red', type: 'pick', slotIndex: 1 },
  { team: 'blue', type: 'pick', slotIndex: 1 },
  { team: 'blue', type: 'pick', slotIndex: 2 },
  { team: 'red', type: 'pick', slotIndex: 2 },
  // Ban phase 2
  { team: 'red', type: 'ban', slotIndex: 3 },
  { team: 'blue', type: 'ban', slotIndex: 3 },
  { team: 'red', type: 'ban', slotIndex: 4 },
  { team: 'blue', type: 'ban', slotIndex: 4 },
  // Pick phase 2
  { team: 'red', type: 'pick', slotIndex: 3 },
  { team: 'blue', type: 'pick', slotIndex: 3 },
  { team: 'blue', type: 'pick', slotIndex: 4 },
  { team: 'red', type: 'pick', slotIndex: 4 },
];

function createSlotId(team: TeamSide, type: SlotType, index: number): string {
  return `${team}-${type}-${index}`;
}

function createInitialSlots(): DraftSlot[] {
  const slots: DraftSlot[] = [];
  for (const team of ['blue', 'red'] as TeamSide[]) {
    for (let i = 0; i < 5; i++) {
      slots.push({
        id: createSlotId(team, 'pick', i),
        type: 'pick',
        team,
        index: i,
        hero: null,
      });
    }
    for (let i = 0; i < 5; i++) {
      slots.push({
        id: createSlotId(team, 'ban', i),
        type: 'ban',
        team,
        index: i,
        hero: null,
      });
    }
  }
  return slots;
}

interface DraftState {
  slots: DraftSlot[];
  currentStepIndex: number;
  draftOrder: DraftOrderStep[];
  history: DraftAction[];
  historyIndex: number; // For undo/redo — points to last applied action
  mode: 'ranked' | 'custom' | 'manual';
  activeTargetId: string | null;
  previewHero: Hero | null;
  analysisHero: Hero | null;  // Hero selected for threat analysis
  analysisTeam: TeamSide | null; // Which team the analysis hero belongs to

  // Derived
  getSlot: (id: string) => DraftSlot | undefined;
  getCurrentStep: () => DraftOrderStep | null;
  getActiveSlotId: () => string | null;
  getPickedHeroSlugs: () => Set<string>;
  getBannedHeroSlugs: () => Set<string>;
  getAllUsedHeroSlugs: () => Set<string>;
  getTeamPicks: (team: TeamSide) => (Hero | null)[];
  getTeamBans: (team: TeamSide) => (Hero | null)[];

  // Actions
  assignHero: (hero: Hero, slotId?: string) => void;
  clearSlot: (slotId: string) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  setMode: (mode: 'ranked' | 'custom' | 'manual') => void;
  setActiveTarget: (id: string | null) => void;
  setPreviewHero: (hero: Hero | null) => void;
  setAnalysisHero: (hero: Hero | null, team: TeamSide | null) => void;
}

export const useDraftStore = create<DraftState>((set, get) => ({
  slots: createInitialSlots(),
  currentStepIndex: 0,
  draftOrder: RANKED_DRAFT_ORDER,
  history: [],
  historyIndex: -1,
  mode: 'ranked',
  activeTargetId: null,
  previewHero: null,
  analysisHero: null,
  analysisTeam: null,

  setActiveTarget: (id) => set({ activeTargetId: id }),
  setPreviewHero: (hero) => set({ previewHero: hero }),
  setAnalysisHero: (hero, team) => set({ analysisHero: hero, analysisTeam: team }),

  getSlot: (id) => get().slots.find((s) => s.id === id),

  getCurrentStep: () => {
    const { draftOrder, currentStepIndex } = get();
    return currentStepIndex < draftOrder.length ? draftOrder[currentStepIndex]! : null;
  },

  getActiveSlotId: () => {
    const step = get().getCurrentStep();
    if (!step) return null;
    return createSlotId(step.team, step.type, step.slotIndex);
  },

  getPickedHeroSlugs: () => {
    const slugs = new Set<string>();
    get().slots.filter((s) => s.type === 'pick' && s.hero).forEach((s) => slugs.add(s.hero!.slug));
    return slugs;
  },

  getBannedHeroSlugs: () => {
    const slugs = new Set<string>();
    get().slots.filter((s) => s.type === 'ban' && s.hero).forEach((s) => slugs.add(s.hero!.slug));
    return slugs;
  },

  getAllUsedHeroSlugs: () => {
    const slugs = new Set<string>();
    get().slots.filter((s) => s.hero).forEach((s) => slugs.add(s.hero!.slug));
    return slugs;
  },

  getTeamPicks: (team) =>
    get()
      .slots.filter((s) => s.team === team && s.type === 'pick')
      .sort((a, b) => a.index - b.index)
      .map((s) => s.hero),

  getTeamBans: (team) =>
    get()
      .slots.filter((s) => s.team === team && s.type === 'ban')
      .sort((a, b) => a.index - b.index)
      .map((s) => s.hero),

  assignHero: (hero, slotId) => {
    const state = get();
    const targetSlotId = slotId ?? state.getActiveSlotId();
    if (!targetSlotId) return;

    // Prevent assigning an already used hero
    if (state.getAllUsedHeroSlugs().has(hero.slug)) return;

    const slotIndex = state.slots.findIndex((s) => s.id === targetSlotId);
    if (slotIndex === -1) return;

    const slot = state.slots[slotIndex]!;
    const action: DraftAction = {
      type: slot.type,
      slotId: targetSlotId,
      hero,
      previousHero: slot.hero,
      timestamp: Date.now(),
    };

    const newSlots = [...state.slots];
    newSlots[slotIndex] = { ...slot, hero };

    // Truncate any redo history
    const newHistory = [...state.history.slice(0, state.historyIndex + 1), action];

    // Auto-advance draft step in ranked/custom mode
    // Find the earliest empty slot based on draft order
    let nextStep = state.draftOrder.length;
    for (let i = 0; i < state.draftOrder.length; i++) {
      const step = state.draftOrder[i]!;
      const stepSlotId = `${step.team}-${step.type}-${step.slotIndex}`;
      const s = newSlots.find((x) => x.id === stepSlotId);
      if (s && !s.hero) {
        nextStep = i;
        break;
      }
    }

    set({
      slots: newSlots,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      currentStepIndex: state.mode !== 'manual' ? nextStep : state.currentStepIndex,
    });
  },

  clearSlot: (slotId) => {
    const state = get();
    const slotIndex = state.slots.findIndex((s) => s.id === slotId);
    if (slotIndex === -1) return;

    const slot = state.slots[slotIndex]!;
    if (!slot.hero) return;

    const action: DraftAction = {
      type: 'clear',
      slotId,
      hero: null,
      previousHero: slot.hero,
      timestamp: Date.now(),
    };

    const newSlots = [...state.slots];
    newSlots[slotIndex] = { ...slot, hero: null };

    const newHistory = [...state.history.slice(0, state.historyIndex + 1), action];

    // Find the earliest empty slot based on draft order
    let nextStep = state.draftOrder.length;
    for (let i = 0; i < state.draftOrder.length; i++) {
      const step = state.draftOrder[i]!;
      const stepSlotId = `${step.team}-${step.type}-${step.slotIndex}`;
      const s = newSlots.find((x) => x.id === stepSlotId);
      if (s && !s.hero) {
        nextStep = i;
        break;
      }
    }

    set({
      slots: newSlots,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      currentStepIndex: state.mode !== 'manual' ? nextStep : state.currentStepIndex,
    });
  },

  undo: () => {
    const state = get();
    if (state.historyIndex < 0) return;

    const action = state.history[state.historyIndex]!;
    const slotIndex = state.slots.findIndex((s) => s.id === action.slotId);
    if (slotIndex === -1) return;

    const newSlots = [...state.slots];
    newSlots[slotIndex] = { ...newSlots[slotIndex]!, hero: action.previousHero };

    // Step back the draft order
    let prevStep = state.currentStepIndex;
    if (state.mode !== 'manual' && action.type !== 'clear') {
      prevStep = Math.max(0, state.currentStepIndex - 1);
    }

    set({
      slots: newSlots,
      historyIndex: state.historyIndex - 1,
      currentStepIndex: prevStep,
    });
  },

  redo: () => {
    const state = get();
    if (state.historyIndex >= state.history.length - 1) return;

    const action = state.history[state.historyIndex + 1]!;
    const slotIndex = state.slots.findIndex((s) => s.id === action.slotId);
    if (slotIndex === -1) return;

    const newSlots = [...state.slots];
    newSlots[slotIndex] = { ...newSlots[slotIndex]!, hero: action.hero };

    let nextStep = state.currentStepIndex;
    if (state.mode !== 'manual' && action.type !== 'clear') {
      nextStep = state.currentStepIndex + 1;
    }

    set({
      slots: newSlots,
      historyIndex: state.historyIndex + 1,
      currentStepIndex: nextStep,
    });
  },

  reset: () => {
    set({
      slots: createInitialSlots(),
      currentStepIndex: 0,
      history: [],
      historyIndex: -1,
      activeTargetId: null,
      analysisHero: null,
      analysisTeam: null,
    });
  },

  setMode: (mode) => {
    set({ mode });
    get().reset();
  },
}));
