import {
  NPC,
  NPCGoal,
  NPCAction,
  createMinerNPC,
  updateNPCGoal,
  updateNPCAction,
  updateNPCLifecycle,
  shouldNPCTerminate,
  Coordinates3D,
  getItemById
} from '@stellarburn/shared';
import { apiClient, wait, calculateDistance, getDirectionTo } from '../services/apiClient.js';

// Miner NPC behavior functions (pure FP)

// Determine next goal based on current state
export const determineNextGoal = (npc: NPC): NPCGoal => {
  // Check if should terminate
  if (shouldNPCTerminate(npc)) {
    return { type: 'idle' };
  }

  // If we have cargo, find a station to sell
  if (npc.ship.cargo.length > 0) {
    if (npc.memory.knownStations.length > 0) {
      // Find best station to sell to (highest price)
      const bestStation = npc.memory.knownStations.reduce((best, station) => {
        const totalValue = npc.ship.cargo.reduce((sum, item) => {
          const buyPrice = station.buyingPrices.get(item.itemId) || 0;
          return sum + (buyPrice * item.quantity);
        }, 0);
        const bestValue = npc.ship.cargo.reduce((sum, item) => {
          const buyPrice = best.buyingPrices.get(item.itemId) || 0;
          return sum + (buyPrice * item.quantity);
        }, 0);
        return totalValue > bestValue ? station : best;
      });
      return { type: 'trade-at-station', stationId: bestStation.id };
    } else {
      return { type: 'find-station' };
    }
  }

  // If no cargo, find asteroids to mine
  if (npc.memory.knownAsteroids.length > 0) {
    // Pick least depleted asteroid
    const viableAsteroid = npc.memory.knownAsteroids
      .filter(a => a.estimatedDepletion < 0.8)
      .sort((a, b) => a.estimatedDepletion - b.estimatedDepletion)[0];

    if (viableAsteroid) {
      return { type: 'mine-resources', asteroidId: viableAsteroid.id };
    }
  }

  // Default: explore to find stations and asteroids
  return { type: 'find-station' };
};

// Execute the current goal and return updated NPC
export const executeGoal = async (npc: NPC): Promise<NPC> => {
  try {
    switch (npc.behaviorState.currentGoal.type) {
      case 'idle':
        return npc;

      case 'find-station':
        return await findStationGoal(npc);

      case 'find-asteroid':
        return await findAsteroidGoal(npc);

      case 'mine-resources':
        return await mineResourcesGoal(npc);

      case 'trade-at-station':
        return await tradeAtStationGoal(npc);

      default:
        return npc;
    }
  } catch (error) {
    console.error(`NPC ${npc.id} goal execution error:`, error);
    // On error, reset to finding a station
    return updateNPCGoal(npc, { type: 'find-station' });
  }
};

