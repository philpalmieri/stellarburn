import { Coordinates3D } from '@stellarburn/shared';

export const DIRECTIONS: { [key: string]: Coordinates3D } = {
  north: { x: 0, y: 0.1, z: 0 },
  south: { x: 0, y: -0.1, z: 0 },
  east: { x: 0.1, y: 0, z: 0 },
  west: { x: -0.1, y: 0, z: 0 },
  up: { x: 0, y: 0, z: 0.1 },
  down: { x: 0, y: 0, z: -0.1 }
};

export const VALID_DIRECTIONS = Object.keys(DIRECTIONS);

export function isValidDirection(direction: string): boolean {
  return VALID_DIRECTIONS.includes(direction.toLowerCase());
}

export function getDirectionVector(direction: string): Coordinates3D {
  const dirVector = DIRECTIONS[direction.toLowerCase()];
  if (!dirVector) {
    throw new Error(`Invalid direction: ${direction}. Valid directions: ${VALID_DIRECTIONS.join(', ')}`);
  }
  return dirVector;
}