import { Coordinates3D, CelestialBody, StationInventory, TradeItem, CargoItem } from '@stellarburn/shared';
import { getItemById } from '../data/tradeItems.js';

// Functional helpers for station operations
const isInDockingRange = (playerCoords: Coordinates3D) => (stationCoords: Coordinates3D): boolean => {
  const dx = Math.abs(playerCoords.x - stationCoords.x);
  const dy = Math.abs(playerCoords.y - stationCoords.y);
  const dz = Math.abs(playerCoords.z - stationCoords.z);
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return distance <= 0.05; // Must be within same zone
};

const canAffordItem = (playerCredits: number) => (itemPrice: number) => (quantity: number): boolean =>
  playerCredits >= itemPrice * quantity;

const hasCargoSpace = (currentWeight: number) => (maxWeight: number) => (itemWeight: number) => (quantity: number): boolean =>
  currentWeight + (itemWeight * quantity) <= maxWeight;

export class StationService {
  constructor(private db: any) {}

  async getStationInfo(stationId: string) {
    const station = await this.findStationById(stationId);
    if (!station) throw new Error('Station not found');

    // Get docked ships
    const dockedPlayers = await this.db.collection('players').find({
      dockedAt: stationId
    }).toArray();

    // Format inventory with item details
    const inventory = station.inventory?.map((inv: StationInventory) => {
      const item = getItemById(inv.itemId);
      return {
        ...inv,
        itemName: item?.name || 'Unknown Item',
        itemCategory: item?.category || 'unknown',
        itemWeight: item?.weight || 0,
        itemRarity: item?.rarity || 'common'
      };
    }) || [];

    return {
      id: station.id,
      name: station.name,
      stationClass: station.stationClass,
      coordinates: station.coordinates,
      credits: station.credits || 0,
      inventory,
      dockedShips: dockedPlayers.map((p: any) => ({
        id: p.id,
        name: p.name
      }))
    };
  }

  async dockPlayer(playerId: string) {
    const player = await this.db.collection('players').findOne({ id: playerId });
    if (!player) throw new Error('Player not found');

    if (player.dockedAt) {
      throw new Error('Already docked at a station');
    }

    // Find nearest station in range
    const station = await this.findNearestStationInRange(player.coordinates);
    if (!station) {
      throw new Error('No station within docking range (must be in same zone)');
    }

    // Update player to be docked
    await this.db.collection('players').updateOne(
      { id: playerId },
      {
        $set: {
          dockedAt: station.id,
          lastActivity: new Date()
        }
      }
    );

    return {
      success: true,
      message: `Docked at ${station.name} (Class ${station.stationClass})`,
      station: {
        id: station.id,
        name: station.name,
        stationClass: station.stationClass,
        coordinates: station.coordinates
      }
    };
  }

  async undockPlayer(playerId: string) {
    const player = await this.db.collection('players').findOne({ id: playerId });
    if (!player) throw new Error('Player not found');

    if (!player.dockedAt) {
      throw new Error('Not currently docked');
    }

    const station = await this.findStationById(player.dockedAt);
    const stationName = station?.name || 'Unknown Station';

    // Update player to be undocked
    await this.db.collection('players').updateOne(
      { id: playerId },
      {
        $unset: { dockedAt: "" },
        $set: { lastActivity: new Date() }
      }
    );

    return {
      success: true,
      message: `Undocked from ${stationName}`,
      coordinates: player.coordinates
    };
  }

  async getStationNearPlayer(playerId: string) {
    const player = await this.db.collection('players').findOne({ id: playerId });
    if (!player) throw new Error('Player not found');

    const station = await this.findNearestStationInRange(player.coordinates);
    if (!station) {
      return {
        nearbyStation: null,
        message: 'No station in docking range'
      };
    }

    return {
      nearbyStation: {
        id: station.id,
        name: station.name,
        stationClass: station.stationClass,
        coordinates: station.coordinates,
        distance: this.calculateDistance(player.coordinates, station.coordinates)
      },
      message: `${station.name} is within docking range`
    };
  }

