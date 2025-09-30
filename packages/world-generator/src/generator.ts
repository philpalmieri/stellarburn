import { MongoClient } from 'mongodb';
import {
  UniverseConfig,
  SystemType,
  StarSystem,
  CelestialBody,
  Coordinates3D,
  SystemDocument,
  coordinateToString
} from '@stellarburn/shared';
import { getRandomAsteroidType } from '@stellarburn/shared';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://stellarburn:stellarburn_dev@mongodb:27017/stellarburn?authSource=admin';

// [Keep all existing SYSTEM_TYPES...]
const SYSTEM_TYPES: SystemType[] = [
  {
    name: 'Red Dwarf System',
    probability: 0.4,
    minPlanets: 1,
    maxPlanets: 3,
    hasAsteroidBelt: false,
    resourceRichness: 0.3,
    stationProbability: 0.1
  },
  {
    name: 'Solar-type System',
    probability: 0.25,
    minPlanets: 3,
    maxPlanets: 8,
    hasAsteroidBelt: true,
    resourceRichness: 0.6,
    stationProbability: 0.3
  },
  {
    name: 'Binary System',
    probability: 0.15,
    minPlanets: 0,
    maxPlanets: 4,
    hasAsteroidBelt: true,
    resourceRichness: 0.8,
    stationProbability: 0.2
  },
  {
    name: 'Gas Giant System',
    probability: 0.1,
    minPlanets: 1,
    maxPlanets: 2,
    hasAsteroidBelt: false,
    resourceRichness: 0.7,
    stationProbability: 0.4
  },
  {
    name: 'Dense System',
    probability: 0.05,
    minPlanets: 8,
    maxPlanets: 15,
    hasAsteroidBelt: true,
    resourceRichness: 0.9,
    stationProbability: 0.6
  },
  {
    name: 'Sparse System',
    probability: 0.05,
    minPlanets: 0,
    maxPlanets: 1,
    hasAsteroidBelt: false,
    resourceRichness: 0.2,
    stationProbability: 0.05
  }
];

function generateRandomCoordinate(size: number): Coordinates3D {
  return {
    x: Math.floor(Math.random() * size * 2) - size,
    y: Math.floor(Math.random() * size * 2) - size,
    z: Math.floor(Math.random() * size * 2) - size
  };
}

// Fixed sub-coordinate generation for 5x5x5 sectors per sector (0.0 to 0.4)
function generateSubCoordinate(baseCoord: number): number {
  const offset = Math.floor(Math.random() * 5) * 0.1; // 0.0, 0.1, 0.2, 0.3, 0.4
  return Math.round((baseCoord + offset) * 10) / 10; // Round to fix floating point
}

function selectSystemType(): SystemType {
  const random = Math.random();
  let cumulativeProbability = 0;
  
  for (const systemType of SYSTEM_TYPES) {
    cumulativeProbability += systemType.probability;
    if (random <= cumulativeProbability) {
      return systemType;
    }
  }
  
  return SYSTEM_TYPES[0];
}

function generateStarSize(systemType: SystemType): number {
  // 3 tier star system: 1, 9, or 27 sectors
  const random = Math.random();

  switch (systemType.name) {
    case 'Red Dwarf System':
      return random < 0.7 ? 1 : (random < 0.95 ? 9 : 27); // Mostly small
    case 'Solar-type System':
      return random < 0.3 ? 1 : (random < 0.8 ? 9 : 27); // Mostly medium
    case 'Binary System':
      return random < 0.1 ? 1 : (random < 0.4 ? 9 : 27); // Mostly large
    case 'Gas Giant System':
      return random < 0.4 ? 9 : 27; // Medium to large only
    case 'Dense System':
      return random < 0.2 ? 9 : 27; // Large systems
    case 'Sparse System':
      return random < 0.8 ? 1 : 9; // Small to medium only
    default:
      return random < 0.4 ? 1 : (random < 0.8 ? 9 : 27); // Balanced
  }
}

