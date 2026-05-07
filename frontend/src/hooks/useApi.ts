import { useQuery } from '@tanstack/react-query';
import { fetchHeroes, fetchCounters, fetchStats, fetchTierList, fetchProMeta } from '../services/api';

/** Hook to fetch the full hero roster */
export function useHeroes() {
  return useQuery({
    queryKey: ['heroes'],
    queryFn: fetchHeroes,
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
    retry: 2,
  });
}

/** Hook to fetch counter picks for a hero */
export function useCounters(heroSlug: string | null) {
  return useQuery({
    queryKey: ['counters', heroSlug],
    queryFn: () => fetchCounters(heroSlug!),
    enabled: !!heroSlug,
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
  });
}

/** Hook to fetch hero statistics */
export function useStats(rank: string = 'all') {
  return useQuery({
    queryKey: ['stats', rank],
    queryFn: () => fetchStats(rank),
    staleTime: 6 * 60 * 60 * 1000,
    retry: 2,
  });
}

/** Hook to fetch tier list */
export function useTierList() {
  return useQuery({
    queryKey: ['tierlist'],
    queryFn: fetchTierList,
    staleTime: 6 * 60 * 60 * 1000,
    retry: 2,
  });
}

/** Hook to fetch MPL PH pro tournament meta data */
export function useProMeta() {
  return useQuery({
    queryKey: ['pro-meta'],
    queryFn: fetchProMeta,
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
  });
}
