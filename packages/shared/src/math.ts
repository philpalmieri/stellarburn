import { Coordinates3D } from './types.js';
import { SYSTEM_BOUNDS } from './constants.js';

// Coordinate formatting and precision handling
export const formatCoordinate = (value: number): number => Math.round(value * 10) / 10;

export const formatCoordinates = (coord: Coordinates3D): Coordinates3D => ({
  x: formatCoordinate(coord.x),
  y: formatCoordinate(coord.y),
  z: formatCoordinate(coord.z)
});

// Coordinate parsing and validation
export const parseCoordinates = (coordStr: string): Coordinates3D => {
  const parts = coordStr.split(',').map(s => parseFloat(s.trim()));
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error('Invalid coordinate format. Expected "x,y,z"');
  }
  return { x: parts[0], y: parts[1], z: parts[2] };
};

export const validateCoordinates = (coord: any): coord is Coordinates3D => {
  return coord &&
         typeof coord.x === 'number' &&
         typeof coord.y === 'number' &&
         typeof coord.z === 'number' &&
         !isNaN(coord.x) && !isNaN(coord.y) && !isNaN(coord.z);
};

// System coordinate utilities
export const getSystemCoords = (coord: Coordinates3D): Coordinates3D => ({
  x: Math.floor(coord.x),
  y: Math.floor(coord.y),
  z: Math.floor(coord.z)
});

export const sameSystem = (coord1: Coordinates3D, coord2: Coordinates3D): boolean => {
  const sys1 = getSystemCoords(coord1);
  const sys2 = getSystemCoords(coord2);
  return sys1.x === sys2.x && sys1.y === sys2.y && sys1.z === sys2.z;
};

export const isWithinSystemBounds = (coord: Coordinates3D): boolean => {
  const systemCoords = getSystemCoords(coord);
  const zoneX = coord.x - systemCoords.x;
  const zoneY = coord.y - systemCoords.y;
  const zoneZ = coord.z - systemCoords.z;

  return zoneX >= SYSTEM_BOUNDS.MIN && zoneX <= SYSTEM_BOUNDS.MAX &&
         zoneY >= SYSTEM_BOUNDS.MIN && zoneY <= SYSTEM_BOUNDS.MAX &&
         zoneZ >= SYSTEM_BOUNDS.MIN && zoneZ <= SYSTEM_BOUNDS.MAX;
};

export const isAtSystemEdge = (coords: Coordinates3D): boolean => {
  const systemX = Math.floor(coords.x);
  const systemY = Math.floor(coords.y);
  const systemZ = Math.floor(coords.z);
  const zoneX = coords.x - systemX;
  const zoneY = coords.y - systemY;
  const zoneZ = coords.z - systemZ;

  // Player is at edge if any coordinate is at 0.0 or 0.4
  return zoneX === 0.0 || zoneX === 0.4 || zoneY === 0.0 || zoneY === 0.4 || zoneZ === 0.0 || zoneZ === 0.4;
};

// Distance calculations
export const calculate3DDistance = (from: Coordinates3D, to: Coordinates3D): number => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

// Functional utilities for distance calculations
export const createDistanceCalculator = (from: Coordinates3D) => (to: Coordinates3D): number => {
  return calculate3DDistance(from, to);
};

export const addDistanceToObject = (playerCoords: Coordinates3D) => (obj: any) => ({
  ...obj,
  distance: calculate3DDistance(playerCoords, obj.coordinates)
});

// Get all edge coordinates for a system (used for jump validation)
export const getEdgeCoordinates = (coords: Coordinates3D): Coordinates3D[] => {
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

// Convert global coordinates to within-system coordinates (0.0-0.4 range)
export const toWithinSystemCoords = (globalCoord: Coordinates3D): Coordinates3D => {
  const systemCoords = getSystemCoords(globalCoord);
  return {
    x: systemCoords.x + (globalCoord.x - Math.floor(globalCoord.x)),
    y: systemCoords.y + (globalCoord.y - Math.floor(globalCoord.y)),
    z: systemCoords.z + (globalCoord.z - Math.floor(globalCoord.z))
  };
};