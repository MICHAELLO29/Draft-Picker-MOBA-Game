import { describe, it, expect } from 'vitest';
import {
  getDraftPhase,
  detectFlexPicks,
  checkDamageBalance,
  analyzeTeamPowerSpike,
  getPhaseAwareRecommendations,
  detectFormingArchetypes,
  getResponseBans,
  buildLaneMatchups,
} from '../utils/draftIntelEngine';
import type { Hero } from '../types';

const makeHero = (name: string, slug: string, roles: string[]): Hero => ({
  name, slug, roles, portraitUrl: '', tier: 'S', winRate: 52, banRate: 10, pickRate: 15,
});

const draftOrder = [
  { team: 'blue', type: 'ban', slotIndex: 0 },
  { team: 'red', type: 'ban', slotIndex: 0 },
  { team: 'blue', type: 'ban', slotIndex: 1 },
  { team: 'red', type: 'ban', slotIndex: 1 },
  { team: 'blue', type: 'ban', slotIndex: 2 },
  { team: 'red', type: 'ban', slotIndex: 2 },
  { team: 'blue', type: 'pick', slotIndex: 0 },
  { team: 'red', type: 'pick', slotIndex: 0 },
  { team: 'red', type: 'pick', slotIndex: 1 },
  { team: 'blue', type: 'pick', slotIndex: 1 },
  { team: 'blue', type: 'pick', slotIndex: 2 },
  { team: 'red', type: 'pick', slotIndex: 2 },
  { team: 'red', type: 'pick', slotIndex: 3 },
  { team: 'blue', type: 'pick', slotIndex: 3 },
  { team: 'blue', type: 'pick', slotIndex: 4 },
  { team: 'red', type: 'pick', slotIndex: 4 },
];

