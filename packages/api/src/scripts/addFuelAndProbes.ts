#!/usr/bin/env tsx

import { MongoClient } from 'mongodb';
import { getItemById } from '@stellarburn/shared';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://stellarburn:stellarburn_dev@mongodb:27017/stellarburn?authSource=admin';

function generatePrices(basePrice: number, stationClass: 'A' | 'B' | 'C' | 'D' | 'E'): { buyPrice: number; sellPrice: number } {
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
  const marketPrice = Math.floor(basePrice * (1 + fluctuation));

  const margin = profitMargins[stationClass];

  // Station buys at below market price, sells at above market price
  const buyPrice = Math.floor(marketPrice * (1 - margin));
  const sellPrice = Math.floor(marketPrice * (1 + margin));

  return { buyPrice, sellPrice };
}

async function addFuelAndProbes() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🚀 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('stellarburn');

    // Get all sectors with stations
    const sectors = await db.collection('sectors').find({}).toArray();
    let totalStations = 0;
    let updatedStations = 0;

    console.log('⛽ Adding fuel and probes to all stations...');

    for (const sector of sectors) {
      if (!sector.staticObjects) continue;

      let hasUpdates = false;

      for (const obj of sector.staticObjects) {
        if (obj.type === 'station' && obj.stationClass && obj.inventory) {
          totalStations++;

          // Check if station already has fuel and probes
          const hasFuel = obj.inventory.some((item: any) => item.itemId === 'fuel');
          const hasProbes = obj.inventory.some((item: any) => item.itemId === 'probe');

          if (!hasFuel) {
            const fuelItem = getItemById('fuel');
            if (fuelItem) {
              const { buyPrice, sellPrice } = generatePrices(fuelItem.basePrice, obj.stationClass);
              obj.inventory.unshift({
                itemId: 'fuel',
                quantity: 999,
                buyPrice,
                sellPrice
              });
              hasUpdates = true;
            }
          }

          if (!hasProbes) {
            const probeItem = getItemById('probe');
            if (probeItem) {
              const { buyPrice, sellPrice } = generatePrices(probeItem.basePrice, obj.stationClass);
              obj.inventory.unshift({
                itemId: 'probe',
                quantity: 999,
                buyPrice,
                sellPrice
              });
              hasUpdates = true;
            }
          }

          if (hasUpdates) {
            updatedStations++;
          }
        }
      }

      // Update the sector if we made changes
      if (hasUpdates) {
        await db.collection('sectors').updateOne(
          { _id: sector._id },
          { $set: { staticObjects: sector.staticObjects } }
        );
      }
    }

    console.log(`📊 Found ${totalStations} total stations`);
    console.log(`✅ Added fuel/probes to ${updatedStations} stations`);
    console.log('🎉 Fuel and probe addition completed successfully!');

  } catch (error) {
    console.error('❌ Error adding fuel and probes:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addFuelAndProbes();
}

export { addFuelAndProbes };