import { Coordinates3D, coordinateToString } from '@stellarburn/shared';

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

export class NavigationService {
  constructor(private db: any) {}

  /**
   * Format coordinates for display - fix floating point precision issues
   */
  private formatCoordinate(value: number): number {
    return Math.round(value * 10) / 10;
  }

  /**
   * Format coordinates object for display
   */
  private formatCoordinates(coord: Coordinates3D): Coordinates3D {
    return {
      x: this.formatCoordinate(coord.x),
      y: this.formatCoordinate(coord.y),
      z: this.formatCoordinate(coord.z)
    };
  }

  /**
   * Parse coordinate string with validation
   */
  private parseCoordinates(coordStr: string): Coordinates3D {
    if (typeof coordStr !== 'string') {
      throw new Error('Coordinates must be a string');
    }

    const parts = coordStr.split(',').map(part => {
      const num = Number(part.trim());
      if (isNaN(num)) {
        throw new Error(`Invalid coordinate value: ${part}`);
      }
      return num;
    });

    if (parts.length !== 3) {
      throw new Error('Coordinates must have exactly 3 values (x,y,z)');
    }

    return {
      x: parts[0],
      y: parts[1],
      z: parts[2]
    };
  }

  /**
   * Validate coordinate object
   */
  private validateCoordinates(coord: any): coord is Coordinates3D {
    return coord && 
           typeof coord === 'object' &&
           typeof coord.x === 'number' && 
           typeof coord.y === 'number' && 
           typeof coord.z === 'number' &&
           !isNaN(coord.x) && 
           !isNaN(coord.y) && 
           !isNaN(coord.z);
  }

  /**
   * Calculate 3D distance between two points
   */
  private calculate3DDistance(from: Coordinates3D, to: Coordinates3D): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Get system coordinates (consistent with other services)
   */
  private getSystemCoords(coord: Coordinates3D): Coordinates3D {
    return {
      x: Math.floor(coord.x),
      y: Math.floor(coord.y),
      z: Math.floor(coord.z)
    };
  }

  /**
   * Check if two coordinates are in the same system
   */
  private sameSystem(coord1: Coordinates3D, coord2: Coordinates3D): boolean {
    const sys1 = this.getSystemCoords(coord1);
    const sys2 = this.getSystemCoords(coord2);
    return sys1.x === sys2.x && sys1.y === sys2.y && sys1.z === sys2.z;
  }

