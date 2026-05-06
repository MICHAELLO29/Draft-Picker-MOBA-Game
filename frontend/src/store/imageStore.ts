import { create } from 'zustand';

const FANDOM_API = 'https://mobile-legends.fandom.com/api.php';
const THUMB_SIZE = 300;

interface ImageStore {
  /** Map of hero name → CDN thumbnail URL */
  images: Record<string, string>;
  /** Whether the batch fetch is currently in progress */
  loading: boolean;
  /** Whether the batch fetch has completed at least once */
  initialized: boolean;

  /**
   * Batch-fetch hero portrait URLs from the Fandom MediaWiki `pageimages` API.
   * The API supports up to 50 titles per request, so we split into chunks.
   * Results are CDN-hosted `static.wikia.nocookie.net` URLs that bypass Cloudflare.
   */
  fetchImages: (names: string[]) => Promise<void>;
}

export const useImageStore = create<ImageStore>((set, get) => ({
  images: {},
  loading: false,
  initialized: false,

  fetchImages: async (names: string[]) => {
    if (get().initialized || get().loading) return;
    set({ loading: true });

    const images: Record<string, string> = {};

    // Split into chunks of 50 (MediaWiki API limit)
    for (let i = 0; i < names.length; i += 50) {
      const chunk = names.slice(i, i + 50);
      const titles = chunk.join('|');

      try {
        const url = `${FANDOM_API}?action=query&titles=${encodeURIComponent(titles)}&prop=pageimages&pithumbsize=${THUMB_SIZE}&format=json&origin=*`;
        const res = await fetch(url);
        const json = await res.json();
        const pages = json.query?.pages;

        if (pages) {
          // Build a reverse map from normalized title → original name
          const normalizedMap = new Map<string, string>();
          if (json.query?.normalized) {
            for (const n of json.query.normalized) {
              normalizedMap.set(n.to, n.from);
            }
          }

          for (const page of Object.values(pages) as any[]) {
            if (page.thumbnail?.source) {
              const title: string = page.title;
              images[title] = page.thumbnail.source;

              // Also map the original pre-normalized name (e.g. "chang'e" → "Chang'e")
              const original = normalizedMap.get(title);
              if (original && original !== title) {
                images[original] = page.thumbnail.source;
              }
            }
          }
        }
      } catch (e) {
        console.warn('[imageStore] Failed to fetch hero images batch:', e);
      }
    }

    set({ images: { ...get().images, ...images }, loading: false, initialized: true });
  },
}));
