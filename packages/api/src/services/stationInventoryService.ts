import { StationInventory, TradeItem } from '@stellarburn/shared';
import { TRADE_ITEMS, getWeightedRandomItems, getItemById } from '../data/tradeItems.js';

export class StationInventoryService {
  constructor(private db: any) {}

  // Generate initial inventory for a station based on its class
  generateStationInventory(stationClass: 'A' | 'B' | 'C' | 'D' | 'E'): StationInventory[] {
    const inventory: StationInventory[] = [];

    // Always add fuel and probes with unlimited quantity (999)
    const fuelItem = getItemById('fuel');
    const probeItem = getItemById('probe');

    if (fuelItem) {
      const { buyPrice, sellPrice } = this.generatePrices(fuelItem, stationClass);
      inventory.push({
        itemId: 'fuel',
        quantity: 999, // Unlimited
        buyPrice,
        sellPrice
      });
    }

    if (probeItem) {
      const { buyPrice, sellPrice } = this.generatePrices(probeItem, stationClass);
      inventory.push({
        itemId: 'probe',
        quantity: 999, // Unlimited
        buyPrice,
        sellPrice
      });
    }

    // Determine how many different items this station should have (in addition to fuel/probes)
    const itemCounts = {
      'A': { min: 12, max: 20 },  // Class A: Luxury stations with many items
      'B': { min: 8, max: 15 },   // Class B: Major trade hubs
      'C': { min: 5, max: 12 },   // Class C: Standard stations
      'D': { min: 3, max: 8 },    // Class D: Small outposts
      'E': { min: 1, max: 5 }     // Class E: Basic supply stations
    };

    const { min, max } = itemCounts[stationClass];
    const itemCount = Math.floor(Math.random() * (max - min + 1)) + min;

    // Get weighted random items based on station class (excluding fuel and probes)
    const selectedItems = getWeightedRandomItems(itemCount, stationClass);

    // Generate inventory entries for each item
    selectedItems.forEach(item => {
      // Skip fuel and probe since we already added them
      if (item.id === 'fuel' || item.id === 'probe') return;

      const quantity = this.generateQuantity(item, stationClass);
      const { buyPrice, sellPrice } = this.generatePrices(item, stationClass);

      inventory.push({
        itemId: item.id,
        quantity,
        buyPrice,
        sellPrice
      });
    });

    return inventory;
  }

  // Generate quantity based on item rarity and station class
  private generateQuantity(item: TradeItem, stationClass: 'A' | 'B' | 'C' | 'D' | 'E'): number {
    const baseQuantities = {
      'common': { min: 10, max: 50 },
      'uncommon': { min: 5, max: 25 },
      'rare': { min: 1, max: 10 },
      'legendary': { min: 1, max: 3 }
    };

    const classMultipliers = {
      'A': 1.5,  // Luxury stations have more stock
      'B': 1.3,  // Major hubs
      'C': 1.0,  // Standard
      'D': 0.7,  // Small outposts
      'E': 0.5   // Basic stations
    };

    const { min, max } = baseQuantities[item.rarity];
    const multiplier = classMultipliers[stationClass];

    const adjustedMin = Math.max(1, Math.floor(min * multiplier));
    const adjustedMax = Math.max(adjustedMin, Math.floor(max * multiplier));

    return Math.floor(Math.random() * (adjustedMax - adjustedMin + 1)) + adjustedMin;
  }

  // Generate buy/sell prices with market fluctuation
  private generatePrices(item: TradeItem, stationClass: 'A' | 'B' | 'C' | 'D' | 'E'): { buyPrice: number; sellPrice: number } {
    // Station class affects profit margins
    const profitMargins = {
      'A': 0.25,  // Luxury stations: 25% markup
      'B': 0.20,  // Major hubs: 20% markup
      'C': 0.15,  // Standard: 15% markup
      'D': 0.18,  // Small outposts: 18% markup (higher due to scarcity)
      'E': 0.22   // Basic stations: 22% markup (highest due to remote location)
    };

    // Market fluctuation: ±10% from base price
    const fluctuation = (Math.random() - 0.5) * 0.2; // -0.1 to +0.1
    const marketPrice = Math.floor(item.basePrice * (1 + fluctuation));

    const margin = profitMargins[stationClass];

    // Station buys at below market price, sells at above market price
    const buyPrice = Math.floor(marketPrice * (1 - margin));
    const sellPrice = Math.floor(marketPrice * (1 + margin));

    return { buyPrice, sellPrice };
  }

  // Seed all existing stations with inventory
  async seedAllStationInventories(): Promise<void> {
    console.log('🏪 Seeding station inventories...');

    const sectors = await this.db.collection('sectors').find({}).toArray();
    let stationCount = 0;
    let totalItems = 0;

    for (const sector of sectors) {
      if (!sector.staticObjects) continue;

      const stations = sector.staticObjects.filter((obj: any) => obj.type === 'station');

      for (const station of stations) {
        if (!station.stationClass) {
          console.log(`⚠️  Station ${station.id} has no stationClass, skipping inventory generation`);
          continue;
        }

        const inventory = this.generateStationInventory(station.stationClass);

        // Add inventory to the station object
        station.inventory = inventory;
        station.credits = this.generateStationCredits(station.stationClass);

        totalItems += inventory.length;
        stationCount++;
      }

      // Update the sector with the modified station data
      await this.db.collection('sectors').updateOne(
        { _id: sector._id },
        { $set: { staticObjects: sector.staticObjects } }
      );
    }

    console.log(`✅ Seeded ${stationCount} stations with ${totalItems} total inventory items`);
  }

  // Generate initial credits for stations
  private generateStationCredits(stationClass: 'A' | 'B' | 'C' | 'D' | 'E'): number {
    const creditRanges = {
      'A': { min: 50000, max: 200000 },  // Luxury stations have lots of money
      'B': { min: 30000, max: 100000 },  // Major hubs
      'C': { min: 15000, max: 50000 },   // Standard stations
      'D': { min: 5000, max: 25000 },    // Small outposts
      'E': { min: 1000, max: 10000 }     // Basic stations
    };

    const { min, max } = creditRanges[stationClass];
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Get all available trade items (for reference)
  getAllTradeItems(): TradeItem[] {
    return TRADE_ITEMS;
  }

  // Update station inventory after trade
  async updateStationInventory(stationId: string, itemId: string, quantityChange: number, creditsChange: number): Promise<void> {
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