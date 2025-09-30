import {
  Coordinates3D,
  coordinateToString,
  parseCoordinates,
  validateCoordinates,
  getSystemCoords,
  formatCoordinates,
  calculate3DDistance,
  isWithinSystemBounds,
  toWithinSystemCoords,
  sameSystem,
  SYSTEM_BOUNDS
} from '@stellarburn/shared';

export interface NavigationStep {
  type: 'move' | 'jump';
  direction: string;
  from: Coordinates3D;
  to: Coordinates3D;
  fuelCost: number;
  description: string;
}

export interface NavigationPath {
  steps: NavigationStep[];
  totalFuelCost: number;
  totalDistance: number;
  estimatedTime: number;
}

export interface CollisionInfo {
  hasCollision: boolean;
  obstruction?: {
    type: 'star' | 'planet' | 'asteroid' | 'station' | 'player';
    name: string;
    size?: number;
    coordinates: Coordinates3D;
  };
}

// Note: formatCoordinate is still needed locally as it's not exported from shared
const formatCoordinate = (value: number): number => {
  return Math.round(value * 10) / 10;
};


// Check for celestial body collisions
const checkCelestialCollision = async (db: any, systemCoordString: string, targetCoord: Coordinates3D): Promise<CollisionInfo> => {
  const system = await db.collection('systems').findOne({ coordinates: systemCoordString });

  if (!system?.staticObjects) {
    return { hasCollision: false };
  }

  for (const obj of system.staticObjects) {
    // Only check collision for stars and large planets
    if (obj.type === 'star' || (obj.type === 'planet' && obj.size >= 4)) {
      const distance = calculate3DDistance(targetCoord, obj.coordinates);

      // Calculate collision radius based on object type and size
      let collisionRadius = 0;
      if (obj.type === 'star') {
        // Stars have larger collision radius
        collisionRadius = Math.min(Math.sqrt(obj.size) * 0.05, 0.3);
      } else {
        // Large planets
        collisionRadius = Math.min(Math.sqrt(obj.size) * 0.03, 0.2);
      }

      if (distance < collisionRadius) {
        return {
          hasCollision: true,
          obstruction: {
            type: obj.type,
            name: obj.name,
            size: obj.size,
            coordinates: obj.coordinates
          }
        };
      }
    }
  }

  return { hasCollision: false };
};

// Check for player collisions (disabled in this game)
const checkPlayerCollision = async (db: any, playerId: string, targetCoord: Coordinates3D): Promise<CollisionInfo> => {
  // Player collisions are disabled to allow shared occupation of sectors
  return { hasCollision: false };
};

