import type { Hero, SynergyTag, ThreatPattern } from '../types';



/** Detect synergy tags from allied team picks */
export function detectSynergies(allies: Hero[]): SynergyTag[] {
  const tags: SynergyTag[] = [];
  if (allies.length < 2) return tags;

  const allRoles = allies.flatMap((h) => h.roles);

  // Check for AoE engage combo
  const hasTank = allRoles.includes('Tank');
  const hasMage = allRoles.includes('Mage');
  if (hasTank && hasMage) {
    tags.push({ label: 'Engage + AoE Burst', type: 'positive', description: 'Tank initiation into mage burst damage' });
  }

  // Check for sustain comp
  const hasSupport = allRoles.includes('Support');
  const hasFighter = allRoles.includes('Fighter');
  if (hasSupport && (hasTank || hasFighter)) {
    tags.push({ label: 'Peel + Sustain', type: 'positive', description: 'Support sustain with frontline protection' });
  }

  // Check for assassin pickoff
  const hasAssassin = allRoles.includes('Assassin');
  if (hasAssassin && hasTank) {
    tags.push({ label: 'Pickoff', type: 'positive', description: 'Assassin picks with tank zone control' });
  }

  // Check for split push
  const fighters = allies.filter((h) => h.roles.includes('Fighter'));
  if (fighters.length >= 2) {
    tags.push({ label: 'Split Push', type: 'neutral', description: 'Multiple fighters can apply side-lane pressure' });
  }

  // Check for protect the carry
  const hasMarksman = allRoles.includes('Marksman');
  if (hasMarksman && hasSupport && hasTank) {
    tags.push({ label: 'Protect the Marksman', type: 'positive', description: 'Full peel composition for marksman carry' });
  }

  return tags;
}

/** Detect composition warnings for missing roles */
export function detectCompWarnings(allies: Hero[]): SynergyTag[] {
  const warnings: SynergyTag[] = [];
  if (allies.length < 3) return warnings;

  const allRoles = allies.flatMap((h) => h.roles);

  if (!allRoles.includes('Tank') && !allRoles.includes('Fighter')) {
    warnings.push({ label: 'No Frontline', type: 'warning', description: 'Team lacks a frontline tank or fighter' });
  }
  if (!allRoles.includes('Tank')) {
    warnings.push({ label: 'No Engage', type: 'warning', description: 'Team lacks a tank for reliable engagement' });
  }
  if (!allRoles.includes('Mage')) {
    warnings.push({ label: 'No Magic Damage', type: 'warning', description: 'Team is all physical — enemies can stack physical defense' });
  }
  if (!allRoles.includes('Marksman') && !allRoles.some((r) => r === 'Mage')) {
    warnings.push({ label: 'No Late-Game Damage', type: 'warning', description: 'Team may fall off in late game without a carry' });
  }

  return warnings;
}

/** Detect threat patterns from enemy team */
export function detectThreats(enemies: Hero[]): ThreatPattern[] {
  const threats: ThreatPattern[] = [];
  if (enemies.length < 2) return threats;

  const allRoles = enemies.flatMap((h) => h.roles);
  const roleCount = (role: string) => allRoles.filter((r) => r === role).length;

  // Full engage threat
  if (roleCount('Tank') >= 2 || (roleCount('Tank') >= 1 && roleCount('Fighter') >= 2)) {
    threats.push({
      label: 'Full Engage',
      description: 'Heavy frontline — expect aggressive dives and team initiation',
      severity: 'high',
    });
  }

  // Triple burst
  if (roleCount('Assassin') + roleCount('Mage') >= 3) {
    threats.push({
      label: 'Triple Burst',
      description: 'Multiple burst damage sources — position carefully and build defense',
      severity: 'high',
    });
  }

  // Heavy CC
  if (roleCount('Tank') + roleCount('Support') >= 3) {
    threats.push({
      label: 'Heavy Crowd Control',
      description: 'Chain CC threat — consider Purify or Diggie counter',
      severity: 'medium',
    });
  }

  // Split push
  if (roleCount('Fighter') >= 2 && roleCount('Assassin') >= 1) {
    threats.push({
      label: 'Split Push Pressure',
      description: 'Expect side-lane splits with jungle ganks',
      severity: 'medium',
    });
  }

  // Poke/siege
  const hasMages = roleCount('Mage') >= 2;
  const hasMarksman = roleCount('Marksman') >= 1;
  if (hasMages && hasMarksman) {
    threats.push({
      label: 'Poke / Siege',
      description: 'Long-range composition — force close-range engagements',
      severity: 'medium',
    });
  }

  return threats;
}
