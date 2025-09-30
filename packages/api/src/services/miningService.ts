import {
  Coordinates3D,
  Player,
  CelestialBody,
  MiningResult,
  MiningOperationState,
  CargoItem,
  getSystemCoords
} from '@stellarburn/shared';
import { getItemById, getMiningYield } from '@stellarburn/shared';
import { getPlayerById, updatePlayer } from './playerService.js';
import { getSystemByCoordinates, updateSystem } from './systemService.js';

// Track active mining operations
const activeMiningOperations = new Map<string, MiningOperationState>();

export async function startMining(playerId: string, asteroidId: string): Promise<MiningResult> {
  try {
    const player = await getPlayerById(playerId);
    if (!player) {
      return {
        success: false,
        message: 'Player not found',
        extractedItems: [],
        miningTime: 0,
        asteroidDepletion: 0,
        cargoSpaceUsed: 0,
        cargoSpaceRemaining: 0
      };
    }

    // Check if player is already mining
    if (activeMiningOperations.has(playerId)) {
      return {
        success: false,
        message: 'You are already mining an asteroid',
        extractedItems: [],
        miningTime: 0,
        asteroidDepletion: 0,
        cargoSpaceUsed: 0,
        cargoSpaceRemaining: 0
      };
    }

    // Get the system containing the asteroid
    const systemCoords = getSystemCoords(player.coordinates);
    const system = await getSystemByCoordinates(systemCoords);
    if (!system) {
      return {
        success: false,
        message: 'Current system not found',
        extractedItems: [],
        miningTime: 0,
        asteroidDepletion: 0,
        cargoSpaceUsed: 0,
        cargoSpaceRemaining: 0
      };
    }

    // Find the asteroid
    const asteroid = system.staticObjects.find(obj => obj.id === asteroidId && obj.type === 'asteroid') as CelestialBody;
    if (!asteroid) {
      return {
        success: false,
        message: 'Asteroid not found in current system',
        extractedItems: [],
        miningTime: 0,
        asteroidDepletion: 0,
        cargoSpaceUsed: 0,
        cargoSpaceRemaining: 0
      };
    }

    // Check if asteroid has mining data
    if (!asteroid.asteroidType || !asteroid.miningProgress) {
      return {
        success: false,
        message: 'This asteroid cannot be mined',
        extractedItems: [],
        miningTime: 0,
        asteroidDepletion: 0,
        cargoSpaceUsed: 0,
        cargoSpaceRemaining: 0
      };
    }

    // Check if asteroid is too depleted
    if (asteroid.miningProgress.currentDepletion >= 1.0) {
      return {
        success: false,
        message: 'This asteroid has been completely depleted',
        extractedItems: [],
        miningTime: 0,
        asteroidDepletion: asteroid.miningProgress.currentDepletion,
        cargoSpaceUsed: 0,
        cargoSpaceRemaining: 0
      };
    }

    // Check distance to asteroid (must be in same coordinates)
    if (
      Math.floor(player.coordinates.x) !== Math.floor(asteroid.coordinates.x) ||
      Math.floor(player.coordinates.y) !== Math.floor(asteroid.coordinates.y) ||
      Math.floor(player.coordinates.z) !== Math.floor(asteroid.coordinates.z)
    ) {
      return {
        success: false,
        message: 'You must be in the same sector as the asteroid to mine it',
        extractedItems: [],
        miningTime: 0,
        asteroidDepletion: asteroid.miningProgress.currentDepletion,
        cargoSpaceUsed: 0,
        cargoSpaceRemaining: 0
      };
    }

    // Calculate mining time based on difficulty (1-5 seconds base + difficulty)
    const baseMiningTime = 2; // 2 seconds base
    const miningTime = baseMiningTime + asteroid.asteroidType.miningDifficulty;

    // Start the mining operation
    const now = new Date();
    const expectedEndTime = new Date(now.getTime() + miningTime * 1000);

    const miningOperation: MiningOperationState = {
      playerId,
      asteroidId,
      startTime: now,
      expectedEndTime,
      miningDuration: miningTime
    };

    activeMiningOperations.set(playerId, miningOperation);

    // Add player to asteroid's active mining operations
    asteroid.miningProgress.activeMiningOperations.push(playerId);

    // Update the system with the mining operation
    await updateSystem(system);

    // Auto-complete mining after the delay
    setTimeout(async () => {
      await completeMiningOperation(playerId);
    }, miningTime * 1000);

    return {
      success: true,
      message: `Mining operation started. Extracting resources in ${miningTime} seconds...`,
      extractedItems: [],
      miningTime,
      asteroidDepletion: asteroid.miningProgress.currentDepletion,
      cargoSpaceUsed: player.ship.cargo.reduce((total, item) => total + (getItemById(item.itemId)?.weight || 0) * item.quantity, 0),
      cargoSpaceRemaining: player.ship.maxCargo - player.ship.cargo.reduce((total, item) => total + (getItemById(item.itemId)?.weight || 0) * item.quantity, 0)
    };

  } catch (error) {
    console.error('Error starting mining operation:', error);
    return {
      success: false,
      message: 'Failed to start mining operation',
      extractedItems: [],
      miningTime: 0,
      asteroidDepletion: 0,
      cargoSpaceUsed: 0,
      cargoSpaceRemaining: 0
    };
  }
}

