import express from 'express';
import dotenv from 'dotenv';
import {
  spawnMinerNPC,
  spawnMultipleMinerNPCs,
  getActiveNPCs,
  getNPCStats,
  cleanupCompletedNPCs,
  stopAllNPCs
} from './services/npcManager.js';

dotenv.config();

const app = express();
const PORT = process.env.NPC_SERVICE_PORT || 3002;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'npc-service' });
});

// Spawn a single miner NPC
app.post('/npcs/spawn/miner', async (req, res) => {
  try {
    const { name, maxOperations, tickInterval, spawnLocation } = req.body;

    const npc = await spawnMinerNPC({
      name,
      maxOperations: maxOperations || 100,
      tickInterval: tickInterval || 5000,
      spawnLocation
    });

    res.json({
      success: true,
      npc,
      message: `Miner NPC ${npc.name} spawned successfully`
    });
  } catch (error: any) {
    console.error('Error spawning miner NPC:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to spawn NPC'
    });
  }
});

// Spawn multiple miner NPCs
app.post('/npcs/spawn/miners', async (req, res) => {
  try {
    const { count = 1, maxOperations, tickInterval, spawnLocation } = req.body;

    if (count < 1 || count > 50) {
      return res.status(400).json({
        success: false,
        error: 'Count must be between 1 and 50'
      });
    }

    const npcs = await spawnMultipleMinerNPCs(count, {
      maxOperations: maxOperations || 100,
      tickInterval: tickInterval || 5000,
      spawnLocation
    });

    res.json({
      success: true,
      npcs,
      message: `${count} Miner NPCs spawned successfully`
    });
  } catch (error: any) {
    console.error('Error spawning multiple miner NPCs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to spawn NPCs'
    });
  }
});

// Get active NPCs
app.get('/npcs/active', (req, res) => {
  const npcs = getActiveNPCs();
  res.json({
    success: true,
    count: npcs.length,
    npcs
  });
});

// Get NPC statistics
app.get('/npcs/stats', (req, res) => {
  const stats = getNPCStats();
  res.json({
    success: true,
    stats
  });
});

// Clean up completed NPCs
app.post('/npcs/cleanup', (req, res) => {
  const cleaned = cleanupCompletedNPCs();
  res.json({
    success: true,
    cleaned,
    message: `Cleaned up ${cleaned} completed NPCs`
  });
});

// Stop all NPCs
app.post('/npcs/stop-all', async (req, res) => {
  try {
    await stopAllNPCs();
    res.json({
      success: true,
      message: 'All NPCs stopped'
    });
  } catch (error: any) {
    console.error('Error stopping NPCs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to stop NPCs'
    });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down NPC service...');
  await stopAllNPCs();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down NPC service...');
  await stopAllNPCs();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`NPC Service running on port ${PORT}`);
  console.log(`API Base: ${process.env.API_BASE || 'http://api:3000/api'}`);
});