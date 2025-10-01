import fetch from 'node-fetch';
import { CelestialBody, Coordinates3D, CreatePlayerResponse, PlayerStatusResponse, MovementResult, ProbeResult, Probe, MiningResult } from '@stellarburn/shared';

const API_BASE = process.env.API_BASE || 'http://localhost:3000/api';
const NPC_SERVICE_BASE = process.env.NPC_SERVICE_BASE || 'http://localhost:3002';

export async function testConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE.replace('/api', '')}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function createPlayer(name: string): Promise<CreatePlayerResponse> {
  const response = await fetch(`${API_BASE}/player/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  
  if (!response.ok) {
    const error: any = await response.json();
    throw new Error(error.error || 'Failed to create player');
  }
  
  return await response.json() as CreatePlayerResponse;
}

export async function getPlayerStatus(playerId: string): Promise<PlayerStatusResponse> {
  try {
    const url = `${API_BASE}/player/${playerId}/status`;
    const response = await fetch(url);

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to get player status (${response.status})`);
    }

    return await response.json() as PlayerStatusResponse;
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to API server. Make sure the API is running.');
    } else if (error.code === 'ENOTFOUND') {
      throw new Error('API server not found. Check your connection.');
    }
    throw new Error(error.message || 'Network error occurred');
  }
}

export async function movePlayer(playerId: string, direction: string): Promise<MovementResult> {
  try {
    const response = await fetch(`${API_BASE}/player/${playerId}/move/${direction}`, {
      method: 'POST'
    });

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to move player (${response.status})`);
    }

    return await response.json() as MovementResult;
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to API server. Make sure the API is running.');
    }
    throw new Error(error.message || 'Network error during movement');
  }
}

export async function jumpPlayer(playerId: string, direction: string) {
  const response = await fetch(`${API_BASE}/player/${playerId}/jump/${direction}`, {
    method: 'POST'
  });
  
  if (!response.ok) {
    const error: any = await response.json();
    throw new Error(error.error || 'Failed to jump');
  }
  
  return await response.json();
}

// Simple scan endpoints - the API handles the logic internally
export async function scanArea(playerId: string) {
  const response = await fetch(`${API_BASE}/player/${playerId}/scan`);
  
  if (!response.ok) {
    const error: any = await response.json();
    throw new Error(error.error || 'Failed to scan area');
  }
  
  return await response.json();
}

export async function systemScan(playerId: string) {
  const response = await fetch(`${API_BASE}/player/${playerId}/system-scan`);
  
  if (!response.ok) {
    const error: any = await response.json();
    throw new Error(error.error || 'Failed to scan system');
  }
  
  return await response.json();
}

export async function plotCourse(playerId: string, from: string, to: string) {
  const response = await fetch(`${API_BASE}/navigation/plot/${playerId}/${from}/${to}`);
  
  if (!response.ok) {
    const error: any = await response.json();
    throw new Error(error.error || 'Failed to plot course');
  }
  
  return await response.json();
}

export async function autopilot(playerId: string, path: any[]) {
  // Execute autopilot at CLI level by making individual move/jump calls
  if (path.length === 0) {
    return { success: true, completed: true, message: 'Already at destination' };
  }

  const step = path[0];
  const remainingSteps = path.slice(1);

  try {
    let result;
    let actualAction = step.type; // Track what we actually did

    if (step.type === 'move') {
      try {
        result = await movePlayer(playerId, step.direction);
      } catch (error: any) {
        // If move fails because it would exit system boundary, try jumping instead
        if (error.message?.includes('would exit system boundary')) {
          console.log(`Auto-converting move ${step.direction} to jump due to system boundary`);
          result = await jumpPlayer(playerId, step.direction);
          actualAction = 'jump'; // Update what we actually did
        } else if (error.message?.includes('Cannot move into')) {
          // If move fails due to collision with star/planet, this indicates the navigation
          // system didn't account for obstacles. For now, fail gracefully with a helpful message.
          throw new Error('Navigation failed: Path blocked by celestial object. The navigation system needs pathfinding improvements to route around obstacles.');
        } else {
          throw error;
        }
      }
    } else if (step.type === 'jump') {
      result = await jumpPlayer(playerId, step.direction);
    } else {
      throw new Error(`Unknown step type: ${step.type}`);
    }

    // Check if we've completed the path
    const completed = remainingSteps.length === 0;

    return {
      success: true,
      completed,
      message: completed ? 'Destination reached!' : `${actualAction === 'move' ? 'Moved' : 'Jumped'} ${step.direction}`,
      remainingSteps,
      stepResult: result
    };
  } catch (error: any) {
    throw new Error(`Autopilot step failed: ${error.message}`);
  }
}

// Database/Knowledge system functions

export async function getKnownSystems(playerId: string) {
  try {
    const response = await fetch(`${API_BASE}/player/${playerId}/database`);

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to get known systems (${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to API server. Make sure the API is running.');
    }
    throw new Error(error.message || 'Network error during database query');
  }
}

export async function getAllKnownSystems(playerId: string) {
  try {
    const response = await fetch(`${API_BASE}/player/${playerId}/database/all`);

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to get all known systems (${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to API server. Make sure the API is running.');
    }
    throw new Error(error.message || 'Network error during database query');
  }
}

export async function getSystemDetails(playerId: string, coordinates: string) {
  try {
    const response = await fetch(`${API_BASE}/player/${playerId}/database/system/${coordinates}`);

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to get system details (${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to API server. Make sure the API is running.');
    }
    throw new Error(error.message || 'Network error during system lookup');
  }
}

export async function launchProbe(playerId: string, direction: string): Promise<ProbeResult> {
  try {
    const response = await fetch(`${API_BASE}/player/${playerId}/probe/${direction}`, {
      method: 'POST'
    });

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to launch probe (${response.status})`);
    }

    return await response.json() as ProbeResult;
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to API server. Make sure the API is running.');
    }
    throw new Error(error.message || 'Network error during probe launch');
  }
}

