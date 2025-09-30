import { Router } from 'express';
import { getMongo } from '../services/databaseService.js';

export function createUniverseRoutes() {
  const router = Router();

  // Universe stats
  router.get('/', async (req, res) => {
    try {
      const db = getMongo('stellarburn');
      const systemsCount = await db.collection('systems').countDocuments();
      const playersCount = await db.collection('players').countDocuments();
      
      res.json({
        totalSystems: systemsCount,
        totalPlayers: playersCount,
        message: 'StellarBurn Universe API is running!'
      });
    } catch (error) {
      console.error('Database query error:', error);
      res.status(500).json({ error: 'Database query failed' });
    }
  });

  // Get systems
  router.get('/systems', async (req, res) => {
    try {
      const db = getMongo('stellarburn');
      const { limit = 5000, skip = 0 } = req.query;

      const systems = await db.collection('systems')
        .find({})
        .limit(Number(limit))
        .skip(Number(skip))
        .toArray();

      res.json(systems);
    } catch (error) {
      console.error('Database query error:', error);
      res.status(500).json({ error: 'Failed to fetch systems' });
    }
  });

  // Get all players (for visualization) - exclude docked players
  router.get('/players', async (req, res) => {
    try {
      const db = getMongo('stellarburn');
      const players = await db.collection('players')
        .find({ dockedAt: { $exists: false } }, { projection: { id: 1, name: 1, coordinates: 1 } })
        .toArray();

      res.json(players);
    } catch (error) {
      console.error('Players query error:', error);
      res.status(500).json({ error: 'Failed to fetch players' });
    }
  });

  // Get all players including docked ones (for player selection UI)
  router.get('/players/all', async (req, res) => {
    try {
      const db = getMongo('stellarburn');
      const players = await db.collection('players')
        .find({}, { projection: { id: 1, name: 1, coordinates: 1, dockedAt: 1 } })
        .toArray();

      res.json(players);
    } catch (error) {
      console.error('All players query error:', error);
      res.status(500).json({ error: 'Failed to fetch all players' });
    }
  });

  return router;
}