import { Router } from 'express';
import { getServices } from '../services/serviceFactory.js';
import { getDirectionVector } from '../constants/directions.js';
import { coordinateToString } from '@stellarburn/shared';

export function createNavigationRoutes() {
  const router = Router();
  const getServicesLazy = () => getServices();

  // Plot course endpoint
  router.get('/plot/:playerId/:from/:to', async (req, res) => {
    try {
      const { from, to } = req.params;
      const { navigationService } = getServicesLazy();
      const path = await navigationService.plotCourse(from, to);
      
      res.json({
        success: true,
        from,
        to,
        path
      });
    } catch (error) {
      console.error('Plot course error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to plot course'
      });
    }
  });

  // Autopilot endpoint - now using the modernized service
  router.post('/autopilot/:playerId', async (req, res) => {
    try {
      const { playerId } = req.params;
      const { path } = req.body;

      if (!path || !Array.isArray(path) || path.length === 0) {
        return res.json({
          success: true,
          message: 'Destination reached',
          completed: true,
          remainingPath: []
        });
      }

      const { navigationService, movementService, scanningService } = getServicesLazy();
      const { step, remainingPath } = navigationService.getNextStep(path);
      
      if (!step) {
        return res.json({
          success: true,
          message: 'Destination reached',
          completed: true,
          remainingPath: []
        });
      }

      let directionVector;
      try {
        directionVector = getDirectionVector(step.direction);
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: error instanceof Error ? error.message : 'Invalid direction',
          completed: false,
          remainingPath: [step, ...remainingPath]
        });
      }

      // Execute the movement first
      let result;
      if (step.type === 'move') {
        result = await movementService.movePlayer(playerId, step.direction, directionVector);

        // Check for collision AFTER moving (for regular movement within system)
        const collision = await navigationService.checkCollision(playerId, result.newCoordinates);

        if (collision.hasCollision) {
          return res.json({
            success: false,
            blocked: true,
            collision: collision.obstruction,
            message: `Autopilot stopped: Collided with ${collision.obstruction?.type} "${collision.obstruction?.name}" at ${coordinateToString(result.newCoordinates)}`,
            remainingPath: remainingPath,
            completed: false
          });
        }
      } else if (step.type === 'jump') {
        // For jumps, only check collision if jumping directly into a celestial body's zone
        // Jumps land at system edges, so collision is less likely
        const jumpResult = await movementService.jumpPlayer(playerId, step.direction, directionVector);
        const systemScan = await scanningService.performSystemScan(playerId);
        result = { ...jumpResult, systemScan };

        // Check collision after jump landing
        const collision = await navigationService.checkCollision(playerId, jumpResult.newCoordinates);

        if (collision.hasCollision) {
          return res.json({
            success: false,
            blocked: true,
            collision: collision.obstruction,
            message: `Autopilot stopped: Jump landed in collision with ${collision.obstruction?.type} "${collision.obstruction?.name}"`,
            remainingPath: remainingPath,
            completed: false
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          error: `Invalid step type: ${step.type}`,
          completed: false,
          remainingPath: [step, ...remainingPath]
        });
      }

      res.json({
        success: true,
        step: step,
        result: result,
        remainingPath: remainingPath,
        completed: remainingPath.length === 0,
        message: remainingPath.length === 0 ? 'Destination reached' : `${remainingPath.length} steps remaining`
      });

    } catch (error) {
      console.error('Autopilot error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Autopilot failed',
        completed: false,
        remainingPath: req.body.path || []
      });
    }
  });

  // Check collision endpoint
  router.post('/check-collision/:playerId', async (req, res) => {
    try {
      const { playerId } = req.params;
      const { coordinates } = req.body;

      if (!coordinates || typeof coordinates !== 'object') {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid coordinates provided' 
        });
      }

      const { navigationService } = getServicesLazy();
      const collision = await navigationService.checkCollision(playerId, coordinates);
      
      res.json({
        success: true,
        collision
      });
    } catch (error) {
      console.error('Collision check error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check collision'
      });
    }
  });

  return router;
}