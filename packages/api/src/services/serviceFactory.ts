import { Db } from 'mongodb';
import { getMongo } from './databaseService.js';
import { NavigationService } from './navigationService.js';
import { MovementService } from './movementService.js';
import { ScanningService } from './scanningService.js';
import { ExplorationService } from './explorationService.js';
import { ProbeService } from './probeService.js';
import { ProbeScheduler } from './probeScheduler.js';
import { NearestService } from './nearestService.js';
import { StationService } from './stationService.js';

export interface ServiceContainer {
  navigationService: NavigationService;
  movementService: MovementService;
  scanningService: ScanningService;
  explorationService: ExplorationService;
  probeService: ProbeService;
  probeScheduler: ProbeScheduler;
  nearestService: NearestService;
  stationService: StationService;
}

let servicesCache: ServiceContainer | null = null;

export function getServices(dbName: string = 'stellarburn'): ServiceContainer {
  if (!servicesCache) {
    const db = getMongo(dbName);

    const explorationService = new ExplorationService(db);
    const scanningService = new ScanningService(db, explorationService);
    const movementService = new MovementService(db, scanningService);
    const navigationService = new NavigationService(db);
    const probeService = new ProbeService(db, scanningService, explorationService);
    const probeScheduler = new ProbeScheduler(probeService);
    const nearestService = new NearestService(db, explorationService);
    const stationService = new StationService(db);

    servicesCache = {
      navigationService,
      movementService,
      scanningService,
      explorationService,
      probeService,
      probeScheduler,
      nearestService,
      stationService
    };
  }

  return servicesCache;
}

// Keep the old function for backwards compatibility
export function createServices(dbName: string = 'stellarburn'): ServiceContainer {
  return getServices(dbName);
}