import { Coordinates4D } from './types.js';

// Pure functional coordinate utilities
export const coordinateToString = ({ x, y, z, w }: Coordinates4D): string => 
  `${x},${y},${z},${w}`;

export const stringToCoordinate = (coordString: string): Coordinates4D => {
  const [x, y, z, w] = coordString.split(',').map(Number);
  return { x, y, z, w };
};

export const calculate4DDistance = (
  coord1: Coordinates4D, 
  coord2: Coordinates4D
): number => {
  const dx = coord2.x - coord1.x;
  const dy = coord2.y - coord1.y;
  const dz = coord2.z - coord1.z;
  const dw = coord2.w - coord1.w;
  return Math.sqrt(dx*dx + dy*dy + dz*dz + dw*dw);
};

// Get all 8 adjacent coordinates in 4D space
export const getAdjacentCoordinates = (coord: Coordinates4D): Coordinates4D[] => [
  { ...coord, x: coord.x + 1 },
  { ...coord, x: coord.x - 1 },
  { ...coord, y: coord.y + 1 },
  { ...coord, y: coord.y - 1 },
  { ...coord, z: coord.z + 1 },
  { ...coord, z: coord.z - 1 },
  { ...coord, w: coord.w + 1 },
  { ...coord, w: coord.w - 1 }
];