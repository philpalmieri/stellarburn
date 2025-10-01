import fetch from 'node-fetch';
import {
  CreatePlayerResponse,
  PlayerStatusResponse,
  MovementResult,
  ProbeResult,
  MiningResult,
  Coordinates3D
} from '@stellarburn/shared';

const API_BASE = process.env.API_BASE || 'http://api:3000/api';

// Reusable API client functions (pure FP style)
export const apiClient = {
  // Player operations
  createPlayer: async (name: string): Promise<CreatePlayerResponse> => {
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
  },

  getPlayerStatus: async (playerId: string): Promise<PlayerStatusResponse> => {
    const response = await fetch(`${API_BASE}/player/${playerId}/status`);

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to get player status (${response.status})`);
    }

    return await response.json() as PlayerStatusResponse;
  },

  // Movement operations
  movePlayer: async (playerId: string, direction: string): Promise<MovementResult> => {
    const response = await fetch(`${API_BASE}/player/${playerId}/move/${direction}`, {
      method: 'POST'
    });

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to move player (${response.status})`);
    }

    return await response.json() as MovementResult;
  },

  jumpPlayer: async (playerId: string, direction: string) => {
    const response = await fetch(`${API_BASE}/player/${playerId}/jump/${direction}`, {
      method: 'POST'
    });

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || 'Failed to jump');
    }

    return await response.json();
  },

  // Scanning operations
  scanArea: async (playerId: string) => {
    const response = await fetch(`${API_BASE}/player/${playerId}/scan`);

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || 'Failed to scan area');
    }

    return await response.json();
  },

  systemScan: async (playerId: string) => {
    const response = await fetch(`${API_BASE}/player/${playerId}/system-scan`);

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || 'Failed to scan system');
    }

    return await response.json();
  },

  // Navigation operations
  plotCourse: async (playerId: string, from: string, to: string) => {
    const response = await fetch(`${API_BASE}/navigation/plot/${playerId}/${from}/${to}`);

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || 'Failed to plot course');
    }

    return await response.json();
  },

  // Mining operations
  autoMine: async (playerId: string): Promise<MiningResult> => {
    const response = await fetch(`${API_BASE}/mining/mine/${playerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.message || `Failed to start auto-mining (${response.status})`);
    }
    return await response.json() as MiningResult;
  },

  getMiningStatus: async (playerId: string) => {
    const response = await fetch(`${API_BASE}/mining/status/${playerId}`);

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.message || `Failed to get mining status (${response.status})`);
    }

    return await response.json();
  },

  // Station operations
  getNearbyStation: async (playerId: string) => {
    const response = await fetch(`${API_BASE}/station/${playerId}/nearby`);

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to get nearby station (${response.status})`);
    }

    return await response.json();
  },

  dockAtStation: async (playerId: string) => {
    const response = await fetch(`${API_BASE}/station/${playerId}/dock`, {
      method: 'POST'
    });

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to dock (${response.status})`);
    }

    return await response.json();
  },

  undockFromStation: async (playerId: string) => {
    const response = await fetch(`${API_BASE}/station/${playerId}/undock`, {
      method: 'POST'
    });

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to undock (${response.status})`);
    }

    return await response.json();
  },

  getStationInfo: async (playerId: string, stationId: string) => {
    const response = await fetch(`${API_BASE}/station/${playerId}/info/${stationId}`);

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to get station info (${response.status})`);
    }

    return await response.json();
  },

  sellToStation: async (playerId: string, itemId: string, quantity: number) => {
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
  },

  buyFromStation: async (playerId: string, itemId: string, quantity: number) => {
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
  },

  // Database/Knowledge operations
  getKnownSystems: async (playerId: string) => {
    const response = await fetch(`${API_BASE}/player/${playerId}/database`);

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to get known systems (${response.status})`);
    }

    return await response.json();
  },

  // Probe operations
  launchProbe: async (playerId: string, direction: string): Promise<ProbeResult> => {
    const response = await fetch(`${API_BASE}/player/${playerId}/probe/${direction}`, {
      method: 'POST'
    });

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to launch probe (${response.status})`);
    }

    return await response.json() as ProbeResult;
  },

  findNearest: async (playerId: string, entityType: string) => {
    const response = await fetch(`${API_BASE}/player/${playerId}/nearest/${entityType}`);

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `Failed to find nearest ${entityType} (${response.status})`);
    }

    return await response.json();
  }
};

// Utility functions for NPC-specific operations
export const wait = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export const calculateDistance = (from: Coordinates3D, to: Coordinates3D): number =>
  Math.sqrt(
    Math.pow(to.x - from.x, 2) +
    Math.pow(to.y - from.y, 2) +
    Math.pow(to.z - from.z, 2)
  );

export const getDirectionTo = (from: Coordinates3D, to: Coordinates3D): string => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const absDz = Math.abs(dz);

  if (absDx >= absDy && absDx >= absDz) {
    return dx > 0 ? 'east' : 'west';
  } else if (absDy >= absDx && absDy >= absDz) {
    return dy > 0 ? 'north' : 'south';
  } else {
    return dz > 0 ? 'up' : 'down';
  }
};