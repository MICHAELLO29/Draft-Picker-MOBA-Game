/**
 * MPL PH Pro Draft Strategies — Season 40 Meta (Patch 2.1.67)
 * 
 * Each strategy defines a team composition archetype used in professional play.
 * The engine scores strategies based on which heroes are banned/available.
 * 
 * Updated: May 2026 — Reflects MPL PH S14, M6, and high-rank meta.
 * Sources: Pro tournament picks/bans, Mythical Glory tier lists.
 */

export interface StrategyHeroSlot {
  role: string;           // e.g. "Tank Jungler", "Healer", "Gold Laner"
  heroSlugs: string[];    // Preferred heroes for this slot (ordered by priority)
  required: boolean;      // If true, at least one hero must be available
}

export interface DraftStrategy {
  id: string;
  name: string;
  tag: string;            // Short classification (Sustain, Burst, Dive, etc.)
  emoji: string;          // Visual icon
  description: string;    // Brief explanation
  playstyle: string;      // How to play this comp
  slots: StrategyHeroSlot[];
  counteredBy: string[];  // Hero slugs that counter this strategy
  keyHeroes: string[];    // The signature heroes that define this strat
}

export const MPL_STRATEGIES: DraftStrategy[] = [
  {
    id: 'ube',
    name: 'UBE Strat',
    tag: 'Sustain',
    emoji: '',
    description: 'Unli-Burst-Engage — tanky jungler with healers for unbeatable sustain in 5v5.',
    playstyle: 'Group as 5, out-sustain all trades. Tank jungler absorbs while healers keep the team topped. Force prolonged fights.',
    slots: [
      { role: 'Tank Jungler', heroSlugs: ['akai', 'hilda', 'barats', 'baxia', 'hylos', 'belerick', 'fredrinn'], required: true },
      { role: 'Healer', heroSlugs: ['estes', 'floryn', 'rafaela', 'mathilda', 'chip'], required: true },
      { role: 'Off-Support', heroSlugs: ['faramis', 'angela', 'diggie', 'lolita', 'johnson'], required: false },
      { role: 'Gold Laner', heroSlugs: ['claude', 'brody', 'karrie', 'beatrix', 'bruno', 'melissa', 'wanwan'], required: false },
      { role: 'EXP Laner', heroSlugs: ['esmeralda', 'uranus', 'ruby', 'chou', 'phoveus', 'fredrinn', 'arlott'], required: false },
    ],
    counteredBy: ['baxia', 'esmeralda', 'saber', 'karina', 'nolan'],
    keyHeroes: ['estes', 'floryn', 'akai', 'barats', 'rafaela'],
  },
  {
    id: 'pickoff',
    name: 'Pickoff Comp',
    tag: 'Burst',
    emoji: '',
    description: 'Assassin-first draft — catch enemies out of position before fights start.',
    playstyle: 'Avoid 5v5. Use fog of war, assassin rotations, and vision denial. Win through number advantages in skirmishes.',
    slots: [
      { role: 'Assassin Core', heroSlugs: ['lancelot', 'ling', 'fanny', 'hayabusa', 'benedetta', 'joy', 'nolan', 'aamon'], required: true },
      { role: 'Setup Tank', heroSlugs: ['atlas', 'tigreal', 'khufra', 'franco', 'chou', 'chip'], required: true },
      { role: 'Mid Mage', heroSlugs: ['yve', 'valentina', 'kagura', 'xavier', 'pharsa', 'cecilion'], required: false },
      { role: 'Gold Laner', heroSlugs: ['beatrix', 'brody', 'wanwan', 'karrie', 'melissa'], required: false },
      { role: 'EXP Flex', heroSlugs: ['esmeralda', 'paquito', 'yu-zhong', 'arlott', 'cici', 'khaleed'], required: false },
    ],
    counteredBy: ['khufra', 'phoveus', 'saber', 'franco', 'kaja'],
    keyHeroes: ['lancelot', 'ling', 'fanny', 'nolan', 'atlas'],
  },
  {
    id: 'protect-carry',
    name: 'Protect the Carry',
    tag: 'Late Game',
    emoji: '',
    description: 'All resources funneled into a hyper-carry marksman with full team protection.',
    playstyle: 'Play safe early, scale into late. 4 members peel and shield the marksman. Win teamfights through sustained DPS in late game.',
    slots: [
      { role: 'Hyper Carry', heroSlugs: ['claude', 'wanwan', 'karrie', 'irithel', 'moskov', 'beatrix', 'melissa'], required: true },
      { role: 'Peeler', heroSlugs: ['estes', 'angela', 'mathilda', 'diggie', 'rafaela', 'chip'], required: true },
      { role: 'Frontline', heroSlugs: ['tigreal', 'lolita', 'atlas', 'hylos', 'belerick', 'fredrinn'], required: true },
      { role: 'Mid Mage', heroSlugs: ['pharsa', 'yve', 'cecilion', 'vale', 'kagura', 'xavier'], required: false },
      { role: 'EXP Offtank', heroSlugs: ['uranus', 'esmeralda', 'ruby', 'yu-zhong', 'thamuz', 'arlott'], required: false },
    ],
    counteredBy: ['natalia', 'lancelot', 'ling', 'saber', 'nolan'],
    keyHeroes: ['claude', 'wanwan', 'estes', 'angela', 'lolita'],
  },
  {
    id: 'dive-comp',
    name: 'Full Dive',
    tag: 'Aggressive',
    emoji: '',
    description: 'All-in teamfight comp — lock down and burst the backline in one rotation.',
    playstyle: 'Force 5v5s. Tank initiates, everyone follows up. Win through CC chains and burst damage coordination.',
    slots: [
      { role: 'Initiator', heroSlugs: ['atlas', 'tigreal', 'khufra', 'akai', 'johnson', 'chip'], required: true },
      { role: 'Dive Fighter', heroSlugs: ['paquito', 'chou', 'benedetta', 'martis', 'arlott', 'cici'], required: true },
      { role: 'Burst Core', heroSlugs: ['karina', 'harley', 'saber', 'roger', 'yi-sun-shin', 'nolan'], required: false },
      { role: 'Mid Mage', heroSlugs: ['valentina', 'yve', 'kadita', 'eudora', 'aurora', 'xavier'], required: false },
      { role: 'Gold Flex', heroSlugs: ['beatrix', 'brody', 'bruno', 'melissa', 'wanwan'], required: false },
    ],
    counteredBy: ['diggie', 'lolita', 'wanwan', 'valir', 'nana'],
    keyHeroes: ['atlas', 'tigreal', 'khufra', 'paquito', 'chou'],
  },
  {
    id: 'split-push',
    name: 'Split Push',
    tag: 'Macro',
    emoji: '',
    description: 'Macro-based split pressure — force enemies to choose which lane to defend.',
    playstyle: 'Avoid grouping. Strong laners push side lanes while the rest stall. Win through tower trades, lord timing, and map control.',
    slots: [
      { role: 'Split Pusher', heroSlugs: ['hayabusa', 'masha', 'sun', 'argus', 'zilong', 'arlott'], required: true },
      { role: 'EXP Fighter', heroSlugs: ['yu-zhong', 'esmeralda', 'khaleed', 'thamuz', 'phoveus', 'cici'], required: true },
      { role: 'Tank/Zone', heroSlugs: ['tigreal', 'atlas', 'franco', 'belerick', 'fredrinn'], required: false },
      { role: 'Mid Mage', heroSlugs: ['pharsa', 'yve', 'cecilion', 'chang-e', 'xavier'], required: false },
      { role: 'Gold Laner', heroSlugs: ['beatrix', 'brody', 'wanwan', 'claude', 'melissa'], required: false },
    ],
    counteredBy: ['natalia', 'aldous', 'johnson', 'nolan'],
    keyHeroes: ['hayabusa', 'masha', 'sun', 'yu-zhong'],
  },
  {
    id: 'turtle-lord',
    name: 'Objective Control',
    tag: 'Objective',
    emoji: '',
    description: 'Objective-focused comp — dominate turtle and lord to snowball gold leads.',
    playstyle: 'Prioritize every objective fight. Take turtles, build gold lead, force lord at power spikes. Win through resource advantage.',
    slots: [
      { role: 'Fast Core', heroSlugs: ['roger', 'yi-sun-shin', 'bane', 'aulus', 'karrie', 'nolan'], required: true },
      { role: 'Zone Tank', heroSlugs: ['atlas', 'tigreal', 'hylos', 'belerick', 'fredrinn'], required: true },
      { role: 'DPS Mage', heroSlugs: ['yve', 'pharsa', 'vale', 'lunox', 'xavier'], required: false },
      { role: 'Support', heroSlugs: ['mathilda', 'rafaela', 'estes', 'angela', 'chip'], required: false },
      { role: 'EXP Laner', heroSlugs: ['esmeralda', 'yu-zhong', 'khaleed', 'uranus', 'arlott'], required: false },
    ],
    counteredBy: ['fanny', 'natalia', 'franco', 'kaja'],
    keyHeroes: ['roger', 'yi-sun-shin', 'atlas', 'hylos'],
  },
  {
    id: 'wombo-combo',
    name: 'Wombo Combo',
    tag: 'Teamfight',
    emoji: '',
    description: 'Chain CC + AoE ultimates for devastating teamfight wipes.',
    playstyle: 'Wait for the perfect engage. Chain 3-4 AoE ultimates for a full team wipe. Win through coordination and one decisive fight.',
    slots: [
      { role: 'AoE Initiator', heroSlugs: ['atlas', 'tigreal', 'gatotkaca', 'johnson', 'chip'], required: true },
      { role: 'AoE Mage', heroSlugs: ['yve', 'vale', 'kadita', 'aurora', 'odette', 'xavier'], required: true },
      { role: 'Follow-up CC', heroSlugs: ['guinevere', 'ruby', 'silvanna', 'khufra', 'cici'], required: false },
      { role: 'Burst Core', heroSlugs: ['karina', 'harley', 'gusion', 'selena', 'nolan'], required: false },
      { role: 'Gold DPS', heroSlugs: ['beatrix', 'bruno', 'irithel', 'claude', 'melissa'], required: false },
    ],
    counteredBy: ['diggie', 'lolita', 'wanwan', 'chou'],
    keyHeroes: ['atlas', 'tigreal', 'yve', 'vale', 'gatotkaca'],
  },
  {
    id: 'flex-draft',
    name: 'Flex Priority',
    tag: 'Adaptive',
    emoji: '',
    description: 'Draft multi-role heroes early to hide your strategy — adapt based on enemy picks.',
    playstyle: 'Pick flex heroes in first rotation. Read enemy draft, then counter-pick in later phases. Win through draft advantage and adaptability.',
    slots: [
      { role: 'Flex Core', heroSlugs: ['chou', 'benedetta', 'esmeralda', 'mathilda', 'valentina', 'arlott'], required: true },
      { role: 'Flex Tank', heroSlugs: ['atlas', 'khufra', 'akai', 'fredrinn', 'chip'], required: true },
      { role: 'Adaptive Mid', heroSlugs: ['valentina', 'kagura', 'yve', 'xavier', 'pharsa'], required: false },
      { role: 'Gold Laner', heroSlugs: ['beatrix', 'wanwan', 'claude', 'brody', 'melissa'], required: false },
      { role: 'Counter Pick', heroSlugs: ['phoveus', 'diggie', 'lolita', 'nana', 'karina'], required: false },
    ],
    counteredBy: ['saber', 'franco', 'nolan'],
    keyHeroes: ['chou', 'esmeralda', 'valentina', 'atlas', 'benedetta'],
  },
];
