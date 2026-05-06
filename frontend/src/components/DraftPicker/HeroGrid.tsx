import { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Search } from 'lucide-react';
import type { Hero } from '../../types';
import { useDraftStore } from '../../store/draftStore';
import { useHeroImage } from '../../utils/imageUtils';

/** Single draggable hero card */
function HeroCard({ hero, isDimmed }: { hero: Hero; isDimmed: boolean }) {
  const [imgError, setImgError] = useState(false);
  const heroImageUrl = useHeroImage(hero.name);
  const setPreviewHero = useDraftStore((s) => s.setPreviewHero);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `hero-${hero.slug}`,
    data: { hero },
    disabled: isDimmed,
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 100 }
    : undefined;

  // Get win rate color class
  const wrClass = hero.winRate
    ? hero.winRate >= 52 ? 'wr-high' : hero.winRate >= 48 ? 'wr-mid' : 'wr-low'
    : '';

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className={`hero-card flex flex-col items-center justify-center p-2 min-h-[110px] w-full ${isDimmed ? 'dimmed' : ''} ${isDragging ? 'opacity-60' : ''}`}
      onClick={() => !isDimmed && setPreviewHero(hero)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!isDimmed) setPreviewHero(hero);
        }
      }}
      role="button"
      tabIndex={isDimmed ? -1 : 0}
      aria-label={`Select ${hero.name}`}
      aria-disabled={isDimmed}
      id={`hero-card-${hero.slug}`}
    >
      {/* Hero portrait image */}
      {heroImageUrl && !imgError ? (
        <img
          src={heroImageUrl}
          alt={hero.name}
          className="w-12 h-12 rounded object-cover border border-slate-700 bg-navy-600 mb-1"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <div className="w-12 h-12 rounded bg-navy-600 flex items-center justify-center text-lg font-bold text-gold-500 mb-1">
          {hero.name.charAt(0)}
        </div>
      )}

      {/* Hero name */}
      <p className="text-xs font-semibold text-white truncate w-full text-center leading-tight" title={hero.name}>
        {hero.name}
      </p>

      {/* Role badges + tier */}
      <div className="flex items-center justify-center gap-1 mt-1 flex-wrap w-full">
        {hero.tier && (
          <span className={`tier-badge tier-${hero.tier.toLowerCase()}`}>
            {hero.tier}
          </span>
        )}
        {hero.roles.slice(0, 1).map((role) => (
          <span key={role} className="role-badge">{role.slice(0, 3)}</span>
        ))}
      </div>

      {/* Win rate */}
      {hero.winRate !== undefined && (
        <p className={`text-[0.65rem] mt-1 font-semibold ${wrClass}`}>
          {hero.winRate.toFixed(1)}%
        </p>
      )}
    </div>
  );
}

/** Hero roster grid with search, filter, and sort */
export default function HeroGrid({ heroes }: { heroes: Hero[] }) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'name' | 'tier' | 'winRate'>('name');

  const slots = useDraftStore((s) => s.slots);
  const usedSlugs = useMemo(() => {
    const slugs = new Set<string>();
    slots.filter((s) => s.hero).forEach((s) => slugs.add(s.hero!.slug));
    return slugs;
  }, [slots]);

  const roles = ['All', 'Tank', 'Fighter', 'Assassin', 'Mage', 'Marksman', 'Support'];
  const tierOrder: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 };

  const filtered = useMemo(() => {
    let result = heroes;

    // Search
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter((h) => h.name.toLowerCase().includes(lower));
    }

    // Role filter
    if (roleFilter !== 'All') {
      result = result.filter((h) => h.roles.includes(roleFilter));
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'tier') {
        return (tierOrder[a.tier ?? 'D'] ?? 4) - (tierOrder[b.tier ?? 'D'] ?? 4);
      }
      if (sortBy === 'winRate') return (b.winRate ?? 0) - (a.winRate ?? 0);
      return 0;
    });

    return result;
  }, [heroes, search, roleFilter, sortBy]);

  return (
    <div className="glass-panel p-3 h-full flex flex-col gap-3" id="hero-roster">
      <h2 className="text-lg font-bold tracking-wide">Heroes</h2>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-500" />
        <input
          type="text"
          className="search-input"
          placeholder="Search hero..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          id="hero-search"
        />
      </div>

      {/* Role filter tabs */}
      <div className="tab-bar overflow-x-auto">
        {roles.map((role) => (
          <button
            key={role}
            className={`tab-item whitespace-nowrap ${roleFilter === role ? 'active' : ''}`}
            onClick={() => setRoleFilter(role)}
            id={`role-filter-${role.toLowerCase()}`}
          >
            {role}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex gap-1">
        {(['name', 'tier', 'winRate'] as const).map((s) => (
          <button
            key={s}
            className={`btn btn-sm ${sortBy === s ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setSortBy(s)}
          >
            {s === 'winRate' ? 'WR' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Hero grid */}
      <div className="grid grid-cols-3 gap-2 overflow-y-auto flex-1 pr-1" id="hero-grid">
        {filtered.map((hero) => (
          <HeroCard
            key={hero.slug}
            hero={hero}
            isDimmed={usedSlugs.has(hero.slug)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-3 text-center text-steel-500 py-8 text-sm">
            No heroes found
          </p>
        )}
      </div>

      <p className="text-xs text-steel-500 text-center">
        {filtered.length} / {heroes.length} heroes
      </p>
    </div>
  );
}