function generatePlanetSize(starSize: number): number {
  // 3 tier planet system: 1, 4, or 9 sectors
  const random = Math.random();

  if (starSize === 27) {
    // Large stars: only small planets (1 sector)
    return 1;
  } else if (starSize === 9) {
    // Medium stars: small to medium planets
    return random < 0.6 ? 1 : 4;
  } else {
    // Small stars: all sizes allowed
    return random < 0.5 ? 1 : (random < 0.8 ? 4 : 9);
  }
}

// Helper function to check if placement is safe distance from star
function isSafeFromStar(objCoords: Coordinates3D, starCoords: Coordinates3D, starSize: number): boolean {
  const distance = Math.sqrt(
    Math.pow(objCoords.x - starCoords.x, 2) +
    Math.pow(objCoords.y - starCoords.y, 2) +
    Math.pow(objCoords.z - starCoords.z, 2)
  );

  // Minimum safe distances based on star size
  if (starSize === 27) return distance >= 0.3; // Large stars need 0.3 unit buffer
  if (starSize === 9) return distance >= 0.2;  // Medium stars need 0.2 unit buffer
  return distance >= 0.1; // Small stars need 0.1 unit buffer
}

// Generate safe coordinates within 5x5x5 system, avoiding star
function generateSafeCoordinate(baseCoord: Coordinates3D, starCoords: Coordinates3D, starSize: number): Coordinates3D | null {
  const maxAttempts = 20;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const coords = {
      x: generateSubCoordinate(baseCoord.x),
      y: generateSubCoordinate(baseCoord.y),
      z: generateSubCoordinate(baseCoord.z)
    };

    if (isSafeFromStar(coords, starCoords, starSize)) {
      return coords;
    }
  }

  return null; // Couldn't find safe placement
}

