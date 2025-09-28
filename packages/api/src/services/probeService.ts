import { Coordinates3D, coordinateToString, Probe, ProbeConfig } from '@stellarburn/shared';
import { ScanningService } from './scanningService.js';
import { ExplorationService } from './explorationService.js';

export class ProbeService {
  constructor(
    private db: any,
    private scanningService: ScanningService,
    private explorationService: ExplorationService
  ) {}

  async launchProbe(playerId: string, direction: string) {
    const player = await this.db.collection('players').findOne({ id: playerId });

    if (!player) {
      throw new Error('Player not found');
    }

    if (player.ship.probes <= 0) {
      throw new Error('No probes available');
    }

    // Convert direction to movement vector
    const directionVectors: { [key: string]: Coordinates3D } = {
      north: { x: 0, y: 1, z: 0 },
      south: { x: 0, y: -1, z: 0 },
      east: { x: 1, y: 0, z: 0 },
      west: { x: -1, y: 0, z: 0 },
      up: { x: 0, y: 0, z: 1 },
      down: { x: 0, y: 0, z: -1 },
      n: { x: 0, y: 1, z: 0 },
      s: { x: 0, y: -1, z: 0 },
      e: { x: 1, y: 0, z: 0 },
      w: { x: -1, y: 0, z: 0 },
      u: { x: 0, y: 0, z: 1 },
      d: { x: 0, y: 0, z: -1 }
    };

    const directionVector = directionVectors[direction.toLowerCase()];
    if (!directionVector) {
      throw new Error('Invalid direction. Use n/north, s/south, e/east, w/west, u/up, d/down');
    }

    // Get probe config from player or use defaults
    const probeConfig = player.ship.probeConfig || {
      maxFuel: 10,
      scanRange: 0.05,
      moveDelay: 1000
    };

    // Create the probe object
    const probe: Probe = {
      id: `probe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      coordinates: player.coordinates,
      direction: directionVector,
      fuel: probeConfig.maxFuel,
      maxFuel: probeConfig.maxFuel,
      launchedAt: new Date(),
      lastActivity: new Date(),
      status: 'active'
    };

    // Store probe in database
    await this.db.collection('probes').insertOne(probe);

    // Reduce probe count
    await this.db.collection('players').updateOne(
      { id: playerId },
      {
        $inc: { 'ship.probes': -1 },
        $set: { lastActivity: new Date() }
      }
    );

    // Instead of executing all movement immediately, just return the probe
    // Movement will be handled by the probe movement scheduler
    const updatedPlayer = await this.db.collection('players').findOne({ id: playerId });

    return {
      success: true,
      message: `Probe launched ${direction}, will scan ${probeConfig.maxFuel} systems over time.`,
      probesRemaining: updatedPlayer.ship.probes,
      probe,
      discoveredSystems: [] // No immediate scanning
    };
  }

  private async executeProbeMovement(probe: Probe) {
    const discoveredSystems = [];
    const currentCoords = probe.coordinates;

    // Start from the next system in the probe direction
    let probeCoords = {
      x: Math.floor(currentCoords.x) + (probe.direction.x > 0 ? 1 : probe.direction.x < 0 ? -1 : 0),
      y: Math.floor(currentCoords.y) + (probe.direction.y > 0 ? 1 : probe.direction.y < 0 ? -1 : 0),
      z: Math.floor(currentCoords.z) + (probe.direction.z > 0 ? 1 : probe.direction.z < 0 ? -1 : 0)
    };

    // Move through systems until fuel runs out
    for (let i = 0; i < probe.fuel; i++) {
      // Update probe position in database
      await this.db.collection('probes').updateOne(
        { id: probe.id },
        {
          $set: {
            coordinates: probeCoords,
            fuel: probe.fuel - i - 1,
            lastActivity: new Date()
          }
        }
      );

      // Add probe to current system's dynamic objects
      const systemCoordString = coordinateToString(probeCoords);
      await this.db.collection('sectors').updateOne(
        { coordinates: systemCoordString },
        {
          $addToSet: { 'dynamicObjects.probes': probe.id },
          $set: { lastActivity: new Date() }
        },
        { upsert: true }
      );

      // Track exploration for this system
      await this.explorationService.trackPlayerExploration(probe.playerId, probeCoords);

      // Perform system scan
      const systemSector = await this.db.collection('sectors').findOne({ coordinates: systemCoordString });

      // Get other players in this system
      const systemPlayers = await this.db.collection('players').find({
        'coordinates.x': { $gte: probeCoords.x, $lt: probeCoords.x + 1 },
        'coordinates.y': { $gte: probeCoords.y, $lt: probeCoords.y + 1 },
        'coordinates.z': { $gte: probeCoords.z, $lt: probeCoords.z + 1 }
      }).toArray();

      const systemScan = {
        systemCoordinates: probeCoords,
        objects: systemSector ? systemSector.staticObjects : [],
        otherPlayers: systemPlayers.map((p: any) => ({
          name: p.name,
          coordinates: p.coordinates
        }))
      };

      discoveredSystems.push({
        coordinates: { ...probeCoords },
        systemScan
      });

      // Move to next system
      probeCoords = {
        x: probeCoords.x + probe.direction.x,
        y: probeCoords.y + probe.direction.y,
        z: probeCoords.z + probe.direction.z
      };
    }

    // Probe fuel exhausted, mark as destroyed and cleanup
    await this.destroyProbe(probe.id);

    return discoveredSystems;
  }

  async destroyProbe(probeId: string) {
    const probe = await this.db.collection('probes').findOne({ id: probeId });
    if (!probe) return;

    // Remove probe from all sectors
    await this.db.collection('sectors').updateMany(
      { 'dynamicObjects.probes': probeId },
      { $pull: { 'dynamicObjects.probes': probeId } }
    );

    // Mark probe as destroyed
    await this.db.collection('probes').updateOne(
      { id: probeId },
      {
        $set: {
          status: 'destroyed',
          lastActivity: new Date()
        }
      }
    );
  }

  async getActiveProbes(playerId: string) {
    return await this.db.collection('probes').find({
      playerId,
      status: 'active'
    }).toArray();
  }

  async getAllProbes(playerId: string) {
    return await this.db.collection('probes').find({ playerId }).toArray();
  }

  async getAllActiveProbes() {
    return await this.db.collection('probes').find({ status: 'active' }).toArray();
  }

  async moveProbeOneStep(probeId: string) {
    const probe = await this.db.collection('probes').findOne({ id: probeId });
    if (!probe || probe.status !== 'active' || probe.fuel <= 0) {
      return null;
    }

    // Calculate next position
    const nextCoords = {
      x: Math.floor(probe.coordinates.x) + probe.direction.x,
      y: Math.floor(probe.coordinates.y) + probe.direction.y,
      z: Math.floor(probe.coordinates.z) + probe.direction.z
    };

    // Update probe position and reduce fuel
    const newFuel = probe.fuel - 1;
    await this.db.collection('probes').updateOne(
      { id: probeId },
      {
        $set: {
          coordinates: nextCoords,
          fuel: newFuel,
          lastActivity: new Date()
        }
      }
    );

    // Add probe to current system's dynamic objects
    const systemCoordString = coordinateToString(nextCoords);
    await this.db.collection('sectors').updateOne(
      { coordinates: systemCoordString },
      {
        $addToSet: { 'dynamicObjects.probes': probeId },
        $set: { lastActivity: new Date() }
      },
      { upsert: true }
    );

    // Track exploration for this system
    await this.explorationService.trackPlayerExploration(probe.playerId, nextCoords);

    // Perform system scan
    const systemSector = await this.db.collection('sectors').findOne({ coordinates: systemCoordString });

    // Get other players in this system
    const systemPlayers = await this.db.collection('players').find({
      'coordinates.x': { $gte: nextCoords.x, $lt: nextCoords.x + 1 },
      'coordinates.y': { $gte: nextCoords.y, $lt: nextCoords.y + 1 },
      'coordinates.z': { $gte: nextCoords.z, $lt: nextCoords.z + 1 }
    }).toArray();

    const systemScan = {
      systemCoordinates: nextCoords,
      objects: systemSector ? systemSector.staticObjects : [],
      otherPlayers: systemPlayers.map((p: any) => ({
        name: p.name,
        coordinates: p.coordinates
      }))
    };

    // If fuel is exhausted, destroy the probe
    if (newFuel <= 0) {
      await this.destroyProbe(probeId);
    }

    return {
      probe: { ...probe, coordinates: nextCoords, fuel: newFuel },
      systemScan,
      fuelExhausted: newFuel <= 0
    };
  }

  async moveAllActiveProbes() {
    const activeProbes = await this.getAllActiveProbes();
    const results = [];

    for (const probe of activeProbes) {
      const result = await this.moveProbeOneStep(probe.id);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }
}