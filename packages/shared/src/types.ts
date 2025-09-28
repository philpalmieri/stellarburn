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
  size: number; // 0-1, percentage of zone occupied
  name: string;
  resources?: ResourceDeposit[];
  stationClass?: 'A' | 'B' | 'C' | 'D' | 'E'; // For stations only
  stationType?: 'trade' | 'military' | 'shipyard' | 'mining' | 'research'; // Future use
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

// Sector document (what we store in MongoDB)
export interface SectorDocument {
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
  currentZone: {
    coordinates: Coordinates3D;
    objects: CelestialBody[];
    otherPlayers: string[];
  };
  adjacentZones: {
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
  probes: number;
  dockedAt?: string; // Station ID if docked
}

// Trade and Station types
export interface TradeItem {
  id: string;
  name: string;
  category: 'fuel' | 'minerals' | 'technology' | 'weapons' | 'goods' | 'contraband';
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