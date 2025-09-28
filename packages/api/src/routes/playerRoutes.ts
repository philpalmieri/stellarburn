import { Router } from 'express';
import { getMongo } from '../services/databaseService.js';
import { getServices } from '../services/serviceFactory.js';
import { DIRECTIONS, getDirectionVector } from '../constants/directions.js';
import { coordinateToString } from '@stellarburn/shared';

export function createPlayerRoutes() {
  const router = Router();


  // Player creation
  router.post('/create', async (req, res) => {
    try {
      const db = getMongo('stellarburn');
      const { name } = req.body;
      
      if (!name || name.length < 2) {
        return res.status(400).json({ error: 'Player name must be at least 2 characters' });
      }
      
      const existingPlayer = await db.collection('players').findOne({ name });
      if (existingPlayer) {
        return res.status(409).json({ error: 'Player name already exists' });
      }
      
      // Find safe spawn location
      const sectors = await db.collection('sectors').find({}).toArray();
      let spawnCoordinates = { x: 0.5, y: 0.5, z: 0.5 };
      
      for (const sector of sectors.slice(0, 10)) {
        const largeObjects = sector.staticObjects.filter((obj: any) => obj.size > 10);
        if (largeObjects.length === 0) {
          spawnCoordinates = {
            x: sector.coord.x + Math.random() * 0.8 + 0.1,
            y: sector.coord.y + Math.random() * 0.8 + 0.1,
            z: sector.coord.z + Math.random() * 0.8 + 0.1
          };
          break;
        }
      }
      
      const newPlayer = {
        id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        coordinates: spawnCoordinates,
        ship: {
          fuel: 100,
          maxFuel: 100,
          cargo: []
        },
        credits: 1000,
        knownSystems: [],
        createdAt: new Date(),
        lastActivity: new Date()
      };
      
      await db.collection('players').insertOne(newPlayer);
      
      res.json({
        message: `Player ${name} created successfully`,
        player: newPlayer,
        spawnLocation: coordinateToString(spawnCoordinates)
      });
    } catch (error) {
      console.error('Player creation error:', error);
      res.status(500).json({ error: 'Failed to create player' });
    }
  });

  // Player status
  router.get('/:playerId/status', async (req, res) => {
    try {
      const db = getMongo('stellarburn');
      const { playerId } = req.params;
      const player = await db.collection('players').findOne({ id: playerId });
      
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }
      
      res.json({
        id: player.id,
        name: player.name,
        coordinates: player.coordinates,
        coordinatesString: coordinateToString(player.coordinates),
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

  // Get services function for lazy initialization
  const getServicesLazy = () => getServices();

  // Movement
  router.post('/:playerId/move/:direction', async (req, res) => {
    try {
      const { playerId, direction } = req.params;
      let directionVector;
      try {
        directionVector = getDirectionVector(direction);
      } catch (error) {
        return res.status(400).json({
          error: error instanceof Error ? error.message : 'Invalid direction'
        });
      }
      
      const { movementService } = getServicesLazy();
      const result = await movementService.movePlayer(playerId, direction, directionVector);
      res.json(result);
    } catch (error) {
      console.error('Movement error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to move player' });
    }
  });

  // Jump movement
  router.post('/:playerId/jump/:direction', async (req, res) => {
    try {
      const { playerId, direction } = req.params;
      let directionVector;
      try {
        directionVector = getDirectionVector(direction);
      } catch (error) {
        return res.status(400).json({
          error: error instanceof Error ? error.message : 'Invalid direction'
        });
      }
      
      const { movementService, scanningService } = getServicesLazy();
      const jumpResult = await movementService.jumpPlayer(playerId, direction, directionVector);
      const systemScan = await scanningService.performSystemScan(playerId);
      
      res.json({
        ...jumpResult,
        systemScan
      });
    } catch (error) {
      console.error('Jump error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to jump' });
    }
  });

  // Scanning
  router.get('/:playerId/scan', async (req, res) => {
    try {
      const { playerId } = req.params;
      const { scanningService } = getServicesLazy();
      const result = await scanningService.performLocalScan(playerId);
      res.json(result);
    } catch (error) {
      console.error('Scan error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to scan area' });
    }
  });

  router.get('/:playerId/system-scan', async (req, res) => {
    try {
      const { playerId } = req.params;
      const { scanningService } = getServicesLazy();
      const result = await scanningService.performSystemScan(playerId);
      res.json(result);
    } catch (error) {
      console.error('System scan error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to scan system' });
    }
  });

  router.get('/:playerId/known-systems', async (req, res) => {
    try {
      const { playerId } = req.params;
      const { explorationService } = getServicesLazy();
      const result = await explorationService.getKnownSystems(playerId);
      res.json(result);
    } catch (error) {
      console.error('Known systems error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get known systems' });
    }
  });

  return router;
}