// Switch to the stellarburn database
db = db.getSiblingDB('stellarburn');

// Create collections
db.createCollection('systems');
db.createCollection('players');
db.createCollection('probes');

// Create indexes for efficient 3D coordinate queries
db.systems.createIndex({ "coordinates": 1 });
db.systems.createIndex({ "dynamicObjects.ships": 1 });
db.systems.createIndex({ "dynamicObjects.probes": 1 });
db.systems.createIndex({ "lastActivity": 1 });

// Create compound index for 3D coordinate queries
db.systems.createIndex({
  "coord.x": 1,
  "coord.y": 1,
  "coord.z": 1
});

db.players.createIndex({ "id": 1 });
db.players.createIndex({ "coordinates": 1 });

db.probes.createIndex({ "playerId": 1 });
db.probes.createIndex({ "coordinates": 1 });
db.probes.createIndex({ "status": 1 });

print("StellarBurn database initialized successfully!");