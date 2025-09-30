import { Router } from 'express';
import { getMongo } from '../services/databaseService.js';
import { getAllActiveProbes } from '../services/probeService.js';

export function createProbeRoutes() {
  const router = Router();

  // Get all active probes (for universe visualization)
  router.get('/active', async (req, res) => {
    try {
      const db = getMongo('stellarburn');
      const probes = await getAllActiveProbes(db);
      res.json(probes);
    } catch (error) {
      console.error('Get all active probes error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get active probes' });
    }
  });

  return router;
}