export async function getActiveProbes(playerId: string): Promise<Probe[]> {
  try {
    const response = await fetch(`${API_BASE}/player/${playerId}/probes`);

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to get probes (${response.status})`);
    }

    return await response.json() as Probe[];
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to API server. Make sure the API is running.');
    }
    throw new Error(error.message || 'Network error during probe query');
  }
}

export async function findNearest(playerId: string, entityType: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/player/${playerId}/nearest/${entityType}`);

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to find nearest ${entityType} (${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to API server. Make sure the API is running.');
    }
    throw new Error(error.message || 'Network error during nearest search');
  }
}

// Station interaction functions
export async function getNearbyStation(playerId: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/station/${playerId}/nearby`);

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to get nearby station (${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to API server. Make sure the API is running.');
    }
    throw new Error(error.message || 'Network error during station query');
  }
}

export async function dockAtStation(playerId: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/station/${playerId}/dock`, {
      method: 'POST'
    });

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to dock (${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to API server. Make sure the API is running.');
    }
    throw new Error(error.message || 'Network error during docking');
  }
}

export async function undockFromStation(playerId: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/station/${playerId}/undock`, {
      method: 'POST'
    });

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to undock (${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to API server. Make sure the API is running.');
    }
    throw new Error(error.message || 'Network error during undocking');
  }
}

export async function getStationInfo(playerId: string, stationId: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/station/${playerId}/info/${stationId}`);

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to get station info (${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to API server. Make sure the API is running.');
    }
    throw new Error(error.message || 'Network error during station info query');
  }
}

export async function buyFromStation(playerId: string, itemId: string, quantity: number): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/station/${playerId}/buy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ itemId, quantity })
    });

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to buy item (${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to API server. Make sure the API is running.');
    }
    throw new Error(error.message || 'Network error during purchase');
  }
}

