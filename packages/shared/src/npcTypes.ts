import { Coordinates3D, Player } from './types.js';

// NPC base type extending Player with additional fields
export interface NPC extends Player {
  npcType: 'miner' | 'trader' | 'pirate' | 'explorer';
  behaviorState: NPCBehaviorState;
  lifecycle: NPCLifecycle;
  memory: NPCMemory;
  isNPC: true; // Type discriminator
}

// NPC behavior state for tracking current activity
export interface NPCBehaviorState {
  currentGoal: NPCGoal;
  currentAction: NPCAction;
  targetLocation?: Coordinates3D;
  targetEntityId?: string; // Station, asteroid, etc.
  actionProgress: number; // 0-1
  lastUpdate: Date;
}

// NPC goals (high-level objectives)
export type NPCGoal =
  | { type: 'idle' }
  | { type: 'find-station' }
  | { type: 'find-asteroid'; resourceType?: string }
  | { type: 'mine-resources'; asteroidId: string }
  | { type: 'trade-at-station'; stationId: string }
  | { type: 'explore-system'; systemCoords: Coordinates3D }
  | { type: 'return-to-base'; baseStationId: string };

// NPC actions (low-level activities)
export type NPCAction =
  | { type: 'waiting'; duration: number }
  | { type: 'scanning' }
  | { type: 'navigating'; path: Coordinates3D[] }
  | { type: 'mining'; asteroidId: string; startTime: Date }
  | { type: 'trading'; stationId: string; items: string[] }
  | { type: 'docking'; stationId: string }
  | { type: 'undocking' };

// NPC lifecycle management
export interface NPCLifecycle {
  spawnTime: Date;
  maxOperations: number; // e.g., 100 trades
  completedOperations: number;
  totalCreditsEarned: number;
  totalResourcesMined: number;
  totalDistanceTraveled: number;
  shouldTerminate: boolean;
}

// NPC memory for decision-making
export interface NPCMemory {
  knownStations: Array<{
    id: string;
    coordinates: Coordinates3D;
    lastVisit?: Date;
    buyingPrices: Map<string, number>;
    sellingPrices: Map<string, number>;
  }>;
  knownAsteroids: Array<{
    id: string;
    coordinates: Coordinates3D;
    resourceType: string;
    lastMined?: Date;
    estimatedDepletion: number;
  }>;
  visitedSystems: Set<string>;
  profitableRoutes: Array<{
    fromStation: string;
    toStation: string;
    itemId: string;
    profitMargin: number;
  }>;
}

// Configuration for different NPC types
export interface NPCConfig {
  type: 'miner' | 'trader' | 'pirate' | 'explorer';
  spawnLocation?: Coordinates3D;
  initialCredits: number;
  initialFuel: number;
  initialProbes: number;
  maxOperations: number;
  behaviorParams: NPCBehaviorParams;
}

export interface NPCBehaviorParams {
  riskTolerance: number; // 0-1, affects decision making
  greediness: number; // 0-1, prefer profit over safety
  curiosity: number; // 0-1, tendency to explore
  patience: number; // 0-1, willingness to wait for better opportunities
  scanRadius: number; // How far to scan for opportunities
}

// Factory functions for creating NPCs (FP style)
export const createMinerNPC = (
  id: string,
  name: string,
  config: Partial<NPCConfig> = {}
): NPC => ({
  id,
  name,
  coordinates: config.spawnLocation || { x: 0, y: 0, z: 0 },
  ship: {
    fuel: config.initialFuel || 1000,
    maxFuel: 1000,
    cargo: [],
    maxCargo: 500,
    probes: config.initialProbes || 10,
    probeConfig: {
      maxFuel: 10,
      scanRange: 10,
      moveDelay: 1000
    }
  },
  credits: config.initialCredits || 10000,
  createdAt: new Date(),
  lastActivity: new Date(),
  npcType: 'miner',
  behaviorState: {
    currentGoal: { type: 'idle' },
    currentAction: { type: 'waiting', duration: 0 },
    actionProgress: 0,
    lastUpdate: new Date()
  },
  lifecycle: {
    spawnTime: new Date(),
    maxOperations: config.maxOperations || 100,
    completedOperations: 0,
    totalCreditsEarned: 0,
    totalResourcesMined: 0,
    totalDistanceTraveled: 0,
    shouldTerminate: false
  },
  memory: {
    knownStations: [],
    knownAsteroids: [],
    visitedSystems: new Set(),
    profitableRoutes: []
  },
  isNPC: true
});

// Utility functions for NPC management (pure functions)
export const shouldNPCTerminate = (npc: NPC): boolean =>
  npc.lifecycle.completedOperations >= npc.lifecycle.maxOperations ||
  npc.lifecycle.shouldTerminate ||
  npc.ship.fuel <= 0;

export const updateNPCLifecycle = (
  npc: NPC,
  operation: 'mine' | 'trade',
  credits?: number,
  resources?: number,
  distance?: number
): NPCLifecycle => ({
  ...npc.lifecycle,
  completedOperations: npc.lifecycle.completedOperations + 1,
  totalCreditsEarned: npc.lifecycle.totalCreditsEarned + (credits || 0),
  totalResourcesMined: npc.lifecycle.totalResourcesMined + (resources || 0),
  totalDistanceTraveled: npc.lifecycle.totalDistanceTraveled + (distance || 0),
  shouldTerminate: (npc.lifecycle.completedOperations + 1) >= npc.lifecycle.maxOperations
});

export const updateNPCGoal = (npc: NPC, newGoal: NPCGoal): NPC => ({
  ...npc,
  behaviorState: {
    ...npc.behaviorState,
    currentGoal: newGoal,
    actionProgress: 0,
    lastUpdate: new Date()
  }
});

export const updateNPCAction = (npc: NPC, newAction: NPCAction): NPC => ({
  ...npc,
  behaviorState: {
    ...npc.behaviorState,
    currentAction: newAction,
    actionProgress: 0,
    lastUpdate: new Date()
  }
});