  private async findNearestStationInRange(playerCoords: Coordinates3D): Promise<CelestialBody | null> {
    // Get current system
    const systemX = Math.floor(playerCoords.x);
    const systemY = Math.floor(playerCoords.y);
    const systemZ = Math.floor(playerCoords.z);
    const systemCoords = `${systemX},${systemY},${systemZ}`;

    const sector = await this.db.collection('sectors').findOne({ coordinates: systemCoords });
    if (!sector || !sector.staticObjects) return null;

    const checkInRange = isInDockingRange(playerCoords);
    const stations = sector.staticObjects.filter((obj: any) =>
      obj.type === 'station' && checkInRange(obj.coordinates)
    );

    return stations.length > 0 ? stations[0] : null;
  }

  private async findStationById(stationId: string): Promise<CelestialBody | null> {
    const sectors = await this.db.collection('sectors').find({}).toArray();

    for (const sector of sectors) {
      if (!sector.staticObjects) continue;

      const station = sector.staticObjects.find((obj: any) =>
        obj.type === 'station' && obj.id === stationId
      );

      if (station) return station;
    }

    return null;
  }

  private calculateDistance(from: Coordinates3D, to: Coordinates3D): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  async buyFromStation(playerId: string, itemId: string, quantity: number) {
    const player = await this.db.collection('players').findOne({ id: playerId });
    if (!player) throw new Error('Player not found');

    if (!player.dockedAt) {
      throw new Error('You must be docked at a station to trade');
    }

    const station = await this.findStationById(player.dockedAt);
    if (!station) throw new Error('Docked station not found');

    // Check if station has this item
    const stationItem = station.inventory?.find((inv: StationInventory) => inv.itemId === itemId);
    if (!stationItem) {
      throw new Error('Station does not have this item in stock');
    }

    if (stationItem.quantity < quantity) {
      throw new Error(`Station only has ${stationItem.quantity} ${itemId} in stock`);
    }

    const item = getItemById(itemId);
    if (!item) throw new Error('Invalid item ID');

    const totalCost = stationItem.sellPrice * quantity;
    const totalWeight = item.weight * quantity;

    // Check player can afford it
    if (player.credits < totalCost) {
      throw new Error(`Insufficient credits. Need ${totalCost}, have ${player.credits}`);
    }

    // Check capacity constraints based on item type
    if (itemId === 'fuel') {
      // Check fuel tank capacity
      const currentFuel = player.ship.fuel || 0;
      const maxFuel = player.ship.maxFuel || 100;
      if (currentFuel + quantity > maxFuel) {
        throw new Error(`Insufficient fuel tank capacity. Can only add ${maxFuel - currentFuel} fuel, trying to add ${quantity}`);
      }
    } else if (itemId === 'probe') {
      // Probes don't take cargo space and have no limit
      // (Could add a max probe limit here if desired)
    } else {
      // Check cargo space for regular items
      const currentCargoWeight = player.ship.cargo?.reduce((total: number, cargo: any) => {
        const cargoItem = getItemById(cargo.itemId);
        return total + (cargoItem ? cargoItem.weight * cargo.quantity : 0);
      }, 0) || 0;

      if (currentCargoWeight + totalWeight > player.ship.maxCargo) {
        throw new Error(`Insufficient cargo space. Need ${totalWeight} units, have ${player.ship.maxCargo - currentCargoWeight} available`);
      }
    }

    // Perform the transaction
    // Handle special items (fuel, probes) vs regular cargo
    let updateOperation: any = {
      $inc: { credits: -totalCost },
      $set: { lastActivity: new Date() }
    };

    if (itemId === 'fuel') {
      // Fuel goes directly to ship fuel tank
      updateOperation.$inc['ship.fuel'] = quantity;
    } else if (itemId === 'probe') {
      // Probes go to ship probe counter
      updateOperation.$inc['ship.probes'] = quantity;
    } else {
      // Regular items go to cargo hold
      updateOperation.$push = {
        'ship.cargo': {
          itemId,
          quantity,
          purchasePrice: stationItem.sellPrice
        }
      };
    }

    await this.db.collection('players').updateOne(
      { id: playerId },
      updateOperation
    );

    // Update station inventory
    await this.updateStationInventory(station.id, itemId, -quantity, totalCost);

    return {
      success: true,
      message: `Purchased ${quantity}x ${item.name} for ${totalCost} credits`,
      transaction: {
        itemId,
        itemName: item.name,
        quantity,
        unitPrice: stationItem.sellPrice,
        totalCost,
        playerCreditsRemaining: player.credits - totalCost
      }
    };
  }

