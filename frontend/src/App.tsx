import { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Swords, BookOpen, RefreshCw } from 'lucide-react';
import HeroGrid from './components/DraftPicker/HeroGrid';
import DraftBoard from './components/DraftPicker/DraftBoard';
import CounterPanel from './components/CounterPanel/CounterPanel';
import StrategyBoard from './components/StrategyBoard/StrategyBoard';
import { useHeroes } from './hooks/useApi';
import { useDraftStore } from './store/draftStore';
import type { Hero } from './types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

/** Tab navigation */
type TabId = 'draft' | 'strategy';

/** App header */
function AppHeader({
  activeTab,
  setActiveTab,
}: {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}) {
  return (
    <header className="app-header glass-panel px-5 py-3 flex items-center justify-between" id="app-header">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold-500 to-gold-400 flex items-center justify-center">
          <Swords className="w-5 h-5 text-navy-900" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-wide leading-tight">
            MLBB Draft <span className="text-gold-400">Strategizer</span>
          </h1>
          <p className="text-[0.6rem] text-steel-500 tracking-wider uppercase">
            Season 40 • Patch 2.1.67
          </p>
        </div>
      </div>

      <div className="tab-bar">
        <button
          className={`tab-item flex items-center gap-1.5 ${activeTab === 'draft' ? 'active' : ''}`}
          onClick={() => setActiveTab('draft')}
        >
          <Swords className="w-3.5 h-3.5" />
          Draft
        </button>
        <button
          className={`tab-item flex items-center gap-1.5 ${activeTab === 'strategy' ? 'active' : ''}`}
          onClick={() => setActiveTab('strategy')}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Strategy
        </button>
      </div>
    </header>
  );
}

/** Main draft view with DnD */
function DraftView({ setActiveTab }: { setActiveTab: (tab: TabId) => void }) {
  const { data: heroesData, isLoading, error } = useHeroes();
  const assignHero = useDraftStore((s) => s.assignHero);
  const [activeHero, setActiveHero] = useState<Hero | null>(null);

  const heroes = heroesData?.data ?? [];
  const isStale = heroesData?.meta?.isStale ?? false;

  // DnD sensors
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  });
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(pointerSensor, touchSensor, keyboardSensor);

  function handleDragStart(event: DragStartEvent) {
    const hero = event.active.data.current?.hero as Hero | undefined;
    if (hero) setActiveHero(hero);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveHero(null);
    const hero = event.active.data.current?.hero as Hero | undefined;
    const slotId = event.over?.id as string | undefined;

    if (hero && slotId) {
      assignHero(hero, slotId);
    }
  }

  function handleDragCancel() {
    setActiveHero(null);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="app-layout">
        <AppHeader activeTab="draft" setActiveTab={setActiveTab} />

        {/* Hero Roster */}
        <div className="hero-roster-panel">
          {isLoading && (
            <div className="glass-panel p-8 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-steel-400">Loading heroes...</p>
            </div>
          )}
          {error && (
            <div className="glass-panel p-4 text-center">
              <p className="text-sm text-red-400 mb-2">Failed to load heroes</p>
              <p className="text-xs text-steel-500">Check if the backend is running on port 3001</p>
            </div>
          )}
          {heroes.length > 0 && (
            <>
              {isStale && (
                <div className="stale-indicator mb-2">
                  <RefreshCw className="w-3 h-3" />
                  Using cached data
                </div>
              )}
              <HeroGrid heroes={heroes} />
            </>
          )}
        </div>

        {/* Draft Board */}
        <div className="draft-board-panel">
          <DraftBoard />
        </div>

        {/* Side Panel */}
        <div className="side-panel">
          <CounterPanel />
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeHero && (
          <div className="hero-card p-2 w-24 shadow-2xl ring-2 ring-gold-400">
            <div className="hero-portrait-placeholder text-lg mb-1">
              {activeHero.name.charAt(0)}
            </div>
            <p className="text-xs font-semibold text-white truncate">{activeHero.name}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

/** Strategy view */
function StrategyView({ setActiveTab }: { setActiveTab: (tab: TabId) => void }) {
  return (
    <div className="app-layout" style={{ gridTemplateColumns: '1fr', gridTemplateRows: 'auto 1fr' }}>
      <AppHeader activeTab="strategy" setActiveTab={setActiveTab} />
      <div className="max-w-4xl mx-auto w-full mt-4">
        <StrategyBoard />
      </div>
    </div>
  );
}

/** Root app */
export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('draft');

  return (
    <QueryClientProvider client={queryClient}>
      {activeTab === 'draft' ? (
        <DraftView setActiveTab={setActiveTab} />
      ) : (
        <StrategyView setActiveTab={setActiveTab} />
      )}
    </QueryClientProvider>
  );
}
