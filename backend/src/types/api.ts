/**
 * Generic API envelope wrapping all data responses.
 * Every endpoint returns this shape for consistency.
 */
export type ApiEnvelope<T> = {
  data: T;
  meta: {
    source: string;
    lastUpdated: string;
    cacheStatus: 'hit' | 'miss' | 'stale';
    isStale: boolean;
    patch?: string;
  };
};

export type HealthResponse = {
  status: 'ok';
  uptime: number;
  timestamp: string;
};
