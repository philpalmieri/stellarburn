import { Db } from 'mongodb';
import { getMongo } from './databaseService.js';
import { moveAllActiveProbes } from './probeService.js';
import { createProbeScheduler, ProbeSchedulerInterface } from './probeScheduler.js';

export interface ServiceContainer {
  probeScheduler: ProbeSchedulerInterface;
}

let servicesCache: ServiceContainer | null = null;

export function getServices(dbName: string = 'stellarburn'): ServiceContainer {
  if (!servicesCache) {
    const db = getMongo(dbName);

    // Create functional probe scheduler with functional probe service
    const probeScheduler = createProbeScheduler(() => moveAllActiveProbes(db));
    servicesCache = {
      probeScheduler
    };
  }

  return servicesCache;
}

// Keep the old function for backwards compatibility
export function createServices(dbName: string = 'stellarburn'): ServiceContainer {
  return getServices(dbName);
}