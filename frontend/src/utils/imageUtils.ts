import { useImageStore } from '../store/imageStore';

/**
 * Get a hero's portrait URL from the pre-fetched image cache.
 * Returns the CDN thumbnail URL, or null if not yet loaded.
 *
 * This replaces the old `Special:FilePath` approach which was blocked
 * by Cloudflare hotlink protection on most heroes.
 */
export function getHeroImageUrl(name: string): string | null {
  return useImageStore.getState().images[name] ?? null;
}

/**
 * React hook that reactively reads a hero's image URL from the store.
 * Re-renders the component when the image cache updates.
 */
export function useHeroImage(name: string): string | null {
  return useImageStore((s) => s.images[name] ?? null);
}
