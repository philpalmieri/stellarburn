import { Coordinates3D, coordinateToString } from '@stellarburn/shared';
import { ExplorationService } from './explorationService.js';

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
    
    // Get other players in this system
    const systemPlayers = await this.db.collection('players').find({
      'coordinates.x': { $gte: systemCoords.x, $lt: systemCoords.x + 1 },
      'coordinates.y': { $gte: systemCoords.y, $lt: systemCoords.y + 1 },
      'coordinates.z': { $gte: systemCoords.z, $lt: systemCoords.z + 1 },
      id: { $ne: playerId }
    }).toArray();
    
    return {
      systemCoordinates: systemCoords,
      objects: systemSector ? systemSector.staticObjects : [],
      otherPlayers: systemPlayers.map((p: any) => ({
        name: p.name,
        coordinates: p.coordinates
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

    // Helper function to find objects near a coordinate
    const findObjectsNear = (coords: Coordinates3D, scanRange: number = 0.05) => {
      if (!systemSector?.staticObjects) return [];

      return systemSector.staticObjects.filter((obj: any) => {
        const distance = Math.sqrt(
          Math.pow(obj.coordinates.x - coords.x, 2) +
          Math.pow(obj.coordinates.y - coords.y, 2) +
          Math.pow(obj.coordinates.z - coords.z, 2)
        );
        return distance <= scanRange;
      });
    };

    // Helper function to find players near a coordinate
    const findPlayersNear = async (coords: Coordinates3D, scanRange: number = 0.05) => {
      const tolerance = scanRange;
      const nearbyPlayers = await this.db.collection('players').find({
        'coordinates.x': { $gte: coords.x - tolerance, $lte: coords.x + tolerance },
        'coordinates.y': { $gte: coords.y - tolerance, $lte: coords.y + tolerance },
        'coordinates.z': { $gte: coords.z - tolerance, $lte: coords.z + tolerance },
        id: { $ne: playerId }
      }).toArray();

      return nearbyPlayers.map((p: any) => ({
        name: p.name,
        coordinates: p.coordinates
      }));
    };

    // Scan current zone - use larger range for objects you're right next to
    const currentObjects = findObjectsNear(currentCoords, 0.1);
    const currentPlayers = await findPlayersNear(currentCoords, 0.05);

    // Define adjacent coordinates
    const adjacentCoords = {
      north: { x: currentCoords.x, y: currentCoords.y + 0.1, z: currentCoords.z },
      south: { x: currentCoords.x, y: currentCoords.y - 0.1, z: currentCoords.z },
      east: { x: currentCoords.x + 0.1, y: currentCoords.y, z: currentCoords.z },
      west: { x: currentCoords.x - 0.1, y: currentCoords.y, z: currentCoords.z },
      up: { x: currentCoords.x, y: currentCoords.y, z: currentCoords.z + 0.1 },
      down: { x: currentCoords.x, y: currentCoords.y, z: currentCoords.z - 0.1 }
    };

    // Scan adjacent zones - use smaller range to prevent bleed-through
    const adjacentZones: any = {};
    for (const [direction, coords] of Object.entries(adjacentCoords)) {
      adjacentZones[direction] = {
        coordinates: coords,
        objects: findObjectsNear(coords, 0.05),
        otherPlayers: await findPlayersNear(coords, 0.05)
      };
    }

    return {
      currentZone: {
        coordinates: currentCoords,
        objects: currentObjects,
        otherPlayers: currentPlayers
      },
      adjacentZones
    };
  }
}