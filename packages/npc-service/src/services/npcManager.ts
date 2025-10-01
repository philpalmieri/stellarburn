import { NPC, Coordinates3D } from '@stellarburn/shared';
import { runMinerNPC } from '../npcs/minerNPC.js';

// Active NPC tracking
interface ActiveNPC {
  id: string;
  name: string;
  type: 'miner' | 'trader' | 'pirate' | 'explorer';
  startTime: Date;
  status: 'running' | 'completed' | 'error';
  promise: Promise<void>;
}

// In-memory store for active NPCs (could be replaced with Redis)
const activeNPCs = new Map<string, ActiveNPC>();

// NPC spawning functions
export const spawnMinerNPC = async (config: {
  name?: string;
  spawnLocation?: Coordinates3D;
  maxOperations?: number;
  tickInterval?: number;
}): Promise<{ id: string; name: string }> => {
  const npcName = config.name || `Miner-${Date.now()}`;

  // Create the player first to get the real ID
  const playerResponse = await import('../services/apiClient.js').then(m => m.apiClient.createPlayer(npcName));
  const realNpcId = playerResponse.player.id;

  const npcPromise = runMinerNPC({
    name: npcName,
    playerId: realNpcId, // Pass the real player ID
    spawnLocation: config.spawnLocation,
    maxOperations: config.maxOperations,
    tickInterval: config.tickInterval
  });

  const activeNPC: ActiveNPC = {
    id: realNpcId, // Use the real API player ID
    name: npcName,
    type: 'miner',
    startTime: new Date(),
    status: 'running',
    promise: npcPromise
  };

  // Update status when complete
  npcPromise
    .then(() => {
      const npc = activeNPCs.get(realNpcId);
      if (npc) npc.status = 'completed';
    })
    .catch((error) => {
      console.error(`NPC ${npcName} error:`, error);
      const npc = activeNPCs.get(realNpcId);
      if (npc) npc.status = 'error';
    });

  activeNPCs.set(realNpcId, activeNPC);

  return { id: realNpcId, name: npcName };
};

// Spawn multiple NPCs
export const spawnMultipleMinerNPCs = async (
  count: number,
  config?: {
    maxOperations?: number;
    tickInterval?: number;
    spawnLocation?: Coordinates3D;
  }
): Promise<Array<{ id: string; name: string }>> => {
  const spawned = [];

  for (let i = 0; i < count; i++) {
    // Stagger spawns slightly to avoid conflicts
    if (i > 0) await new Promise(resolve => setTimeout(resolve, 1000));

    const npc = await spawnMinerNPC({
      name: `Miner-${i + 1}`,
      ...config
    });
    spawned.push(npc);
  }

  return spawned;
};

// Get active NPCs status
export const getActiveNPCs = (): Array<{
  id: string;
  name: string;
  type: string;
  status: string;
  uptime: number;
}> => {
  const now = new Date();
  return Array.from(activeNPCs.values()).map(npc => ({
    id: npc.id,
    name: npc.name,
    type: npc.type,
    status: npc.status,
    uptime: Math.floor((now.getTime() - npc.startTime.getTime()) / 1000)
  }));
};

// Get NPC count by status
export const getNPCStats = () => {
  const stats = {
    total: activeNPCs.size,
    running: 0,
    completed: 0,
    error: 0,
    byType: {
      miner: 0,
      trader: 0,
      pirate: 0,
      explorer: 0
    }
  };

  for (const npc of activeNPCs.values()) {
    stats[npc.status]++;
    stats.byType[npc.type]++;
  }

  return stats;
};

// Clean up completed NPCs
export const cleanupCompletedNPCs = (): number => {
  let cleaned = 0;
  for (const [id, npc] of activeNPCs.entries()) {
    if (npc.status === 'completed' || npc.status === 'error') {
      activeNPCs.delete(id);
      cleaned++;
    }
  }
  return cleaned;
};

// Stop all NPCs (graceful shutdown)
export const stopAllNPCs = async (): Promise<void> => {
  console.log('Stopping all NPCs...');
  // In a real implementation, we'd signal NPCs to stop gracefully
  // For now, we just clear the tracking
  activeNPCs.clear();
};