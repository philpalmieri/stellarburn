// Switch to the stellarburn database
db = db.getSiblingDB('stellarburn');

// Create collections
db.createCollection('sectors');
db.createCollection('players');
db.createCollection('systems');

// Create indexes for efficient 4D coordinate queries
db.sectors.createIndex({ "coordinates": 1 });
db.sectors.createIndex({ "dynamicObjects.ships": 1 });
db.sectors.createIndex({ "lastActivity": 1 });

// Create compound index for geospatial-style queries
db.sectors.createIndex({ 
  "coord.x": 1, 
  "coord.y": 1, 
  "coord.z": 1, 
  "coord.w": 1 
});

db.players.createIndex({ "playerId": 1 });
db.players.createIndex({ "currentCoordinates": 1 });

print("StellarBurn database initialized successfully!");