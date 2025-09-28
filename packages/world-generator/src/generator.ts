import { MongoClient } from 'mongodb';
import { 
  UniverseConfig, 
  SystemType, 
  StarSystem, 
  CelestialBody, 
  Coordinates3D, 
  SectorDocument,
  coordinateToString 
} from '@stellarburn/shared';

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

// Fixed sub-coordinate generation - ensure coordinates stay within system bounds
function generateSubCoordinate(baseCoord: number): number {
  const offset = (Math.floor(Math.random() * 8) + 1) * 0.1; // 0.1 to 0.8 (not 0.9)
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
  switch (systemType.name) {
    case 'Red Dwarf System':
      return Math.floor(Math.random() * 100) + 50;
    case 'Solar-type System':
      return Math.floor(Math.random() * 150) + 100;
    case 'Binary System':
      return Math.floor(Math.random() * 200) + 150;
    case 'Gas Giant System':
      return Math.floor(Math.random() * 100) + 80;
    case 'Dense System':
      return Math.floor(Math.random() * 100) + 200;
    case 'Sparse System':
      return Math.floor(Math.random() * 50) + 30;
    default:
      return Math.floor(Math.random() * 100) + 100;
  }
}

function generatePlanetSize(systemType: SystemType): number {
  const baseSize = Math.floor(Math.random() * 12) + 1;
  
  if (systemType.name === 'Gas Giant System') {
    return baseSize + Math.floor(Math.random() * 40) + 20;
  } else if (systemType.name === 'Dense System') {
    return Math.floor(Math.random() * 8) + 3;
  } else {
    return baseSize;
  }
}

function generateStarSystem(coordinates: Coordinates3D, systemType: SystemType): StarSystem {
  const systemId = `system_${coordinateToString(coordinates)}`;
  
  const starSize = generateStarSize(systemType);
  const star: CelestialBody = {
    id: `${systemId}_star`,
    type: 'star',
    coordinates,
    size: starSize,
    name: `${systemType.name.split(' ')[0]} Star ${systemId.slice(-6)}`,
    resources: []
  };

  const planetCount = Math.floor(
    Math.random() * (systemType.maxPlanets - systemType.minPlanets + 1)
  ) + systemType.minPlanets;
  
  const planets: CelestialBody[] = [];
  for (let i = 0; i < planetCount; i++) {
    const planetCoord: Coordinates3D = {
      x: generateSubCoordinate(coordinates.x),
      y: generateSubCoordinate(coordinates.y),
      z: generateSubCoordinate(coordinates.z)
    };

    const planetSize = generatePlanetSize(systemType);
    planets.push({
      id: `${systemId}_planet_${i}`,
      type: 'planet',
      coordinates: planetCoord,
      size: planetSize,
      name: `Planet ${systemId.slice(-6)}-${i + 1}`,
      resources: []
    });
  }

  const asteroids: CelestialBody[] = [];
  if (systemType.hasAsteroidBelt) {
    const asteroidCount = Math.floor(Math.random() * 8) + 3;
    for (let i = 0; i < asteroidCount; i++) {
      const asteroidCoord: Coordinates3D = {
        x: generateSubCoordinate(coordinates.x),
        y: generateSubCoordinate(coordinates.y),
        z: generateSubCoordinate(coordinates.z)
      };

      asteroids.push({
        id: `${systemId}_asteroid_${i}`,
        type: 'asteroid',
        coordinates: asteroidCoord,
        size: 1,
        name: `Asteroid ${systemId.slice(-6)}-A${i + 1}`,
        resources: []
      });
    }
  }

  const stations: CelestialBody[] = [];
  if (Math.random() < systemType.stationProbability) {
    const stationCoord: Coordinates3D = {
      x: generateSubCoordinate(coordinates.x),
      y: generateSubCoordinate(coordinates.y),
      z: generateSubCoordinate(coordinates.z)
    };

    // Assign station class based on system type and randomness
    const stationClasses: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];
    const classWeights = systemType.name.includes('Solar') ? [0.3, 0.3, 0.2, 0.15, 0.05] :
                        systemType.name.includes('Binary') ? [0.2, 0.25, 0.25, 0.2, 0.1] :
                        [0.1, 0.2, 0.3, 0.25, 0.15]; // Default weights

    const randomValue = Math.random();
    let cumulativeWeight = 0;
    let stationClass: 'A' | 'B' | 'C' | 'D' | 'E' = 'C';
    for (let i = 0; i < stationClasses.length; i++) {
      cumulativeWeight += classWeights[i];
      if (randomValue < cumulativeWeight) {
        stationClass = stationClasses[i];
        break;
      }
    }

    stations.push({
      id: `${systemId}_station`,
      type: 'station',
      coordinates: stationCoord,
      size: 1,
      name: `${systemType.name.split(' ')[0]}-type Station`,
      resources: [],
      stationClass
    });
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

export async function generateUniverse(config: UniverseConfig, clearExisting: boolean = false) {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('stellarburn');
    const sectorsCollection = db.collection('sectors');
    
    if (clearExisting) {
      console.log('🗑️  Clearing existing universe data...');
      await sectorsCollection.deleteMany({});
    }

    const maxPossibleSectors = Math.pow(config.size * 2, 3);
    const systemsToGenerate = Math.floor(maxPossibleSectors * config.sparsity);
    
    console.log(`🎲 Generating ${systemsToGenerate} star systems with fixed coordinate precision...`);
    
    const generatedSystems: any[] = [];
    const usedCoordinates = new Set<string>();
    
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
    
    await sectorsCollection.insertMany(generatedSystems);
    
    console.log('📊 Universe Generation Summary:');
    console.log(`   Total systems generated: ${systemsToGenerate}`);
    console.log(`   Database sectors: ${await sectorsCollection.countDocuments()}`);
    console.log(`   Universe density: ${(config.sparsity * 100).toFixed(2)}%`);
    console.log(`   Fixed coordinate precision for clean display`);
    
  } finally {
    await client.close();
  }
}