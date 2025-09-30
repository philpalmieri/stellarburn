import { Coordinates3D, coordinateToString, getSystemCoords } from '@stellarburn/shared';


// Track player exploration by adding system to known systems
export const trackPlayerExploration = async (db: any, playerId: string, coordinates: Coordinates3D): Promise<void> => {
  const systemCoords = getSystemCoords(coordinates);
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

  const sectors = await db.collection('systems').find({
    coordinates: { $in: knownSystems }
  }).toArray();

  return {
    playerCoordinates: player.coordinates,
    rawSystems: knownSystems,
    knownSystems: sectors
  };
};