#!/usr/bin/env tsx

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://stellarburn:stellarburn_dev@mongodb:27017/stellarburn?authSource=admin';

const STATION_CLASSES = ['A', 'B', 'C', 'D', 'E'] as const;

function assignRandomStationClass(): string {
  // Weighted distribution: fewer A-class stations, more E-class
  const weights = [0.05, 0.15, 0.25, 0.35, 0.20]; // A, B, C, D, E
  const random = Math.random();
  let cumulative = 0;

  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (random <= cumulative) {
      return STATION_CLASSES[i];
    }
  }

  return 'E'; // Fallback
}

async function assignStationClasses() {
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

    console.log('🏪 Assigning station classes...');

    for (const sector of sectors) {
      if (!sector.staticObjects) continue;

      let hasUpdates = false;

      for (const obj of sector.staticObjects) {
        if (obj.type === 'station') {
          totalStations++;

          // Only assign if no class exists
          if (!obj.stationClass) {
            obj.stationClass = assignRandomStationClass();
            obj.credits = Math.floor(Math.random() * 50000) + 10000; // 10k-60k credits
            hasUpdates = true;
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
    console.log(`✅ Assigned classes to ${updatedStations} stations`);
    console.log('🎉 Station class assignment completed successfully!');

  } catch (error) {
    console.error('❌ Error assigning station classes:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the assignment if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  assignStationClasses();
}

export { assignStationClasses };