  /**
   * Check for collisions at target coordinate
   */
  async checkCollision(playerId: string, targetCoord: Coordinates3D): Promise<CollisionInfo> {
    try {
      const systemCoords = this.getSystemCoords(targetCoord);
      const systemCoordString = coordinateToString(systemCoords);
      
      // Check celestial objects
      const collision = await this.checkCelestialCollision(systemCoordString, targetCoord);
      if (collision.hasCollision) {
        return collision;
      }

      // Check player collisions
      return await this.checkPlayerCollision(playerId, targetCoord);
      
    } catch (error) {
      console.error('Collision check failed:', error);
      throw new Error(`Failed to check collision: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check for collisions with celestial objects
   */
  private async checkCelestialCollision(systemCoordString: string, targetCoord: Coordinates3D): Promise<CollisionInfo> {
    const systemSector = await this.db.collection('sectors').findOne({ coordinates: systemCoordString });
    
    if (!systemSector?.staticObjects) {
      return { hasCollision: false };
    }

    for (const obj of systemSector.staticObjects) {
      // Only check collision for stars (any size) and large planets (size 4+)
      // Size 1 objects (small planets, asteroids, stations) don't prevent movement
      if (obj.type === 'star' || (obj.type === 'planet' && obj.size >= 4)) {
        const distance = this.calculate3DDistance(targetCoord, obj.coordinates);

        // Use a much smaller collision radius - only collision if very close to object center
        // This allows navigation around objects without requiring complex pathfinding
        let collisionRadius;

        if (obj.type === 'star') {
          // Stars are dangerous - larger collision radius but still reasonable
          collisionRadius = Math.min(Math.sqrt(obj.size) * 0.05, 0.3);
        } else if (obj.type === 'planet' && obj.size >= 4) {
          // Large planets - medium collision radius
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
  }

  /**
   * Check for collisions with other players
   * Note: Player collisions are disabled to allow shared occupation of zones
   */
  private async checkPlayerCollision(playerId: string, targetCoord: Coordinates3D): Promise<CollisionInfo> {
    // Players can occupy the same zones - no collision detection needed
    return { hasCollision: false };
  }

  /**
   * Plan system-to-system jumps
   */
  private planSystemJumps(fromSystem: Coordinates3D, toSystem: Coordinates3D): NavigationStep[] {
    const steps: NavigationStep[] = [];
    let current = { ...fromSystem };

    // Handle X axis
    while (current.x !== toSystem.x) {
      const direction = current.x < toSystem.x ? 'east' : 'west';
      const next = { ...current };
      next.x += current.x < toSystem.x ? 1 : -1;

      // Jump lands at system center (system coordinate + 0.5)
      const landingCoords = {
        x: next.x + 0.5,
        y: current.y + 0.5,
        z: current.z + 0.5
      };

      steps.push({
        type: 'jump',
        direction,
        from: this.formatCoordinates(current),
        to: this.formatCoordinates(landingCoords),
        fuelCost: 1,
        description: `Jump ${direction} to system ${coordinateToString(this.formatCoordinates(next))}`
      });

      current = next;
    }

    // Handle Y axis
    while (current.y !== toSystem.y) {
      const direction = current.y < toSystem.y ? 'north' : 'south';
      const next = { ...current };
      next.y += current.y < toSystem.y ? 1 : -1;

      // Jump lands at system center (system coordinate + 0.5)
      const landingCoords = {
        x: current.x + 0.5,
        y: next.y + 0.5,
        z: current.z + 0.5
      };

      steps.push({
        type: 'jump',
        direction,
        from: this.formatCoordinates(current),
        to: this.formatCoordinates(landingCoords),
        fuelCost: 1,
        description: `Jump ${direction} to system ${coordinateToString(this.formatCoordinates(next))}`
      });

      current = next;
    }

    // Handle Z axis
    while (current.z !== toSystem.z) {
      const direction = current.z < toSystem.z ? 'up' : 'down';
      const next = { ...current };
      next.z += current.z < toSystem.z ? 1 : -1;

      // Jump lands at system center (system coordinate + 0.5)
      const landingCoords = {
        x: current.x + 0.5,
        y: current.y + 0.5,
        z: next.z + 0.5
      };

      steps.push({
        type: 'jump',
        direction,
        from: this.formatCoordinates(current),
        to: this.formatCoordinates(landingCoords),
        fuelCost: 1,
        description: `Jump ${direction} to system ${coordinateToString(this.formatCoordinates(next))}`
      });

      current = next;
    }

    return steps;
  }

  /**
   * Plan movement within a system - treating coordinates as exact decimal positions
   */
  private planSystemMovement(from: Coordinates3D, to: Coordinates3D): NavigationStep[] {
    const steps: NavigationStep[] = [];
    let current = { ...from };
    const tolerance = 0.001; // Much smaller tolerance for exact matching
    const stepSize = 0.1;

    // Handle X axis - move in exact 0.1 increments toward target
    while (Math.abs(current.x - to.x) > tolerance) {
      const direction = current.x < to.x ? 'east' : 'west';
      const next = { ...current };

      // Calculate exact step to target, but limit to stepSize increments
      const remaining = to.x - current.x;
      const step = Math.abs(remaining) < stepSize ? remaining :
                   (remaining > 0 ? stepSize : -stepSize);

      next.x = current.x + step;

      steps.push({
        type: 'move',
        direction,
        from: this.formatCoordinates(current),
        to: this.formatCoordinates(next),
        fuelCost: 1,
        description: `Move ${direction} to ${coordinateToString(this.formatCoordinates(next))}`
      });

      current = next;
    }

    // Handle Y axis - move in exact 0.1 increments toward target
    while (Math.abs(current.y - to.y) > tolerance) {
      const direction = current.y < to.y ? 'north' : 'south';
      const next = { ...current };

      const remaining = to.y - current.y;
      const step = Math.abs(remaining) < stepSize ? remaining :
                   (remaining > 0 ? stepSize : -stepSize);

      next.y = current.y + step;

      steps.push({
        type: 'move',
        direction,
        from: this.formatCoordinates(current),
        to: this.formatCoordinates(next),
        fuelCost: 1,
        description: `Move ${direction} to ${coordinateToString(this.formatCoordinates(next))}`
      });

      current = next;
    }

    // Handle Z axis - move in exact 0.1 increments toward target
    while (Math.abs(current.z - to.z) > tolerance) {
      const direction = current.z < to.z ? 'up' : 'down';
      const next = { ...current };

      const remaining = to.z - current.z;
      const step = Math.abs(remaining) < stepSize ? remaining :
                   (remaining > 0 ? stepSize : -stepSize);

      next.z = current.z + step;

      steps.push({
        type: 'move',
        direction,
        from: this.formatCoordinates(current),
        to: this.formatCoordinates(next),
        fuelCost: 1,
        description: `Move ${direction} to ${coordinateToString(this.formatCoordinates(next))}`
      });

      current = next;
    }

    return steps;
  }

  /**
   * Calculate edge coordinate for system exit
   */
  private calculateEdgeCoordinate(from: Coordinates3D, system: Coordinates3D): Coordinates3D {
    // For negative systems, we need to handle edge calculation properly
    // System ranges: system 1 = [1.0, 2.0), system -1 = [-1.0, 0.0), system -6 = [-6.0, -5.0)
    const getEdgeCoordinate = (currentPos: number, systemCoord: number): number => {
      const systemStart = systemCoord;
      const systemEnd = systemCoord + 1;
      const systemMid = systemCoord + 0.5;

      // If we're in the lower half of the system, go to the start edge
      // If we're in the upper half, go to the end edge (with some margin)
      if (currentPos < systemMid) {
        return systemStart + 0.1; // Near the start of the system
      } else {
        return systemEnd - 0.1; // Near the end of the system
      }
    };

    return {
      x: getEdgeCoordinate(from.x, system.x),
      y: getEdgeCoordinate(from.y, system.y),
      z: getEdgeCoordinate(from.z, system.z)
    };
  }

  /**
   * Check if coordinate is at system coordinate
   */
  private isAtSystemCoordinate(coord: Coordinates3D, system: Coordinates3D): boolean {
    return coord.x === system.x && coord.y === system.y && coord.z === system.z;
  }

  /**
   * Plot a complete navigation course
   */
  async plotCourse(fromStr: string, toStr: string): Promise<NavigationPath> {
    try {
      const from = this.parseCoordinates(fromStr);
      const to = this.parseCoordinates(toStr);

      let allSteps: NavigationStep[] = [];
      let current = { ...from };

      const fromSystem = this.getSystemCoords(from);
      const toSystem = this.getSystemCoords(to);

      // Check which axes need system jumps
      const needsJump = {
        x: fromSystem.x !== toSystem.x,
        y: fromSystem.y !== toSystem.y,
        z: fromSystem.z !== toSystem.z
      };

      const needsAnyJump = needsJump.x || needsJump.y || needsJump.z;

      if (!needsAnyJump) {
        // Same system - just move within system
        allSteps = this.planSystemMovement(current, to);
      } else {
        // Need jumps on some axes - handle each axis independently

        // First, handle X axis jumps if needed
        if (needsJump.x) {
          while (this.getSystemCoords(current).x !== toSystem.x) {
            const currentSysX = this.getSystemCoords(current).x;
            const direction = currentSysX < toSystem.x ? 'east' : 'west';
            const nextSysX = currentSysX + (currentSysX < toSystem.x ? 1 : -1);

            // Land at center of new system
            const landingCoord = {
              x: nextSysX + 0.5,
              y: current.y,
              z: current.z
            };

            allSteps.push({
              type: 'jump',
              direction,
              from: this.formatCoordinates(current),
              to: this.formatCoordinates(landingCoord),
              fuelCost: 1,
              description: `Jump ${direction} to system ${nextSysX},${this.getSystemCoords(current).y},${this.getSystemCoords(current).z}`
            });

            current = landingCoord;
          }
        }

        // Then handle Y axis jumps if needed
        if (needsJump.y) {
          while (this.getSystemCoords(current).y !== toSystem.y) {
            const currentSysY = this.getSystemCoords(current).y;
            const direction = currentSysY < toSystem.y ? 'north' : 'south';
            const nextSysY = currentSysY + (currentSysY < toSystem.y ? 1 : -1);

            const landingCoord = {
              x: current.x,
              y: nextSysY + 0.5,
              z: current.z
            };

            allSteps.push({
              type: 'jump',
              direction,
              from: this.formatCoordinates(current),
              to: this.formatCoordinates(landingCoord),
              fuelCost: 1,
              description: `Jump ${direction} to system ${this.getSystemCoords(current).x},${nextSysY},${this.getSystemCoords(current).z}`
            });

            current = landingCoord;
          }
        }

        // Finally handle Z axis jumps if needed
        if (needsJump.z) {
          while (this.getSystemCoords(current).z !== toSystem.z) {
            const currentSysZ = this.getSystemCoords(current).z;
            const direction = currentSysZ < toSystem.z ? 'up' : 'down';
            const nextSysZ = currentSysZ + (currentSysZ < toSystem.z ? 1 : -1);

            const landingCoord = {
              x: current.x,
              y: current.y,
              z: nextSysZ + 0.5
            };

            allSteps.push({
              type: 'jump',
              direction,
              from: this.formatCoordinates(current),
              to: this.formatCoordinates(landingCoord),
              fuelCost: 1,
              description: `Jump ${direction} to system ${this.getSystemCoords(current).x},${this.getSystemCoords(current).y},${nextSysZ}`
            });

            current = landingCoord;
          }
        }

        // Finally, move to the exact destination within the target system
        if (current.x !== to.x || current.y !== to.y || current.z !== to.z) {
          allSteps.push(...this.planSystemMovement(current, to));
        }
      }

      const totalFuelCost = allSteps.reduce((sum, step) => sum + step.fuelCost, 0);
      const totalDistance = this.calculate3DDistance(from, to);

      return {
        steps: allSteps,
        totalFuelCost,
        totalDistance,
        estimatedTime: allSteps.length
      };
    } catch (error) {
      console.error('Course plotting failed:', error);
      throw new Error(`Failed to plot course: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get next step from navigation path
   */
  getNextStep(path: NavigationStep[]): { step: NavigationStep | null; remainingPath: NavigationStep[] } {
    if (path.length === 0) {
      return { step: null, remainingPath: [] };
    }

    const [nextStep, ...remaining] = path;
    return { step: nextStep, remainingPath: remaining };
  }

  /**
   * Validate navigation step
   */
  validateStep(step: NavigationStep): boolean {
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
      this.validateCoordinates(step.from);
      this.validateCoordinates(step.to);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate navigation path
   */
  validatePath(path: NavigationStep[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(path)) {
      errors.push('Path must be an array');
      return { isValid: false, errors };
    }

    if (path.length === 0) {
      return { isValid: true, errors: [] }; // Empty path is valid (already at destination)
    }

    path.forEach((step, index) => {
      if (!this.validateStep(step)) {
        errors.push(`Invalid step at index ${index}`);
      }
    });

    // Check path continuity
    for (let i = 0; i < path.length - 1; i++) {
      const currentStep = path[i];
      const nextStep = path[i + 1];
      
      const currentTo = currentStep.to;
      const nextFrom = nextStep.from;
      
      const tolerance = 0.01;
      if (Math.abs(currentTo.x - nextFrom.x) > tolerance ||
          Math.abs(currentTo.y - nextFrom.y) > tolerance ||
          Math.abs(currentTo.z - nextFrom.z) > tolerance) {
        errors.push(`Path discontinuity between steps ${i} and ${i + 1}`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }
}