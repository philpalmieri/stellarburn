import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectToMongoDB, closeMongoDB } from './services/databaseService.js';
import { createPlayerRoutes } from './routes/playerRoutes.js';
import { createNavigationRoutes } from './routes/navigationRoutes.js';
import { createUniverseRoutes } from './routes/universeRoutes.js';
import { createProbeRoutes } from './routes/probeRoutes.js';
import { createStationRoutes } from './routes/stationRoutes.js';
import { getServices } from './services/serviceFactory.js';

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Basic health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'StellarBurn API'
  });
});

// Mount routes
app.use('/api/universe', createUniverseRoutes());
app.use('/api/player', createPlayerRoutes());
app.use('/api/navigation', createNavigationRoutes());
app.use('/api/probes', createProbeRoutes());
app.use('/api/station', createStationRoutes());

// Start server
async function startServer() {
  try {
    console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);
    await connectToMongoDB(MONGODB_URI);

    app.listen(PORT, () => {
      console.log(`🚀 StellarBurn API server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🌌 Universe API: http://localhost:${PORT}/api/universe`);
      console.log(`👥 Player Management: http://localhost:${PORT}/api/player/`);
      console.log(`🧭 Navigation: http://localhost:${PORT}/api/navigation/`);

      // Start the probe movement scheduler
      const { probeScheduler } = getServices();
      probeScheduler.start();
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');

  // Stop probe scheduler
  const { probeScheduler } = getServices();
  probeScheduler.stop();

  await closeMongoDB();
  process.exit(0);
});

startServer();
