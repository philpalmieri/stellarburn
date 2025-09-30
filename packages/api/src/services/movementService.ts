import { MongoClient } from 'mongodb';
import { Coordinates3D, coordinateToString } from '@stellarburn/shared';
import { performLocalScan, performSystemScan } from './scanningService.js';

// Helper function for getting system objects
const getSystemObjects = (db: any) => async (systemCoords: Coordinates3D) => {
  const systemCoordString = coordinateToString(systemCoords);
  const systemSector = await db.collection('sectors').findOne({ coordinates: systemCoordString });
  return systemSector?.staticObjects || [];
};

// Functional collision checker using currying
const checkCollision = (targetCoords: Coordinates3D) => (objects: any[]): { collision: boolean; object?: any } => {
    for (const obj of objects) {
      // Only check collision for stars (any size) and large planets (size 4+)
      // Size 1 objects (small planets, asteroids, stations) don't prevent movement
      if (obj.type === 'star' || (obj.type === 'planet' && obj.size >= 4)) {
        // Check if target coordinates would be inside the object
        const distance = Math.sqrt(
          Math.pow(targetCoords.x - obj.coordinates.x, 2) +
          Math.pow(targetCoords.y - obj.coordinates.y, 2) +
          Math.pow(targetCoords.z - obj.coordinates.z, 2)
        );

        // Define collision radius based on object size (smaller to allow close orbit)
        let collisionRadius;
        if (obj.type === 'star') {
          if (obj.size === 1) collisionRadius = 0.03;
          else if (obj.size === 9) collisionRadius = 0.08;
          else if (obj.size === 27) collisionRadius = 0.12;
          else collisionRadius = 0.08; // fallback
        } else if (obj.type === 'planet' && obj.size >= 4) {
          if (obj.size === 4) collisionRadius = 0.05;
          else if (obj.size === 9) collisionRadius = 0.08;
          else collisionRadius = 0.08; // fallback
        }

        if (distance < collisionRadius) {
          return { collision: true, object: obj };
        }
      }
    }
    return { collision: false };
};

// Helper function to check if player is at system edge
const isAtSystemEdge = (coords: Coordinates3D): boolean => {
    const systemX = Math.floor(coords.x);
    const systemY = Math.floor(coords.y);
    const systemZ = Math.floor(coords.z);
    const zoneX = coords.x - systemX;
    const zoneY = coords.y - systemY;
    const zoneZ = coords.z - systemZ;

    // Player is at edge if any coordinate is at 0.0 or 0.4
    return zoneX === 0.0 || zoneX === 0.4 || zoneY === 0.0 || zoneY === 0.4 || zoneZ === 0.0 || zoneZ === 0.4;
};

// Helper function to get edge coordinates
const getEdgeCoordinates = (coords: Coordinates3D): Coordinates3D[] => {
    const systemX = Math.floor(coords.x);
    const systemY = Math.floor(coords.y);
    const systemZ = Math.floor(coords.z);

    const edges = [];

    // Add all edge coordinates (faces of the 5x5x5 cube)
    for (const x of [0.0, 0.4]) {
      for (const y of [0.0, 0.1, 0.2, 0.3, 0.4]) {
        for (const z of [0.0, 0.1, 0.2, 0.3, 0.4]) {
          edges.push({ x: systemX + x, y: systemY + y, z: systemZ + z });
        }
      }
    }

    for (const y of [0.0, 0.4]) {
      for (const x of [0.1, 0.2, 0.3]) { // avoid duplicates from previous loop
        for (const z of [0.0, 0.1, 0.2, 0.3, 0.4]) {
          edges.push({ x: systemX + x, y: systemY + y, z: systemZ + z });
        }
      }
    }

    for (const z of [0.0, 0.4]) {
      for (const x of [0.1, 0.2, 0.3]) { // avoid duplicates
        for (const y of [0.1, 0.2, 0.3]) { // avoid duplicates
          edges.push({ x: systemX + x, y: systemY + y, z: systemZ + z });
        }
      }
    }

    return edges;
};

// Move player function using functional approach
export const movePlayer = async (db: any, playerId: string, direction: string, directionVector: Coordinates3D) => {
    const player = await db.collection('players').findOne({ id: playerId });

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

    // Validate new coordinates stay within 5x5x5 zone system (0.0-0.4 range per sector)
    const systemX = Math.floor(newCoordinates.x);
    const systemY = Math.floor(newCoordinates.y);
    const systemZ = Math.floor(newCoordinates.z);
    const zoneX = newCoordinates.x - systemX;
    const zoneY = newCoordinates.y - systemY;
    const zoneZ = newCoordinates.z - systemZ;

    if (zoneX < 0 || zoneX > 0.4 || zoneY < 0 || zoneY > 0.4 || zoneZ < 0 || zoneZ > 0.4) {
      throw new Error(`Cannot move ${direction} - would exit system boundary. Use 'jump ${direction}' to travel to the next system.`);
    }

    // Check for collisions with stars and large planets
    const systemCoords = { x: systemX, y: systemY, z: systemZ };
    const getSystemObjectsForDb = getSystemObjects(db);
    const systemObjects = await getSystemObjectsForDb(systemCoords);
    const collisionCheck = checkCollision(newCoordinates)(systemObjects);

    if (collisionCheck.collision) {
      const obj = collisionCheck.object;
      const objType = obj.type === 'star' ? 'star' : 'large planet';
      throw new Error(`You cannot crash your ship on purpose! Cannot move into ${objType} ${obj.name}. You can orbit around it but not enter it.`);
    }

    await db.collection('players').updateOne(
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
    const localScan = await performLocalScan(db, playerId);

    return {
      success: true,
      newCoordinates,
      fuel: player.ship.fuel - 1,
      message: `Moved ${direction} to ${coordinateToString(newCoordinates)}`,
      localScan
    };
};

// Jump player function using functional approach
export const jumpPlayer = async (db: any, playerId: string, direction: string, directionVector: Coordinates3D) => {
    const player = await db.collection('players').findOne({ id: playerId });

    if (!player) {
      throw new Error('Player not found');
    }

    if (player.ship.fuel < 1) {
      throw new Error('Not enough fuel to jump');
    }

    const currentCoords = player.coordinates;

    // Validate that player is at system edge before jumping
    if (!isAtSystemEdge(currentCoords)) {
      const edgeCoords = getEdgeCoordinates(currentCoords);
      const nearestEdges = edgeCoords.slice(0, 6); // Show first 6 edge options
      const edgeList = nearestEdges.map(coord => coordinateToString(coord)).join(', ');
      throw new Error(`Cannot jump from the center of a zone. Move to a system edge first. Nearest edges: ${edgeList}`);
    }

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

    // Landing coordinates: enter at system center (0.2 offset for 5x5x5 system center)
    const landingCoords = {
      x: directionVector.x !== 0 ? nextSystemCoords.x + 0.2 : currentCoords.x,
      y: directionVector.y !== 0 ? nextSystemCoords.y + 0.2 : currentCoords.y,
      z: directionVector.z !== 0 ? nextSystemCoords.z + 0.2 : currentCoords.z
    };

    await db.collection('players').updateOne(
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
    const systemScan = await performSystemScan(db, playerId);

    return {
      success: true,
      newCoordinates: landingCoords,
      fuel: player.ship.fuel - 1,
      systemCoordinates: nextSystemCoords,
      message: `Jumped ${direction} to system ${coordinateToString(nextSystemCoords)}`,
      systemScan
    };
};