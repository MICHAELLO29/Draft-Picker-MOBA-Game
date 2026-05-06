import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import config from './config/index.js';
import heroRoutes from './routes/heroRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import refreshRoute from './routes/refreshRoute.js';
import type { HealthResponse } from './types/api.js';
import type { Request, Response, NextFunction } from 'express';

const logger = pino({
  level: config.logLevel,
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

const app = express();

// --- Middleware ---
app.use(helmet());
app.use(compression());
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json());

// Rate limit /api/refresh to prevent abuse
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: 'Too many refresh requests. Try again later.' },
});
app.use('/api/refresh', refreshLimiter);

// --- Routes ---

/** Health check endpoint */
app.get('/api/health', (_req: Request, res: Response) => {
  const health: HealthResponse = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
  res.json(health);
});

app.use('/api', heroRoutes);
app.use('/api', statsRoutes);
app.use('/api', refreshRoute);

// --- Error handler ---
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err: err.message, stack: err.stack }, 'Unhandled error');
  res.status(500).json({
    error: 'Internal server error',
    message: process.env['NODE_ENV'] === 'development' ? err.message : undefined,
  });
});

// --- Start ---
app.listen(config.port, () => {
  logger.info({ port: config.port, cors: config.corsOrigins }, 'MLBB Draft Strategizer API started');
});

export default app;
