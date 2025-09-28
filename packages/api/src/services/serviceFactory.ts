import { Db } from 'mongodb';
import { getMongo } from './databaseService.js';
import { NavigationService } from './navigationService.js';
import { MovementService } from './movementService.js';
import { ScanningService } from './scanningService.js';
import { ExplorationService } from './explorationService.js';

export interface ServiceContainer {
  navigationService: NavigationService;
  movementService: MovementService;
  scanningService: ScanningService;
  explorationService: ExplorationService;
}

let servicesCache: ServiceContainer | null = null;

export function getServices(dbName: string = 'stellarburn'): ServiceContainer {
  if (!servicesCache) {
    const db = getMongo(dbName);

    const explorationService = new ExplorationService(db);
    const scanningService = new ScanningService(db, explorationService);
    const movementService = new MovementService(db, scanningService);
    const navigationService = new NavigationService(db);

    servicesCache = {
      navigationService,
      movementService,
      scanningService,
      explorationService
    };
  }

  return servicesCache;
}

// Keep the old function for backwards compatibility
export function createServices(dbName: string = 'stellarburn'): ServiceContainer {
  return getServices(dbName);
}