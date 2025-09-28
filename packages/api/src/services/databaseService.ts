import { MongoClient, Db } from 'mongodb';

let mongoClient: MongoClient | null = null;

export async function connectToMongoDB(uri: string): Promise<void> {
  if (mongoClient) {
    return;
  }
  
  mongoClient = new MongoClient(uri);
  await mongoClient.connect();
  console.log('✅ Connected to MongoDB successfully');
}

export function getMongo(dbName: string): Db {
  if (!mongoClient) {
    throw new Error('Database not connected. Call connectToMongoDB() first.');
  }
  return mongoClient.db(dbName);
}

export async function closeMongoDB(): Promise<void> {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
  }
}