import { Coordinates3D, coordinateToString } from '@stellarburn/shared';
import { getMongo } from './databaseService.js';

export interface System {
  _id?: any;
  coordinates: string;
  staticObjects: any[];
  dynamicObjects?: {
    players?: string[];
    probes?: string[];
  };
}

export async function getSystemByCoordinates(coordinates: Coordinates3D): Promise<System | null> {
  try {
    const db = getMongo('stellarburn');
    const coordString = coordinateToString(coordinates);
    const system = await db.collection('systems').findOne({ coordinates: coordString });
    return system as unknown as System | null;
  } catch (error) {
    console.error('Error getting system by coordinates:', error);
    return null;
  }
}

export async function updateSystem(system: System): Promise<boolean> {
  try {
    const db = getMongo('stellarburn');
    const result = await db.collection('systems').updateOne(
      { coordinates: system.coordinates },
      { $set: system }
    );
    return result.modifiedCount > 0 || result.upsertedCount > 0;
  } catch (error) {
    console.error('Error updating system:', error);
    return false;
  }
}

export async function createSystem(system: System): Promise<boolean> {
  try {
    const db = getMongo('stellarburn');
    await db.collection('systems').insertOne(system);
    return true;
  } catch (error) {
    console.error('Error creating system:', error);
    return false;
  }
}

export async function deleteSystem(coordinates: string): Promise<boolean> {
  try {
    const db = getMongo('stellarburn');
    const result = await db.collection('systems').deleteOne({ coordinates });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting system:', error);
    return false;
  }
}

export async function getAllSystems(): Promise<System[]> {
  try {
    const db = getMongo('stellarburn');
    const systems = await db.collection('systems').find({}).toArray();
    return systems as unknown as System[];
  } catch (error) {
    console.error('Error getting all systems:', error);
    return [];
  }
}

export async function findSystemsByQuery(query: any): Promise<System[]> {
  try {
    const db = getMongo('stellarburn');
    const systems = await db.collection('systems').find(query).toArray();
    return systems as unknown as System[];
  } catch (error) {
    console.error('Error finding systems by query:', error);
    return [];
  }
}