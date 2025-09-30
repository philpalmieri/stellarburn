import { Router } from 'express';
import { startMining, getMiningStatus, cancelMining } from '../services/miningService.js';

// Helper function to calculate distance between two coordinates
function calculateDistance(coord1: any, coord2: any): number {
  return Math.sqrt(
    Math.pow(coord1.x - coord2.x, 2) +
    Math.pow(coord1.y - coord2.y, 2) +
    Math.pow(coord1.z - coord2.z, 2)
  );
}

export function createMiningRoutes(): Router {
  const router = Router();

  // Auto-mine nearest asteroid (similar to auto-dock)
  router.post('/mine/:playerId', async (req, res) => {
    try {
      const { playerId } = req.params;

      if (!playerId) {
        return res.status(400).json({
          success: false,
          message: 'Player ID is required'
        });
      }

      // Find the nearest asteroid to the player
      const { performLocalScan } = await import('../services/scanningService.js');
      const { getMongo } = await import('../services/databaseService.js');

      const db = getMongo('stellarburn');
      const localScan = await performLocalScan(db, playerId);

      // Find asteroids in current sector
      const asteroidsInSector = localScan.currentSector.objects.filter((obj: any) => obj.type === 'asteroid');

      if (asteroidsInSector.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No asteroids found in current sector. Move closer to an asteroid to mine it.'
        });
      }

      // Find the closest asteroid
      const player = await db.collection('players').findOne({ id: playerId });
      if (!player) {
        return res.status(400).json({
          success: false,
          message: 'Player not found'
        });
      }

      let nearestAsteroid = asteroidsInSector[0];
      let minDistance = calculateDistance(player.coordinates, nearestAsteroid.coordinates);

      for (const asteroid of asteroidsInSector) {
        const distance = calculateDistance(player.coordinates, asteroid.coordinates);
        if (distance < minDistance) {
          minDistance = distance;
          nearestAsteroid = asteroid;
        }
      }

      // Start mining the nearest asteroid
      const result = await startMining(playerId, nearestAsteroid.id);

      if (result.success) {
        res.status(200).json({
          ...result,
          asteroidName: nearestAsteroid.name,
          distance: minDistance.toFixed(2)
        });
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('Error auto-mining:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while starting auto-mining operation'
      });
    }
  });

  // Start mining a specific asteroid
  router.post('/mine/:asteroidId', async (req, res) => {
    try {
      const { asteroidId } = req.params;
      const { playerId } = req.body;

      if (!playerId) {
        return res.status(400).json({
          success: false,
          message: 'Player ID is required'
        });
      }

      if (!asteroidId) {
        return res.status(400).json({
          success: false,
          message: 'Asteroid ID is required'
        });
      }

      const result = await startMining(playerId, asteroidId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('Error starting mining:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while starting mining operation'
      });
    }
  });

  // Get current mining status
  router.get('/status/:playerId', async (req, res) => {
    try {
      const { playerId } = req.params;

      if (!playerId) {
        return res.status(400).json({
          success: false,
          message: 'Player ID is required'
        });
      }

      const miningStatus = getMiningStatus(playerId);

      if (miningStatus) {
        const now = new Date();
        const timeRemaining = Math.max(0, Math.ceil((miningStatus.expectedEndTime.getTime() - now.getTime()) / 1000));

        res.status(200).json({
          success: true,
          mining: true,
          operation: {
            ...miningStatus,
            timeRemaining
          }
        });
      } else {
        res.status(200).json({
          success: true,
          mining: false,
          operation: null
        });
      }

    } catch (error) {
      console.error('Error getting mining status:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while getting mining status'
      });
    }
  });

  // Cancel current mining operation
  router.post('/cancel/:playerId', async (req, res) => {
    try {
      const { playerId } = req.params;

      if (!playerId) {
        return res.status(400).json({
          success: false,
          message: 'Player ID is required'
        });
      }

      const cancelled = cancelMining(playerId);

      if (cancelled) {
        res.status(200).json({
          success: true,
          message: 'Mining operation cancelled'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'No active mining operation to cancel'
        });
      }

    } catch (error) {
      console.error('Error cancelling mining:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while cancelling mining operation'
      });
    }
  });

  return router;
}