  async sellToStation(playerId: string, itemId: string, quantity: number) {
    const player = await this.db.collection('players').findOne({ id: playerId });
    if (!player) throw new Error('Player not found');

    if (!player.dockedAt) {
      throw new Error('You must be docked at a station to trade');
    }

    const station = await this.findStationById(player.dockedAt);
    if (!station) throw new Error('Docked station not found');

    // Check if player has this item
    const playerCargo = player.ship.cargo?.find((cargo: CargoItem) => cargo.itemId === itemId);
    if (!playerCargo) {
      throw new Error('You do not have this item in your cargo');
    }

    if (playerCargo.quantity < quantity) {
      throw new Error(`You only have ${playerCargo.quantity} ${itemId} in cargo`);
    }

    const item = getItemById(itemId);
    if (!item) throw new Error('Invalid item ID');

    // Check if station buys this item (has it in inventory)
    const stationItem = station.inventory?.find((inv: StationInventory) => inv.itemId === itemId);
    if (!stationItem) {
      throw new Error('Station does not buy this type of item');
    }

    const totalValue = stationItem.buyPrice * quantity;

    // Check if station has enough credits
    if ((station.credits || 0) < totalValue) {
      throw new Error(`Station cannot afford this transaction. Station has ${station.credits || 0} credits, needs ${totalValue}`);
    }

    // Perform the transaction
    // Update player cargo and credits
    if (playerCargo.quantity === quantity) {
      // Remove item entirely
      await this.db.collection('players').updateOne(
        { id: playerId },
        {
          $inc: { credits: totalValue },
          $pull: { 'ship.cargo': { itemId } },
          $set: { lastActivity: new Date() }
        }
      );
    } else {
      // Reduce quantity
      await this.db.collection('players').updateOne(
        { id: playerId, 'ship.cargo.itemId': itemId },
        {
          $inc: {
            credits: totalValue,
            'ship.cargo.$.quantity': -quantity
          },
          $set: { lastActivity: new Date() }
        }
      );
    }

    // Update station inventory
    await this.updateStationInventory(station.id, itemId, quantity, -totalValue);

    return {
      success: true,
      message: `Sold ${quantity}x ${item.name} for ${totalValue} credits`,
      transaction: {
        itemId,
        itemName: item.name,
        quantity,
        unitPrice: stationItem.buyPrice,
        totalValue,
        playerCreditsRemaining: player.credits + totalValue
      }
    };
  }

  private async updateStationInventory(stationId: string, itemId: string, quantityChange: number, creditsChange: number) {
    const sectors = await this.db.collection('sectors').find({}).toArray();

    for (const sector of sectors) {
      if (!sector.staticObjects) continue;

      const station = sector.staticObjects.find((obj: any) => obj.id === stationId);
      if (!station) continue;

      // Update item quantity
      const inventoryItem = station.inventory?.find((inv: any) => inv.itemId === itemId);
      if (inventoryItem) {
        inventoryItem.quantity += quantityChange;

        // Remove item if quantity reaches 0
        if (inventoryItem.quantity <= 0) {
          station.inventory = station.inventory.filter((inv: any) => inv.itemId !== itemId);
        }
      } else if (quantityChange > 0) {
        // Add new item to inventory (when selling to station)
        const item = getItemById(itemId);
        if (item && station.inventory) {
          station.inventory.push({
            itemId,
            quantity: quantityChange,
            buyPrice: Math.floor(item.basePrice * 0.8), // Station buys at 80% of base
            sellPrice: Math.floor(item.basePrice * 1.2)  // Station sells at 120% of base
          });
        }
      }

      // Update station credits
      if (station.credits !== undefined) {
        station.credits += creditsChange;
      }

      // Save changes
      await this.db.collection('sectors').updateOne(
        { _id: sector._id },
        { $set: { staticObjects: sector.staticObjects } }
      );
      return;
    }

    throw new Error(`Station ${stationId} not found`);
  }
}