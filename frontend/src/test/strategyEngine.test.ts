import { describe, it, expect } from 'vitest';
import { evaluateStrategies, getTopStrategies } from '../utils/strategyEngine';
import type { Hero } from '../types';

const makeHero = (name: string, slug: string, roles: string[]): Hero => ({
  name,
  slug,
  roles,
  portraitUrl: '',
  tier: 'S',
  winRate: 52,
  banRate: 10,
  pickRate: 15,
});

// Build a pool of heroes that match strategy slots
const heroPool: Hero[] = [
  makeHero('Akai', 'akai', ['Tank']),
  makeHero('Estes', 'estes', ['Support']),
  makeHero('Floryn', 'floryn', ['Support']),
  makeHero('Rafaela', 'rafaela', ['Support']),
  makeHero('Claude', 'claude', ['Marksman']),
  makeHero('Bruno', 'bruno', ['Marksman']),
  makeHero('Esmeralda', 'esmeralda', ['Mage', 'Tank']),
  makeHero('Baxia', 'baxia', ['Tank']),
  makeHero('Atlas', 'atlas', ['Tank']),
  makeHero('Tigreal', 'tigreal', ['Tank']),
  makeHero('Lancelot', 'lancelot', ['Assassin']),
  makeHero('Ling', 'ling', ['Assassin']),
  makeHero('Fanny', 'fanny', ['Assassin']),
  makeHero('Yve', 'yve', ['Mage']),
  makeHero('Valentina', 'valentina', ['Mage']),
  makeHero('Khufra', 'khufra', ['Tank']),
  makeHero('Paquito', 'paquito', ['Fighter']),
  makeHero('Chou', 'chou', ['Fighter']),
  makeHero('Wanwan', 'wanwan', ['Marksman']),
  makeHero('Angela', 'angela', ['Support']),
  makeHero('Diggie', 'diggie', ['Support']),
  makeHero('Saber', 'saber', ['Assassin']),
  makeHero('Karina', 'karina', ['Assassin', 'Mage']),
  makeHero('Hayabusa', 'hayabusa', ['Assassin']),
  makeHero('Masha', 'masha', ['Fighter', 'Tank']),
  makeHero('Lolita', 'lolita', ['Tank', 'Support']),
  makeHero('Natalia', 'natalia', ['Assassin']),
  makeHero('Phoveus', 'phoveus', ['Fighter']),
  makeHero('Gatotkaca', 'gatotkaca', ['Tank', 'Fighter']),
  makeHero('Vale', 'vale', ['Mage']),
  makeHero('Roger', 'roger', ['Fighter', 'Marksman']),
  makeHero('Hylos', 'hylos', ['Tank']),
];

