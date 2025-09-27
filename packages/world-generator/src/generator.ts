import { MongoClient } from 'mongodb';
import { 
  UniverseConfig, 
  SystemType, 
  StarSystem, 
  CelestialBody, 
  Coordinates4D, 
  SectorDocument,
  coordinateToString 
} from '@stellarburn/shared';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://stellarburn:stellarburn_dev@mongodb:27017/stellarburn?authSource=admin';

// Predefined system types with probabilities
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

// Generate random coordinate within bounds
function generateRandomCoordinate(maxQuadrant: number, sectorsPerQuadrant: number): Coordinates4D {
  return {
    x: Math.floor(Math.random() * maxQuadrant * sectorsPerQuadrant),
    y: Math.floor(Math.random() * maxQuadrant * sectorsPerQuadrant), 
    z: Math.floor(Math.random() * maxQuadrant * sectorsPerQuadrant),
    w: Math.floor(Math.random() * maxQuadrant * sectorsPerQuadrant)
  };
}

// Select system type based on probabilities
function selectSystemType(): SystemType {
  const random = Math.random();
  let cumulativeProbability = 0;
  
  for (const systemType of SYSTEM_TYPES) {
    cumulativeProbability += systemType.probability;
    if (random <= cumulativeProbability) {
      return systemType;
    }
  }
  
  return SYSTEM_TYPES[0]; // Fallback to first type
}

// Generate a star system
function generateStarSystem(coordinates: Coordinates4D, systemType: SystemType): StarSystem {
  const systemId = `system_${coordinateToString(coordinates)}`;
  
  // Create the star (always at the center)
  const star: CelestialBody = {
    id: `${systemId}_star`,
    type: 'star',
    coordinates,
    size: 1.0, // Stars take up full sector
    name: `${systemType.name.split(' ')[0]} Star ${systemId.slice(-8)}`,
    resources: []
  };

  // Generate planets
  const planetCount = Math.floor(
    Math.random() * (systemType.maxPlanets - systemType.minPlanets + 1)
  ) + systemType.minPlanets;
  
  const planets: CelestialBody[] = [];
  for (let i = 0; i < planetCount; i++) {
    // Planets get slightly offset coordinates within the same major sector
    const planetCoord: Coordinates4D = {
      x: coordinates.x + Math.random() * 0.8 + 0.1, // 0.1 to 0.9 offset
      y: coordinates.y + Math.random() * 0.8 + 0.1,
      z: coordinates.z + Math.random() * 0.8 + 0.1,
      w: coordinates.w + Math.random() * 0.8 + 0.1
    };

    planets.push({
      id: `${systemId}_planet_${i}`,
      type: 'planet',
      coordinates: planetCoord,
      size: Math.random() * 0.1 + 0.05, // 0.05 to 0.15
      name: `Planet ${systemId.slice(-8)}-${i + 1}`,
      resources: [] // TODO: Generate resources based on systemType.resourceRichness
    });
  }

  // Generate asteroids if system has asteroid belt
  const asteroids: CelestialBody[] = [];
  if (systemType.hasAsteroidBelt) {
    const asteroidCount = Math.floor(Math.random() * 5) + 2; // 2-6 asteroids
    for (let i = 0; i < asteroidCount; i++) {
      const asteroidCoord: Coordinates4D = {
        x: coordinates.x + Math.random(),
        y: coordinates.y + Math.random(),
        z: coordinates.z + Math.random(),
        w: coordinates.w + Math.random()
      };

      asteroids.push({
        id: `${systemId}_asteroid_${i}`,
        type: 'asteroid',
        coordinates: asteroidCoord,
        size: Math.random() * 0.02 + 0.01, // 0.01 to 0.03
        name: `Asteroid ${systemId.slice(-8)}-A${i + 1}`,
        resources: [] // TODO: Generate mineral resources
      });
    }
  }

  // Generate stations based on probability
  const stations: CelestialBody[] = [];
  if (Math.random() < systemType.stationProbability) {
    const stationCoord: Coordinates4D = {
      x: coordinates.x + Math.random() * 0.9 + 0.05,
      y: coordinates.y + Math.random() * 0.9 + 0.05,
      z: coordinates.z + Math.random() * 0.9 + 0.05,
      w: coordinates.w + Math.random() * 0.9 + 0.05
    };

    stations.push({
      id: `${systemId}_station`,
      type: 'station',
      coordinates: stationCoord,
      size: 0.05, // Fixed size for stations
      name: `${systemType.name.split(' ')[0]} Station`,
      resources: []
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

// Main universe generation function
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

    // Calculate how many systems to generate
    const maxPossibleSectors = Math.pow(config.sectorsPerQuadrant, 4) * config.quadrants;
    const systemsToGenerate = Math.floor(maxPossibleSectors * config.sparsity);
    
    console.log(`🎲 Generating ${systemsToGenerate} star systems...`);
    
    const generatedSystems: SectorDocument[] = [];
    const usedCoordinates = new Set<string>();
    
    for (let i = 0; i < systemsToGenerate; i++) {
      let coordinates: Coordinates4D;
      let coordString: string;
      
      // Find unique coordinates
      do {
        coordinates = generateRandomCoordinate(config.quadrants, config.sectorsPerQuadrant);
        coordString = coordinateToString(coordinates);
      } while (usedCoordinates.has(coordString));
      
      usedCoordinates.add(coordString);
      
      // Generate system
      const systemType = selectSystemType();
      const starSystem = generateStarSystem(coordinates, systemType);
      
      // Create sector document
      const sector: SectorDocument = {
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
    
    // Insert all sectors into database
    console.log('💾 Inserting systems into database...');
    await sectorsCollection.insertMany(generatedSystems);
    
    console.log('📊 Universe Generation Summary:');
    console.log(`   Total systems generated: ${systemsToGenerate}`);
    console.log(`   Database sectors: ${await sectorsCollection.countDocuments()}`);
    console.log(`   Universe density: ${(config.sparsity * 100).toFixed(2)}%`);
    
  } finally {
    await client.close();
  }
}