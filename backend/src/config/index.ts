const config = {
  port: parseInt(process.env['PORT'] ?? '3001', 10),
  cacheTtlMs: parseInt(process.env['CACHE_TTL_MS'] ?? String(6 * 60 * 60 * 1000), 10), // 6 hours
  corsOrigins: (process.env['CORS_ORIGINS'] ?? 'http://localhost:5173').split(','),
  mlbbhubBaseUrl: process.env['MLBBHUB_BASE_URL'] ?? 'https://mlbbhub.com',
  scrapeTimeoutMs: parseInt(process.env['SCRAPE_TIMEOUT_MS'] ?? '15000', 10),
  logLevel: process.env['LOG_LEVEL'] ?? 'info',
} as const;

export default config;
