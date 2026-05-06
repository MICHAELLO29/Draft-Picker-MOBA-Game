import { create } from 'zustand';
import type { Strategy, GamePhase, Waypoint, MapArrow } from '../types';

const STORAGE_KEY = 'mlbb-draft-strategies';

function loadStrategies(): Strategy[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStrategies(strategies: Strategy[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(strategies));
}

interface StrategyState {
  strategies: Strategy[];
  activeStrategyId: string | null;

  // Notes
  notes: {
    winCondition: string;
    keyObjectives: string;
    teamWeakness: string;
    priorityBans: string;
  };

  // Map state
  currentPhase: GamePhase;
  waypoints: Record<GamePhase, Waypoint[]>;
  arrows: Record<GamePhase, MapArrow[]>;

  // Actions
  setCurrentPhase: (phase: GamePhase) => void;
  addWaypoint: (waypoint: Waypoint) => void;
  updateWaypoint: (id: string, updates: Partial<Waypoint>) => void;
  removeWaypoint: (id: string) => void;
  addArrow: (arrow: MapArrow) => void;
  removeArrow: (id: string) => void;
  clearPhase: () => void;

  // Notes
  updateNote: (key: keyof StrategyState['notes'], value: string) => void;

  // Strategy persistence
  saveStrategy: (name: string, draft: Strategy['draft']) => void;
  loadStrategy: (id: string) => Strategy | null;
  deleteStrategy: (id: string) => void;
  renameStrategy: (id: string, name: string) => void;
  duplicateStrategy: (id: string) => void;
}

export const useStrategyStore = create<StrategyState>((set, get) => ({
  strategies: loadStrategies(),
  activeStrategyId: null,

  notes: {
    winCondition: '',
    keyObjectives: '',
    teamWeakness: '',
    priorityBans: '',
  },

  currentPhase: 'early',
  waypoints: { early: [], mid: [], late: [] },
  arrows: { early: [], mid: [], late: [] },

  setCurrentPhase: (phase) => set({ currentPhase: phase }),

  addWaypoint: (waypoint) => {
    const { currentPhase, waypoints } = get();
    set({
      waypoints: {
        ...waypoints,
        [currentPhase]: [...waypoints[currentPhase], waypoint],
      },
    });
  },

  updateWaypoint: (id, updates) => {
    const { currentPhase, waypoints } = get();
    set({
      waypoints: {
        ...waypoints,
        [currentPhase]: waypoints[currentPhase].map((w) =>
          w.id === id ? { ...w, ...updates } : w
        ),
      },
    });
  },

  removeWaypoint: (id) => {
    const { currentPhase, waypoints, arrows } = get();
    set({
      waypoints: {
        ...waypoints,
        [currentPhase]: waypoints[currentPhase].filter((w) => w.id !== id),
      },
      // Also remove arrows connected to this waypoint
      arrows: {
        ...arrows,
        [currentPhase]: arrows[currentPhase].filter(
          (a) => a.fromId !== id && a.toId !== id
        ),
      },
    });
  },

  addArrow: (arrow) => {
    const { currentPhase, arrows } = get();
    set({
      arrows: {
        ...arrows,
        [currentPhase]: [...arrows[currentPhase], arrow],
      },
    });
  },

  removeArrow: (id) => {
    const { currentPhase, arrows } = get();
    set({
      arrows: {
        ...arrows,
        [currentPhase]: arrows[currentPhase].filter((a) => a.id !== id),
      },
    });
  },

  clearPhase: () => {
    const { currentPhase, waypoints, arrows } = get();
    set({
      waypoints: { ...waypoints, [currentPhase]: [] },
      arrows: { ...arrows, [currentPhase]: [] },
    });
  },

  updateNote: (key, value) => {
    set({ notes: { ...get().notes, [key]: value } });
  },

  saveStrategy: (name, draft) => {
    const { waypoints, arrows, notes, strategies } = get();
    const id = `strategy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const strategy: Strategy = {
      id,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      draft,
      mapPhases: {
        early: { waypoints: waypoints.early, arrows: arrows.early },
        mid: { waypoints: waypoints.mid, arrows: arrows.mid },
        late: { waypoints: waypoints.late, arrows: arrows.late },
      },
      notes,
    };

    const newStrategies = [strategy, ...strategies];
    saveStrategies(newStrategies);
    set({ strategies: newStrategies, activeStrategyId: id });
  },

  loadStrategy: (id) => {
    const strategy = get().strategies.find((s) => s.id === id);
    if (!strategy) return null;

    set({
      activeStrategyId: id,
      notes: strategy.notes,
      waypoints: {
        early: strategy.mapPhases.early.waypoints,
        mid: strategy.mapPhases.mid.waypoints,
        late: strategy.mapPhases.late.waypoints,
      },
      arrows: {
        early: strategy.mapPhases.early.arrows,
        mid: strategy.mapPhases.mid.arrows,
        late: strategy.mapPhases.late.arrows,
      },
    });
    return strategy;
  },

  deleteStrategy: (id) => {
    const newStrategies = get().strategies.filter((s) => s.id !== id);
    saveStrategies(newStrategies);
    set({
      strategies: newStrategies,
      activeStrategyId: get().activeStrategyId === id ? null : get().activeStrategyId,
    });
  },

  renameStrategy: (id, name) => {
    const newStrategies = get().strategies.map((s) =>
      s.id === id ? { ...s, name, updatedAt: Date.now() } : s
    );
    saveStrategies(newStrategies);
    set({ strategies: newStrategies });
  },

  duplicateStrategy: (id) => {
    const strategy = get().strategies.find((s) => s.id === id);
    if (!strategy) return;

    const newId = `strategy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const duplicate: Strategy = {
      ...structuredClone(strategy),
      id: newId,
      name: `${strategy.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const newStrategies = [duplicate, ...get().strategies];
    saveStrategies(newStrategies);
    set({ strategies: newStrategies });
  },
}));
