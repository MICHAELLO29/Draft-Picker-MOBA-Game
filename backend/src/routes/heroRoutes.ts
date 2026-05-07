import { Router } from 'express';
import { getHeroes, getCounters, getProMeta } from '../services/scraperService.js';
import { normalizeHeroSlug } from '../utils/slugify.js';

const router = Router();

/** GET /api/heroes — Full hero roster */
router.get('/heroes', async (_req, res, next) => {
  try {
    const result = await getHeroes();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** GET /api/counter/:heroSlug — Counter picks for a specific hero */
router.get('/counter/:heroSlug', async (req, res, next) => {
  try {
    const rawSlug = req.params['heroSlug'] ?? '';
    const heroSlug = normalizeHeroSlug(rawSlug);

    if (!heroSlug) {
      res.status(400).json({ error: 'Invalid hero slug' });
      return;
    }

    const result = await getCounters(heroSlug);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** GET /api/pro-meta — MPL PH pro tournament meta data */
router.get('/pro-meta', async (_req, res, next) => {
  try {
    const result = await getProMeta();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
