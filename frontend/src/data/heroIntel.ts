/**
 * Competitive Hero Intelligence
 * 
 * Maps hero slugs to pro-level data: flex roles, lane assignments,
 * power spikes, damage types, and draft phase priority.
 */

export interface HeroIntel {
  damageType: 'Physical' | 'Magic' | 'Mixed';
  powerSpike: 'Early' | 'Mid' | 'Late';
  flexRoles: string[];         // Roles this hero can realistically flex to
  laneAssignment: string[];    // EXP, MID, GOLD, JG, ROAM
  draftPriority: 'first-pick' | 'flex' | 'counter' | 'last-pick' | 'any';
}

/**
 * Draft priority meanings:
 * - first-pick: Contested OP hero, grab early before enemy takes it
 * - flex: Multi-role hero, great on P1-P2 because it hides your plan
 * - counter: Best used as a response pick (P3-P4)
 * - last-pick: Hard counter specialist, devastates on P5
 * - any: Safe at any point in the draft
 */

// Key MPL heroes with competitive intelligence
export const HERO_INTEL: Record<string, HeroIntel> = {
  // ── TANKS ──
  'atlas': {
    damageType: 'Magic', powerSpike: 'Mid', flexRoles: ['Tank', 'Support'],
    laneAssignment: ['ROAM'], draftPriority: 'first-pick',
  },
  'tigreal': {
    damageType: 'Physical', powerSpike: 'Mid', flexRoles: ['Tank'],
    laneAssignment: ['ROAM'], draftPriority: 'any',
  },
  'khufra': {
    damageType: 'Magic', powerSpike: 'Mid', flexRoles: ['Tank'],
    laneAssignment: ['ROAM', 'JG'], draftPriority: 'counter',
  },
  'akai': {
    damageType: 'Physical', powerSpike: 'Mid', flexRoles: ['Tank', 'Fighter'],
    laneAssignment: ['ROAM', 'JG'], draftPriority: 'flex',
  },
  'hylos': {
    damageType: 'Magic', powerSpike: 'Mid', flexRoles: ['Tank'],
    laneAssignment: ['ROAM', 'EXP'], draftPriority: 'any',
  },
  'franco': {
    damageType: 'Physical', powerSpike: 'Early', flexRoles: ['Tank'],
    laneAssignment: ['ROAM'], draftPriority: 'counter',
  },
  'lolita': {
    damageType: 'Physical', powerSpike: 'Mid', flexRoles: ['Tank', 'Support'],
    laneAssignment: ['ROAM'], draftPriority: 'counter',
  },
  'johnson': {
    damageType: 'Physical', powerSpike: 'Mid', flexRoles: ['Tank'],
    laneAssignment: ['ROAM'], draftPriority: 'any',
  },
  'gatotkaca': {
    damageType: 'Magic', powerSpike: 'Mid', flexRoles: ['Tank', 'Fighter'],
    laneAssignment: ['ROAM', 'EXP'], draftPriority: 'flex',
  },
  'belerick': {
    damageType: 'Magic', powerSpike: 'Late', flexRoles: ['Tank'],
    laneAssignment: ['ROAM', 'EXP'], draftPriority: 'any',
  },
  'grock': {
    damageType: 'Physical', powerSpike: 'Early', flexRoles: ['Tank', 'Fighter'],
    laneAssignment: ['ROAM', 'EXP'], draftPriority: 'flex',
  },

  // ── FIGHTERS ──
  'chou': {
    damageType: 'Physical', powerSpike: 'Mid', flexRoles: ['Fighter', 'Tank', 'Assassin'],
    laneAssignment: ['EXP', 'ROAM', 'JG'], draftPriority: 'flex',
  },
  'paquito': {
    damageType: 'Physical', powerSpike: 'Early', flexRoles: ['Fighter'],
    laneAssignment: ['EXP', 'JG'], draftPriority: 'flex',
  },
  'yu-zhong': {
    damageType: 'Physical', powerSpike: 'Mid', flexRoles: ['Fighter'],
    laneAssignment: ['EXP'], draftPriority: 'any',
  },
  'esmeralda': {
    damageType: 'Magic', powerSpike: 'Mid', flexRoles: ['Fighter', 'Mage', 'Tank'],
    laneAssignment: ['EXP', 'JG', 'ROAM'], draftPriority: 'flex',
  },
  'khaleed': {
    damageType: 'Physical', powerSpike: 'Early', flexRoles: ['Fighter'],
    laneAssignment: ['EXP'], draftPriority: 'any',
  },
  'phoveus': {
    damageType: 'Magic', powerSpike: 'Mid', flexRoles: ['Fighter'],
    laneAssignment: ['EXP'], draftPriority: 'last-pick',
  },
  'thamuz': {
    damageType: 'Physical', powerSpike: 'Early', flexRoles: ['Fighter'],
    laneAssignment: ['EXP'], draftPriority: 'any',
  },
  'ruby': {
    damageType: 'Physical', powerSpike: 'Mid', flexRoles: ['Fighter', 'Tank'],
    laneAssignment: ['EXP'], draftPriority: 'any',
  },
  'uranus': {
    damageType: 'Magic', powerSpike: 'Late', flexRoles: ['Tank', 'Fighter'],
    laneAssignment: ['EXP'], draftPriority: 'any',
  },

  // ── ASSASSINS ──
  'lancelot': {
    damageType: 'Physical', powerSpike: 'Mid', flexRoles: ['Assassin'],
    laneAssignment: ['JG'], draftPriority: 'first-pick',
  },
  'ling': {
    damageType: 'Physical', powerSpike: 'Mid', flexRoles: ['Assassin'],
    laneAssignment: ['JG'], draftPriority: 'first-pick',
  },
  'fanny': {
    damageType: 'Physical', powerSpike: 'Early', flexRoles: ['Assassin'],
    laneAssignment: ['JG'], draftPriority: 'last-pick',
  },
  'hayabusa': {
    damageType: 'Physical', powerSpike: 'Mid', flexRoles: ['Assassin'],
    laneAssignment: ['JG', 'EXP'], draftPriority: 'counter',
  },
  'benedetta': {
    damageType: 'Physical', powerSpike: 'Mid', flexRoles: ['Assassin', 'Fighter'],
    laneAssignment: ['EXP', 'JG'], draftPriority: 'flex',
  },
  'saber': {
    damageType: 'Physical', powerSpike: 'Mid', flexRoles: ['Assassin'],
    laneAssignment: ['JG'], draftPriority: 'counter',
  },
  'karina': {
    damageType: 'Magic', powerSpike: 'Mid', flexRoles: ['Assassin', 'Mage'],
    laneAssignment: ['JG'], draftPriority: 'any',
  },
  'gusion': {
    damageType: 'Magic', powerSpike: 'Early', flexRoles: ['Assassin', 'Mage'],
    laneAssignment: ['JG', 'MID'], draftPriority: 'flex',
  },
  'joy': {
    damageType: 'Magic', powerSpike: 'Mid', flexRoles: ['Assassin'],
    laneAssignment: ['JG'], draftPriority: 'first-pick',
  },
  'natalia': {
    damageType: 'Physical', powerSpike: 'Mid', flexRoles: ['Assassin'],
    laneAssignment: ['JG', 'ROAM'], draftPriority: 'last-pick',
  },
  'helcurt': {
    damageType: 'Physical', powerSpike: 'Mid', flexRoles: ['Assassin'],
    laneAssignment: ['JG'], draftPriority: 'last-pick',
  },

  // ── MAGES ──
  'valentina': {
    damageType: 'Magic', powerSpike: 'Mid', flexRoles: ['Mage', 'Assassin'],
    laneAssignment: ['MID', 'JG'], draftPriority: 'flex',
  },
  'yve': {
    damageType: 'Magic', powerSpike: 'Mid', flexRoles: ['Mage'],
    laneAssignment: ['MID'], draftPriority: 'any',
  },
  'pharsa': {
    damageType: 'Magic', powerSpike: 'Late', flexRoles: ['Mage'],
    laneAssignment: ['MID'], draftPriority: 'any',
  },
  'kagura': {
    damageType: 'Magic', powerSpike: 'Mid', flexRoles: ['Mage'],
    laneAssignment: ['MID'], draftPriority: 'any',
  },
  'cecilion': {
    damageType: 'Magic', powerSpike: 'Late', flexRoles: ['Mage'],
    laneAssignment: ['MID', 'GOLD'], draftPriority: 'any',
  },
  'vale': {
    damageType: 'Magic', powerSpike: 'Mid', flexRoles: ['Mage'],
    laneAssignment: ['MID'], draftPriority: 'any',
  },
  'kadita': {
    damageType: 'Magic', powerSpike: 'Mid', flexRoles: ['Mage', 'Assassin'],
    laneAssignment: ['MID', 'JG'], draftPriority: 'counter',
  },
  'harley': {
    damageType: 'Magic', powerSpike: 'Early', flexRoles: ['Mage', 'Assassin'],
    laneAssignment: ['JG', 'MID'], draftPriority: 'flex',
  },
  'lunox': {
    damageType: 'Magic', powerSpike: 'Mid', flexRoles: ['Mage'],
    laneAssignment: ['MID'], draftPriority: 'any',
  },
  'selena': {
    damageType: 'Magic', powerSpike: 'Early', flexRoles: ['Mage', 'Assassin', 'Support'],
    laneAssignment: ['MID', 'ROAM'], draftPriority: 'flex',
  },

  // ── MARKSMEN ──
  'beatrix': {
    damageType: 'Physical', powerSpike: 'Mid', flexRoles: ['Marksman'],
    laneAssignment: ['GOLD', 'MID'], draftPriority: 'first-pick',
  },
  'brody': {
    damageType: 'Physical', powerSpike: 'Early', flexRoles: ['Marksman'],
    laneAssignment: ['GOLD', 'EXP'], draftPriority: 'flex',
  },
  'bruno': {
    damageType: 'Physical', powerSpike: 'Late', flexRoles: ['Marksman'],
    laneAssignment: ['GOLD'], draftPriority: 'any',
  },
  'claude': {
    damageType: 'Physical', powerSpike: 'Late', flexRoles: ['Marksman'],
    laneAssignment: ['GOLD'], draftPriority: 'any',
  },
  'wanwan': {
    damageType: 'Physical', powerSpike: 'Late', flexRoles: ['Marksman'],
    laneAssignment: ['GOLD'], draftPriority: 'last-pick',
  },
  'karrie': {
    damageType: 'Mixed', powerSpike: 'Mid', flexRoles: ['Marksman'],
    laneAssignment: ['GOLD', 'JG'], draftPriority: 'flex',
  },
  'moskov': {
    damageType: 'Physical', powerSpike: 'Late', flexRoles: ['Marksman'],
    laneAssignment: ['GOLD'], draftPriority: 'any',
  },
  'irithel': {
    damageType: 'Physical', powerSpike: 'Late', flexRoles: ['Marksman'],
    laneAssignment: ['GOLD'], draftPriority: 'any',
  },
  'popol-and-kupa': {
    damageType: 'Physical', powerSpike: 'Mid', flexRoles: ['Marksman', 'Support'],
    laneAssignment: ['GOLD', 'ROAM'], draftPriority: 'flex',
  },
  'yi-sun-shin': {
    damageType: 'Physical', powerSpike: 'Mid', flexRoles: ['Marksman', 'Assassin'],
    laneAssignment: ['JG', 'GOLD'], draftPriority: 'flex',
  },

  // ── SUPPORTS ──
  'estes': {
    damageType: 'Magic', powerSpike: 'Mid', flexRoles: ['Support'],
    laneAssignment: ['ROAM'], draftPriority: 'any',
  },
  'angela': {
    damageType: 'Magic', powerSpike: 'Mid', flexRoles: ['Support'],
    laneAssignment: ['ROAM'], draftPriority: 'any',
  },
  'mathilda': {
    damageType: 'Magic', powerSpike: 'Early', flexRoles: ['Support', 'Assassin'],
    laneAssignment: ['ROAM', 'JG'], draftPriority: 'flex',
  },
  'rafaela': {
    damageType: 'Magic', powerSpike: 'Mid', flexRoles: ['Support'],
    laneAssignment: ['ROAM'], draftPriority: 'any',
  },
  'diggie': {
    damageType: 'Magic', powerSpike: 'Mid', flexRoles: ['Support'],
    laneAssignment: ['ROAM'], draftPriority: 'counter',
  },
  'floryn': {
    damageType: 'Magic', powerSpike: 'Late', flexRoles: ['Support'],
    laneAssignment: ['ROAM'], draftPriority: 'any',
  },
  'faramis': {
    damageType: 'Magic', powerSpike: 'Mid', flexRoles: ['Support', 'Mage'],
    laneAssignment: ['ROAM', 'MID'], draftPriority: 'flex',
  },
};
