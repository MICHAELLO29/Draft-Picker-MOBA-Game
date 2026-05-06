import { useState } from 'react';
import { Save, FolderOpen, Copy, Trash2, Edit3, FileText } from 'lucide-react';
import { useStrategyStore } from '../../store/strategyStore';
import { useDraftStore } from '../../store/draftStore';

/** Notes panel with guided prompts */
function NotesPanel() {
  const { notes, updateNote } = useStrategyStore();

  const noteFields = [
    { key: 'winCondition' as const, label: 'Win Condition', placeholder: 'How does your team win fights and close the game?' },
    { key: 'keyObjectives' as const, label: 'Key Objectives', placeholder: 'Turtle timing, Lord push, tower targets...' },
    { key: 'teamWeakness' as const, label: 'Team Comp Weakness', placeholder: 'What is your comp vulnerable to?' },
    { key: 'priorityBans' as const, label: 'Priority Bans', placeholder: 'Must-ban heroes for next game...' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-gold-500" />
        <h3 className="text-sm font-bold">Strategy Notes</h3>
      </div>
      {noteFields.map((field) => (
        <div key={field.key}>
          <label className="text-[0.65rem] text-steel-400 uppercase tracking-wider font-semibold mb-1 block">
            {field.label}
          </label>
          <textarea
            className="note-textarea"
            placeholder={field.placeholder}
            value={notes[field.key]}
            onChange={(e) => updateNote(field.key, e.target.value)}
            rows={2}
          />
        </div>
      ))}
    </div>
  );
}

/** Saved strategies list */
function StrategiesList() {
  const { strategies, activeStrategyId, loadStrategy, deleteStrategy, renameStrategy, duplicateStrategy } = useStrategyStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  if (strategies.length === 0) {
    return (
      <p className="text-xs text-steel-500 text-center py-4">
        No saved strategies yet. Save your first draft!
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {strategies.map((strategy) => (
        <div
          key={strategy.id}
          className={`glass-panel p-3 flex items-center justify-between gap-2 cursor-pointer transition-all hover:border-gold-500/30
            ${activeStrategyId === strategy.id ? 'border-gold-500/50' : ''}`}
          onClick={() => loadStrategy(strategy.id)}
        >
          <div className="flex-1 min-w-0">
            {editingId === strategy.id ? (
              <input
                className="search-input text-xs py-1 px-2"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => {
                  renameStrategy(strategy.id, editName);
                  setEditingId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    renameStrategy(strategy.id, editName);
                    setEditingId(null);
                  }
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <p className="text-xs font-semibold text-white truncate">{strategy.name}</p>
            )}
            <p className="text-[0.6rem] text-steel-500 mt-0.5">
              {new Date(strategy.updatedAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              className="btn btn-ghost btn-sm p-1"
              onClick={() => { setEditingId(strategy.id); setEditName(strategy.name); }}
              title="Rename"
            >
              <Edit3 className="w-3 h-3" />
            </button>
            <button
              className="btn btn-ghost btn-sm p-1"
              onClick={() => duplicateStrategy(strategy.id)}
              title="Duplicate"
            >
              <Copy className="w-3 h-3" />
            </button>
            <button
              className="btn btn-danger btn-sm p-1"
              onClick={() => deleteStrategy(strategy.id)}
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Main strategy board */
export default function StrategyBoard() {
  const [strategyName, setStrategyName] = useState('');
  const saveStrategy = useStrategyStore((s) => s.saveStrategy);
  const draftStore = useDraftStore();

  const handleSave = () => {
    const name = strategyName.trim() || `Draft ${new Date().toLocaleTimeString()}`;
    saveStrategy(name, {
      bluePicks: draftStore.getTeamPicks('blue'),
      redPicks: draftStore.getTeamPicks('red'),
      blueBans: draftStore.getTeamBans('blue'),
      redBans: draftStore.getTeamBans('red'),
    });
    setStrategyName('');
  };

  return (
    <div className="glass-panel p-4 flex flex-col gap-4" id="strategy-board">
      <div className="flex items-center gap-2">
        <FolderOpen className="w-4 h-4 text-gold-500" />
        <h3 className="text-sm font-bold">Strategy Board</h3>
      </div>

      {/* Save form */}
      <div className="flex gap-2">
        <input
          type="text"
          className="search-input text-sm flex-1"
          placeholder="Strategy name..."
          style={{ paddingLeft: '12px' }}
          value={strategyName}
          onChange={(e) => setStrategyName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <button className="btn btn-primary btn-sm" onClick={handleSave}>
          <Save className="w-3.5 h-3.5" />
          Save
        </button>
      </div>

      {/* Saved strategies */}
      <StrategiesList />

      {/* Divider */}
      <div className="border-t border-white/5" />

      {/* Notes */}
      <NotesPanel />
    </div>
  );
}
