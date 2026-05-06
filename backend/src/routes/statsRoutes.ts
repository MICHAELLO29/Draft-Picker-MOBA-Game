import { Router } from 'express';
import { getStats, getTierList } from '../services/scraperService.js';

const router = Router();

/** GET /api/stats — Hero statistics with optional rank filter */
router.get('/stats', async (req, res, next) => {
  try {
    const rankFilter = (req.query['rank'] as string) ?? 'all';
    const validRanks = ['all', 'epic', 'legend', 'mythic', 'honor', 'glory'];

    if (!validRanks.includes(rankFilter)) {
      res.status(400).json({ error: `Invalid rank filter. Must be one of: ${validRanks.join(', ')}` });
      return;
    }

    const result = await getStats(rankFilter);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** GET /api/tierlist — Tier list */
router.get('/tierlist', async (_req, res, next) => {
  try {
    const result = await getTierList();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