function generateStarSystem(coordinates: Coordinates3D, systemType: SystemType): StarSystem {
  const systemId = `system_${coordinateToString(coordinates)}`;
  
  const starSize = generateStarSize(systemType);
  // Star goes at center of 5x5x5 system (2,2,2) = coordinates + 0.2
  const starCoordinates = {
    x: coordinates.x + 0.2,
    y: coordinates.y + 0.2,
    z: coordinates.z + 0.2
  };
  const star: CelestialBody = {
    id: `${systemId}_star`,
    type: 'star',
    coordinates: starCoordinates,
    size: starSize,
    name: `${systemType.name.split(' ')[0]} Star ${systemId.slice(-6)}`,
    resources: []
  };

  // Adjust planet count based on star size
  let maxPlanetsForStar = systemType.maxPlanets;
  if (starSize === 27) {
    maxPlanetsForStar = Math.min(systemType.maxPlanets, 3); // Large stars: fewer planets
  } else if (starSize === 9) {
    maxPlanetsForStar = Math.min(systemType.maxPlanets, 5); // Medium stars: moderate planets
  }
  // Small stars can have full planet count

  const planetCount = Math.floor(
    Math.random() * (maxPlanetsForStar - systemType.minPlanets + 1)
  ) + systemType.minPlanets;

  const planets: CelestialBody[] = [];
  for (let i = 0; i < planetCount; i++) {
    const planetCoord = generateSafeCoordinate(coordinates, starCoordinates, starSize);

    if (planetCoord) {
      const planetSize = generatePlanetSize(starSize);
      planets.push({
        id: `${systemId}_planet_${i}`,
        type: 'planet',
        coordinates: planetCoord,
        size: planetSize,
        name: `Planet ${systemId.slice(-6)}-${i + 1}`,
        resources: []
      });
    }
  }

  const asteroids: CelestialBody[] = [];
  if (systemType.hasAsteroidBelt) {
    // Reduce asteroid count for large stars
    let asteroidCount = Math.floor(Math.random() * 8) + 3;
    if (starSize === 27) {
      asteroidCount = Math.min(asteroidCount, 4); // Large stars: fewer asteroids
    }

    for (let i = 0; i < asteroidCount; i++) {
      const asteroidCoord = generateSafeCoordinate(coordinates, starCoordinates, starSize);

      if (asteroidCoord) {
        const asteroidType = getRandomAsteroidType();
        asteroids.push({
          id: `${systemId}_asteroid_${i}`,
          type: 'asteroid',
          coordinates: asteroidCoord,
          size: 1, // Asteroids are always 1 sector
          name: `${asteroidType.name} ${systemId.slice(-6)}-A${i + 1}`,
          resources: [],
          asteroidType,
          miningProgress: {
            totalMined: 0,
            lastMined: new Date(0), // Never mined
            currentDepletion: 0,
            activeMiningOperations: []
          }
        });
      }
    }
  }

  const stations: CelestialBody[] = [];
  if (Math.random() < systemType.stationProbability) {
    const stationCoord = generateSafeCoordinate(coordinates, starCoordinates, starSize);

    if (stationCoord) {
      // Determine station type based on system characteristics
      const hasAsteroids = systemType.hasAsteroidBelt;
      const asteroidCount = asteroids.length;
      const planetCount = planets.length;

      let stationType: 'trade' | 'military' | 'shipyard' | 'mining' | 'research';
      let stationClass: 'A' | 'B' | 'C' | 'D' | 'E';
      let stationName: string;

      // Logic for station type selection
      if (hasAsteroids && asteroidCount >= 5) {
        // Systems with lots of asteroids get mining stations
        stationType = 'mining';
        stationClass = 'B';
        stationName = 'Mining Station';
      } else if (systemType.name.includes('Binary') || systemType.name.includes('Dense')) {
        // Binary and dense systems often have military presence
        stationType = 'military';
        stationClass = 'A';
        stationName = 'Military Station';
      } else if (systemType.name.includes('Solar') && planetCount >= 3) {
        // Solar systems with multiple planets become trading hubs
        stationType = 'trade';
        stationClass = 'C';
        stationName = 'Trading Hub';
      } else if (systemType.resourceRichness >= 0.7) {
        // Resource-rich systems get research stations
        stationType = 'research';
        stationClass = 'D';
        stationName = 'Research Station';
      } else {
        // Default to frontier outposts - using shipyard as closest to "outpost"
        stationType = 'shipyard';
        stationClass = 'E';
        stationName = 'Frontier Outpost';
      }

      stations.push({
        id: `${systemId}_station`,
        type: 'station',
        coordinates: stationCoord,
        size: 1, // Stations are always 1 sector
        name: stationName,
        resources: [],
        stationClass,
        stationType // Add station type for better identification
      });
    }
  }

  return {
    id: systemId,
    coordinates,
    systemType: systemType.name,
    star,
    planets,
    asteroids,
    stations
  };
}