export async function sellToStation(playerId: string, itemId: string, quantity: number): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/station/${playerId}/sell`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ itemId, quantity })
    });

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to sell item (${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to API server. Make sure the API is running.');
    }
    throw new Error(error.message || 'Network error during sale');
  }
}

// Admin function to reset player resources (for testing)
export async function resetPlayer(playerId: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/player/${playerId}/admin/reset`, {
      method: 'POST'
    });

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to reset player (${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to API server. Make sure the API is running.');
    }
    throw new Error(error.message || 'Network error during reset');
  }
}

// Mining functions
export async function autoMine(playerId: string): Promise<MiningResult> {
  try {
    const response = await fetch(`${API_BASE}/mining/mine/${playerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.message || `Failed to start auto-mining (${response.status})`);
    }
    return await response.json() as MiningResult;

  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to API server. Make sure the API is running.');
    }
    throw new Error(error.message || 'Network error during auto-mining');
  }
}

export async function startMining(playerId: string, asteroidId: string): Promise<MiningResult> {
  try {
    const response = await fetch(`${API_BASE}/mining/mine/${asteroidId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId })
    });

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.message || `Failed to start mining (${response.status})`);
    }

    return await response.json() as MiningResult;
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to API server. Make sure the API is running.');
    }
    throw new Error(error.message || 'Network error during mining');
  }
}

export async function getMiningStatus(playerId: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/mining/status/${playerId}`);

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.message || `Failed to get mining status (${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to API server. Make sure the API is running.');
    }
    throw new Error(error.message || 'Network error during mining status check');
  }
}

export async function cancelMining(playerId: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/mining/cancel/${playerId}`, {
      method: 'POST'
    });

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.message || `Failed to cancel mining (${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to API server. Make sure the API is running.');
    }
    throw new Error(error.message || 'Network error during mining cancellation');
  }
}

// NPC Management functions
export async function spawnMinerNPC(name?: string, maxOperations?: number): Promise<any> {
  try {
    const response = await fetch(`${NPC_SERVICE_BASE}/npcs/spawn/miner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, maxOperations })
    });

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to spawn NPC (${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to NPC service. Make sure the NPC service is running.');
    }
    throw new Error(error.message || 'Network error during NPC spawn');
  }
}

export async function spawnMultipleMiners(count: number, maxOperations?: number): Promise<any> {
  try {
    const response = await fetch(`${NPC_SERVICE_BASE}/npcs/spawn/miners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count, maxOperations })
    });

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to spawn NPCs (${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to NPC service. Make sure the NPC service is running.');
    }
    throw new Error(error.message || 'Network error during NPCs spawn');
  }
}

export async function getActiveNPCs(): Promise<any> {
  try {
    const response = await fetch(`${NPC_SERVICE_BASE}/npcs/active`);

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to get active NPCs (${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to NPC service. Make sure the NPC service is running.');
    }
    throw new Error(error.message || 'Network error getting active NPCs');
  }
}

export async function getNPCStats(): Promise<any> {
  try {
    const response = await fetch(`${NPC_SERVICE_BASE}/npcs/stats`);

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to get NPC stats (${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to NPC service. Make sure the NPC service is running.');
    }
    throw new Error(error.message || 'Network error getting NPC stats');
  }
}

export async function cleanupCompletedNPCs(): Promise<any> {
  try {
    const response = await fetch(`${NPC_SERVICE_BASE}/npcs/cleanup`, {
      method: 'POST'
    });

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to cleanup NPCs (${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to NPC service. Make sure the NPC service is running.');
    }
    throw new Error(error.message || 'Network error during NPC cleanup');
  }
}

export async function stopAllNPCs(): Promise<any> {
  try {
    const response = await fetch(`${NPC_SERVICE_BASE}/npcs/stop-all`, {
      method: 'POST'
    });

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to stop NPCs (${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to NPC service. Make sure the NPC service is running.');
    }
    throw new Error(error.message || 'Network error stopping NPCs');
  }
}