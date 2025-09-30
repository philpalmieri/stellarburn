// 3D Coordinate system
export interface Coordinates3D {
  x: number;
  y: number;
  z: number;
}

// Universe configuration
export interface UniverseConfig {
  size: number; // Universe extends from -size to +size in each dimension
  sparsity: number; // 0-1, how empty space should be
}

// System types for procedural generation
export interface SystemType {
  name: string;
  probability: number;
  minPlanets: number;
  maxPlanets: number;
  hasAsteroidBelt: boolean;
  resourceRichness: number;
  stationProbability: number;
}

// Celestial bodies
export interface CelestialBody {
  id: string;
  type: 'star' | 'planet' | 'asteroid' | 'station';
  coordinates: Coordinates3D;
  size: number; // 0-1, percentage of sector occupied
  name: string;
  resources?: ResourceDeposit[];
  stationClass?: 'A' | 'B' | 'C' | 'D' | 'E'; // For stations only
  stationType?: 'trade' | 'military' | 'shipyard' | 'mining' | 'research'; // Future use
  inventory?: StationInventory[]; // For stations only
  credits?: number; // For stations only
  isHavenStation?: boolean; // Special marker for the center safe sector station
  asteroidType?: AsteroidType; // For asteroids only
  miningProgress?: MiningProgress; // For asteroids only
}

export interface ResourceDeposit {
  type: string;
  quantity: number;
  quality: number; // 0-1
}

// Star system (collection of celestial bodies)
export interface StarSystem {
  id: string;
  coordinates: Coordinates3D;
  systemType: string;
  star: CelestialBody;
  planets: CelestialBody[];
  asteroids: CelestialBody[];
  stations: CelestialBody[];
}

// System document (what we store in MongoDB)
export interface SystemDocument {
  _id?: string;
  coordinates: string; // "x.x,y.y,z.z"
  coord: Coordinates3D; // For indexed queries
  staticObjects: CelestialBody[]; // planets, stations, asteroids
  dynamicObjects: {
    ships: string[]; // player IDs currently here
    probes: string[]; // probe IDs scanning this area
  };
  lastActivity: Date;
  createdAt: Date;
}

// Player management
export interface Player {
  id: string;
  name: string;
  coordinates: Coordinates3D;
  ship: {
    fuel: number;
    maxFuel: number;
    cargo: CargoItem[];
    maxCargo: number; // Max cargo weight capacity
    probes: number;
    probeConfig: ProbeConfig;
  };
  credits: number;
  dockedAt?: string; // Station ID if docked
  createdAt: Date;
  lastActivity: Date;
}

export interface MovementResult {
  success: boolean;
  newCoordinates?: Coordinates3D;
  fuel?: number;
  message: string;
  blocked?: {
    by: string; // 'star', 'planet', etc.
    object: CelestialBody;
  };
}

// Jump movement result with system scan
export interface JumpResult {
  success: boolean;
  newCoordinates?: Coordinates3D;
  fuel?: number;
  message: string;
  systemScan?: {
    systemCoordinates: Coordinates3D;
    objects: CelestialBody[];
    otherPlayers: Array<{
      name: string;
      coordinates: Coordinates3D;
    }>;
  };
}

export interface ScanResult {
  currentSector: {
    coordinates: Coordinates3D;
    objects: CelestialBody[];
    otherPlayers: string[];
  };
  adjacentSectors: {
    [direction: string]: {
      coordinates: Coordinates3D;
      objects: CelestialBody[];
      otherPlayers: string[];
    };
  };
}

// Probe management
export interface Probe {
  id: string;
  playerId: string;
  coordinates: Coordinates3D;
  direction: Coordinates3D;
  fuel: number;
  maxFuel: number;
  launchedAt: Date;
  lastActivity: Date;
  status: 'active' | 'destroyed' | 'recalled';
}

export interface ProbeConfig {
  maxFuel: number; // How many jumps the probe can make
  scanRange: number; // How far the probe can scan
  moveDelay: number; // Milliseconds between moves (for future real-time movement)
}

export interface ProbeResult {
  success: boolean;
  message: string;
  probesRemaining: number;
  probe?: Probe; // The launched probe object
  discoveredSystems: Array<{
    coordinates: Coordinates3D;
    systemScan: {
      systemCoordinates: Coordinates3D;
      objects: CelestialBody[];
      otherPlayers: Array<{
        name: string;
        coordinates: Coordinates3D;
      }>;
    };
  }>;
}

// API Response types
export interface CreatePlayerResponse {
  message: string;
  player: Player;
  spawnLocation: string;
}

export interface PlayerStatusResponse {
  id: string;
  name: string;
  coordinates: Coordinates3D;
  coordinatesString: string;
  fuel: number;
  maxFuel: number;
  credits: number;
  cargoCount: number;
  cargo: CargoItem[];
  probes: number;
  dockedAt?: string; // Station ID if docked
}

// Trade and Station types
export interface TradeItem {
  id: string;
  name: string;
  category: 'fuel' | 'raw_materials' | 'resources' | 'technology' | 'military' | 'luxury' | 'contraband';
  basePrice: number;
  weight: number; // cargo space required
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export interface StationInventory {
  itemId: string;
  quantity: number;
  buyPrice: number;  // Price station buys at
  sellPrice: number; // Price station sells at
}

export interface Station {
  id: string;
  name: string;
  coordinates: Coordinates3D;
  stationClass: 'A' | 'B' | 'C' | 'D' | 'E';
  inventory: StationInventory[];
  dockedShips: string[]; // Player IDs
  credits: number; // Station's money for trading
}

export interface CargoItem {
  itemId: string;
  quantity: number;
  purchasePrice: number; // What player paid
}

// Mining system types
export interface AsteroidType {
  name: string;
  primaryResource: {
    itemId: string; // ID from trade items
    density: 'high' | 'medium' | 'low'; // affects extraction amounts
    probability: number; // 0-1, chance of getting this resource
  };
  secondaryResources: Array<{
    itemId: string;
    density: 'high' | 'medium' | 'low';
    probability: number;
  }>;
  miningDifficulty: number; // 1-5, affects mining time and success rate
  depletionRate: number; // 0-1, how much resources are depleted per mining operation
}

export interface MiningProgress {
  totalMined: number; // Total amount mined from this asteroid
  lastMined: Date; // Last time this asteroid was mined
  currentDepletion: number; // 0-1, how depleted the asteroid is
  activeMiningOperations: string[]; // Player IDs currently mining
}

export interface MiningResult {
  success: boolean;
  message: string;
  extractedItems: Array<{
    itemId: string;
    quantity: number;
    value: number;
  }>;
  miningTime: number; // Time in seconds for the operation
  asteroidDepletion: number; // New depletion level
  cargoSpaceUsed: number;
  cargoSpaceRemaining: number;
}

export interface MiningOperationState {
  playerId: string;
  asteroidId: string;
  startTime: Date;
  expectedEndTime: Date;
  miningDuration: number; // seconds
}