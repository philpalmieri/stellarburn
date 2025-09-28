import { Router } from 'express';
import { getServices } from '../services/serviceFactory.js';

export function createProbeRoutes() {
  const router = Router();

  // Get all active probes (for universe visualization)
  router.get('/active', async (req, res) => {
    try {
      const { probeService } = getServices();
      const probes = await probeService.getAllActiveProbes();
      res.json(probes);
    } catch (error) {
      console.error('Get all active probes error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get active probes' });
    }
  });

  return router;
}