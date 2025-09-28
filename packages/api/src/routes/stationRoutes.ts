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

  // Buy item from station
  router.post('/:playerId/buy', async (req, res) => {
    try {
      const { playerId } = req.params;
      const { itemId, quantity } = req.body;
      const { stationService, stationInventoryService } = getServices();

      if (!itemId || !quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Invalid itemId or quantity' });
      }

      const result = await stationService.buyFromStation(playerId, itemId, quantity);
      res.json(result);
    } catch (error) {
      console.error('Buy error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to buy item' });
    }
  });

  // Sell item to station
  router.post('/:playerId/sell', async (req, res) => {
    try {
      const { playerId } = req.params;
      const { itemId, quantity } = req.body;
      const { stationService } = getServices();

      if (!itemId || !quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Invalid itemId or quantity' });
      }

      const result = await stationService.sellToStation(playerId, itemId, quantity);
      res.json(result);
    } catch (error) {
      console.error('Sell error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to sell item' });
    }
  });

  // Get available trade items (for reference)
  router.get('/trade-items', async (req, res) => {
    try {
      const { stationInventoryService } = getServices();
      const items = stationInventoryService.getAllTradeItems();
      res.json(items);
    } catch (error) {
      console.error('Trade items error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get trade items' });
    }
  });

  return router;
}