// Goal implementation functions
const findStationGoal = async (npc: NPC): Promise<NPC> => {
  console.log(`NPC ${npc.name} searching for stations...`);

  // First, check database for known stations (like 'db' command)
  try {
    const knownSystems = await apiClient.getKnownSystems(npc.id);
    const knownSystemsData = knownSystems as any;
    if (knownSystemsData.systems && knownSystemsData.systems.length > 0) {
      // Look for systems with stations
      const systemsWithStations = knownSystemsData.systems.filter((system: any) =>
        system.stations && system.stations.length > 0
      );

      if (systemsWithStations.length > 0) {
        console.log(`NPC ${npc.name} found ${systemsWithStations.length} systems with stations in database`);

        // Find the closest station from all known systems
        let closestStation = null;
        let closestDistance = Infinity;

        for (const system of systemsWithStations) {
          for (const station of system.stations) {
            const distance = calculateDistance(npc.coordinates, station.coordinates);
            if (distance < closestDistance) {
              closestDistance = distance;
              closestStation = station;
            }
          }
        }

        if (closestStation) {
          console.log(`NPC ${npc.name} targeting known station ${closestStation.name} at distance ${closestDistance.toFixed(2)}`);
          return {
            ...npc,
            behaviorState: {
              ...npc.behaviorState,
              currentGoal: { type: 'trade-at-station', stationId: closestStation.id },
              targetLocation: closestStation.coordinates,
              targetEntityId: closestStation.id
            }
          };
        }
      }
    }
  } catch (error) {
    console.log(`NPC ${npc.name} failed to query database: ${error}`);
  }

  // No known stations, try firing a probe to discover new systems (like 'probe' command)
  const directions = ['north', 'south', 'east', 'west', 'up', 'down'];
  const randomDirection = directions[Math.floor(Math.random() * directions.length)];

  try {
    console.log(`NPC ${npc.name} launching probe ${randomDirection} to search for stations...`);
    const probeResult = await apiClient.launchProbe(npc.id, randomDirection);

    if (probeResult.success && (probeResult as any).discoveredSystems) {
      console.log(`NPC ${npc.name} probe discovered ${(probeResult as any).discoveredSystems.length} systems`);

      // Wait a moment for the probe data to be added to database
      await wait(1000);

      // Now check database again for newly discovered stations
      try {
        const updatedKnownSystems = await apiClient.getKnownSystems(npc.id);
        const updatedKnownSystemsData = updatedKnownSystems as any;
        const systemsWithStations = updatedKnownSystemsData.systems.filter((system: any) =>
          system.stations && system.stations.length > 0
        );

        if (systemsWithStations.length > 0) {
          // Find nearest discovered station
          let closestStation = null;
          let closestDistance = Infinity;

          for (const system of systemsWithStations) {
            for (const station of system.stations) {
              const distance = calculateDistance(npc.coordinates, station.coordinates);
              if (distance < closestDistance) {
                closestDistance = distance;
                closestStation = station;
              }
            }
          }

          if (closestStation) {
            console.log(`NPC ${npc.name} found station ${closestStation.name} via probe data`);
            return {
              ...npc,
              behaviorState: {
                ...npc.behaviorState,
                currentGoal: { type: 'trade-at-station', stationId: closestStation.id },
                targetLocation: closestStation.coordinates,
                targetEntityId: closestStation.id
              }
            };
          }
        }
      } catch (dbError) {
        console.log(`NPC ${npc.name} failed to query database after probe: ${dbError}`);
      }
    }

    console.log(`NPC ${npc.name} probe found no stations, continuing to explore...`);
  } catch (probeError) {
    console.log(`NPC ${npc.name} failed to launch probe: ${probeError}`);
  }

  // No stations found via probe, move randomly to explore
  try {
    const moveResult = await apiClient.jumpPlayer(npc.id, randomDirection);
    console.log(`NPC ${npc.name} jumping ${randomDirection} to continue exploration`);
    return {
      ...npc,
      coordinates: (moveResult as any).newCoordinates || npc.coordinates,
      ship: { ...npc.ship, fuel: (moveResult as any).fuel || npc.ship.fuel }
    };
  } catch (error) {
    // If jump fails, try move
    try {
      const moveResult = await apiClient.movePlayer(npc.id, randomDirection);
      console.log(`NPC ${npc.name} moving ${randomDirection} to continue exploration`);
      return {
        ...npc,
        coordinates: (moveResult as any).newCoordinates || npc.coordinates,
        ship: { ...npc.ship, fuel: (moveResult as any).fuel || npc.ship.fuel }
      };
    } catch (moveError) {
      console.log(`NPC ${npc.name} movement failed, staying put: ${moveError}`);
      return npc;
    }
  }
};

