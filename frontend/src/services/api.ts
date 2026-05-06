import type { Hero, CounterPick, ApiEnvelope } from '../types';

const API_BASE = '/api';

/** Fetch hero roster from backend */
export async function fetchHeroes(): Promise<ApiEnvelope<Hero[]>> {
  const res = await fetch(`${API_BASE}/heroes`);
  if (!res.ok) throw new Error(`Failed to fetch heroes: ${res.status}`);
  return res.json();
}

/** Fetch counter picks for a hero */
export async function fetchCounters(heroSlug: string): Promise<ApiEnvelope<CounterPick[]>> {
  const res = await fetch(`${API_BASE}/counter/${heroSlug}`);
  if (!res.ok) throw new Error(`Failed to fetch counters: ${res.status}`);
  return res.json();
}

/** Fetch hero statistics */
export async function fetchStats(rank: string = 'all'): Promise<ApiEnvelope<Hero[]>> {
  const res = await fetch(`${API_BASE}/stats?rank=${rank}`);
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`);
  return res.json();
}

/** Fetch tier list */
export async function fetchTierList(): Promise<ApiEnvelope<Hero[]>> {
  const res = await fetch(`${API_BASE}/tierlist`);
  if (!res.ok) throw new Error(`Failed to fetch tier list: ${res.status}`);
  return res.json();
}

/** Force refresh all backend data */
export async function refreshData(): Promise<{ success: boolean; errors: string[] }> {
  const res = await fetch(`${API_BASE}/refresh`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to refresh: ${res.status}`);
  return res.json();
}
