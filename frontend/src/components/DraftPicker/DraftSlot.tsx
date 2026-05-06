import { useState, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { X } from 'lucide-react';
import type { DraftSlot as DraftSlotType } from '../../types';
import { useDraftStore } from '../../store/draftStore';
import { useHeroImage } from '../../utils/imageUtils';

interface Props {
  slot: DraftSlotType;
  isActive: boolean;
}

export default function DraftSlot({ slot, isActive }: Props) {
  const [imgError, setImgError] = useState(false);
  const clearSlot = useDraftStore((s) => s.clearSlot);
  const activeTargetId = useDraftStore((s) => s.activeTargetId);
  const setActiveTarget = useDraftStore((s) => s.setActiveTarget);
  const heroImageUrl = useHeroImage(slot.hero?.name ?? '');

  // Reset imgError when the hero in this slot changes
  useEffect(() => { setImgError(false); }, [slot.hero?.name]);
  
  const { setNodeRef, isOver } = useDroppable({
    id: slot.id,
    data: { slot },
  });

  const isBan = slot.type === 'ban';
  const isFilled = !!slot.hero;
  const isTargeted = activeTargetId === slot.id;

  return (
    <div
      ref={setNodeRef}
      className={`draft-slot ${isActive ? 'active' : ''} ${isFilled ? 'filled cursor-pointer' : ''} ${isBan ? 'ban-slot' : ''} ${isOver ? 'ring-2 ring-gold-400' : ''} ${isTargeted ? 'ring-2 ring-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.5)]' : ''}`}
      role="button"
      aria-label={`${slot.team} ${slot.type} slot ${slot.index + 1}${slot.hero ? `: ${slot.hero.name}` : ''}`}
      id={`slot-${slot.id}`}
      onClick={() => {
        if (slot.hero) {
          setActiveTarget(isTargeted ? null : slot.id);
        }
      }}
    >
      {slot.hero ? (
        <div className="relative w-full h-full animate-scale-in group">
          {heroImageUrl && !imgError ? (
            <img
              src={heroImageUrl}
              alt={slot.hero.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center text-xl font-bold ${isBan ? 'text-steel-400 bg-navy-800' : 'text-gold-500 bg-navy-600'}`}>
              {slot.hero.name.charAt(0)}
            </div>
          )}
          <p className="absolute bottom-0 left-0 right-0 text-[0.55rem] text-center text-white bg-black/70 px-1 py-0.5 truncate font-semibold">
            {slot.hero.name}
          </p>
          <button
            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-600/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onClick={(e) => {
              e.stopPropagation();
              clearSlot(slot.id);
              if (isTargeted) setActiveTarget(null);
            }}
            aria-label={`Remove ${slot.hero.name}`}
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      ) : (
        <span className="text-xs text-steel-500 font-semibold">
          {isBan ? 'BAN' : slot.index + 1}
        </span>
      )}
    </div>
  );
}
