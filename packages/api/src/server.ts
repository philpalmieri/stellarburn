import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { MongoClient } from 'mongodb';

const app = express();
const PORT = process.env.PORT || 3000;
// Use simple connection without auth for development
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongodb:27017/stellarburn';

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

// Basic universe info endpoint
app.get('/api/universe', async (req, res) => {
  try {
    if (!mongoClient) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const db = mongoClient.db('stellarburn');
    const sectorsCount = await db.collection('sectors').countDocuments();
    
    res.json({
      totalSectors: sectorsCount,
      message: 'StellarBurn Universe API is running!'
    });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Get all sectors (with optional pagination)
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

// Get specific sector by coordinates
app.get('/api/sector/:x/:y/:z/:w', async (req, res) => {
  try {
    if (!mongoClient) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const { x, y, z, w } = req.params;
    const coordinates = `${x},${y},${z},${w}`;
    
    const db = mongoClient.db('stellarburn');
    const sector = await db.collection('sectors').findOne({ coordinates });
    
    if (!sector) {
      return res.status(404).json({ error: 'Sector not found' });
    }
    
    res.json(sector);
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: 'Failed to fetch sector' });
  }
});

// Get sectors within range of coordinates
app.get('/api/sectors/near/:x/:y/:z/:w', async (req, res) => {
  try {
    if (!mongoClient) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const { x, y, z, w } = req.params;
    const range = Number(req.query.range) || 5;
    
    const centerX = Number(x);
    const centerY = Number(y);
    const centerZ = Number(z);
    const centerW = Number(w);
    
    const db = mongoClient.db('stellarburn');
    const sectors = await db.collection('sectors').find({
      'coord.x': { $gte: centerX - range, $lte: centerX + range },
      'coord.y': { $gte: centerY - range, $lte: centerY + range },
      'coord.z': { $gte: centerZ - range, $lte: centerZ + range },
      'coord.w': { $gte: centerW - range, $lte: centerW + range }
    }).toArray();
    
    res.json(sectors);
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: 'Failed to fetch nearby sectors' });
  }
});

// Start server
async function startServer() {
  try {
    // Connect to MongoDB
    console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    console.log('✅ Connected to MongoDB successfully');
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 StellarBurn API server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🌌 Universe API: http://localhost:${PORT}/api/universe`);
      console.log(`🗺️  Sectors API: http://localhost:${PORT}/api/sectors`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  if (mongoClient) {
    await mongoClient.close();
  }
  process.exit(0);
});

startServer();