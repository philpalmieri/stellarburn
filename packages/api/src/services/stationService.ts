import { Coordinates3D, CelestialBody, StationInventory, TradeItem } from '@stellarburn/shared';

// Functional helpers for station operations
const isInDockingRange = (playerCoords: Coordinates3D) => (stationCoords: Coordinates3D): boolean => {
  const dx = Math.abs(playerCoords.x - stationCoords.x);
  const dy = Math.abs(playerCoords.y - stationCoords.y);
  const dz = Math.abs(playerCoords.z - stationCoords.z);
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return distance <= 0.05; // Must be within same zone
};

const canAffordItem = (playerCredits: number) => (itemPrice: number) => (quantity: number): boolean =>
  playerCredits >= itemPrice * quantity;

const hasCargoSpace = (currentWeight: number) => (maxWeight: number) => (itemWeight: number) => (quantity: number): boolean =>
  currentWeight + (itemWeight * quantity) <= maxWeight;

export class StationService {
  constructor(private db: any) {}

  async getStationInfo(stationId: string) {
    const station = await this.findStationById(stationId);
    if (!station) throw new Error('Station not found');

    // Get docked ships
    const dockedPlayers = await this.db.collection('players').find({
      dockedAt: stationId
    }).toArray();

    return {
      id: station.id,
      name: station.name,
      stationClass: station.stationClass,
      coordinates: station.coordinates,
      dockedShips: dockedPlayers.map((p: any) => ({
        id: p.id,
        name: p.name
      }))
    };
  }

  async dockPlayer(playerId: string) {
    const player = await this.db.collection('players').findOne({ id: playerId });
    if (!player) throw new Error('Player not found');

    if (player.dockedAt) {
      throw new Error('Already docked at a station');
    }

    // Find nearest station in range
    const station = await this.findNearestStationInRange(player.coordinates);
    if (!station) {
      throw new Error('No station within docking range (must be in same zone)');
    }

    // Update player to be docked
    await this.db.collection('players').updateOne(
      { id: playerId },
      {
        $set: {
          dockedAt: station.id,
          lastActivity: new Date()
        }
      }
    );

    return {
      success: true,
      message: `Docked at ${station.name} (Class ${station.stationClass})`,
      station: {
        id: station.id,
        name: station.name,
        stationClass: station.stationClass,
        coordinates: station.coordinates
      }
    };
  }

  async undockPlayer(playerId: string) {
    const player = await this.db.collection('players').findOne({ id: playerId });
    if (!player) throw new Error('Player not found');

    if (!player.dockedAt) {
      throw new Error('Not currently docked');
    }

    const station = await this.findStationById(player.dockedAt);
    const stationName = station?.name || 'Unknown Station';

    // Update player to be undocked
    await this.db.collection('players').updateOne(
      { id: playerId },
      {
        $unset: { dockedAt: "" },
        $set: { lastActivity: new Date() }
      }
    );

    return {
      success: true,
      message: `Undocked from ${stationName}`,
      coordinates: player.coordinates
    };
  }

  async getStationNearPlayer(playerId: string) {
    const player = await this.db.collection('players').findOne({ id: playerId });
    if (!player) throw new Error('Player not found');

    const station = await this.findNearestStationInRange(player.coordinates);
    if (!station) {
      return {
        nearbyStation: null,
        message: 'No station in docking range'
      };
    }

    return {
      nearbyStation: {
        id: station.id,
        name: station.name,
        stationClass: station.stationClass,
        coordinates: station.coordinates,
        distance: this.calculateDistance(player.coordinates, station.coordinates)
      },
      message: `${station.name} is within docking range`
    };
  }

  private async findNearestStationInRange(playerCoords: Coordinates3D): Promise<CelestialBody | null> {
    // Get current system
    const systemX = Math.floor(playerCoords.x);
    const systemY = Math.floor(playerCoords.y);
    const systemZ = Math.floor(playerCoords.z);
    const systemCoords = `${systemX},${systemY},${systemZ}`;

    const sector = await this.db.collection('sectors').findOne({ coordinates: systemCoords });
    if (!sector || !sector.staticObjects) return null;

    const checkInRange = isInDockingRange(playerCoords);
    const stations = sector.staticObjects.filter((obj: any) =>
      obj.type === 'station' && checkInRange(obj.coordinates)
    );

    return stations.length > 0 ? stations[0] : null;
  }

  private async findStationById(stationId: string): Promise<CelestialBody | null> {
    const sectors = await this.db.collection('sectors').find({}).toArray();

    for (const sector of sectors) {
      if (!sector.staticObjects) continue;

      const station = sector.staticObjects.find((obj: any) =>
        obj.type === 'station' && obj.id === stationId
      );

      if (station) return station;
    }

    return null;
  }

  private calculateDistance(from: Coordinates3D, to: Coordinates3D): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}