#!/usr/bin/env tsx

import { MongoClient } from 'mongodb';
import { seedAllStationInventories } from '../services/stationInventoryService.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://stellarburn:stellarburn_dev@mongodb:27017/stellarburn?authSource=admin';

async function seedStationInventory() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🚀 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('stellarburn');

    // Check if there are any stations
    const sectors = await db.collection('systems').find({}).toArray();
    let totalStations = 0;

    for (const sector of sectors) {
      if (sector.staticObjects) {
        totalStations += sector.staticObjects.filter((obj: any) => obj.type === 'station').length;
      }
    }

    if (totalStations === 0) {
      console.log('❌ No stations found in the universe. Please generate the universe first.');
      return;
    }

    console.log(`📊 Found ${totalStations} stations in the universe`);

    // Seed all stations using functional approach
    await seedAllStationInventories(db);

    console.log('🎉 Station inventory seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding station inventory:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the seeding if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedStationInventory();
}

export { seedStationInventory };