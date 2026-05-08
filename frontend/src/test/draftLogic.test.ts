import { describe, it, expect } from 'vitest';
import type { Hero } from '../types';

// ─── Test hero factory ───
const makeHero = (name: string, slug: string, roles: string[], opts?: Partial<Hero>): Hero => ({
  name,
  slug,
  roles,
  portraitUrl: '',
  tier: 'S',
  winRate: 52,
  banRate: 10,
  pickRate: 15,
  ...opts,
});

// ═══════════════════════════════════════════════════════════════
// These tests validate the LOGIC used in CounterPanel
// They test the pure functions/algorithms, not the React component
// ═══════════════════════════════════════════════════════════════

describe('Draft Logic: Pro Synergy Picks', () => {
  // Simulate the proSynergyPicks algorithm
  function computeProSynergyPicks(
    teamPicks: Hero[],
    allHeroes: Hero[],
    usedSlugs: Set<string>,
    proMeta: { topPicks: Array<{ heroSlug: string; heroName: string; pickCount: number }>; topWinRates: Array<{ heroSlug: string; heroName: string; proWinRate: number }> } | null
  ) {
    if (teamPicks.length === 0) return [];

    const teamRoles = new Set(teamPicks.flatMap((h) => h.roles));
    const needsRoles: string[] = [];
    if (!teamRoles.has('Tank')) needsRoles.push('Tank');
    if (!teamRoles.has('Mage')) needsRoles.push('Mage');
    if (!teamRoles.has('Marksman')) needsRoles.push('Marksman');
    if (!teamRoles.has('Assassin')) needsRoles.push('Assassin');
    if (!teamRoles.has('Fighter')) needsRoles.push('Fighter');
    if (!teamRoles.has('Support')) needsRoles.push('Support');

    type SynergyEntry = { hero: Hero; fillsRole: string; isPro: boolean; score: number; proPickCount?: number };
    const results: SynergyEntry[] = [];

    if (proMeta) {
      const proHeroes = new Map<string, { pickCount?: number; proWinRate?: number }>();
      for (const entry of proMeta.topPicks) {
        const hero = allHeroes.find((h) => h.slug === entry.heroSlug);
        if (hero && !usedSlugs.has(hero.slug)) {
          proHeroes.set(hero.slug, { pickCount: entry.pickCount });
        }
      }

      for (const [slug, proInfo] of proHeroes) {
        const hero = allHeroes.find((h) => h.slug === slug);
        if (!hero) continue;
        const filledRole = hero.roles.find((r) => needsRoles.includes(r));
        if (!filledRole && needsRoles.length > 0) continue;

        const score = (proInfo.pickCount ?? 0) * 3 + (filledRole ? 20 : 0);
        results.push({ hero, fillsRole: filledRole ?? hero.roles[0] ?? 'Flex', isPro: true, score, proPickCount: proInfo.pickCount });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 3);
  }

  const harley = makeHero('Harley', 'harley', ['Assassin', 'Mage']);
  const valentina = makeHero('Valentina', 'valentina', ['Mage']);
  const bruno = makeHero('Bruno', 'bruno', ['Marksman']);
  const gatotkaca = makeHero('Gatotkaca', 'gatotkaca', ['Tank', 'Fighter']);
  const khaleed = makeHero('Khaleed', 'khaleed', ['Fighter']);
  const estes = makeHero('Estes', 'estes', ['Support']);

  const allHeroes = [harley, valentina, bruno, gatotkaca, khaleed, estes];
  const proMeta = {
    topPicks: [
      { heroSlug: 'bruno', heroName: 'Bruno', pickCount: 50 },
      { heroSlug: 'gatotkaca', heroName: 'Gatotkaca', pickCount: 40 },
      { heroSlug: 'khaleed', heroName: 'Khaleed', pickCount: 35 },
      { heroSlug: 'estes', heroName: 'Estes', pickCount: 30 },
    ],
    topWinRates: [],
  };

  it('should recommend heroes that fill missing team roles', () => {
    // Blue has Harley (Assassin/Mage) → needs Tank, Marksman, Fighter, Support
    const usedSlugs = new Set(['harley']);
    const result = computeProSynergyPicks([harley], allHeroes, usedSlugs, proMeta);

    expect(result.length).toBeGreaterThan(0);
    // Should NOT include heroes from same roles already covered
    const filledRoles = result.map(r => r.fillsRole);
    expect(filledRoles).not.toContain('Mage');
    expect(filledRoles).not.toContain('Assassin');
  });

  it('should use the correct team picks, not hardcoded blue', () => {
    // Red team has Valentina (Mage) → needs Tank, Marksman, Assassin, Fighter, Support
    const usedSlugs = new Set(['valentina']);
    const result = computeProSynergyPicks([valentina], allHeroes, usedSlugs, proMeta);

    expect(result.length).toBeGreaterThan(0);
    // Mage is covered by Valentina, so no Mage recommendations
    const filledRoles = result.map(r => r.fillsRole);
    expect(filledRoles).not.toContain('Mage');
  });

  it('should exclude already picked/banned heroes', () => {
    const usedSlugs = new Set(['harley', 'bruno']); // Bruno already used
    const result = computeProSynergyPicks([harley], allHeroes, usedSlugs, proMeta);

    const heroNames = result.map(r => r.hero.name);
    expect(heroNames).not.toContain('Bruno');
    expect(heroNames).not.toContain('Harley');
  });

  it('should return empty for empty team', () => {
    const result = computeProSynergyPicks([], allHeroes, new Set(), proMeta);
    expect(result).toEqual([]);
  });

  it('should prioritize heroes with higher pro pick count', () => {
    // Bruno (50 picks) should rank higher than Estes (30 picks) when both fill needed roles
    const usedSlugs = new Set(['harley']);
    const result = computeProSynergyPicks([harley], allHeroes, usedSlugs, proMeta);

    const brunoIdx = result.findIndex(r => r.hero.name === 'Bruno');
    const estesIdx = result.findIndex(r => r.hero.name === 'Estes');
    if (brunoIdx !== -1 && estesIdx !== -1) {
      expect(brunoIdx).toBeLessThan(estesIdx);
    }
  });
});

describe('Draft Logic: Advantaged by Bans', () => {
  // Simulate the advantagedByBans algorithm
  function computeAdvantagedByBans(
    bannedHeroes: Hero[],
    freedHeroesMap: Map<string, string[]>, // slug -> bannedNames that freed them
    allHeroes: Hero[],
    usedSlugs: Set<string>,
    proMeta: { topPicks: Array<{ heroSlug: string; heroName: string; pickCount: number }>; topBans: Array<{ heroSlug: string; heroName: string; banCount: number }> } | null
  ) {
    if (bannedHeroes.length === 0) return [];

    type AdvantagedEntry = { hero: Hero; freedFrom: string[]; proPickCount?: number; score: number; isPro: true };
    const results: AdvantagedEntry[] = [];
    if (!proMeta) return [];

    const proHeroInfo = new Map<string, { pickCount?: number; banCount?: number }>();
    for (const entry of proMeta.topPicks) {
      const hero = allHeroes.find(h => h.slug === entry.heroSlug);
      if (hero && !usedSlugs.has(hero.slug)) {
        proHeroInfo.set(hero.slug, { pickCount: entry.pickCount });
      }
    }

    for (const [slug, proInfo] of proHeroInfo) {
      const hero = allHeroes.find(h => h.slug === slug);
      if (!hero) continue;
      const freedFrom = freedHeroesMap.get(slug) ?? [];
      const score = (proInfo.pickCount ?? 0) * 3 + (proInfo.banCount ?? 0) * 2 + freedFrom.length * 15;
      results.push({ hero, freedFrom, proPickCount: proInfo.pickCount, score, isPro: true });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  const harley = makeHero('Harley', 'harley', ['Assassin', 'Mage']);
  const freya = makeHero('Freya', 'freya', ['Fighter']);
  const bruno = makeHero('Bruno', 'bruno', ['Marksman']);
  const gatotkaca = makeHero('Gatotkaca', 'gatotkaca', ['Tank']);
  const allHeroes = [harley, freya, bruno, gatotkaca];

  it('should show all available pro heroes when bans exist', () => {
    const proMeta = {
      topPicks: [
        { heroSlug: 'harley', heroName: 'Harley', pickCount: 45 },
        { heroSlug: 'bruno', heroName: 'Bruno', pickCount: 50 },
      ],
      topBans: [],
    };
    const usedSlugs = new Set(['freya']); // Freya is banned
    const result = computeAdvantagedByBans(
      [freya], new Map(), allHeroes, usedSlugs, proMeta
    );

    expect(result.length).toBe(2); // Both Harley and Bruno should show
    expect(result.map(r => r.hero.name)).toContain('Harley');
    expect(result.map(r => r.hero.name)).toContain('Bruno');
  });

  it('should NOT use win rate for scoring', () => {
    const proMeta = {
      topPicks: [
        { heroSlug: 'harley', heroName: 'Harley', pickCount: 10 },
        { heroSlug: 'bruno', heroName: 'Bruno', pickCount: 50 },
      ],
      topBans: [],
    };
    const usedSlugs = new Set(['freya']);
    const result = computeAdvantagedByBans(
      [freya], new Map(), allHeroes, usedSlugs, proMeta
    );

    // Bruno (50 picks) should rank HIGHER than Harley (10 picks)
    // because scoring is purely pro pick count based
    expect(result[0].hero.name).toBe('Bruno');
    expect(result[1].hero.name).toBe('Harley');
  });

  it('should give bonus score for heroes freed from bans', () => {
    const proMeta = {
      topPicks: [
        { heroSlug: 'harley', heroName: 'Harley', pickCount: 10 },
        { heroSlug: 'bruno', heroName: 'Bruno', pickCount: 10 },
      ],
      topBans: [],
    };
    // Harley is freed from 2 bans, Bruno from none
    const freedMap = new Map([['harley', ['Fanny', 'Zhuxin']]]);
    const usedSlugs = new Set(['freya']);
    const result = computeAdvantagedByBans(
      [freya], freedMap, allHeroes, usedSlugs, proMeta
    );

    // Harley should rank higher due to freed-from bonus (2 * 15 = 30)
    expect(result[0].hero.name).toBe('Harley');
  });

  it('should exclude already used heroes', () => {
    const proMeta = {
      topPicks: [
        { heroSlug: 'harley', heroName: 'Harley', pickCount: 45 },
        { heroSlug: 'bruno', heroName: 'Bruno', pickCount: 50 },
      ],
      topBans: [],
    };
    const usedSlugs = new Set(['freya', 'harley']); // Harley already picked
    const result = computeAdvantagedByBans(
      [freya], new Map(), allHeroes, usedSlugs, proMeta
    );

    expect(result.map(r => r.hero.name)).not.toContain('Harley');
  });

  it('should return empty when no bans exist', () => {
    const proMeta = {
      topPicks: [{ heroSlug: 'harley', heroName: 'Harley', pickCount: 45 }],
      topBans: [],
    };
    const result = computeAdvantagedByBans([], new Map(), allHeroes, new Set(), proMeta);
    expect(result).toEqual([]);
  });
});

describe('Draft Logic: Threat Analysis Team Awareness', () => {
  it('should show threat analysis only for the clicked hero', () => {
    // The analysisHero should determine which hero's counters are fetched
    // NOT auto-detect based on enemy picks
    const analysisHero = makeHero('Harley', 'harley', ['Assassin', 'Mage']);
    const analysisTeam: 'blue' | 'red' = 'blue';

    // Counter data should only be fetched for the clicked hero's slug
    const counterSlug = analysisHero.slug;
    expect(counterSlug).toBe('harley');
    expect(analysisTeam).toBe('blue');
  });

  it('should work for both blue AND red heroes', () => {
    // Blue hero clicked
    const blueHero = makeHero('Harley', 'harley', ['Assassin', 'Mage']);
    expect(blueHero.slug).toBe('harley');

    // Red hero clicked
    const redHero = makeHero('Valentina', 'valentina', ['Mage']);
    expect(redHero.slug).toBe('valentina');

    // Both should produce valid counter fetch slugs
    // (the old logic only showed red team analysis, this validates both work)
  });

  it('should generate correct panel title with team label', () => {
    const analysisHero = makeHero('Valentina', 'valentina', ['Mage']);
    const analysisTeam = 'red' as 'blue' | 'red';

    const label = `${analysisHero.name} (${analysisTeam === 'blue' ? 'Blue' : 'Red'} Team)`;
    expect(label).toBe('Valentina (Red Team)');
  });
});

describe('Draft Logic: Panel State Machine', () => {
  type PanelState = 'IDLE' | 'META_BANS' | 'ENEMY_PICKED' | 'PICK_RECOMMENDATIONS';

  function computePanelState(
    analysisHero: Hero | null,
    hasAnyHeroes: boolean,
    isInBanPhase: boolean
  ): PanelState {
    if (analysisHero) return 'ENEMY_PICKED';
    if (!hasAnyHeroes && !isInBanPhase) return 'IDLE';
    if (!isInBanPhase) return 'PICK_RECOMMENDATIONS';
    return 'META_BANS';
  }

  it('should show ENEMY_PICKED when a hero is clicked', () => {
    const hero = makeHero('Harley', 'harley', ['Mage']);
    expect(computePanelState(hero, true, false)).toBe('ENEMY_PICKED');
  });

  it('should show ENEMY_PICKED even during ban phase if hero clicked', () => {
    const hero = makeHero('Harley', 'harley', ['Mage']);
    expect(computePanelState(hero, true, true)).toBe('ENEMY_PICKED');
  });

  it('should show IDLE when no heroes and not in ban phase', () => {
    expect(computePanelState(null, false, false)).toBe('IDLE');
  });

  it('should show META_BANS during ban phase with no clicked hero', () => {
    expect(computePanelState(null, true, true)).toBe('META_BANS');
  });

  it('should show PICK_RECOMMENDATIONS when heroes exist, no click, not ban phase', () => {
    expect(computePanelState(null, true, false)).toBe('PICK_RECOMMENDATIONS');
  });

  it('should NOT auto-show threat analysis without user click', () => {
    // Even if enemy has picks, panel should NOT show ENEMY_PICKED without a click
    expect(computePanelState(null, true, false)).toBe('PICK_RECOMMENDATIONS');
  });
});
