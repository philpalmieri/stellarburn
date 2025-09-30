import { Coordinates3D, coordinateToString } from '@stellarburn/shared';
import { ExplorationService } from './explorationService.js';
import { getItemById } from '../data/tradeItems.js';

// Functional helper functions using currying and higher-order functions
const createDistanceCalculator = (targetCoords: Coordinates3D) =>
  (coords: Coordinates3D) => Math.sqrt(
    Math.pow(coords.x - targetCoords.x, 2) +
    Math.pow(coords.y - targetCoords.y, 2) +
    Math.pow(coords.z - targetCoords.z, 2)
  );

const createRangeFilter = (scanRange: number) =>
  (distance: number) => distance <= scanRange;

const findObjectsNear = (systemSector: any) => (coords: Coordinates3D) => (scanRange: number = 0.05) => {
  if (!systemSector?.staticObjects) return [];

  const calculateDistance = createDistanceCalculator(coords);
  const isInRange = createRangeFilter(scanRange);

  return systemSector.staticObjects.filter((obj: any) =>
    isInRange(calculateDistance(obj.coordinates))
  );
};

const findPlayersNear = (db: any) => (excludePlayerId: string) => (coords: Coordinates3D) => async (scanRange: number = 0.05) => {
  const tolerance = scanRange;
  const nearbyPlayers = await db.collection('players').find({
    'coordinates.x': { $gte: coords.x - tolerance, $lte: coords.x + tolerance },
    'coordinates.y': { $gte: coords.y - tolerance, $lte: coords.y + tolerance },
    'coordinates.z': { $gte: coords.z - tolerance, $lte: coords.z + tolerance },
    id: { $ne: excludePlayerId },
    dockedAt: { $exists: false }
  }).toArray();

  return nearbyPlayers.map((p: any) => ({
    name: p.name,
    coordinates: p.coordinates
  }));
};

const findProbesNear = (db: any) => (coords: Coordinates3D) => async (scanRange: number = 0.05) => {
  const tolerance = scanRange;
  const nearbyProbes = await db.collection('probes').find({
    'coordinates.x': { $gte: coords.x - tolerance, $lte: coords.x + tolerance },
    'coordinates.y': { $gte: coords.y - tolerance, $lte: coords.y + tolerance },
    'coordinates.z': { $gte: coords.z - tolerance, $lte: coords.z + tolerance },
    status: 'active'
  }).toArray();

  return nearbyProbes.map((probe: any) => ({
    id: probe.id,
    playerId: probe.playerId,
    coordinates: probe.coordinates,
    fuel: probe.fuel,
    status: probe.status
  }));
};

// Helper function to enrich station data with inventory details
const enrichStationData = (obj: any) => {
  if (obj.type === 'station') {
    const enrichedInventory = obj.inventory?.map((inv: any) => {
      const item = getItemById(inv.itemId);
      return {
        ...inv,
        itemName: item?.name || 'Unknown Item',
        itemCategory: item?.category || 'unknown'
      };
    }).slice(0, 5) || []; // Limit to first 5 items for scan display

    return {
      ...obj,
      enrichedInventory,
      inventoryCount: obj.inventory?.length || 0
    };
  }
  return obj;
};

export class ScanningService {
  constructor(
    private db: any,
    private explorationService: ExplorationService
  ) {}