const findAsteroidGoal = async (npc: NPC): Promise<NPC> => {
  console.log(`NPC ${npc.name} searching for asteroids...`);

  // First, check database for known asteroids (like 'db' command)
  try {
    const knownSystems = await apiClient.getKnownSystems(npc.id);
    const knownSystemsData = knownSystems as any;
    if (knownSystemsData.systems && knownSystemsData.systems.length > 0) {
      // Look for systems with asteroids
      const systemsWithAsteroids = knownSystemsData.systems.filter((system: any) =>
        system.asteroids && system.asteroids.length > 0
      );

      if (systemsWithAsteroids.length > 0) {
        console.log(`NPC ${npc.name} found ${systemsWithAsteroids.length} systems with asteroids in database`);

        // Find the closest asteroid from all known systems
        let closestAsteroid = null;
        let closestDistance = Infinity;

        for (const system of systemsWithAsteroids) {
          for (const asteroid of system.asteroids) {
            const distance = calculateDistance(npc.coordinates, asteroid.coordinates);
            if (distance < closestDistance) {
              closestDistance = distance;
              closestAsteroid = asteroid;
            }
          }
        }

        if (closestAsteroid) {
          console.log(`NPC ${npc.name} targeting known asteroid ${closestAsteroid.id} at distance ${closestDistance.toFixed(2)}`);
          return {
            ...npc,
            behaviorState: {
              ...npc.behaviorState,
              currentGoal: { type: 'mine-resources', asteroidId: closestAsteroid.id },
              targetLocation: closestAsteroid.coordinates,
              targetEntityId: closestAsteroid.id
            }
          };
        }
      }
    }
  } catch (error) {
    console.log(`NPC ${npc.name} failed to query database for asteroids: ${error}`);
  }

  // No known asteroids, try firing a probe to discover new systems (like 'probe' command)
  const directions = ['north', 'south', 'east', 'west', 'up', 'down'];
  const randomDirection = directions[Math.floor(Math.random() * directions.length)];

  try {
    console.log(`NPC ${npc.name} launching probe ${randomDirection} to search for asteroids...`);
    const probeResult = await apiClient.launchProbe(npc.id, randomDirection);

    if (probeResult.success && (probeResult as any).discoveredSystems) {
      console.log(`NPC ${npc.name} probe discovered ${(probeResult as any).discoveredSystems.length} systems`);

      // Wait a moment for the probe data to be added to database
      await wait(1000);

      // Now check database again for newly discovered asteroids
      try {
        const updatedKnownSystems = await apiClient.getKnownSystems(npc.id);
        const updatedKnownSystemsData = updatedKnownSystems as any;
        const systemsWithAsteroids = updatedKnownSystemsData.systems.filter((system: any) =>
          system.asteroids && system.asteroids.length > 0
        );

        if (systemsWithAsteroids.length > 0) {
          // Find nearest discovered asteroid
          let closestAsteroid = null;
          let closestDistance = Infinity;

          for (const system of systemsWithAsteroids) {
            for (const asteroid of system.asteroids) {
              const distance = calculateDistance(npc.coordinates, asteroid.coordinates);
              if (distance < closestDistance) {
                closestDistance = distance;
                closestAsteroid = asteroid;
              }
            }
          }

          if (closestAsteroid) {
            console.log(`NPC ${npc.name} found asteroid ${closestAsteroid.id} via probe data`);
            return {
              ...npc,
              behaviorState: {
                ...npc.behaviorState,
                currentGoal: { type: 'mine-resources', asteroidId: closestAsteroid.id },
                targetLocation: closestAsteroid.coordinates,
                targetEntityId: closestAsteroid.id
              }
            };
          }
        }
      } catch (dbError) {
        console.log(`NPC ${npc.name} failed to query database after probe: ${dbError}`);
      }
    }

    console.log(`NPC ${npc.name} probe found no asteroids, will search for stations instead...`);
  } catch (probeError) {
    console.log(`NPC ${npc.name} failed to launch probe: ${probeError}`);
  }

  // No asteroids found via probe, fall back to finding stations
  return await findStationGoal(npc);
};

const mineResourcesGoal = async (npc: NPC): Promise<NPC> => {
  if (npc.behaviorState.currentGoal.type !== 'mine-resources') return npc;

  const asteroidId = npc.behaviorState.currentGoal.asteroidId;
  console.log(`NPC ${npc.name} attempting to mine asteroid ${asteroidId}...`);

  try {
    // Try auto-mining
    const miningResult = await apiClient.autoMine(npc.id);

    if (miningResult.success) {
      console.log(`NPC ${npc.name} mining started, waiting ${miningResult.miningTime}s...`);

      // Wait for mining to complete
      await wait((miningResult.miningTime || 5) * 1000);

      // Check mining status to get results
      const status = await apiClient.getMiningStatus(npc.id);

      // Update cargo with mined resources
      const updatedShip = { ...npc.ship };
      if (miningResult.extractedItems) {
        for (const extracted of miningResult.extractedItems) {
          const existingItem = updatedShip.cargo.find(i => i.itemId === extracted.itemId);
          if (existingItem) {
            existingItem.quantity += extracted.quantity;
          } else {
            updatedShip.cargo.push({
              itemId: extracted.itemId,
              quantity: extracted.quantity,
              purchasePrice: 0
            });
          }
        }
      }

      // Update lifecycle
      const resourceCount = miningResult.extractedItems?.reduce((sum, i) => sum + i.quantity, 0) || 0;
      const updatedLifecycle = updateNPCLifecycle(npc, 'mine', 0, resourceCount);

      console.log(`NPC ${npc.name} mined ${resourceCount} resources`);

      // Determine next goal
      const nextGoal = determineNextGoal({
        ...npc,
        ship: updatedShip,
        lifecycle: updatedLifecycle
      });

      return {
        ...npc,
        ship: updatedShip,
        lifecycle: updatedLifecycle,
        behaviorState: {
          ...npc.behaviorState,
          currentGoal: nextGoal,
          actionProgress: 0
        }
      };
    }
  } catch (error: any) {
    console.log(`NPC ${npc.name} mining failed: ${error.message}`);

    // If no asteroids nearby, search for them
    if (error.message?.includes('No asteroids found')) {
      return updateNPCGoal(npc, { type: 'find-asteroid' });
    }

    // Navigate closer to asteroid target if we have one
    if (npc.behaviorState.targetLocation) {
      const direction = getDirectionTo(npc.coordinates, npc.behaviorState.targetLocation);
      try {
        const moveResult = await apiClient.movePlayer(npc.id, direction);
        return {
          ...npc,
          coordinates: moveResult.newCoordinates || npc.coordinates,
          ship: { ...npc.ship, fuel: moveResult.fuel || npc.ship.fuel }
        };
      } catch (moveError) {
        console.log(`NPC ${npc.name} movement failed, exploring instead`);
        return updateNPCGoal(npc, { type: 'find-asteroid' });
      }
    }
  }

  return updateNPCGoal(npc, { type: 'find-asteroid' });
};

