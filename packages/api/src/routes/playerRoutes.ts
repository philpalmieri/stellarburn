import { Router } from 'express';
import { MovementService } from '../services/movementService.js';
import { ScanningService } from '../services/scanningService.js';
import { ExplorationService } from '../services/explorationService.js';

export function createPlayerRoutes(db: any) {
  const router = Router();
  const movementService = new MovementService(db);
  const scanningService = new ScanningService(db);
  const explorationService = new ExplorationService(db);

  // Direction mappings
  const DIRECTIONS: { [key: string]: any } = {
    north: { x: 0, y: 0.1, z: 0 },
    south: { x: 0, y: -0.1, z: 0 },
    east: { x: 0.1, y: 0, z: 0 },
    west: { x: -0.1, y: 0, z: 0 },
    up: { x: 0, y: 0, z: 0.1 },
    down: { x: 0, y: 0, z: -0.1 }
  };

  // Player status
  router.get('/:playerId/status', async (req, res) => {
    try {
      const { playerId } = req.params;
      const player = await db.collection('players').findOne({ id: playerId });
      
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }
      
      res.json({
        id: player.id,
        name: player.name,
        coordinates: player.coordinates,
        coordinatesString: `${player.coordinates.x},${player.coordinates.y},${player.coordinates.z}`,
        fuel: player.ship.fuel,
        maxFuel: player.ship.maxFuel,
        credits: player.credits,
        cargoCount: player.ship.cargo.length
      });
    } catch (error) {
      console.error('Player status error:', error);
      res.status(500).json({ error: 'Failed to get player status' });
    }
  });

  // Movement
  router.post('/:playerId/move/:direction', async (req, res) => {
    try {
      const { playerId, direction } = req.params;
      const directionVector = DIRECTIONS[direction.toLowerCase()];
      
      if (!directionVector) {
        return res.status(400).json({ 
          error: 'Invalid direction. Use: north, south, east, west, up, down' 
        });
      }
      
      const result = await movementService.movePlayer(playerId, direction, directionVector);
      res.json(result);
    } catch (error) {
      console.error('Movement error:', error);
      res.status(500).json({ error: error.message || 'Failed to move player' });
    }
  });

  // Jump movement
  router.post('/:playerId/jump/:direction', async (req, res) => {
    try {
      const { playerId, direction } = req.params;
      const directionVector = DIRECTIONS[direction.toLowerCase()];
      
      if (!directionVector) {
        return res.status(400).json({ 
          error: 'Invalid direction. Use: north, south, east, west, up, down' 
        });
      }
      
      const jumpResult = await movementService.jumpPlayer(playerId, direction, directionVector);
      const systemScan = await scanningService.performSystemScan(playerId);
      
      res.json({
        ...jumpResult,
        systemScan
      });
    } catch (error) {
      console.error('Jump error:', error);
      res.status(500).json({ error: error.message || 'Failed to jump' });
    }
  });

  // Scanning
  router.get('/:playerId/scan', async (req, res) => {
    try {
      const { playerId } = req.params;
      const result = await scanningService.performLocalScan(playerId);
      res.json(result);
    } catch (error) {
      console.error('Scan error:', error);
      res.status(500).json({ error: error.message || 'Failed to scan area' });
    }
  });

  router.get('/:playerId/system-scan', async (req, res) => {
    try {
      const { playerId } = req.params;
      const result = await scanningService.performSystemScan(playerId);
      res.json(result);
    } catch (error) {
      console.error('System scan error:', error);
      res.status(500).json({ error: error.message || 'Failed to scan system' });
    }
  });

  router.get('/:playerId/known-systems', async (req, res) => {
    try {
      const { playerId } = req.params;
      const result = await explorationService.getKnownSystems(playerId);
      res.json(result);
    } catch (error) {
      console.error('Known systems error:', error);
      res.status(500).json({ error: error.message || 'Failed to get known systems' });
    }
  });

  return router;
}