  async performSystemScan(playerId: string) {
    const player = await this.db.collection('players').findOne({ id: playerId });
    if (!player) {
      throw new Error('Player not found');
    }
    
    const currentCoords = player.coordinates;
    const systemCoords = {
      x: Math.floor(currentCoords.x),
      y: Math.floor(currentCoords.y),
      z: Math.floor(currentCoords.z)
    };
    
    // Track exploration automatically
    await this.explorationService.trackPlayerExploration(playerId, currentCoords);
    
    // Get system data
    const systemCoordString = coordinateToString(systemCoords);
    const systemSector = await this.db.collection('sectors').findOne({ coordinates: systemCoordString });
    
    // Get other players in this system (exclude docked players)
    const systemPlayers = await this.db.collection('players').find({
      'coordinates.x': { $gte: systemCoords.x, $lt: systemCoords.x + 1 },
      'coordinates.y': { $gte: systemCoords.y, $lt: systemCoords.y + 1 },
      'coordinates.z': { $gte: systemCoords.z, $lt: systemCoords.z + 1 },
      id: { $ne: playerId },
      dockedAt: { $exists: false }
    }).toArray();

    // Get probes in this system
    const systemProbes = await this.db.collection('probes').find({
      'coordinates.x': { $gte: systemCoords.x, $lt: systemCoords.x + 1 },
      'coordinates.y': { $gte: systemCoords.y, $lt: systemCoords.y + 1 },
      'coordinates.z': { $gte: systemCoords.z, $lt: systemCoords.z + 1 },
      status: 'active'
    }).toArray();

    return {
      systemCoordinates: systemCoords,
      objects: systemSector?.staticObjects ? systemSector.staticObjects.map(enrichStationData) : [],
      otherPlayers: (systemPlayers || []).map((p: any) => ({
        name: p.name,
        coordinates: p.coordinates
      })),
      probes: (systemProbes || []).map((probe: any) => ({
        id: probe.id,
        playerId: probe.playerId,
        coordinates: probe.coordinates,
        fuel: probe.fuel,
        status: probe.status
      }))
    };
  }

  async performLocalScan(playerId: string) {
    const player = await this.db.collection('players').findOne({ id: playerId });
    if (!player) {
      throw new Error('Player not found');
    }

    // Track exploration
    await this.explorationService.trackPlayerExploration(playerId, player.coordinates);

    const currentCoords = player.coordinates;
    const systemCoords = {
      x: Math.floor(currentCoords.x),
      y: Math.floor(currentCoords.y),
      z: Math.floor(currentCoords.z)
    };

    // Get system data for object detection
    const systemCoordString = coordinateToString(systemCoords);
    const systemSector = await this.db.collection('sectors').findOne({ coordinates: systemCoordString });

    // Create partially applied functions for this scan session
    const findObjectsInSystemSector = findObjectsNear(systemSector);
    const findPlayersExcludingCurrent = findPlayersNear(this.db)(playerId);
    const findActiveProbes = findProbesNear(this.db);

    // Scan current zone - use larger range for objects you're right next to
    const currentObjects = findObjectsInSystemSector(currentCoords)(0.1).map(enrichStationData);
    const currentPlayers = await findPlayersExcludingCurrent(currentCoords)(0.05);
    const currentProbes = await findActiveProbes(currentCoords)(0.05);

    // Define adjacent coordinates - these should represent the centers of adjacent 0.1-unit zones
    const adjacentCoords = {
      north: { x: currentCoords.x, y: currentCoords.y + 0.1, z: currentCoords.z },
      south: { x: currentCoords.x, y: currentCoords.y - 0.1, z: currentCoords.z },
      east: { x: currentCoords.x + 0.1, y: currentCoords.y, z: currentCoords.z },
      west: { x: currentCoords.x - 0.1, y: currentCoords.y, z: currentCoords.z },
      up: { x: currentCoords.x, y: currentCoords.y, z: currentCoords.z + 0.1 },
      down: { x: currentCoords.x, y: currentCoords.y, z: currentCoords.z - 0.1 }
    };

    // Scan adjacent zones - use larger range to capture entities in neighboring zones
    const adjacentZones: any = {};
    for (const [direction, coords] of Object.entries(adjacentCoords)) {
      adjacentZones[direction] = {
        coordinates: coords,
        objects: findObjectsInSystemSector(coords)(0.05).map(enrichStationData),
        otherPlayers: await findPlayersExcludingCurrent(coords)(0.08), // Larger range to detect entities in adjacent zones
        probes: await findActiveProbes(coords)(0.08)
      };
    }

    return {
      currentZone: {
        coordinates: currentCoords,
        objects: currentObjects,
        otherPlayers: currentPlayers,
        probes: currentProbes
      },
      adjacentZones
    };
  }
}