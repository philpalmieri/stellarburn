import { Coordinates3D, coordinateToString, createDistanceCalculator, addDistanceToObject } from '@stellarburn/shared';
import { getKnownSystems } from './explorationService.js';

// Use shared utilities for distance calculations
const calculateDistance3D = createDistanceCalculator;
const createEntityWithDistance = addDistanceToObject;

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

// Helper function to find nearest entity of a specific type from known systems
const findNearestEntityOfType = async (db: any, playerId: string, entityType: 'station' | 'planet' | 'star'): Promise<NearestResult | null> => {
  const player = await db.collection('players').findOne({ id: playerId });
  if (!player) throw new Error('Player not found');

  // Get player's known systems
  const knownSystemsResult = await getKnownSystems(db, playerId);
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
};

// Find nearest station for a player
export const findNearestStation = async (db: any, playerId: string): Promise<NearestResult | null> => {
  return findNearestEntityOfType(db, playerId, 'station');
};

// Find nearest planet for a player
export const findNearestPlanet = async (db: any, playerId: string): Promise<NearestResult | null> => {
  return findNearestEntityOfType(db, playerId, 'planet');
};

// Find nearest star for a player
export const findNearestStar = async (db: any, playerId: string): Promise<NearestResult | null> => {
  return findNearestEntityOfType(db, playerId, 'star');
};

// Find nearest other player
export const findNearestPlayer = async (db: any, playerId: string): Promise<NearestResult | null> => {
  const player = await db.collection('players').findOne({ id: playerId });
  if (!player) throw new Error('Player not found');

  const otherPlayers = await db.collection('players').find({
    id: { $ne: playerId },
    dockedAt: { $exists: false }
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
};

// Find nearest active probe
export const findNearestProbe = async (db: any, playerId: string): Promise<NearestResult | null> => {
  const player = await db.collection('players').findOne({ id: playerId });
  if (!player) throw new Error('Player not found');

  const activeProbes = await db.collection('probes').find({
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
};

// Find nearest objects of multiple types and return sorted by distance
export const findNearestOfAnyType = async (db: any, playerId: string, types: string[]): Promise<NearestResult[]> => {
  const results: NearestResult[] = [];

  for (const type of types) {
    let result: NearestResult | null = null;

    switch (type) {
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
        result = await findNearestPlayer(db, playerId);
        break;
      case 'probe':
        result = await findNearestProbe(db, playerId);
        break;
    }

    if (result) {
      results.push(result);
    }
  }

  return sortByDistance(results);
};