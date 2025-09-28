import { Coordinates3D, coordinateToString } from '@stellarburn/shared';
import { ExplorationService } from './explorationService.js';

// Functional utilities for distance and nearest calculations
const calculateDistance3D = (from: Coordinates3D) => (to: Coordinates3D): number => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

const createEntityWithDistance = (fromCoords: Coordinates3D) => (entity: any) => ({
  ...entity,
  distance: calculateDistance3D(fromCoords)(entity.coordinates)
});

const sortByDistance = (entities: any[]) =>
  entities.sort((a, b) => a.distance - b.distance);

const filterByType = (type: string) => (entity: any) =>
  entity.type === type;

const findClosestEntity = (fromCoords: Coordinates3D) => (entities: any[]) => {
  if (entities.length === 0) return null;

  return entities
    .map(createEntityWithDistance(fromCoords))
    .reduce((closest, current) =>
      current.distance < closest.distance ? current : closest
    );
};

const findNearestOfType = (fromCoords: Coordinates3D) => (type: string) => (entities: any[]) => {
  const filtered = entities.filter(filterByType(type));
  return findClosestEntity(fromCoords)(filtered);
};

export interface NearestResult {
  type: 'station' | 'planet' | 'star' | 'player' | 'probe';
  name: string;
  coordinates: Coordinates3D;
  distance: number;
  systemCoordinates?: Coordinates3D;
}

export class NearestService {
  constructor(
    private db: any,
    private explorationService: ExplorationService
  ) {}

  async findNearestStation(playerId: string): Promise<NearestResult | null> {
    return this.findNearestEntityOfType(playerId, 'station');
  }

  async findNearestPlanet(playerId: string): Promise<NearestResult | null> {
    return this.findNearestEntityOfType(playerId, 'planet');
  }

  async findNearestStar(playerId: string): Promise<NearestResult | null> {
    return this.findNearestEntityOfType(playerId, 'star');
  }

  async findNearestPlayer(playerId: string): Promise<NearestResult | null> {
    const player = await this.db.collection('players').findOne({ id: playerId });
    if (!player) throw new Error('Player not found');

    const otherPlayers = await this.db.collection('players').find({
      id: { $ne: playerId }
    }).toArray();

    if (otherPlayers.length === 0) return null;

    const findClosest = findClosestEntity(player.coordinates);
    const closest = findClosest(otherPlayers);

    return closest ? {
      type: 'player',
      name: closest.name,
      coordinates: closest.coordinates,
      distance: closest.distance
    } : null;
  }

  async findNearestProbe(playerId: string): Promise<NearestResult | null> {
    const player = await this.db.collection('players').findOne({ id: playerId });
    if (!player) throw new Error('Player not found');

    const activeProbes = await this.db.collection('probes').find({
      status: 'active'
    }).toArray();

    if (activeProbes.length === 0) return null;

    const findClosest = findClosestEntity(player.coordinates);
    const closest = findClosest(activeProbes);

    return closest ? {
      type: 'probe',
      name: `Probe ${closest.id.slice(-6)}`,
      coordinates: closest.coordinates,
      distance: closest.distance
    } : null;
  }

  private async findNearestEntityOfType(playerId: string, entityType: 'station' | 'planet' | 'star'): Promise<NearestResult | null> {
    const player = await this.db.collection('players').findOne({ id: playerId });
    if (!player) throw new Error('Player not found');

    // Get player's known systems
    const knownSystemsResult = await this.explorationService.getKnownSystems(playerId);
    const knownSystems = knownSystemsResult.knownSystems;

    let allEntities: any[] = [];

    // Collect all entities of the specified type from known systems
    for (const knownSector of knownSystems) {
      const systemCoords = knownSector.coord;

      if (knownSector?.staticObjects) {
        const entitiesInSystem = knownSector.staticObjects
          .filter(filterByType(entityType))
          .map((entity: any) => ({
            ...entity,
            systemCoordinates: systemCoords
          }));

        allEntities.push(...entitiesInSystem);
      }
    }

    if (allEntities.length === 0) return null;

    const findClosest = findClosestEntity(player.coordinates);
    const closest = findClosest(allEntities);

    return closest ? {
      type: entityType,
      name: closest.name,
      coordinates: closest.coordinates,
      distance: closest.distance,
      systemCoordinates: closest.systemCoordinates
    } : null;
  }

  async findNearestOfAnyType(playerId: string, types: string[]): Promise<NearestResult[]> {
    const results: NearestResult[] = [];

    for (const type of types) {
      let result: NearestResult | null = null;

      switch (type) {
        case 'station':
          result = await this.findNearestStation(playerId);
          break;
        case 'planet':
          result = await this.findNearestPlanet(playerId);
          break;
        case 'star':
          result = await this.findNearestStar(playerId);
          break;
        case 'player':
          result = await this.findNearestPlayer(playerId);
          break;
        case 'probe':
          result = await this.findNearestProbe(playerId);
          break;
      }

      if (result) {
        results.push(result);
      }
    }

    return sortByDistance(results);
  }
}