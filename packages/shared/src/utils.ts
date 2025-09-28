import { Coordinates3D } from './types.js';

// Pure functional coordinate utilities
export const coordinateToString = ({ x, y, z }: Coordinates3D): string => 
  `${x},${y},${z}`;

export const stringToCoordinate = (coordString: string): Coordinates3D => {
  const [x, y, z] = coordString.split(',').map(Number);
  return { x, y, z };
};

export const calculate3DDistance = (
  coord1: Coordinates3D, 
  coord2: Coordinates3D
): number => {
  const dx = coord2.x - coord1.x;
  const dy = coord2.y - coord1.y;
  const dz = coord2.z - coord1.z;
  return Math.sqrt(dx*dx + dy*dy + dz*dz);
};

// Get all 6 adjacent coordinates in 3D space
export const getAdjacentCoordinates = (coord: Coordinates3D): Coordinates3D[] => [
  { ...coord, x: coord.x + 1 },
  { ...coord, x: coord.x - 1 },
  { ...coord, y: coord.y + 1 },
  { ...coord, y: coord.y - 1 },
  { ...coord, z: coord.z + 1 },
  { ...coord, z: coord.z - 1 }
];