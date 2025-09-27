// 4D Coordinate system
export interface Coordinates4D {
  x: number;
  y: number;
  z: number;
  w: number;
}

// Universe configuration
export interface UniverseConfig {
  quadrants: number;
  sectorsPerQuadrant: number;
  zonesPerSector: number;
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
  coordinates: Coordinates4D;
  size: number; // 0-1, percentage of zone occupied
  name: string;
  resources?: ResourceDeposit[];
}

export interface ResourceDeposit {
  type: string;
  quantity: number;
  quality: number; // 0-1
}

// Sector document (what we store in MongoDB)
export interface SectorDocument {
  _id?: string;
  coordinates: string; // "x.x,y.y,z.z,w.w"
  coord: Coordinates4D; // For indexed queries
  staticObjects: CelestialBody[]; // planets, stations, asteroids
  dynamicObjects: {
    ships: string[]; // player IDs currently here
    probes: string[]; // probe IDs scanning this area
  };
  lastActivity: Date;
  createdAt: Date;
}