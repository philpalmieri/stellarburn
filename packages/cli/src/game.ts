import fetch from 'node-fetch';
import { CelestialBody, Coordinates3D, CreatePlayerResponse, PlayerStatusResponse, MovementResult } from '@stellarburn/shared';

const API_BASE = process.env.API_BASE || 'http://localhost:3000/api';

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
  const response = await fetch(`${API_BASE}/navigation/autopilot/${playerId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path })
  });
  
  if (!response.ok) {
    const error: any = await response.json();
    throw new Error(error.error || 'Autopilot failed');
  }

  return await response.json();
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