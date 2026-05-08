/**
 * MPL PH Pro Draft Strategies
 * 
 * Each strategy defines a team composition archetype used in professional play.
 * The engine scores strategies based on which heroes are banned/available.
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
    emoji: '🟣',
    description: 'Unli-Burst-Engage — tanky jungler with multiple healers/supports for unbeatable sustain.',
    playstyle: 'Group as 5, sustain through fights, outpace enemy healing with raw durability. Tank jungler dives and absorbs while supports keep the team alive.',
    slots: [
      { role: 'Tank Jungler', heroSlugs: ['akai', 'hilda', 'barats', 'baxia', 'hylos', 'belerick'], required: true },
      { role: 'Healer / Support', heroSlugs: ['estes', 'floryn', 'rafaela', 'mathilda'], required: true },
      { role: 'Off-Support', heroSlugs: ['faramis', 'angela', 'diggie', 'lolita'], required: false },
      { role: 'Gold Laner', heroSlugs: ['claude', 'brody', 'karrie', 'beatrix', 'bruno'], required: false },
      { role: 'EXP Laner', heroSlugs: ['esmeralda', 'uranus', 'ruby', 'chou', 'phoveus'], required: false },
    ],
    counteredBy: ['baxia', 'dominance-ice', 'esmeralda', 'saber', 'karina'],
    keyHeroes: ['estes', 'floryn', 'akai', 'barats', 'rafaela'],
  },
  {
    id: 'pickoff',
    name: 'Pickoff Comp',
    tag: 'Burst',
    emoji: '🗡️',
    description: 'High burst assassination comp — pick off key targets before teamfights begin.',
    playstyle: 'Avoid full 5v5s. Use vision control and assassin rotations to catch enemies out of position. Win through numbers advantage.',
    slots: [
      { role: 'Assassin Core', heroSlugs: ['lancelot', 'ling', 'fanny', 'hayabusa', 'benedetta', 'joy'], required: true },
      { role: 'Setup / Tank', heroSlugs: ['atlas', 'tigreal', 'khufra', 'franco', 'chou'], required: true },
      { role: 'Mid Mage', heroSlugs: ['yve', 'valentina', 'pharsa', 'kagura', 'cecilion'], required: false },
      { role: 'Gold Laner', heroSlugs: ['beatrix', 'brody', 'wanwan', 'karrie'], required: false },
      { role: 'EXP / Flex', heroSlugs: ['esmeralda', 'paquito', 'khaleed', 'yu-zhong'], required: false },
    ],
    counteredBy: ['khufra', 'phoveus', 'saber', 'franco', 'kaja'],
    keyHeroes: ['lancelot', 'ling', 'fanny', 'atlas', 'khufra'],
  },
  {
    id: 'protect-carry',
    name: 'Protect the Carry',
    tag: 'Late Game',
    emoji: '🛡️',
    description: 'Funnel all resources into a hyper-carry marksman with full team peeling.',
    playstyle: 'Play safe early, scale into late game. All 4 members peel and protect the marksman. Win teamfights through sustained DPS.',
    slots: [
      { role: 'Hyper Carry', heroSlugs: ['claude', 'wanwan', 'karrie', 'irithel', 'moskov', 'beatrix'], required: true },
      { role: 'Support', heroSlugs: ['estes', 'angela', 'mathilda', 'diggie', 'rafaela'], required: true },
      { role: 'Tank / Peeler', heroSlugs: ['tigreal', 'lolita', 'atlas', 'hylos', 'belerick'], required: true },
      { role: 'Mid Mage', heroSlugs: ['pharsa', 'yve', 'cecilion', 'vale', 'kagura'], required: false },
      { role: 'EXP Offtank', heroSlugs: ['uranus', 'esmeralda', 'ruby', 'yu-zhong', 'thamuz'], required: false },
    ],
    counteredBy: ['natalia', 'lancelot', 'ling', 'saber', 'helcurt'],
    keyHeroes: ['claude', 'wanwan', 'estes', 'angela', 'lolita'],
  },
  {
    id: 'dive-comp',
    name: 'Full Dive',
    tag: 'Aggressive',
    emoji: '⚡',
    description: 'All-in team fight composition — dive onto the backline and burst them down.',
    playstyle: 'Force 5v5 fights. Tank engages, everyone follows. Win through superior teamfight execution and CC chains.',
    slots: [
      { role: 'Engage Tank', heroSlugs: ['atlas', 'tigreal', 'khufra', 'akai', 'johnson'], required: true },
      { role: 'Dive Fighter', heroSlugs: ['paquito', 'chou', 'benedetta', 'martis', 'alpha'], required: true },
      { role: 'Burst Jungler', heroSlugs: ['karina', 'harley', 'saber', 'roger', 'yi-sun-shin'], required: false },
      { role: 'Mid Mage', heroSlugs: ['valentina', 'yve', 'kadita', 'eudora', 'aurora'], required: false },
      { role: 'Gold / Flex', heroSlugs: ['beatrix', 'brody', 'bruno', 'popol-and-kupa'], required: false },
    ],
    counteredBy: ['diggie', 'lolita', 'wanwan', 'valir', 'nana'],
    keyHeroes: ['atlas', 'tigreal', 'khufra', 'paquito', 'chou'],
  },
  {
    id: 'split-push',
    name: 'Split Push',
    tag: 'Macro',
    emoji: '🔀',
    description: 'Apply pressure across multiple lanes — force enemies to split up and pick them off.',
    playstyle: 'Avoid grouping. Use strong laners to push side lanes while the rest stall. Win through macro, tower trades, and lord control.',
    slots: [
      { role: 'Split Pusher', heroSlugs: ['hayabusa', 'masha', 'sun', 'argus', 'zilong', 'aldous'], required: true },
      { role: 'EXP Fighter', heroSlugs: ['yu-zhong', 'esmeralda', 'khaleed', 'thamuz', 'phoveus'], required: true },
      { role: 'Tank / Zone', heroSlugs: ['tigreal', 'atlas', 'franco', 'belerick'], required: false },
      { role: 'Mid Mage', heroSlugs: ['pharsa', 'yve', 'cecilion', 'chang-e'], required: false },
      { role: 'Gold Laner', heroSlugs: ['beatrix', 'brody', 'wanwan', 'claude'], required: false },
    ],
    counteredBy: ['natalia', 'aldous', 'johnson', 'helcurt'],
    keyHeroes: ['hayabusa', 'masha', 'sun', 'yu-zhong'],
  },
  {
    id: 'turtle-lord',
    name: 'Turtle-Lord Control',
    tag: 'Objective',
    emoji: '🐢',
    description: 'Objective-focused comp — dominate turtle and lord to snowball gold advantage.',
    playstyle: 'Prioritize objective fights. Take every turtle, build gold lead, force lord at power spikes. Win through resource control.',
    slots: [
      { role: 'Fast Jungler', heroSlugs: ['roger', 'yi-sun-shin', 'bane', 'aulus', 'karrie'], required: true },
      { role: 'Zone Tank', heroSlugs: ['atlas', 'tigreal', 'hylos', 'belerick', 'grock'], required: true },
      { role: 'DPS Mage', heroSlugs: ['yve', 'pharsa', 'vale', 'lunox'], required: false },
      { role: 'Support', heroSlugs: ['mathilda', 'rafaela', 'estes', 'angela'], required: false },
      { role: 'EXP Laner', heroSlugs: ['esmeralda', 'yu-zhong', 'khaleed', 'uranus'], required: false },
    ],
    counteredBy: ['fanny', 'natalia', 'franco', 'kaja'],
    keyHeroes: ['roger', 'yi-sun-shin', 'atlas', 'hylos'],
  },
  {
    id: 'wombo-combo',
    name: 'Wombo Combo',
    tag: 'Teamfight',
    emoji: '💥',
    description: 'Chain CC + AoE ultimates for devastating teamfight wipes.',
    playstyle: 'Wait for the perfect engage. Chain 3-4 AoE ultimates for a full team wipe. Win through coordination and one perfect fight.',
    slots: [
      { role: 'AoE Initiator', heroSlugs: ['atlas', 'tigreal', 'gatotkaca', 'johnson'], required: true },
      { role: 'AoE Mage', heroSlugs: ['yve', 'vale', 'kadita', 'aurora', 'odette', 'gord'], required: true },
      { role: 'Follow-up CC', heroSlugs: ['guinevere', 'ruby', 'silvanna', 'khufra'], required: false },
      { role: 'Burst Jungler', heroSlugs: ['karina', 'harley', 'gusion', 'selena'], required: false },
      { role: 'Gold DPS', heroSlugs: ['beatrix', 'bruno', 'irithel', 'claude'], required: false },
    ],
    counteredBy: ['diggie', 'lolita', 'wanwan', 'purify'],
    keyHeroes: ['atlas', 'tigreal', 'yve', 'vale', 'gatotkaca'],
  },
];
