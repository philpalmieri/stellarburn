import { Coordinates3D, coordinateToString } from '@stellarburn/shared';

export class ExplorationService {
  constructor(private db: any) {}

  async trackPlayerExploration(playerId: string, coordinates: Coordinates3D) {
    const systemCoords = {
      x: Math.floor(coordinates.x),
      y: Math.floor(coordinates.y),
      z: Math.floor(coordinates.z)
    };
    
    const systemCoordString = coordinateToString(systemCoords);
    
    await this.db.collection('players').updateOne(
      { id: playerId },
      { 
        $addToSet: { 
          'knownSystems': systemCoordString 
        }
      }
    );
  }

  async getKnownSystems(playerId: string) {
    const player = await this.db.collection('players').findOne({ id: playerId });
    if (!player) {
      throw new Error('Player not found');
    }
    
    const knownSystems = player.knownSystems || [];
    
    const sectors = await this.db.collection('sectors').find({
      coordinates: { $in: knownSystems }
    }).toArray();
    
    return {
      playerCoordinates: player.coordinates,
      rawSystems: knownSystems,
      knownSystems: sectors
    };
  }
}