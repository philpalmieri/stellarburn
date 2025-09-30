import { Coordinates3D } from './types.js';

// Pure functional coordinate utilities
export const coordinateToString = ({ x, y, z }: Coordinates3D): string => {
  // Format to 1 decimal place, removing trailing zeros
  const formatCoord = (val: number) => {
    const rounded = Math.round(val * 10) / 10;
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
  };
  return `${formatCoord(x)},${formatCoord(y)},${formatCoord(z)}`;
};

export const stringToCoordinate = (coordString: string): Coordinates3D => {
  const [x, y, z] = coordString.split(',').map(Number);
  return { x, y, z };
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