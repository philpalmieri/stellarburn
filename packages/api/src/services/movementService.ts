import { MongoClient } from 'mongodb';
import { Coordinates3D, coordinateToString } from '@stellarburn/shared';
import { ScanningService } from './scanningService.js';

export class MovementService {
  constructor(
    private db: any,
    private scanningService: ScanningService
  ) {}

  async movePlayer(playerId: string, direction: string, directionVector: Coordinates3D) {
    const player = await this.db.collection('players').findOne({ id: playerId });
    
    if (!player) {
      throw new Error('Player not found');
    }
    
    if (player.ship.fuel < 1) {
      throw new Error('Not enough fuel to move');
    }
    
    const newCoordinates: Coordinates3D = {
      x: player.coordinates.x + directionVector.x,
      y: player.coordinates.y + directionVector.y,
      z: player.coordinates.z + directionVector.z
    };
    
    await this.db.collection('players').updateOne(
      { id: playerId },
      {
        $set: {
          coordinates: newCoordinates,
          lastActivity: new Date()
        },
        $inc: { 'ship.fuel': -1 }
      }
    );

    // Perform local scan at new location
    const localScan = await this.scanningService.performLocalScan(playerId);

    return {
      success: true,
      newCoordinates,
      fuel: player.ship.fuel - 1,
      message: `Moved ${direction} to ${coordinateToString(newCoordinates)}`,
      localScan
    };
  }

  async jumpPlayer(playerId: string, direction: string, directionVector: Coordinates3D) {
    const player = await this.db.collection('players').findOne({ id: playerId });
    
    if (!player) {
      throw new Error('Player not found');
    }
    
    if (player.ship.fuel < 1) {
      throw new Error('Not enough fuel to jump');
    }
    
    const currentCoords = player.coordinates;

    // Use consistent system coordinate calculation (same as navigation service)
    const getCurrentSystemCoord = (coord: number): number => Math.floor(coord);

    const currentSystem = {
      x: getCurrentSystemCoord(currentCoords.x),
      y: getCurrentSystemCoord(currentCoords.y),
      z: getCurrentSystemCoord(currentCoords.z)
    };

    const nextSystemCoords = {
      x: currentSystem.x + (directionVector.x > 0 ? 1 : directionVector.x < 0 ? -1 : 0),
      y: currentSystem.y + (directionVector.y > 0 ? 1 : directionVector.y < 0 ? -1 : 0),
      z: currentSystem.z + (directionVector.z > 0 ? 1 : directionVector.z < 0 ? -1 : 0)
    };

    // Landing coordinates: enter at system center (0.5 offset from system coordinate)
    const landingCoords = {
      x: directionVector.x !== 0 ? nextSystemCoords.x + 0.5 : currentCoords.x,
      y: directionVector.y !== 0 ? nextSystemCoords.y + 0.5 : currentCoords.y,
      z: directionVector.z !== 0 ? nextSystemCoords.z + 0.5 : currentCoords.z
    };
    
    await this.db.collection('players').updateOne(
      { id: playerId },
      {
        $set: {
          coordinates: landingCoords,
          lastActivity: new Date()
        },
        $inc: { 'ship.fuel': -1 }
      }
    );

    // Perform system scan at new location
    const systemScan = await this.scanningService.performSystemScan(playerId);

    return {
      success: true,
      newCoordinates: landingCoords,
      fuel: player.ship.fuel - 1,
      systemCoordinates: nextSystemCoords,
      message: `Jumped ${direction} to system ${coordinateToString(nextSystemCoords)}`,
      systemScan
    };
  }
}