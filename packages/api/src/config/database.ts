// MongoDB connection configuration utility
export function buildMongoDBUri(): string {
  const MONGO_USER = process.env.MONGO_USER || 'stellarburn';
  const MONGO_PASSWORD = process.env.MONGO_PASSWORD || 'stellarburn_dev';
  const MONGO_HOST = process.env.MONGO_HOST || 'mongodb';
  const MONGO_PORT = process.env.MONGO_PORT || '27017';
  const MONGO_DATABASE = process.env.MONGO_DATABASE || 'stellarburn';
  const MONGO_AUTH_SOURCE = process.env.MONGO_AUTH_SOURCE || 'admin';

  // Check if full URI is provided first
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }

  // Build URI from individual components
  return `mongodb://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DATABASE}?authSource=${MONGO_AUTH_SOURCE}`;
}

// Individual config values for use if needed
export const DATABASE_CONFIG = {
  user: process.env.MONGO_USER || 'stellarburn',
  password: process.env.MONGO_PASSWORD || 'stellarburn_dev',
  host: process.env.MONGO_HOST || 'mongodb',
  port: process.env.MONGO_PORT || '27017',
  database: process.env.MONGO_DATABASE || 'stellarburn',
  authSource: process.env.MONGO_AUTH_SOURCE || 'admin'
} as const;