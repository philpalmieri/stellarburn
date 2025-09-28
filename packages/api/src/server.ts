import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { MongoClient } from 'mongodb';
import { createPlayerRoutes } from './routes/playerRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://stellarburn:stellarburn_dev@mongodb:27017/stellarburn?authSource=admin';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// MongoDB connection
let mongoClient: MongoClient;

// Basic health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'StellarBurn API' 
  });
});

// Universe endpoints
app.get('/api/universe', async (req, res) => {
  try {
    if (!mongoClient) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const db = mongoClient.db('stellarburn');
    const sectorsCount = await db.collection('sectors').countDocuments();
    const playersCount = await db.collection('players').countDocuments();
    
    res.json({
      totalSectors: sectorsCount,
      totalPlayers: playersCount,
      message: 'StellarBurn Universe API is running!'
    });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

app.get('/api/sectors', async (req, res) => {
  try {
    if (!mongoClient) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const db = mongoClient.db('stellarburn');
    const { limit = 5000, skip = 0 } = req.query;
    
    const sectors = await db.collection('sectors')
      .find({})
      .limit(Number(limit))
      .skip(Number(skip))
      .toArray();
    
    res.json(sectors);
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: 'Failed to fetch sectors' });
  }
});

app.get('/api/players', async (req, res) => {
  try {
    if (!mongoClient) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const db = mongoClient.db('stellarburn');
    const players = await db.collection('players')
      .find({}, { projection: { id: 1, name: 1, coordinates: 1 } })
      .toArray();
    
    res.json(players);
  } catch (error) {
    console.error('Players query error:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// Player creation
app.post('/api/player/create', async (req, res) => {
  try {
    if (!mongoClient) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const { name } = req.body;
    if (!name || name.length < 2) {
      return res.status(400).json({ error: 'Player name must be at least 2 characters' });
    }
    
    const db = mongoClient.db('stellarburn');
    
    const existingPlayer = await db.collection('players').findOne({ name });
    if (existingPlayer) {
      return res.status(409).json({ error: 'Player name already exists' });
    }
    
    // Find safe spawn location
    const sectors = await db.collection('sectors').find({}).toArray();
    let spawnCoordinates = { x: 0.5, y: 0.5, z: 0.5 };
    
    for (const sector of sectors.slice(0, 10)) {
      const largeObjects = sector.staticObjects.filter((obj: any) => obj.size > 10);
      if (largeObjects.length === 0) {
        spawnCoordinates = {
          x: sector.coord.x + Math.random() * 0.8 + 0.1,
          y: sector.coord.y + Math.random() * 0.8 + 0.1,
          z: sector.coord.z + Math.random() * 0.8 + 0.1
        };
        break;
      }
    }
    
    const newPlayer = {
      id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      coordinates: spawnCoordinates,
      ship: {
        fuel: 100,
        maxFuel: 100,
        cargo: []
      },
      credits: 1000,
      knownSystems: [], // Initialize empty known systems
      createdAt: new Date(),
      lastActivity: new Date()
    };
    
    await db.collection('players').insertOne(newPlayer);
    
    res.json({
      message: `Player ${name} created successfully`,
      player: newPlayer,
      spawnLocation: `${spawnCoordinates.x},${spawnCoordinates.y},${spawnCoordinates.z}`
    });
  } catch (error) {
    console.error('Player creation error:', error);
    res.status(500).json({ error: 'Failed to create player' });
  }
});

// Start server
async function startServer() {
  try {
    console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    console.log('✅ Connected to MongoDB successfully');
    
    const db = mongoClient.db('stellarburn');
    
    // Mount player routes
    app.use('/api/player', createPlayerRoutes(db));
    
    app.listen(PORT, () => {
      console.log(`🚀 StellarBurn API server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🌌 Universe API: http://localhost:${PORT}/api/universe`);
      console.log(`👥 Player Management: http://localhost:${PORT}/api/player/`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  if (mongoClient) {
    await mongoClient.close();
  }
  process.exit(0);
});

startServer();