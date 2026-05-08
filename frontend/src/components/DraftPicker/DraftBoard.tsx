import { Undo2, Redo2, RotateCcw, Swords, ChevronRight } from 'lucide-react';
import { useDraftStore } from '../../store/draftStore';
import DraftSlot from './DraftSlot';
import type { TeamSide } from '../../types';

/** Team column showing picks and bans */
function TeamColumn({ team }: { team: TeamSide }) {
  const slots = useDraftStore((s) => s.slots);
  const activeSlotId = useDraftStore((s) => s.getActiveSlotId());

  const picks = slots
    .filter((s) => s.team === team && s.type === 'pick')
    .sort((a, b) => a.index - b.index);

  const bans = slots
    .filter((s) => s.team === team && s.type === 'ban')
    .sort((a, b) => a.index - b.index);

  const isBlue = team === 'blue';
  const teamColor = isBlue ? 'text-blue-400' : 'text-red-400';
  const panelClass = isBlue ? 'glass-panel-blue' : 'glass-panel-red';

  return (
    <div className={`${panelClass} p-4 rounded-xl flex flex-col gap-3`} id={`${team}-team`}>
      {/* Team header */}
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${isBlue ? 'bg-blue-500' : 'bg-red-500'}`} />
        <h3 className={`text-sm font-bold uppercase tracking-wider ${teamColor}`}>
          {team === 'blue' ? 'Blue Team' : 'Red Team'}
        </h3>
      </div>

      {/* Pick slots */}
      <div className="space-y-1">
        <p className="text-[0.65rem] text-steel-500 uppercase tracking-wider font-semibold">Picks</p>
        <div className="flex gap-2 flex-wrap">
          {picks.map((slot) => (
            <DraftSlot key={slot.id} slot={slot} isActive={activeSlotId === slot.id} />
          ))}
        </div>
      </div>

      {/* Ban slots */}
      <div className="space-y-1">
        <p className="text-[0.65rem] text-steel-500 uppercase tracking-wider font-semibold">Bans</p>
        <div className="flex gap-2 flex-wrap">
          {bans.map((slot) => (
            <DraftSlot key={slot.id} slot={slot} isActive={activeSlotId === slot.id} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Phase banner showing current action */
function PhaseIndicator() {
  const currentStepIndex = useDraftStore((s) => s.currentStepIndex);
  const draftOrder = useDraftStore((s) => s.draftOrder);
  const slots = useDraftStore((s) => s.slots);

  // Check if draft is complete
  const allFilled = slots.every((s) => s.hero !== null);
  if (allFilled) {
    return (
      <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
          Draft Complete
        </span>
      </div>
    );
  }

  const currentStep = draftOrder[currentStepIndex];
  if (!currentStep) return null;

  const isBlue = currentStep.team === 'blue';
  const isBan = currentStep.type === 'ban';
  const teamLabel = isBlue ? 'Blue Team' : 'Red Team';
  const actionLabel = isBan ? 'BAN' : 'PICK';
  const stepNum = currentStep.slotIndex + 1;

  // Count total bans/picks for phase display
  const totalBanSteps = draftOrder.filter((s) => s.type === 'ban').length;
  const totalPickSteps = draftOrder.filter((s) => s.type === 'pick').length;
  const completedBans = draftOrder.filter((s, i) => s.type === 'ban' && i < currentStepIndex).length;
  const completedPicks = draftOrder.filter((s, i) => s.type === 'pick' && i < currentStepIndex).length;
  const phaseProgress = isBan
    ? `Ban ${completedBans + 1}/${totalBanSteps}`
    : `Pick ${completedPicks + 1}/${totalPickSteps}`;

  const bgClass = isBan
    ? 'bg-red-500/10 border-red-500/30'
    : isBlue
      ? 'bg-blue-500/10 border-blue-500/30'
      : 'bg-red-500/10 border-red-500/30';

  const textClass = isBan
    ? 'text-red-400'
    : isBlue ? 'text-blue-400' : 'text-red-400';

  const dotClass = isBan
    ? 'bg-red-400 animate-pulse'
    : isBlue ? 'bg-blue-400 animate-pulse' : 'bg-red-400 animate-pulse';

  return (
    <div className={`flex items-center justify-between py-2 px-4 rounded-lg border ${bgClass}`}>
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full ${dotClass}`} />
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold uppercase tracking-wider ${textClass}`}>
            {teamLabel}
          </span>
          <ChevronRight className={`w-3 h-3 ${textClass} opacity-50`} />
          <span className={`text-xs font-black uppercase tracking-wider ${textClass}`}>
            {actionLabel} {stepNum}
          </span>
        </div>
      </div>
      <span className="text-[0.6rem] text-steel-500 font-medium tracking-wide">
        {phaseProgress}
      </span>
    </div>
  );
}

/** Draft order indicator */
function DraftOrderBar() {
  const currentStepIndex = useDraftStore((s) => s.currentStepIndex);
  const draftOrder = useDraftStore((s) => s.draftOrder);

  return (
    <div className="flex gap-1 overflow-x-auto py-2 px-1" id="draft-order-bar">
      {draftOrder.map((step, i) => {
        const isActive = i === currentStepIndex;
        const isDone = i < currentStepIndex;
        const bgColor = step.team === 'blue'
          ? isActive ? 'bg-blue-500' : isDone ? 'bg-blue-800' : 'bg-blue-900/40'
          : isActive ? 'bg-red-500' : isDone ? 'bg-red-800' : 'bg-red-900/40';

        return (
          <div
            key={i}
            className={`w-6 h-6 rounded flex items-center justify-center text-[0.5rem] font-bold ${bgColor} ${isActive ? 'ring-2 ring-gold-400 scale-110' : ''} transition-all`}
            title={`${step.team} ${step.type} ${step.slotIndex + 1}`}
          >
            {step.type === 'ban' ? 'B' : 'P'}
          </div>
        );
      })}
    </div>
  );
}

/** Main draft board layout */
export default function DraftBoard() {
  const { undo, redo, reset, mode, setMode, historyIndex, history } = useDraftStore();

  return (
    <div className="flex flex-col gap-4" id="draft-board">
      {/* Header controls */}
      <div className="flex items-center justify-between glass-panel p-3">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-gold-500" />
          <h2 className="text-lg font-bold">Draft Board</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode selector */}
          <div className="tab-bar">
            {(['ranked', 'manual'] as const).map((m) => (
              <button
                key={m}
                className={`tab-item ${mode === m ? 'active' : ''}`}
                onClick={() => setMode(m)}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          {/* Undo/Redo/Reset */}
          <button className="btn btn-ghost btn-sm" onClick={undo} disabled={historyIndex < 0} title="Undo">
            <Undo2 className="w-4 h-4" />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo">
            <Redo2 className="w-4 h-4" />
          </button>
          <button className="btn btn-danger btn-sm" onClick={reset} title="Reset Draft">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Phase indicator - NOW PICKING/BANNING banner */}
      {mode === 'ranked' && <PhaseIndicator />}

      {/* Draft order indicator */}
      {mode === 'ranked' && <DraftOrderBar />}

      {/* Team columns */}
      <div className="grid grid-cols-2 gap-4">
        <TeamColumn team="blue" />
        <TeamColumn team="red" />
      </div>
    </div>
  );
}
