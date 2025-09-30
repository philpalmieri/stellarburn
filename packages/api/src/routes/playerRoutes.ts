import { Router } from 'express';
import { getMongo } from '../services/databaseService.js';
import { getServices } from '../services/serviceFactory.js';
import { getItemById } from '../data/tradeItems.js';
import { DIRECTIONS, getDirectionVector } from '../constants/directions.js';
import { coordinateToString } from '@stellarburn/shared';
import { performLocalScan, performSystemScan } from '../services/scanningService.js';
import { getKnownSystems } from '../services/explorationService.js';
import { findNearestStation, findNearestPlanet, findNearestStar, findNearestPlayer, findNearestProbe } from '../services/nearestService.js';
import { movePlayer, jumpPlayer } from '../services/movementService.js';
import { launchProbe, getActiveProbes, getAllProbes } from '../services/probeService.js';

// Functional helper for distance calculations and sorting
const calculateDistance3D = (from: any) => (to: any): number => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

const addDistanceToObject = (playerCoords: any) => (obj: any) => ({
  ...obj,
  distance: calculateDistance3D(playerCoords)(obj.coordinates)
});

const addDistanceToSystem = (playerCoords: any) => (system: any) => {
  const systemDistance = calculateDistance3D(playerCoords)(system.coord);
  return {
    ...system,
    distance: systemDistance,
    objects: system.staticObjects ? system.staticObjects
      .map(addDistanceToObject(playerCoords))
      .sort((a: any, b: any) => a.distance - b.distance) : []
  };
};