const tradeAtStationGoal = async (npc: NPC): Promise<NPC> => {
  if (npc.behaviorState.currentGoal.type !== 'trade-at-station') return npc;

  const stationId = npc.behaviorState.currentGoal.stationId;
  console.log(`NPC ${npc.name} attempting to trade at station ${stationId}...`);

  try {
    // Try to dock
    const dockResult = await apiClient.dockAtStation(npc.id);

    if ((dockResult as any).success) {
      console.log(`NPC ${npc.name} docked at ${(dockResult as any).station.name}`);

      // Get station info to update prices in memory
      const stationInfo = await apiClient.getStationInfo(npc.id, stationId);

      // Update known prices
      const updatedMemory = { ...npc.memory };
      const stationMemory = updatedMemory.knownStations.find(s => s.id === stationId);
      if (stationMemory && (stationInfo as any).inventory) {
        for (const item of (stationInfo as any).inventory) {
          stationMemory.buyingPrices.set(item.itemId, item.buyPrice);
          stationMemory.sellingPrices.set(item.itemId, item.sellPrice);
        }
      }

      // Sell all cargo
      let totalCreditsEarned = 0;
      let totalCreditsSpent = 0;
      const updatedShip = { ...npc.ship, cargo: [] };

      for (const cargoItem of npc.ship.cargo) {
        try {
          const sellResult = await apiClient.sellToStation(npc.id, cargoItem.itemId, cargoItem.quantity);
          if ((sellResult as any).success) {
            totalCreditsEarned += (sellResult as any).creditsEarned || 0;
            console.log(`NPC ${npc.name} sold ${cargoItem.quantity} ${cargoItem.itemId} for ${(sellResult as any).creditsEarned} credits`);
          }
        } catch (sellError) {
          console.log(`NPC ${npc.name} couldn't sell ${cargoItem.itemId}`);
        }
      }

      // Buy fuel to top off
      try {
        const fuelNeeded = npc.ship.maxFuel - npc.ship.fuel;
        if (fuelNeeded > 0 && npc.credits + totalCreditsEarned > fuelNeeded * 2) { // Assuming fuel costs ~2 credits per unit
          const fuelResult = await apiClient.buyFromStation(npc.id, 'fuel', fuelNeeded);
          if ((fuelResult as any).success) {
            updatedShip.fuel = npc.ship.maxFuel;
            totalCreditsSpent += (fuelResult as any).totalCost || 0;
            console.log(`NPC ${npc.name} bought ${fuelNeeded} fuel for ${(fuelResult as any).totalCost} credits`);
          }
        }
      } catch (fuelError) {
        console.log(`NPC ${npc.name} couldn't buy fuel: ${fuelError}`);
      }

      // Undock
      await apiClient.undockFromStation(npc.id);

      // Update lifecycle
      const netCredits = totalCreditsEarned - totalCreditsSpent;
      const updatedLifecycle = updateNPCLifecycle(npc, 'trade', netCredits);

      console.log(`NPC ${npc.name} completed trade, earned ${totalCreditsEarned}, spent ${totalCreditsSpent} on fuel. Net: ${netCredits} credits. Total: ${updatedLifecycle.totalCreditsEarned}`);

      // Determine next goal
      const nextGoal = determineNextGoal({
        ...npc,
        ship: updatedShip,
        memory: updatedMemory,
        lifecycle: updatedLifecycle,
        credits: npc.credits + netCredits
      });

      return {
        ...npc,
        ship: updatedShip,
        memory: updatedMemory,
        lifecycle: updatedLifecycle,
        credits: npc.credits + netCredits,
        dockedAt: undefined,
        behaviorState: {
          ...npc.behaviorState,
          currentGoal: nextGoal,
          actionProgress: 0
        }
      };
    }
  } catch (error: any) {
    console.log(`NPC ${npc.name} dock/trade failed: ${error.message}`);

    // If can't dock, navigate closer
    if (npc.behaviorState.targetLocation) {
      const direction = getDirectionTo(npc.coordinates, npc.behaviorState.targetLocation);
      try {
        const moveResult = await apiClient.movePlayer(npc.id, direction);
        return {
          ...npc,
          coordinates: moveResult.newCoordinates || npc.coordinates,
          ship: { ...npc.ship, fuel: moveResult.fuel || npc.ship.fuel }
        };
      } catch (moveError) {
        // Try jumping if move fails
        try {
          const jumpResult = await apiClient.jumpPlayer(npc.id, direction);
          return {
            ...npc,
            coordinates: (jumpResult as any).newCoordinates || npc.coordinates,
            ship: { ...npc.ship, fuel: (jumpResult as any).fuel || npc.ship.fuel }
          };
        } catch (jumpError) {
          console.log(`NPC ${npc.name} navigation failed, exploring instead`);
          return updateNPCGoal(npc, { type: 'find-station' });
        }
      }
    }
  }

  return updateNPCGoal(npc, { type: 'find-station' });
};