// Main collision check function
export const checkCollision = async (db: any, playerId: string, targetCoord: Coordinates3D): Promise<CollisionInfo> => {
  try {
    const systemCoords = getSystemCoords(targetCoord);
    const systemCoordString = coordinateToString(systemCoords);

    // Check celestial body collisions first
    const collision = await checkCelestialCollision(db, systemCoordString, targetCoord);
    if (collision.hasCollision) {
      return collision;
    }

    // Check player collisions (currently disabled)
    return await checkPlayerCollision(db, playerId, targetCoord);
  } catch (error) {
    console.error('Collision check failed:', error);
    throw new Error(`Failed to check collision: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Plan system jumps between different star systems
const planSystemJumps = (fromSystem: Coordinates3D, toSystem: Coordinates3D): NavigationStep[] => {
  const steps: NavigationStep[] = [];
  let current = { ...fromSystem };

  // Move in X direction first
  while (current.x !== toSystem.x) {
    const direction = current.x < toSystem.x ? 'east' : 'west';
    const next = { ...current };
    next.x += current.x < toSystem.x ? 1 : -1;

    // Calculate edge coordinate for landing
    const landingCoords = {
      x: next.x + (current.x < toSystem.x ? 0.0 : 0.4),
      y: current.y + 0.2, // Land in middle of system
      z: current.z + 0.2
    };

    steps.push({
      type: 'jump',
      direction,
      from: formatCoordinates(current),
      to: formatCoordinates(landingCoords),
      fuelCost: 10,
      description: `Jump ${direction} to system ${coordinateToString(formatCoordinates(next))}`
    });

    current = next;
  }

  // Move in Y direction
  while (current.y !== toSystem.y) {
    const direction = current.y < toSystem.y ? 'north' : 'south';
    const next = { ...current };
    next.y += current.y < toSystem.y ? 1 : -1;

    const landingCoords = {
      x: current.x + 0.2,
      y: next.y + (current.y < toSystem.y ? 0.0 : 0.4),
      z: current.z + 0.2
    };

    steps.push({
      type: 'jump',
      direction,
      from: formatCoordinates(current),
      to: formatCoordinates(landingCoords),
      fuelCost: 10,
      description: `Jump ${direction} to system ${coordinateToString(formatCoordinates(next))}`
    });

    current = next;
  }

  // Move in Z direction
  while (current.z !== toSystem.z) {
    const direction = current.z < toSystem.z ? 'up' : 'down';
    const next = { ...current };
    next.z += current.z < toSystem.z ? 1 : -1;

    const landingCoords = {
      x: current.x + 0.2,
      y: current.y + 0.2,
      z: next.z + (current.z < toSystem.z ? 0.0 : 0.4)
    };

    steps.push({
      type: 'jump',
      direction,
      from: formatCoordinates(current),
      to: formatCoordinates(landingCoords),
      fuelCost: 10,
      description: `Jump ${direction} to system ${coordinateToString(formatCoordinates(next))}`
    });

    current = next;
  }

  return steps;
};


// Check if a coordinate has a collision with obstacles
const hasCollision = async (db: any, coord: Coordinates3D): Promise<boolean> => {
  try {
    const systemCoords = getSystemCoords(coord);
    const systemCoordString = coordinateToString(systemCoords);
    const collision = await checkCollision(db, '', coord); // Empty playerId for pathfinding
    return collision.hasCollision;
  } catch {
    return false; // Assume no collision if check fails
  }
};

// Simple obstacle avoidance pathfinding
const planSystemMovementWithAvoidance = async (db: any, from: Coordinates3D, to: Coordinates3D): Promise<NavigationStep[]> => {
  const steps: NavigationStep[] = [];
  let current = { ...from };
  const tolerance = 0.001;
  const stepSize = 0.1;

  // Move in X direction with obstacle avoidance
  while (Math.abs(current.x - to.x) > tolerance) {
    const remaining = to.x - current.x;
    const direction = remaining > 0 ? 'east' : 'west';
    const step = Math.abs(remaining) < stepSize ? remaining :
      (remaining > 0 ? stepSize : -stepSize);

    const next = { ...current };
    next.x = Math.round((current.x + step) * 10) / 10;

    // Check if the next position would be within system boundaries
    if (!isWithinSystemBounds(next)) {
      // If movement would exit system, stop here - let higher-level navigation handle jumps
      break;
    }

    // Check for collision at the next position
    const collision = await hasCollision(db, next);

    if (collision) {
      // Try to go around the obstacle by moving in Y direction first
      const detourSteps = await planDetourAround(db, current, to);
      steps.push(...detourSteps);
      break; // Exit X movement loop, detour handles the rest
    } else {
      steps.push({
        type: 'move',
        direction,
        from: formatCoordinates(current),
        to: formatCoordinates(next),
        fuelCost: 1,
        description: `Move ${direction} to ${coordinateToString(formatCoordinates(next))}`
      });

      current = next;
    }
  }

  // Continue with remaining movement if no detour was needed
  if (steps.length === 0 || !steps[steps.length - 1].description.includes('detour')) {
    await addRemainingMovement(db, steps, current, to, tolerance, stepSize);
  }

  return steps;
};

// Plan a detour around an obstacle
const planDetourAround = async (db: any, from: Coordinates3D, to: Coordinates3D): Promise<NavigationStep[]> => {
  const steps: NavigationStep[] = [];
  const stepSize = 0.1;

  // Try moving in Y direction to go around obstacle
  const systemCoords = getSystemCoords(from);
  const yOptions = [
    Math.round((from.y + stepSize) * 10) / 10,  // Try north
    Math.round((from.y - stepSize) * 10) / 10   // Try south
  ];

  for (const newY of yOptions) {
    const detourPoint = { ...from, y: newY };

    // Make sure we stay within system bounds
    if (isWithinSystemBounds(detourPoint)) {
      const collision = await hasCollision(db, detourPoint);

      if (!collision) {
        // Found a safe detour point, move there first
        const direction = newY > from.y ? 'north' : 'south';
        steps.push({
          type: 'move',
          direction,
          from: formatCoordinates(from),
          to: formatCoordinates(detourPoint),
          fuelCost: 1,
          description: `Move ${direction} to avoid obstacle`
        });

        // Then try to continue toward destination
        const remainingSteps = await planSystemMovementWithAvoidance(db, detourPoint, to);
        steps.push(...remainingSteps);
        return steps;
      }
    }
  }

  // If Y detour doesn't work, try Z direction
  const zOptions = [
    Math.round((from.z + stepSize) * 10) / 10,  // Try up
    Math.round((from.z - stepSize) * 10) / 10   // Try down
  ];

  for (const newZ of zOptions) {
    const detourPoint = { ...from, z: newZ };

    if (isWithinSystemBounds(detourPoint)) {
      const collision = await hasCollision(db, detourPoint);

      if (!collision) {
        const direction = newZ > from.z ? 'up' : 'down';
        steps.push({
          type: 'move',
          direction,
          from: formatCoordinates(from),
          to: formatCoordinates(detourPoint),
          fuelCost: 1,
          description: `Move ${direction} to avoid obstacle`
        });

        const remainingSteps = await planSystemMovementWithAvoidance(db, detourPoint, to);
        steps.push(...remainingSteps);
        return steps;
      }
    }
  }

  // If no detour is possible, return empty steps (will cause pathfinding to fail)
  return steps;
};

// Add remaining movement after obstacle avoidance
const addRemainingMovement = async (db: any, steps: NavigationStep[], current: Coordinates3D, to: Coordinates3D, tolerance: number, stepSize: number): Promise<void> => {
  // Continue Y direction movement
  while (Math.abs(current.y - to.y) > tolerance) {
    const remaining = to.y - current.y;
    const direction = remaining > 0 ? 'north' : 'south';
    const step = Math.abs(remaining) < stepSize ? remaining :
      (remaining > 0 ? stepSize : -stepSize);

    const next = { ...current };
    next.y = Math.round((current.y + step) * 10) / 10;

    // Check if the next position would be within system boundaries
    if (!isWithinSystemBounds(next)) {
      // If movement would exit system, stop here
      break;
    }

    const collision = await hasCollision(db, next);
    if (collision) {
      // If we hit another obstacle, we'd need more complex pathfinding
      console.warn('Complex obstacle scenario detected, may need advanced pathfinding');
      break;
    }

    steps.push({
      type: 'move',
      direction,
      from: formatCoordinates(current),
      to: formatCoordinates(next),
      fuelCost: 1,
      description: `Move ${direction} to ${coordinateToString(formatCoordinates(next))}`
    });

    current = next;
  }

  // Continue Z direction movement
  while (Math.abs(current.z - to.z) > tolerance) {
    const remaining = to.z - current.z;
    const direction = remaining > 0 ? 'up' : 'down';
    const step = Math.abs(remaining) < stepSize ? remaining :
      (remaining > 0 ? stepSize : -stepSize);

    const next = { ...current };
    next.z = Math.round((current.z + step) * 10) / 10;

    // Check if the next position would be within system boundaries
    if (!isWithinSystemBounds(next)) {
      // If movement would exit system, stop here
      break;
    }

    const collision = await hasCollision(db, next);
    if (collision) {
      console.warn('Complex obstacle scenario detected, may need advanced pathfinding');
      break;
    }

    steps.push({
      type: 'move',
      direction,
      from: formatCoordinates(current),
      to: formatCoordinates(next),
      fuelCost: 1,
      description: `Move ${direction} to ${coordinateToString(formatCoordinates(next))}`
    });

    current = next;
  }
};

// Legacy function for simple movement (without obstacle avoidance)
const planSystemMovement = (from: Coordinates3D, to: Coordinates3D): NavigationStep[] => {
  const steps: NavigationStep[] = [];
  let current = { ...from };
  const tolerance = 0.001;
  const stepSize = 0.1;

  // Move in X direction
  while (Math.abs(current.x - to.x) > tolerance) {
    const remaining = to.x - current.x;
    const direction = remaining > 0 ? 'east' : 'west';
    const step = Math.abs(remaining) < stepSize ? remaining :
      (remaining > 0 ? stepSize : -stepSize);

    const next = { ...current };
    next.x = Math.round((current.x + step) * 10) / 10; // Fix floating point precision

    steps.push({
      type: 'move',
      direction,
      from: formatCoordinates(current),
      to: formatCoordinates(next),
      fuelCost: 1,
      description: `Move ${direction} to ${coordinateToString(formatCoordinates(next))}`
    });

    current = next;
  }

  // Move in Y direction
  while (Math.abs(current.y - to.y) > tolerance) {
    const remaining = to.y - current.y;
    const direction = remaining > 0 ? 'north' : 'south';
    const step = Math.abs(remaining) < stepSize ? remaining :
      (remaining > 0 ? stepSize : -stepSize);

    const next = { ...current };
    next.y = Math.round((current.y + step) * 10) / 10; // Fix floating point precision

    steps.push({
      type: 'move',
      direction,
      from: formatCoordinates(current),
      to: formatCoordinates(next),
      fuelCost: 1,
      description: `Move ${direction} to ${coordinateToString(formatCoordinates(next))}`
    });

    current = next;
  }

  // Move in Z direction
  while (Math.abs(current.z - to.z) > tolerance) {
    const remaining = to.z - current.z;
    const direction = remaining > 0 ? 'up' : 'down';
    const step = Math.abs(remaining) < stepSize ? remaining :
      (remaining > 0 ? stepSize : -stepSize);

    const next = { ...current };
    next.z = Math.round((current.z + step) * 10) / 10; // Fix floating point precision

    steps.push({
      type: 'move',
      direction,
      from: formatCoordinates(current),
      to: formatCoordinates(next),
      fuelCost: 1,
      description: `Move ${direction} to ${coordinateToString(formatCoordinates(next))}`
    });

    current = next;
  }

  return steps;
};

// Calculate edge coordinate for system jumping
const calculateEdgeCoordinate = (from: Coordinates3D, system: Coordinates3D): Coordinates3D => {
  // Helper to determine edge coordinate for a single axis
  const getEdgeCoordinate = (currentPos: number, systemCoord: number): number => {
    const systemMid = systemCoord + 0.5;

    // If coming from lower coordinate, land at edge 0.0
    // If coming from higher coordinate, land at edge 0.4
    if (currentPos < systemMid) {
      return systemCoord + 0.0;
    } else {
      return systemCoord + 0.4;
    }
  };

  return {
    x: getEdgeCoordinate(from.x, system.x),
    y: getEdgeCoordinate(from.y, system.y),
    z: getEdgeCoordinate(from.z, system.z)
  };
};

// Check if coordinate is at system boundary
const isAtSystemCoordinate = (coord: Coordinates3D, system: Coordinates3D): boolean => {
  const tolerance = 0.001;
  return Math.abs(coord.x - system.x) < tolerance &&
         Math.abs(coord.y - system.y) < tolerance &&
         Math.abs(coord.z - system.z) < tolerance;
};


// Main course plotting function
export const plotCourse = async (db: any, fromStr: string, toStr: string): Promise<NavigationPath> => {
  try {
    const from = parseCoordinates(fromStr);
    const to = parseCoordinates(toStr);

    if (!validateCoordinates(from) || !validateCoordinates(to)) {
      throw new Error('Invalid coordinates provided');
    }

    const fromSystem = getSystemCoords(from);
    const toSystem = getSystemCoords(to);

    let allSteps: NavigationStep[] = [];
    let current = { ...from };

    // Determine if we need jumps
    const needsJump = {
      x: fromSystem.x !== toSystem.x,
      y: fromSystem.y !== toSystem.y,
      z: fromSystem.z !== toSystem.z
    };
    const needsAnyJump = needsJump.x || needsJump.y || needsJump.z;

    // If no jumps needed, just move within the same system
    if (!needsAnyJump) {
      allSteps = await planSystemMovementWithAvoidance(db, current, to);
    } else {
      // Multi-system navigation - jump to each system in sequence

      // Jump in X direction
      if (needsJump.x) {
        while (getSystemCoords(current).x !== toSystem.x) {
          const currentSysX = getSystemCoords(current).x;
          const direction = currentSysX < toSystem.x ? 'east' : 'west';
          const nextSysX = currentSysX + (currentSysX < toSystem.x ? 1 : -1);

          // Calculate edge coordinate we need to reach before jumping
          const edgeCoord = {
            x: direction === 'east' ? currentSysX + 0.4 : currentSysX + 0.0,
            y: current.y,
            z: current.z
          };

          // First, move to edge if not already there
          const tolerance = 0.001;
          if (Math.abs(current.x - edgeCoord.x) > tolerance ||
              Math.abs(current.y - edgeCoord.y) > tolerance ||
              Math.abs(current.z - edgeCoord.z) > tolerance) {
            allSteps.push(...await planSystemMovementWithAvoidance(db, current, edgeCoord));
            current = { ...edgeCoord };
          }

          const landingCoord = {
            x: nextSysX + (direction === 'east' ? 0.0 : 0.4),
            y: getSystemCoords(current).y + 0.2,
            z: getSystemCoords(current).z + 0.2
          };

          allSteps.push({
            type: 'jump',
            direction,
            fuelCost: 10,
            from: formatCoordinates(current),
            to: formatCoordinates(landingCoord),
            description: `Jump ${direction} to system ${nextSysX},${getSystemCoords(current).y},${getSystemCoords(current).z}`
          });

          current = landingCoord;
        }
      }

      // Jump in Y direction
      if (needsJump.y) {
        while (getSystemCoords(current).y !== toSystem.y) {
          const currentSysY = getSystemCoords(current).y;
          const direction = currentSysY < toSystem.y ? 'north' : 'south';
          const nextSysY = currentSysY + (currentSysY < toSystem.y ? 1 : -1);

          // Calculate edge coordinate we need to reach before jumping
          const edgeCoord = {
            x: current.x,
            y: direction === 'north' ? currentSysY + 0.4 : currentSysY + 0.0,
            z: current.z
          };

          // First, move to edge if not already there
          const tolerance = 0.001;
          if (Math.abs(current.x - edgeCoord.x) > tolerance ||
              Math.abs(current.y - edgeCoord.y) > tolerance ||
              Math.abs(current.z - edgeCoord.z) > tolerance) {
            allSteps.push(...await planSystemMovementWithAvoidance(db, current, edgeCoord));
            current = { ...edgeCoord };
          }

          const landingCoord = {
            x: getSystemCoords(current).x + 0.2,
            y: nextSysY + (direction === 'north' ? 0.0 : 0.4),
            z: getSystemCoords(current).z + 0.2
          };

          allSteps.push({
            type: 'jump',
            direction,
            fuelCost: 10,
            from: formatCoordinates(current),
            to: formatCoordinates(landingCoord),
            description: `Jump ${direction} to system ${getSystemCoords(current).x},${nextSysY},${getSystemCoords(current).z}`
          });

          current = landingCoord;
        }
      }

      // Jump in Z direction
      if (needsJump.z) {
        while (getSystemCoords(current).z !== toSystem.z) {
          const currentSysZ = getSystemCoords(current).z;
          const direction = currentSysZ < toSystem.z ? 'up' : 'down';
          const nextSysZ = currentSysZ + (currentSysZ < toSystem.z ? 1 : -1);

          // Calculate edge coordinate we need to reach before jumping
          const edgeCoord = {
            x: current.x,
            y: current.y,
            z: direction === 'up' ? currentSysZ + 0.4 : currentSysZ + 0.0
          };

          // First, move to edge if not already there
          const tolerance = 0.001;
          if (Math.abs(current.x - edgeCoord.x) > tolerance ||
              Math.abs(current.y - edgeCoord.y) > tolerance ||
              Math.abs(current.z - edgeCoord.z) > tolerance) {
            allSteps.push(...await planSystemMovementWithAvoidance(db, current, edgeCoord));
            current = { ...edgeCoord };
          }

          const landingCoord = {
            x: getSystemCoords(current).x + 0.2,
            y: getSystemCoords(current).y + 0.2,
            z: nextSysZ + (direction === 'up' ? 0.0 : 0.4)
          };

          allSteps.push({
            type: 'jump',
            direction,
            fuelCost: 10,
            from: formatCoordinates(current),
            to: formatCoordinates(landingCoord),
            description: `Jump ${direction} to system ${getSystemCoords(current).x},${getSystemCoords(current).y},${nextSysZ}`
          });

          current = landingCoord;
        }
      }

      // Final movement within the destination system
      if (current.x !== to.x || current.y !== to.y || current.z !== to.z) {
        // Ensure both current and to coordinates are in the same system for final movement
        const currentSystem = getSystemCoords(current);
        const destSystem = getSystemCoords(to);

        // Verify we're in the destination system
        if (currentSystem.x === destSystem.x && currentSystem.y === destSystem.y && currentSystem.z === destSystem.z) {
          allSteps.push(...await planSystemMovementWithAvoidance(db, current, to));
        } else {
          // If we're not in the same system, there's a logic error in the navigation
          console.error('Navigation error: Final movement attempted between different systems',
            { current: currentSystem, destination: destSystem });
        }
      }
    }

    // Calculate totals
    const totalFuelCost = allSteps.reduce((sum, step) => sum + step.fuelCost, 0);
    const totalDistance = calculate3DDistance(from, to);
    const estimatedTime = allSteps.length * 2; // 2 seconds per step

    return {
      steps: allSteps,
      totalFuelCost,
      totalDistance,
      estimatedTime
    };
  } catch (error) {
    console.error('Course plotting failed:', error);
    throw new Error(`Failed to plot course: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Get next step from a navigation path
export const getNextStep = (path: NavigationStep[]): { step: NavigationStep | null; remainingPath: NavigationStep[] } => {
  if (path.length === 0) {
    return { step: null, remainingPath: [] };
  }

  const [nextStep, ...remaining] = path;
  return {
    step: nextStep,
    remainingPath: remaining
  };
};

// Validate a single navigation step
export const validateStep = (step: NavigationStep): boolean => {
  if (!step || typeof step !== 'object') {
    return false;
  }

  const requiredFields = ['type', 'direction', 'from', 'to', 'fuelCost', 'description'];
  const hasAllFields = requiredFields.every(field => field in step);

  if (!hasAllFields) {
    return false;
  }

  const validTypes = ['move', 'jump'];
  if (!validTypes.includes(step.type)) {
    return false;
  }

  try {
    validateCoordinates(step.from);
    validateCoordinates(step.to);
    return true;
  } catch {
    return false;
  }
};

// Validate an entire navigation path
export const validatePath = (path: NavigationStep[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!Array.isArray(path)) {
    errors.push('Path must be an array');
    return { isValid: false, errors };
  }

  if (path.length === 0) {
    return { isValid: true, errors: [] }; // Empty path is valid (already at destination)
  }

  // Validate each step
  path.forEach((step, index) => {
    if (!validateStep(step)) {
      errors.push(`Invalid step at index ${index}`);
    }
  });

  // Check path continuity
  const tolerance = 0.001;
  for (let i = 0; i < path.length - 1; i++) {
    const currentTo = path[i].to;
    const nextFrom = path[i + 1].from;

    if (Math.abs(currentTo.x - nextFrom.x) > tolerance ||
        Math.abs(currentTo.y - nextFrom.y) > tolerance ||
        Math.abs(currentTo.z - nextFrom.z) > tolerance) {
      errors.push(`Path discontinuity between steps ${i} and ${i + 1}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};