const sortByDistance = (items: any[]) => items.sort((a, b) => a.distance - b.distance);

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
      
      // Spawn at Haven Station in center system (0,0,0) - docked at the station
      const spawnCoordinates = {
        x: 0.3, // Haven Station coordinates
        y: 0.3,
        z: 0.1
      };
      
      const newPlayer = {
        id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        coordinates: spawnCoordinates,
        dockedAt: 'system_0,0,0_station', // Docked at Haven Station
        ship: {
          fuel: 100,
          maxFuel: 100,
          cargo: [],
          maxCargo: 50, // Add cargo capacity
          probes: 10,
          probeConfig: {
            maxFuel: 10,
            scanRange: 0.05,
            moveDelay: 1000
          }
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
        cargoCount: player.ship.cargo.length,
        cargo: player.ship.cargo || [],
        probes: player.ship.probes || 0,
        dockedAt: player.dockedAt || undefined
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
      
      const db = getMongo('stellarburn');
      const result = await movePlayer(db, playerId, direction, directionVector);
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
      
      const db = getMongo('stellarburn');
      const jumpResult = await jumpPlayer(db, playerId, direction, directionVector);

      res.json(jumpResult);
    } catch (error) {
      console.error('Jump error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to jump' });
    }
  });

  // Scanning
  router.get('/:playerId/scan', async (req, res) => {
    try {
      const { playerId } = req.params;
      const db = getMongo('stellarburn');
      const result = await performLocalScan(db, playerId);
      res.json(result);
    } catch (error) {
      console.error('Scan error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to scan area' });
    }
  });

  router.get('/:playerId/system-scan', async (req, res) => {
    try {
      const { playerId } = req.params;
      const db = getMongo('stellarburn');
      const result = await performSystemScan(db, playerId);

      // Get player coordinates for distance calculation
      const player = await db.collection('players').findOne({ id: playerId });

      if (player && result.objects) {
        // Sort objects by distance from player
        const objectsWithDistance = result.objects
          .map(addDistanceToObject(player.coordinates));
        result.objects = sortByDistance(objectsWithDistance);
      }

      // Sort other players by distance
      if (player && result.otherPlayers) {
        const playersWithDistance = result.otherPlayers
          .map((p: any) => ({
            ...p,
            distance: calculateDistance3D(player.coordinates)(p.coordinates)
          }));
        result.otherPlayers = sortByDistance(playersWithDistance);
      }

      // Sort probes by distance
      if (player && result.probes) {
        const probesWithDistance = result.probes
          .map((p: any) => ({
            ...p,
            distance: calculateDistance3D(player.coordinates)(p.coordinates)
          }));
        result.probes = sortByDistance(probesWithDistance);
      }

      res.json(result);
    } catch (error) {
      console.error('System scan error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to scan system' });
    }
  });

  // Probe launch
  router.post('/:playerId/probe/:direction', async (req, res) => {
    try {
      const { playerId, direction } = req.params;
      const db = getMongo('stellarburn');
      const result = await launchProbe(db, playerId, direction);
      res.json(result);
    } catch (error) {
      console.error('Probe launch error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to launch probe' });
    }
  });

  // Get active probes
  router.get('/:playerId/probes', async (req, res) => {
    try {
      const { playerId } = req.params;
      const db = getMongo('stellarburn');
      const probes = await getActiveProbes(db, playerId);
      res.json(probes);
    } catch (error) {
      console.error('Get probes error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get probes' });
    }
  });

  // Get all probes (including destroyed)
  router.get('/:playerId/probes/all', async (req, res) => {
    try {
      const { playerId } = req.params;
      const db = getMongo('stellarburn');
      const probes = await getAllProbes(db, playerId);
      res.json(probes);
    } catch (error) {
      console.error('Get all probes error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get all probes' });
    }
  });

  router.get('/:playerId/known-systems', async (req, res) => {
    try {
      const { playerId } = req.params;
      const db = getMongo('stellarburn');
      const result = await getKnownSystems(db, playerId);
      res.json(result);
    } catch (error) {
      console.error('Known systems error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get known systems' });
    }
  });

  // Nearest entity finder
  router.get('/:playerId/nearest/:entityType', async (req, res) => {
    try {
      const { playerId, entityType } = req.params;
      const db = getMongo('stellarburn');

      let result;
      switch (entityType.toLowerCase()) {
        case 'station':
          result = await findNearestStation(db, playerId);
          break;
        case 'planet':
          result = await findNearestPlanet(db, playerId);
          break;
        case 'star':
          result = await findNearestStar(db, playerId);
          break;
        case 'player':
        case 'ship':
          result = await findNearestPlayer(db, playerId);
          break;
        case 'probe':
          result = await findNearestProbe(db, playerId);
          break;
        default:
          return res.status(400).json({
            error: 'Invalid entity type. Use: station, planet, star, player/ship, or probe'
          });
      }

      if (!result) {
        return res.json({
          message: `No ${entityType} found in your known systems`,
          nearest: null
        });
      }

      res.json({
        message: `Nearest ${entityType} found`,
        nearest: result
      });
    } catch (error) {
      console.error('Nearest entity error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to find nearest entity' });
    }
  });

  // Database/Knowledge system endpoints

  // Get known systems with objects (default behavior - 'db')
  router.get('/:playerId/database', async (req, res) => {
    try {
      const { playerId } = req.params;
      const db = getMongo('stellarburn');
      const result = await getKnownSystems(db, playerId);

      // Filter to only show systems with objects
      const systemsWithObjects = result.knownSystems.filter((system: any) =>
        system.staticObjects && system.staticObjects.length > 0
      );

      // Add distances and sort by closest first
      const systemsWithDistances = systemsWithObjects
        .map(addDistanceToSystem(result.playerCoordinates));

      const sortedSystems = sortByDistance(systemsWithDistances);

      res.json({
        player: result.playerCoordinates,
        totalKnownSystems: result.knownSystems.length,
        systemsWithObjects: systemsWithObjects.length,
        systems: sortedSystems.map((system: any) => ({
          coordinates: system.coordinates,
          coord: system.coord,
          distance: system.distance,
          objectCount: system.staticObjects.length,
          objects: system.objects.map((obj: any) => ({
            type: obj.type,
            name: obj.name,
            size: obj.size,
            coordinates: obj.coordinates,
            distance: obj.distance
          }))
        }))
      });
    } catch (error) {
      console.error('Database query error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to query database' });
    }
  });

  // Get all known systems including empty ones ('db all')
  router.get('/:playerId/database/all', async (req, res) => {
    try {
      const { playerId } = req.params;
      const db = getMongo('stellarburn');
      const result = await getKnownSystems(db, playerId);

      // Add distances and sort all systems by closest first
      const systemsWithDistances = result.knownSystems
        .map(addDistanceToSystem(result.playerCoordinates));

      const sortedSystems = sortByDistance(systemsWithDistances);

      res.json({
        player: result.playerCoordinates,
        totalKnownSystems: result.knownSystems.length,
        systems: sortedSystems.map((system: any) => ({
          coordinates: system.coordinates,
          coord: system.coord,
          distance: system.distance,
          isEmpty: !system.staticObjects || system.staticObjects.length === 0,
          objectCount: system.staticObjects ? system.staticObjects.length : 0,
          objects: system.objects.map((obj: any) => ({
            type: obj.type,
            name: obj.name,
            size: obj.size,
            coordinates: obj.coordinates,
            distance: obj.distance
          }))
        }))
      });
    } catch (error) {
      console.error('Database all query error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to query database' });
    }
  });

  // Get specific system details ('db 1,1,1')
  router.get('/:playerId/database/system/:coordinates', async (req, res) => {
    try {
      const { playerId, coordinates } = req.params;
      const db = getMongo('stellarburn');
      const result = await getKnownSystems(db, playerId);

      // Find the specific system in player's known systems
      const system = result.knownSystems.find((sys: any) => sys.coordinates === coordinates);

      if (!system) {
        // Check if the system exists in the universe at all (but don't reveal details!)
        const universalSystem = await db.collection('sectors').findOne({ coordinates });

        if (universalSystem) {
          return res.status(403).json({
            error: `You haven't been to system ${coordinates} yet - no peeking! 🔭`,
            hint: 'You need to visit this system first to discover what\'s there',
            suggestion: 'Use navigation to travel there and explore',
            teaser: 'This system does exist somewhere in the universe...'
          });
        } else {
          return res.status(404).json({
            error: `System ${coordinates} doesn't exist in this universe`,
            hint: 'Check your coordinates - this system was never generated',
            suggestion: 'Try coordinates closer to explored space'
          });
        }
      }

      // Get additional details about the system
      const systemDetails = {
        coordinates: system.coordinates,
        coord: system.coord,
        discovered: system.createdAt || system.lastActivity,
        isEmpty: !system.staticObjects || system.staticObjects.length === 0,
        objectCount: system.staticObjects ? system.staticObjects.length : 0,
        objects: system.staticObjects ? system.staticObjects.map((obj: any) => {
          const baseObj = {
            id: obj.id,
            type: obj.type,
            name: obj.name,
            size: obj.size,
            coordinates: obj.coordinates,
            distance: Math.sqrt(
              Math.pow(obj.coordinates.x - result.playerCoordinates.x, 2) +
              Math.pow(obj.coordinates.y - result.playerCoordinates.y, 2) +
              Math.pow(obj.coordinates.z - result.playerCoordinates.z, 2)
            ).toFixed(2),
            resources: obj.resources || []
          };

          // Enrich station data with inventory details
          if (obj.type === 'station' && obj.inventory) {
            const enrichedInventory = obj.inventory?.map((inv: any) => {
              const item = getItemById(inv.itemId);
              return {
                ...inv,
                itemName: item?.name || 'Unknown Item',
                itemCategory: item?.category || 'unknown'
              };
            }).slice(0, 5) || [];

            return {
              ...baseObj,
              stationClass: obj.stationClass,
              enrichedInventory,
              inventoryCount: obj.inventory?.length || 0
            };
          }

          return baseObj;
        }) : [],
        dynamicObjects: system.dynamicObjects || { ships: [], probes: [] }
      };

      res.json({
        player: result.playerCoordinates,
        system: systemDetails
      });
    } catch (error) {
      console.error('System details error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get system details' });
    }
  });

  return router;
}