describe('Draft Intelligence Engine', () => {
  describe('getDraftPhase', () => {
    it('detects ban phase 1', () => {
      expect(getDraftPhase(0, draftOrder).phase).toBe('ban1');
    });
    it('detects early pick P1', () => {
      const r = getDraftPhase(6, draftOrder);
      expect(r.isEarlyPick).toBe(true);
      expect(r.pickNumber).toBe(1);
    });
    it('detects last pick P5', () => {
      const r = getDraftPhase(14, draftOrder);
      expect(r.isLastPick).toBe(true);
      expect(r.pickNumber).toBe(5);
    });
  });

  describe('detectFlexPicks', () => {
    it('detects Chou as flex', () => {
      const r = detectFlexPicks([makeHero('Chou', 'chou', ['Fighter'])]);
      expect(r.length).toBe(1);
      expect(r[0].flexRoles.length).toBeGreaterThanOrEqual(2);
    });
    it('does not flag Bruno as flex', () => {
      expect(detectFlexPicks([makeHero('Bruno', 'bruno', ['Marksman'])]).length).toBe(0);
    });
  });

  describe('checkDamageBalance', () => {
    it('warns all-physical', () => {
      const team = [
        makeHero('Lancelot', 'lancelot', ['Assassin']),
        makeHero('Bruno', 'bruno', ['Marksman']),
        makeHero('Chou', 'chou', ['Fighter']),
        makeHero('Khaleed', 'khaleed', ['Fighter']),
      ];
      const r = checkDamageBalance(team);
      expect(r.length).toBeGreaterThan(0);
      expect(r[0].type).toBe('all-physical');
    });
    it('warns all-magic', () => {
      const team = [
        makeHero('Yve', 'yve', ['Mage']),
        makeHero('Karina', 'karina', ['Assassin']),
        makeHero('Estes', 'estes', ['Support']),
      ];
      expect(checkDamageBalance(team)[0].type).toBe('all-magic');
    });
    it('no warn balanced', () => {
      const team = [
        makeHero('Lancelot', 'lancelot', ['Assassin']),
        makeHero('Yve', 'yve', ['Mage']),
        makeHero('Bruno', 'bruno', ['Marksman']),
        makeHero('Karina', 'karina', ['Assassin']),
      ];
      expect(checkDamageBalance(team).length).toBe(0);
    });
    it('no warn small team', () => {
      expect(checkDamageBalance([makeHero('Lancelot', 'lancelot', ['Assassin'])])).toEqual([]);
    });
  });

  describe('analyzeTeamPowerSpike', () => {
    it('detects late-game heavy', () => {
      const r = analyzeTeamPowerSpike([
        makeHero('Bruno', 'bruno', ['Marksman']),
        makeHero('Claude', 'claude', ['Marksman']),
        makeHero('Pharsa', 'pharsa', ['Mage']),
        makeHero('Floryn', 'floryn', ['Support']),
      ]);
      expect(r.late).toBeGreaterThan(50);
      expect(r.warning).toContain('late');
    });
    it('detects early-game heavy', () => {
      const r = analyzeTeamPowerSpike([
        makeHero('Paquito', 'paquito', ['Fighter']),
        makeHero('Gusion', 'gusion', ['Assassin']),
        makeHero('Khaleed', 'khaleed', ['Fighter']),
        makeHero('Mathilda', 'mathilda', ['Support']),
      ]);
      expect(r.early).toBeGreaterThan(30);
    });
  });

  describe('getPhaseAwareRecommendations', () => {
    const pool = [
      makeHero('Chou', 'chou', ['Fighter']),
      makeHero('Fanny', 'fanny', ['Assassin']),
      makeHero('Esmeralda', 'esmeralda', ['Mage', 'Tank']),
      makeHero('Bruno', 'bruno', ['Marksman']),
      makeHero('Atlas', 'atlas', ['Tank']),
      makeHero('Wanwan', 'wanwan', ['Marksman']),
    ];
    it('prioritizes flex on P1', () => {
      const phase = { phase: 'pick1' as const, pickNumber: 1, isEarlyPick: true, isLastPick: false };
      const r = getPhaseAwareRecommendations(pool, phase, [], new Set(), 5);
      const ci = r.findIndex((x) => x.hero.slug === 'chou');
      const fi = r.findIndex((x) => x.hero.slug === 'fanny');
      if (ci !== -1 && fi !== -1) expect(ci).toBeLessThan(fi);
    });
    it('prioritizes last-pick on P5', () => {
      const phase = { phase: 'pick3' as const, pickNumber: 5, isEarlyPick: false, isLastPick: true };
      const r = getPhaseAwareRecommendations(pool, phase, [], new Set(), 5);
      const fanny = r.find((x) => x.hero.slug === 'fanny');
      const chou = r.find((x) => x.hero.slug === 'chou');
      if (fanny && chou) expect(fanny.phaseScore).toBeGreaterThan(chou.phaseScore);
    });
    it('excludes used heroes', () => {
      const phase = { phase: 'pick1' as const, pickNumber: 1, isEarlyPick: true, isLastPick: false };
      const r = getPhaseAwareRecommendations(pool, phase, [], new Set(['chou', 'atlas']), 5);
      expect(r.map((x) => x.hero.slug)).not.toContain('chou');
    });
  });

  describe('detectFormingArchetypes', () => {
    it('detects UBE with healer + tank jungler', () => {
      const team = [makeHero('Estes', 'estes', ['Support']), makeHero('Akai', 'akai', ['Tank'])];
      const r = detectFormingArchetypes(team);
      const ube = r.find((a) => a.name === 'UBE Strat');
      expect(ube).toBeDefined();
      expect(ube!.progress).toBeGreaterThanOrEqual(30);
    });
    it('detects Pickoff with assassin + setup tank', () => {
      const team = [makeHero('Lancelot', 'lancelot', ['Assassin']), makeHero('Atlas', 'atlas', ['Tank'])];
      const pickoff = detectFormingArchetypes(team).find((a) => a.name === 'Pickoff Comp');
      expect(pickoff).toBeDefined();
      expect(pickoff!.progress).toBeGreaterThanOrEqual(60);
    });
    it('returns empty for no heroes', () => {
      expect(detectFormingArchetypes([])).toEqual([]);
    });
    it('sorts by progress descending', () => {
      const r = detectFormingArchetypes([
        makeHero('Atlas', 'atlas', ['Tank']),
        makeHero('Lancelot', 'lancelot', ['Assassin']),
        makeHero('Yve', 'yve', ['Mage']),
      ]);
      for (let i = 1; i < r.length; i++) expect(r[i].progress).toBeLessThanOrEqual(r[i - 1].progress);
    });
  });

  describe('getResponseBans', () => {
    it('suggests banning healers vs sustain enemy', () => {
      const enemy = [makeHero('Estes', 'estes', ['Support'])];
      const all = [makeHero('Floryn', 'floryn', ['Support']), makeHero('Bruno', 'bruno', ['Marksman'])];
      const r = getResponseBans(enemy, all, new Set());
      expect(r.some((x) => x.hero.slug === 'floryn')).toBe(true);
    });
    it('returns empty for no enemy', () => {
      expect(getResponseBans([], [], new Set())).toEqual([]);
    });
  });

  describe('buildLaneMatchups', () => {
    it('assigns heroes to correct lanes', () => {
      const blue = [makeHero('Bruno', 'bruno', ['Marksman']), makeHero('Yve', 'yve', ['Mage'])];
      const red = [makeHero('Claude', 'claude', ['Marksman']), makeHero('Pharsa', 'pharsa', ['Mage'])];
      const r = buildLaneMatchups(blue, red);
      expect(r.length).toBeGreaterThan(0);
      const gold = r.find((m) => m.lane === 'GOLD');
      if (gold) expect(gold.yourHero?.slug).toBe('bruno');
    });
    it('shows advantage early vs late', () => {
      const r = buildLaneMatchups([makeHero('Paquito', 'paquito', ['Fighter'])], [makeHero('Uranus', 'uranus', ['Tank'])]);
      const exp = r.find((m) => m.lane === 'EXP');
      if (exp?.yourHero && exp?.enemyHero) expect(exp.advantage).toBe('advantage');
    });
    it('handles empty teams', () => {
      expect(buildLaneMatchups([], []).length).toBe(0);
    });
  });
});