describe('Strategy Engine', () => {
  describe('evaluateStrategies', () => {
    it('should return strategies when bans exist', () => {
      const banned = new Set(['saber']); // Saber counters UBE
      const picked = new Set<string>();
      const results = evaluateStrategies(banned, picked, heroPool);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should boost UBE strategy when its counters are banned', () => {
      // Baxia and Karina counter UBE - ban them both
      const banned = new Set(['baxia', 'karina']);
      const picked = new Set<string>();
      const results = evaluateStrategies(banned, picked, heroPool);

      const ube = results.find((r) => r.strategy.id === 'ube');
      expect(ube).toBeDefined();
      expect(ube!.countersBanned.length).toBeGreaterThanOrEqual(1);
      expect(ube!.viability).toBe('strong');
    });

    it('should weaken strategy when key heroes are banned', () => {
      // Ban Estes + Floryn + Rafaela — UBE healers all gone
      const banned = new Set(['estes', 'floryn', 'rafaela', 'akai']);
      const picked = new Set<string>();
      const results = evaluateStrategies(banned, picked, heroPool);

      // UBE should either not appear (required slots empty) or be weakened
      const ube = results.find((r) => r.strategy.id === 'ube');
      // If UBE still appears, it should be weakened due to key heroes banned
      if (ube) {
        expect(ube.viability).not.toBe('strong');
      }
    });

    it('should exclude strategies with all required heroes banned', () => {
      // Ban ALL assassin junglers — pickoff comp requires one
      const banned = new Set(['lancelot', 'ling', 'fanny', 'hayabusa', 'benedetta', 'joy']);
      const picked = new Set<string>();
      const results = evaluateStrategies(banned, picked, heroPool);

      const pickoff = results.find((r) => r.strategy.id === 'pickoff');
      // Should not appear since no assassin core available
      expect(pickoff).toBeUndefined();
    });

    it('should not include picked heroes as available', () => {
      const banned = new Set<string>();
      const picked = new Set(['estes', 'atlas']); // Already picked
      const results = evaluateStrategies(banned, picked, heroPool);

      for (const rec of results) {
        for (const slot of rec.availableHeroes) {
          expect(slot.available).not.toContain('estes');
          expect(slot.available).not.toContain('atlas');
        }
      }
    });
  });

  describe('getTopStrategies', () => {
    it('should limit results to specified count', () => {
      const banned = new Set(['saber']);
      const results = getTopStrategies(banned, new Set(), heroPool, 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should filter out weakened strategies', () => {
      const banned = new Set(['saber']);
      const results = getTopStrategies(banned, new Set(), heroPool);
      for (const rec of results) {
        expect(rec.viability).not.toBe('weakened');
      }
    });

    it('should rank strategies with more counters banned higher', () => {
      // Ban Diggie + Lolita + Wanwan — counters to Dive Comp AND Wombo Combo
      const banned = new Set(['diggie', 'lolita', 'wanwan']);
      const results = getTopStrategies(banned, new Set(), heroPool, 5);

      // Strategies with more counters banned should appear first
      if (results.length >= 2) {
        expect(results[0].countersBanned.length).toBeGreaterThanOrEqual(
          results[results.length - 1].countersBanned.length
        );
      }
    });

    it('should return empty when no bans and no advantage', () => {
      const results = getTopStrategies(new Set(), new Set(), heroPool);
      // Even with no bans, viable strategies can still appear (all heroes available)
      // But they won't have counter-ban advantages
      for (const rec of results) {
        expect(rec.countersBanned).toEqual([]);
      }
    });
  });

  describe('Strategy: UBE Strat specifics', () => {
    it('should recommend UBE when anti-heal heroes are banned', () => {
      // Baxia and Esmeralda counter UBE sustain
      const banned = new Set(['baxia', 'esmeralda']);
      const results = evaluateStrategies(banned, new Set(), heroPool);

      const ube = results.find((r) => r.strategy.id === 'ube');
      expect(ube).toBeDefined();
      expect(ube!.viability).toBe('strong');
      expect(ube!.reason).toContain('banned');
    });

    it('should list healer options in UBE slots', () => {
      const banned = new Set(['baxia']);
      const results = evaluateStrategies(banned, new Set(), heroPool);

      const ube = results.find((r) => r.strategy.id === 'ube');
      expect(ube).toBeDefined();

      const healerSlot = ube!.availableHeroes.find((s) => s.role === 'Healer');
      expect(healerSlot).toBeDefined();
      expect(healerSlot!.available.length).toBeGreaterThan(0);
      expect(healerSlot!.available).toContain('estes');
    });
  });

  describe('Strategy: Dive Comp specifics', () => {
    it('should recommend Dive when Diggie (counter) is banned', () => {
      const banned = new Set(['diggie']);
      const results = evaluateStrategies(banned, new Set(), heroPool);

      const dive = results.find((r) => r.strategy.id === 'dive-comp');
      expect(dive).toBeDefined();
      expect(dive!.countersBanned).toContain('Diggie');
      expect(dive!.viability).toBe('strong');
    });
  });
});