function generateCenterSystem(): any {
  const centerCoordinates = { x: 0, y: 0, z: 0 };
  const systemId = 'system_0,0,0';

  // Small star at center of system
  const starCoordinates = { x: 0.2, y: 0.2, z: 0.2 };
  const star: CelestialBody = {
    id: `${systemId}_star`,
    type: 'star',
    coordinates: starCoordinates,
    size: 1, // Small star
    name: 'Sol Central',
    resources: []
  };

  // Fixed layout: 2 planets
  const planets: CelestialBody[] = [
    {
      id: `${systemId}_planet_0`,
      type: 'planet',
      coordinates: { x: 0.1, y: 0.1, z: 0.1 },
      size: 1,
      name: 'Haven Prime',
      resources: []
    },
    {
      id: `${systemId}_planet_1`,
      type: 'planet',
      coordinates: { x: 0.3, y: 0.3, z: 0.1 }, // This planet will have the station
      size: 1,
      name: 'Terra Nova',
      resources: []
    }
  ];

  // Asteroid belt around the system
  const asteroids: CelestialBody[] = [];
  const asteroidPositions = [
    { x: 0.0, y: 0.0, z: 0.3 },
    { x: 0.1, y: 0.3, z: 0.3 },
    { x: 0.3, y: 0.0, z: 0.0 },
    { x: 0.4, y: 0.1, z: 0.2 },
    { x: 0.0, y: 0.4, z: 0.1 },
    { x: 0.2, y: 0.4, z: 0.4 },
    { x: 0.4, y: 0.4, z: 0.0 },
    { x: 0.1, y: 0.0, z: 0.4 },
    { x: 0.4, y: 0.3, z: 0.4 },
    { x: 0.0, y: 0.2, z: 0.0 },
    { x: 0.4, y: 0.0, z: 0.3 },
    { x: 0.2, y: 0.0, z: 0.1 }
  ];

  asteroidPositions.forEach((coords, i) => {
    const asteroidType = getRandomAsteroidType();
    asteroids.push({
      id: `${systemId}_asteroid_${i}`,
      type: 'asteroid',
      coordinates: coords,
      size: 1,
      name: `${asteroidType.name} A${i + 1}`,
      resources: [],
      asteroidType,
      miningProgress: {
        totalMined: 0,
        lastMined: new Date(0), // Never mined
        currentDepletion: 0,
        activeMiningOperations: []
      }
    });
  });

  // Trading station orbiting Terra Nova planet
  const station: CelestialBody = {
    id: `${systemId}_station`,
    type: 'station',
    coordinates: { x: 0.3, y: 0.3, z: 0.1 }, // Same as Terra Nova - orbiting it
    size: 1,
    name: 'Haven Station',
    resources: [],
    stationClass: 'A' as const, // High-class station
    stationType: 'trade' as const,
    credits: 1000000, // Plenty of credits for trading
    inventory: [], // Will be populated by station inventory service
    isHavenStation: true // Special marker for comprehensive inventory
  };

  return {
    coordinates: '0,0,0',
    coord: centerCoordinates,
    staticObjects: [star, ...planets, ...asteroids, station],
    dynamicObjects: {
      ships: [],
      probes: []
    },
    lastActivity: new Date(),
    createdAt: new Date()
  };
}

export async function generateUniverse(config: UniverseConfig, clearExisting: boolean = false) {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('stellarburn');
    const systemsCollection = db.collection('systems');

    if (clearExisting) {
      console.log('🗑️  Clearing existing universe data...');
      await systemsCollection.deleteMany({});
    }

    // Always generate the center system first
    console.log('🏛️  Generating center safe system...');
    const centerSystem = generateCenterSystem();
    const generatedSystems: any[] = [centerSystem];
    const usedCoordinates = new Set<string>(['0,0,0']);

    const maxPossibleSectors = Math.pow(config.size * 2, 3);
    const systemsToGenerate = Math.floor(maxPossibleSectors * config.sparsity) - 1; // -1 for center system

    console.log(`🎲 Generating ${systemsToGenerate} additional star systems with fixed coordinate precision...`);

    for (let i = 0; i < systemsToGenerate; i++) {
      let coordinates: Coordinates3D;
      let coordString: string;

      do {
        coordinates = generateRandomCoordinate(config.size);
        coordString = coordinateToString(coordinates);
      } while (usedCoordinates.has(coordString));

      usedCoordinates.add(coordString);

      const systemType = selectSystemType();
      const starSystem = generateStarSystem(coordinates, systemType);

      const sector = {
        coordinates: coordString,
        coord: coordinates,
        staticObjects: [starSystem.star, ...starSystem.planets, ...starSystem.asteroids, ...starSystem.stations],
        dynamicObjects: {
          ships: [],
          probes: []
        },
        lastActivity: new Date(),
        createdAt: new Date()
      };

      generatedSystems.push(sector);

      if ((i + 1) % 100 === 0) {
        console.log(`   Generated ${i + 1}/${systemsToGenerate} systems...`);
      }
    }

    await systemsCollection.insertMany(generatedSystems);

    console.log('📊 Universe Generation Summary:');
    console.log(`   Total systems generated: ${generatedSystems.length} (including center system)`);
    console.log(`   Database systems: ${await systemsCollection.countDocuments()}`);
    console.log(`   Universe density: ${(config.sparsity * 100).toFixed(2)}%`);
    console.log(`   Center safe system created at (0,0,0)`);
    console.log(`   Fixed coordinate precision for clean display`);

  } finally {
    await client.close();
  }
}