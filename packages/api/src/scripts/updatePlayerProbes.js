#!/usr/bin/env node

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://stellarburn:stellarburn_dev@localhost:27017/stellarburn?authSource=admin';

async function updatePlayerProbes() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();

    const db = client.db('stellarburn');
    const players = db.collection('players');

    // Find all players
    const allPlayers = await players.find({}).toArray();
    console.log(`📊 Found ${allPlayers.length} players to update`);

    // Update all players
    const updateResult = await players.updateMany(
      {}, // Update all players
      {
        $set: {
          'ship.probes': 100,
          'ship.probeConfig': {
            maxFuel: 10,
            scanRange: 0.05,
            moveDelay: 1000
          }
        }
      }
    );

    console.log(`✅ Updated ${updateResult.modifiedCount} players with 100 probes and probe config`);

    // Verify the updates
    const updatedPlayers = await players.find({}).toArray();
    console.log('\n📋 Player Status After Update:');
    updatedPlayers.forEach(player => {
      const probes = player.ship?.probes || 'undefined';
      const hasConfig = player.ship?.probeConfig ? '✅' : '❌';
      console.log(`  ${player.name}: ${probes} probes ${hasConfig}`);
    });

  } catch (error) {
    console.error('❌ Error updating players:', error);
  } finally {
    await client.close();
    console.log('🔌 Database connection closed');
  }
}

updatePlayerProbes();