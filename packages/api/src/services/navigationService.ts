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
   * Get system coordinates (floor values)
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
      const distance = this.calculate3DDistance(targetCoord, obj.coordinates);

      // Use a much smaller collision radius - only collision if very close to object center
      // This allows navigation around objects without requiring complex pathfinding
      let collisionRadius;

      if (obj.type === 'star') {
        // Stars are dangerous - larger collision radius but still reasonable
        collisionRadius = Math.min(Math.sqrt(obj.size) * 0.05, 0.3);
      } else if (obj.type === 'station') {
        // Stations you might want to dock with - very small radius
        collisionRadius = 0.05;
      } else {
        // Planets, asteroids - medium collision radius
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

      steps.push({
        type: 'jump',
        direction,
        from: { ...current },
        to: { ...next },
        fuelCost: 1,
        description: `Jump ${direction} to system ${coordinateToString(next)}`
      });

      current = next;
    }

    // Handle Y axis
    while (current.y !== toSystem.y) {
      const direction = current.y < toSystem.y ? 'north' : 'south';
      const next = { ...current };
      next.y += current.y < toSystem.y ? 1 : -1;

      steps.push({
        type: 'jump',
        direction,
        from: { ...current },
        to: { ...next },
        fuelCost: 1,
        description: `Jump ${direction} to system ${coordinateToString(next)}`
      });

      current = next;
    }

    // Handle Z axis
    while (current.z !== toSystem.z) {
      const direction = current.z < toSystem.z ? 'up' : 'down';
      const next = { ...current };
      next.z += current.z < toSystem.z ? 1 : -1;

      steps.push({
        type: 'jump',
        direction,
        from: { ...current },
        to: { ...next },
        fuelCost: 1,
        description: `Jump ${direction} to system ${coordinateToString(next)}`
      });

      current = next;
    }

    return steps;
  }

  /**
   * Plan movement within a system
   */
  private planSystemMovement(from: Coordinates3D, to: Coordinates3D): NavigationStep[] {
    const steps: NavigationStep[] = [];
    let current = { ...from };
    const tolerance = 0.05;
    const stepSize = 0.1;

    // Handle X axis
    while (Math.abs(current.x - to.x) > tolerance) {
      const direction = current.x < to.x ? 'east' : 'west';
      const next = { ...current };
      const step = current.x < to.x ? stepSize : -stepSize;
      next.x = Math.round((current.x + step) * 10) / 10;

      steps.push({
        type: 'move',
        direction,
        from: { ...current },
        to: { ...next },
        fuelCost: 1,
        description: `Move ${direction} to ${coordinateToString(next)}`
      });

      current = next;
    }

    // Handle Y axis
    while (Math.abs(current.y - to.y) > tolerance) {
      const direction = current.y < to.y ? 'north' : 'south';
      const next = { ...current };
      const step = current.y < to.y ? stepSize : -stepSize;
      next.y = Math.round((current.y + step) * 10) / 10;

      steps.push({
        type: 'move',
        direction,
        from: { ...current },
        to: { ...next },
        fuelCost: 1,
        description: `Move ${direction} to ${coordinateToString(next)}`
      });

      current = next;
    }

    // Handle Z axis
    while (Math.abs(current.z - to.z) > tolerance) {
      const direction = current.z < to.z ? 'up' : 'down';
      const next = { ...current };
      const step = current.z < to.z ? stepSize : -stepSize;
      next.z = Math.round((current.z + step) * 10) / 10;

      steps.push({
        type: 'move',
        direction,
        from: { ...current },
        to: { ...next },
        fuelCost: 1,
        description: `Move ${direction} to ${coordinateToString(next)}`
      });

      current = next;
    }

    return steps;
  }

  /**
   * Calculate edge coordinate for system exit
   */
  private calculateEdgeCoordinate(from: Coordinates3D, system: Coordinates3D): Coordinates3D {
    return {
      x: from.x < system.x + 0.5 ? system.x : system.x + 0.9,
      y: from.y < system.y + 0.5 ? system.y : system.y + 0.9,
      z: from.z < system.z + 0.5 ? system.z : system.z + 0.9
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

      if (this.sameSystem(from, to)) {
        // Same system - just move within system
        allSteps = this.planSystemMovement(from, to);
      } else {
        // Different systems - need to jump
        const fromSystem = this.getSystemCoords(from);
        const toSystem = this.getSystemCoords(to);

        // Move to system edge if not already there
        if (!this.isAtSystemCoordinate(from, fromSystem)) {
          const edgeCoord = this.calculateEdgeCoordinate(from, fromSystem);
          allSteps.push(...this.planSystemMovement(from, edgeCoord));
        }

        // Jump between systems
        allSteps.push(...this.planSystemJumps(fromSystem, toSystem));

        // Move to final destination within target system
        if (!this.isAtSystemCoordinate(to, toSystem)) {
          const entryCoord: Coordinates3D = { x: toSystem.x, y: toSystem.y, z: toSystem.z };
          allSteps.push(...this.planSystemMovement(entryCoord, to));
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