export async function completeMiningOperation(playerId: string): Promise<MiningResult> {
  try {
    const miningOperation = activeMiningOperations.get(playerId);
    if (!miningOperation) {
      return {
        success: false,
        message: 'No active mining operation found',
        extractedItems: [],
        miningTime: 0,
        asteroidDepletion: 0,
        cargoSpaceUsed: 0,
        cargoSpaceRemaining: 0
      };
    }

    // Remove from active operations
    activeMiningOperations.delete(playerId);

    const player = await getPlayerById(playerId);
    if (!player) {
      return {
        success: false,
        message: 'Player not found',
        extractedItems: [],
        miningTime: 0,
        asteroidDepletion: 0,
        cargoSpaceUsed: 0,
        cargoSpaceRemaining: 0
      };
    }

    const systemCoords = getSystemCoords(player.coordinates);
    const system = await getSystemByCoordinates(systemCoords);
    if (!system) {
      return {
        success: false,
        message: 'Current system not found',
        extractedItems: [],
        miningTime: 0,
        asteroidDepletion: 0,
        cargoSpaceUsed: 0,
        cargoSpaceRemaining: 0
      };
    }

    const asteroid = system.staticObjects.find(obj => obj.id === miningOperation.asteroidId && obj.type === 'asteroid') as CelestialBody;
    if (!asteroid || !asteroid.asteroidType || !asteroid.miningProgress) {
      return {
        success: false,
        message: 'Asteroid not found or cannot be mined',
        extractedItems: [],
        miningTime: 0,
        asteroidDepletion: 0,
        cargoSpaceUsed: 0,
        cargoSpaceRemaining: 0
      };
    }

    // Remove player from asteroid's active mining operations
    asteroid.miningProgress.activeMiningOperations = asteroid.miningProgress.activeMiningOperations.filter(id => id !== playerId);

    // Calculate what resources were extracted
    const extractedItems: Array<{ itemId: string; quantity: number; value: number; }> = [];

    // Check primary resource
    if (Math.random() < asteroid.asteroidType.primaryResource.probability) {
      const quantity = getMiningYield(asteroid.asteroidType.primaryResource.density);
      const item = getItemById(asteroid.asteroidType.primaryResource.itemId);
      if (item) {
        extractedItems.push({
          itemId: item.id,
          quantity,
          value: item.basePrice * quantity
        });
      }
    }

    // Check secondary resources
    for (const secondaryResource of asteroid.asteroidType.secondaryResources) {
      if (Math.random() < secondaryResource.probability) {
        const quantity = getMiningYield(secondaryResource.density);
        const item = getItemById(secondaryResource.itemId);
        if (item) {
          extractedItems.push({
            itemId: item.id,
            quantity,
            value: item.basePrice * quantity
          });
        }
      }
    }

    // Calculate total cargo weight needed
    let totalCargoWeight = 0;
    for (const extracted of extractedItems) {
      const item = getItemById(extracted.itemId);
      if (item) {
        totalCargoWeight += item.weight * extracted.quantity;
      }
    }

    // Check current cargo capacity
    const currentCargoWeight = player.ship.cargo.reduce((total, item) => {
      const itemData = getItemById(item.itemId);
      return total + (itemData?.weight || 0) * item.quantity;
    }, 0);

    const availableCargoSpace = player.ship.maxCargo - currentCargoWeight;

    // Filter items that fit in cargo
    const itemsToAdd = extractedItems.filter(extracted => {
      const item = getItemById(extracted.itemId);
      return item && (item.weight * extracted.quantity) <= availableCargoSpace;
    });

    // Add items to player cargo
    for (const extracted of itemsToAdd) {
      const existingCargoItem = player.ship.cargo.find(item => item.itemId === extracted.itemId);
      if (existingCargoItem) {
        existingCargoItem.quantity += extracted.quantity;
      } else {
        const newCargoItem: CargoItem = {
          itemId: extracted.itemId,
          quantity: extracted.quantity,
          purchasePrice: 0 // Mined items have no purchase price
        };
        player.ship.cargo.push(newCargoItem);
      }
    }

    // Update asteroid depletion
    asteroid.miningProgress.currentDepletion += asteroid.asteroidType.depletionRate;
    asteroid.miningProgress.totalMined += itemsToAdd.reduce((total, item) => total + item.quantity, 0);
    asteroid.miningProgress.lastMined = new Date();

    // Update player and system
    await updatePlayer(player);
    await updateSystem(system);

    const finalCargoWeight = player.ship.cargo.reduce((total, item) => {
      const itemData = getItemById(item.itemId);
      return total + (itemData?.weight || 0) * item.quantity;
    }, 0);

    let message = 'Mining operation completed!';
    if (itemsToAdd.length === 0) {
      message = 'Mining operation completed, but no resources were extracted.';
    } else if (itemsToAdd.length < extractedItems.length) {
      message = 'Mining operation completed, but some resources couldn\'t fit in your cargo hold.';
    }

    return {
      success: true,
      message,
      extractedItems: itemsToAdd,
      miningTime: miningOperation.miningDuration,
      asteroidDepletion: asteroid.miningProgress.currentDepletion,
      cargoSpaceUsed: finalCargoWeight,
      cargoSpaceRemaining: player.ship.maxCargo - finalCargoWeight
    };

  } catch (error) {
    console.error('Error completing mining operation:', error);
    // Clean up the operation even if there was an error
    activeMiningOperations.delete(playerId);

    return {
      success: false,
      message: 'Failed to complete mining operation',
      extractedItems: [],
      miningTime: 0,
      asteroidDepletion: 0,
      cargoSpaceUsed: 0,
      cargoSpaceRemaining: 0
    };
  }
}

export function getMiningStatus(playerId: string): MiningOperationState | null {
  return activeMiningOperations.get(playerId) || null;
}

export function cancelMining(playerId: string): boolean {
  const operation = activeMiningOperations.get(playerId);
  if (operation) {
    activeMiningOperations.delete(playerId);
    return true;
  }
  return false;
}