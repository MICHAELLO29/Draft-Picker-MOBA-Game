import { Router } from 'express';
import { refreshAll } from '../services/scraperService.js';

const router = Router();

/** POST /api/refresh — Force refresh all cached data */
router.post('/refresh', async (_req, res, next) => {
  try {
    const result = await refreshAll();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