// Main NPC lifecycle runner
export const runMinerNPC = async (config: {
  name: string;
  playerId: string;
  spawnLocation?: Coordinates3D;
  maxOperations?: number;
  tickInterval?: number;
}): Promise<void> => {
  const tickInterval = config.tickInterval || 5000; // 5 second ticks by default
  const npcId = config.playerId; // Use the passed player ID

  console.log(`Running Miner NPC: ${config.name} (${npcId})`);

  // Initialize NPC state using the provided player ID
  let npc = createMinerNPC(
    npcId,
    config.name,
    {
      spawnLocation: config.spawnLocation,
      maxOperations: config.maxOperations || 100
    }
  );

  console.log(`NPC ${config.name} spawned at ${JSON.stringify(npc.coordinates)}`);

  // Initial setup for NPC
  try {
    console.log(`NPC ${config.name} performing initial system scan...`);
    await apiClient.systemScan(npc.id);

    console.log(`NPC ${config.name} undocking from starting station...`);
    try {
      await apiClient.undockFromStation(npc.id);
      console.log(`NPC ${config.name} successfully undocked`);
    } catch (undockError) {
      console.log(`NPC ${config.name} was not docked (normal for some spawn conditions)`);
    }

    console.log(`NPC ${config.name} initialization complete`);
  } catch (initError) {
    console.error(`NPC ${config.name} initialization error:`, initError);
  }

  // Main NPC loop
  while (!shouldNPCTerminate(npc)) {
    try {
      // Execute current goal
      npc = await executeGoal(npc);

      // Check if we need a new goal
      if (npc.behaviorState.actionProgress >= 1.0 || npc.behaviorState.currentGoal.type === 'idle') {
        const nextGoal = determineNextGoal(npc);
        npc = updateNPCGoal(npc, nextGoal);
        console.log(`NPC ${npc.name} new goal: ${nextGoal.type}`);
      }

      // Wait before next tick
      await wait(tickInterval);

    } catch (error) {
      console.error(`NPC ${npc.name} error:`, error);
      await wait(tickInterval);
    }
  }

  console.log(`NPC ${npc.name} lifecycle complete:`);
  console.log(`- Operations: ${npc.lifecycle.completedOperations}`);
  console.log(`- Credits earned: ${npc.lifecycle.totalCreditsEarned}`);
  console.log(`- Resources mined: ${npc.lifecycle.totalResourcesMined}`);
  console.log(`- Distance traveled: ${npc.lifecycle.totalDistanceTraveled}`);
};