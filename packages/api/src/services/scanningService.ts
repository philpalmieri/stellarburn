import { Coordinates3D, coordinateToString } from '@stellarburn/shared';
import { ExplorationService } from './explorationService.js';

export class ScanningService {
  private explorationService: ExplorationService;

  constructor(private db: any) {
    this.explorationService = new ExplorationService(db);
  }

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
    return {
      currentZone: {
        coordinates: currentCoords,
        objects: [],
        otherPlayers: []
      },
      adjacentZones: {
        north: { coordinates: { x: currentCoords.x, y: currentCoords.y + 0.1, z: currentCoords.z }, objects: [], otherPlayers: [] },
        south: { coordinates: { x: currentCoords.x, y: currentCoords.y - 0.1, z: currentCoords.z }, objects: [], otherPlayers: [] },
        east: { coordinates: { x: currentCoords.x + 0.1, y: currentCoords.y, z: currentCoords.z }, objects: [], otherPlayers: [] },
        west: { coordinates: { x: currentCoords.x - 0.1, y: currentCoords.y, z: currentCoords.z }, objects: [], otherPlayers: [] },
        up: { coordinates: { x: currentCoords.x, y: currentCoords.y, z: currentCoords.z + 0.1 }, objects: [], otherPlayers: [] },
        down: { coordinates: { x: currentCoords.x, y: currentCoords.y, z: currentCoords.z - 0.1 }, objects: [], otherPlayers: [] }
      }
    };
  }
}