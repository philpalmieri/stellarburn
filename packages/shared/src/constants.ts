import { Coordinates3D } from './types.js';

// Direction vectors for movement
export const DIRECTIONS: { [key: string]: Coordinates3D } = {
  north: { x: 0, y: 0.1, z: 0 },
  south: { x: 0, y: -0.1, z: 0 },
  east: { x: 0.1, y: 0, z: 0 },
  west: { x: -0.1, y: 0, z: 0 },
  up: { x: 0, y: 0, z: 0.1 },
  down: { x: 0, y: 0, z: -0.1 }
};

export const VALID_DIRECTIONS = Object.keys(DIRECTIONS);

// Game constants
export const FUEL_COSTS = {
  MOVE: 1,
  JUMP: 10,
  PROBE_LAUNCH: 0
} as const;

export const SYSTEM_BOUNDS = {
  MIN: 0.0,
  MAX: 0.4,
  CENTER: 0.2,
  STEP_SIZE: 0.1
} as const;

// System configuration
export const SYSTEM_SIZE = {
  ZONES_PER_AXIS: 5,
  ZONE_SIZE: 0.1,
  TOTAL_SIZE: 0.4
} as const;

// Validation helper functions
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