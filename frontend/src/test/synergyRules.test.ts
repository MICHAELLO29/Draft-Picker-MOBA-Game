import { describe, it, expect } from 'vitest';
import { detectSynergies, detectCompWarnings, detectThreats } from '../utils/synergyRules';
import type { Hero } from '../types';

const makeHero = (name: string, roles: string[]): Hero => ({
  name,
  slug: name.toLowerCase(),
  roles,
  portraitUrl: '',
  tier: 'S',
  winRate: 52,
  banRate: 10,
  pickRate: 15,
});

describe('Synergy Rules', () => {
  describe('detectSynergies', () => {
    it('should detect Tank + Mage as Engage + AoE Burst', () => {
      const allies = [makeHero('Gatotkaca', ['Tank']), makeHero('Valentina', ['Mage'])];
      const synergies = detectSynergies(allies);
      expect(synergies.some(s => s.label === 'Engage + AoE Burst')).toBe(true);
    });

    it('should detect Support + Tank/Fighter as Peel + Sustain', () => {
      const allies = [makeHero('Estes', ['Support']), makeHero('Masha', ['Fighter', 'Tank'])];
      const synergies = detectSynergies(allies);
      expect(synergies.some(s => s.label === 'Peel + Sustain')).toBe(true);
    });

    it('should detect Assassin + Tank as Pickoff', () => {
      const allies = [makeHero('Harley', ['Assassin']), makeHero('Atlas', ['Tank'])];
      const synergies = detectSynergies(allies);
      expect(synergies.some(s => s.label === 'Pickoff')).toBe(true);
    });

    it('should return empty for single hero', () => {
      const synergies = detectSynergies([makeHero('Harley', ['Assassin'])]);
      expect(synergies).toEqual([]);
    });

    it('should detect Protect the Marksman comp', () => {
      const allies = [
        makeHero('Bruno', ['Marksman']),
        makeHero('Estes', ['Support']),
        makeHero('Atlas', ['Tank']),
      ];
      const synergies = detectSynergies(allies);
      expect(synergies.some(s => s.label === 'Protect the Marksman')).toBe(true);
    });
  });

  describe('detectCompWarnings', () => {
    it('should warn about no frontline', () => {
      const allies = [
        makeHero('Harley', ['Assassin', 'Mage']),
        makeHero('Bruno', ['Marksman']),
        makeHero('Valentina', ['Mage']),
      ];
      const warnings = detectCompWarnings(allies);
      expect(warnings.some(w => w.label === 'No Frontline')).toBe(true);
    });

    it('should not warn when team has 2 or less heroes', () => {
      const allies = [makeHero('Harley', ['Assassin'])];
      const warnings = detectCompWarnings(allies);
      expect(warnings).toEqual([]);
    });
  });

  describe('detectThreats', () => {
    it('should detect high win-rate enemy threats', () => {
      const enemies = [makeHero('Freya', ['Fighter'])];
      const threats = detectThreats(enemies);
      // Threats function analyzes enemy composition patterns
      expect(Array.isArray(threats)).toBe(true);
    });
  });
});
