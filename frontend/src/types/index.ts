/** Hero as received from the backend API */
export interface Hero {
  name: string;
  slug: string;
  roles: string[];
  portraitUrl: string;
  tier?: string;
  winRate?: number;
  pickRate?: number;
  banRate?: number;
}

/** Counter pick suggestion */
export interface CounterPick {
  heroName: string;
  heroSlug: string;
  portraitUrl: string;
  matchupWinRate: number;
  winRateDelta: number;
  phaseStrengths: ('Early' | 'Mid' | 'Late')[];
  difficulty?: string;
  description?: string;
  scrapeTimestamp: string;
  sourceUrl: string;
}

/** Counter result with both directions */
export interface CounterResult {
  strongAgainst: CounterPick[];
  weakAgainst: CounterPick[];
}

/** Pro meta entry from MPL PH tournament data */
export interface ProMetaEntry {
  heroName: string;
  heroSlug: string;
  pickCount?: number;
  banCount?: number;
  proWinRate?: number;
  category: 'pick' | 'ban' | 'winrate';
}

/** Pro meta data from MPL PH */
export interface ProMetaData {
  topPicks: ProMetaEntry[];
  topBans: ProMetaEntry[];
  topWinRates: ProMetaEntry[];
  scrapeTimestamp: string;
  source: string;
}

/** API envelope from backend */
export interface ApiEnvelope<T> {
  data: T;
  meta: {
    source: string;
    lastUpdated: string;
    cacheStatus: 'hit' | 'miss' | 'stale';
    isStale: boolean;
    patch?: string;
  };
}

/** Draft slot types */
export type SlotType = 'pick' | 'ban';
export type TeamSide = 'blue' | 'red';

/** A slot in the draft board */
export interface DraftSlot {
  id: string;
  type: SlotType;
  team: TeamSide;
  index: number;
  hero: Hero | null;
}

/** Draft action for history stack */
export interface DraftAction {
  type: 'pick' | 'ban' | 'clear' | 'swap';
  slotId: string;
  hero: Hero | null;
  previousHero: Hero | null;
  timestamp: number;
}

/** Draft order step */
export interface DraftOrderStep {
  team: TeamSide;
  type: SlotType;
  slotIndex: number;
}

/** Map waypoint */
export interface Waypoint {
  id: string;
  heroSlug?: string;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  label?: string;
  team: TeamSide;
}

/** Map arrow between waypoints */
export interface MapArrow {
  id: string;
  fromId: string;
  toId: string;
  team: TeamSide;
}

/** Game phase for map planning */
export type GamePhase = 'early' | 'mid' | 'late';

/** Saved strategy */
export interface Strategy {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  draft: {
    bluePicks: (Hero | null)[];
    redPicks: (Hero | null)[];
    blueBans: (Hero | null)[];
    redBans: (Hero | null)[];
  };
  mapPhases: Record<GamePhase, {
    waypoints: Waypoint[];
    arrows: MapArrow[];
  }>;
  notes: {
    winCondition: string;
    keyObjectives: string;
    teamWeakness: string;
    priorityBans: string;
  };
}

/** Synergy tag */
export interface SynergyTag {
  label: string;
  type: 'positive' | 'warning' | 'neutral';
  description?: string;
}

/** Threat pattern */
export interface ThreatPattern {
  label: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}
