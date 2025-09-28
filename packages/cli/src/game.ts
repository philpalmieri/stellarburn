import fetch from 'node-fetch';
import { CelestialBody, Coordinates3D, CreatePlayerResponse, PlayerStatusResponse, MovementResult } from '@stellarburn/shared';

const API_BASE = 'http://api:3000/api';

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
  const response = await fetch(`${API_BASE}/player/${playerId}/status`);
  
  if (!response.ok) {
    const error: any = await response.json();
    throw new Error(error.error || 'Failed to get player status');
  }
  
  return await response.json() as PlayerStatusResponse;
}

export async function movePlayer(playerId: string, direction: string): Promise<MovementResult> {
  const response = await fetch(`${API_BASE}/player/${playerId}/move/${direction}`, {
    method: 'POST'
  });
  
  if (!response.ok) {
    const error: any = await response.json();
    throw new Error(error.error || 'Failed to move player');
  }
  
  return await response.json() as MovementResult;
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