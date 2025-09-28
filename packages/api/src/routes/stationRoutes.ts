import { Router } from 'express';
import { getServices } from '../services/serviceFactory.js';

export function createStationRoutes() {
  const router = Router();

  // Get station info when near it
  router.get('/:playerId/nearby', async (req, res) => {
    try {
      const { playerId } = req.params;
      const { stationService } = getServices();
      const result = await stationService.getStationNearPlayer(playerId);
      res.json(result);
    } catch (error) {
      console.error('Get nearby station error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get nearby station' });
    }
  });

  // Dock at station
  router.post('/:playerId/dock', async (req, res) => {
    try {
      const { playerId } = req.params;
      const { stationService } = getServices();
      const result = await stationService.dockPlayer(playerId);
      res.json(result);
    } catch (error) {
      console.error('Dock error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to dock' });
    }
  });

  // Undock from station
  router.post('/:playerId/undock', async (req, res) => {
    try {
      const { playerId } = req.params;
      const { stationService } = getServices();
      const result = await stationService.undockPlayer(playerId);
      res.json(result);
    } catch (error) {
      console.error('Undock error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to undock' });
    }
  });

  // Get station details (when docked)
  router.get('/:playerId/info/:stationId', async (req, res) => {
    try {
      const { playerId, stationId } = req.params;
      const { stationService } = getServices();

      // TODO: Verify player is docked at this station

      const result = await stationService.getStationInfo(stationId);
      res.json(result);
    } catch (error) {
      console.error('Station info error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get station info' });
    }
  });

  // TODO: Add buy/sell endpoints when trade system is ready
  // router.post('/:playerId/buy', ...)
  // router.post('/:playerId/sell', ...)

  return router;
}