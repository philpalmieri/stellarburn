import { Coordinates3D, coordinateToString } from '@stellarburn/shared';

// Helper function to convert coordinates to system coordinates
const toSystemCoordinates = (coordinates: Coordinates3D): Coordinates3D => ({
  x: Math.floor(coordinates.x),
  y: Math.floor(coordinates.y),
  z: Math.floor(coordinates.z)
});

// Track player exploration by adding system to known systems
export const trackPlayerExploration = async (db: any, playerId: string, coordinates: Coordinates3D): Promise<void> => {
  const systemCoords = toSystemCoordinates(coordinates);
  const systemCoordString = coordinateToString(systemCoords);

  await db.collection('players').updateOne(
    { id: playerId },
    {
      $addToSet: {
        'knownSystems': systemCoordString
      }
    }
  );
};

// Get all known systems for a player
export const getKnownSystems = async (db: any, playerId: string) => {
  const player = await db.collection('players').findOne({ id: playerId });
  if (!player) {
    throw new Error('Player not found');
  }

  const knownSystems = player.knownSystems || [];

  const sectors = await db.collection('sectors').find({
    coordinates: { $in: knownSystems }
  }).toArray();

  return {
    playerCoordinates: player.coordinates,
    rawSystems: knownSystems,
    knownSystems: sectors
  };
};