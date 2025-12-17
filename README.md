# Stellar Burn

A 3D space exploration and trading game built with Node.js, MongoDB, and Docker. Navigate a procedurally generated universe, mine asteroids, trade at stations, and manage autonomous NPC miners.

## AI Note
This is a playground vibe coded with Claude, do not trust it :) 


**Live at:** [stellarburn.com](https://stellarburn.com) (Not actually live now)

## Architecture

This is a monorepo containing multiple packages:

- **packages/api** - Express API server for game state and logic
- **packages/cli** - Command-line game client for players
- **packages/web-ui** - React-based web interface
- **packages/npc-service** - Autonomous NPC management service
- **packages/world-generator** - Universe generation CLI tool
- **packages/shared** - Shared TypeScript types and utilities

## Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)
- npm workspaces support

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd stellarburn
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build Shared Package

The shared package contains TypeScript types used across all services and must be built first:

```bash
npm run build --workspace=packages/shared
```

> **Important:** This step is required on new machines before running Docker containers, as the volume mounts will overlay local files.

### 4. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

The default configuration should work for local development.

## Running the Application

### Start All Services

```bash
npm run dev
# or
docker-compose up
```

This starts:
- **MongoDB** - Database (port 27017)
- **API** - Game server (port 3000)
- **Web UI** - React interface (port 3001)
- **NPC Service** - Autonomous NPCs (port 3002)

### Start Individual Services

```bash
# Database only
npm run db:up

# API only
docker-compose up api

# With specific services
docker-compose up mongodb api web-ui
```

## Universe Setup

### Generate Universe

Create a new 3D universe with stars, planets, stations, and asteroids.

The world generator must be run from the API container:

```bash
# Generate with default parameters (25x25x25 universe, 5% sparsity)
docker-compose exec api npm run dev --workspace=packages/world-generator universe

# Generate with custom parameters
docker-compose exec api npm run dev --workspace=packages/world-generator universe -- --size 50 --sparsity 0.05 --clear
```

Parameters:
- `--size <number>` - Universe extends from -size to +size in each dimension (default: 25)
- `--sparsity <number>` - Density of objects, 0-1 (default: 0.05 = 5% of sectors have objects)
- `--clear` - Clears existing universe data before generating

Example sizes:
- `--size 25` - Creates a 50x50x50 universe (125,000 possible sectors)
- `--size 50` - Creates a 100x100x100 universe (1,000,000 possible sectors)

### Seed Station Inventory

After generating the universe, populate stations with tradeable items:

```bash
docker-compose exec api npm run seed-stations --workspace=packages/api
```

This adds inventory to all stations including:
- Fuel and probes (always available)
- Resources (iron ore, copper, gold, platinum, etc.)
- Manufactured goods (electronics, medical supplies, etc.)

## Playing the Game

### Creating a Player

```bash
docker-compose exec cli npm run dev create "PlayerName"
```

This returns a player ID - save this for all future commands!

### CLI Commands

All commands follow the pattern: `stellarburn <playerId> <action> [target]`

#### Basic Commands

```bash
# View player status (location, fuel, credits, cargo)
stellarburn <playerId> status

# Scan local area (current sector and adjacent sectors)
stellarburn <playerId> scan

# Scan entire current system
stellarburn <playerId> sscan
```

#### Movement

**Local Movement** (0.1 unit steps within a system):
```bash
stellarburn <playerId> n        # North
stellarburn <playerId> s        # South
stellarburn <playerId> e        # East
stellarburn <playerId> w        # West
stellarburn <playerId> u        # Up
stellarburn <playerId> d        # Down
```

**Jump Movement** (1 unit jumps between systems):
```bash
stellarburn <playerId> jn       # Jump north
stellarburn <playerId> js       # Jump south
stellarburn <playerId> je       # Jump east
stellarburn <playerId> jw       # Jump west
stellarburn <playerId> ju       # Jump up
stellarburn <playerId> jd       # Jump down
```

#### Navigation & Exploration

```bash
# View known systems database (systems with objects)
stellarburn <playerId> db

# View all known systems (including empty)
stellarburn <playerId> dball

# View specific system details
stellarburn <playerId> db "1,2,3"

# Plot course to coordinates
stellarburn <playerId> plot "5.5,3.2,1.0"

# Autopilot to destination
stellarburn <playerId> go "5.5,3.2,1.0"

# Find nearest entity
stellarburn <playerId> nearest station
stellarburn <playerId> nearest planet
stellarburn <playerId> nearest asteroid
```

#### Probe System

Launch autonomous probes to scan distant systems:

```bash
# Launch probe in direction (scans 10 systems ahead)
stellarburn <playerId> probe n

# View active probes
stellarburn <playerId> probes
```

Probes automatically:
- Jump through systems in the specified direction
- Scan each system for objects
- Add discoveries to your navigation database
- Stop after 10 jumps or when fuel depleted

#### Station & Trading

```bash
# Find nearby station
stellarburn <playerId> station

# Dock at nearby station
stellarburn <playerId> dock

# View station market
stellarburn <playerId> market

# Buy items
stellarburn <playerId> buy fuel 10
stellarburn <playerId> buy probe 5
stellarburn <playerId> buy iron_ore 100

# Sell items
stellarburn <playerId> sell iron_ore 50

# Undock from station
stellarburn <playerId> undock
```

#### Mining

```bash
# Auto-mine nearest asteroid
stellarburn <playerId> mine

# Check mining status
stellarburn <playerId> mining
```

Mining:
- Automatically navigates to nearest asteroid
- Mines resources over time
- Adds mined resources to cargo
- Resources can be sold at stations

#### Admin Commands

```bash
# Reset fuel and probes (debugging)
stellarburn <playerId> reset
```

## Running CLI Commands Inside Container

For convenience, you can run CLI commands inside the Docker container:

```bash
# Enter the CLI container
docker-compose exec cli sh

# Inside container, run commands
npm run dev create "MyPlayer"
npm run dev <playerId> status
npm run dev <playerId> scan
```

## NPC System

The NPC service manages autonomous miners that explore, mine, and trade:

```bash
# Spawn NPC miners (default: 1 miner, 10 operations)
stellarburn <playerId> spawn miner

# Spawn multiple NPCs with custom operation count
stellarburn <playerId> spawn miner 5 20

# View NPC status
stellarburn <playerId> npcs

# Remove completed NPCs
stellarburn <playerId> cleanup

# Stop all NPCs
stellarburn <playerId> stopnpcs
```

NPC miners autonomously:
1. Find nearest asteroid
2. Navigate to it
3. Mine resources
4. Find nearest station
5. Navigate and dock
6. Sell resources
7. Repeat for N operations

## Development

### Workspace Commands

```bash
# Build all packages
npm run build

# Build specific package
npm run build --workspace=packages/api

# Run dev mode for specific service
npm run dev --workspace=packages/api
```

### Docker Commands

```bash
# Rebuild containers
docker-compose build

# View logs
docker-compose logs -f api
docker-compose logs -f npc-service

# Stop all containers
docker-compose down

# Stop and remove volumes (resets database)
docker-compose down -v

# Clean everything
npm run clean
```

### Monorepo Structure

This project uses npm workspaces. The `packages/shared` package is a dependency of other packages:

- **packages/shared** - Must be built first, contains TypeScript types
- Other packages import from `@stellarburn/shared`
- Changes to shared types require rebuilding the shared package

## Database

MongoDB stores:
- **systems** - 3D universe sectors with stars, planets, stations, asteroids
- **players** - Player state, location, inventory, ship data
- **probes** - Active probe positions and status
- **npcs** - NPC state and operation queues

Access MongoDB:

```bash
# Via Docker
docker-compose exec mongodb mongosh -u stellarburn -p stellarburn_dev --authenticationDatabase admin stellarburn

# From host (if port exposed)
mongosh mongodb://stellarburn:stellarburn_dev@localhost:27017/stellarburn?authSource=admin
```

## API Endpoints

The API runs on port 3000:

- `GET /health` - Health check
- `GET /api/universe` - Universe metadata
- `POST /api/player` - Create player
- `GET /api/player/:id` - Get player status
- `POST /api/player/:id/move` - Move player
- `POST /api/player/:id/jump` - Jump to new system
- `GET /api/navigation/scan` - Scan area
- `GET /api/navigation/system-scan` - Scan system
- `POST /api/navigation/plot` - Plot course
- `POST /api/navigation/autopilot` - Execute autopilot step
- `GET /api/station/:id` - Get station info
- `POST /api/station/dock` - Dock at station
- `POST /api/station/undock` - Undock from station
- `POST /api/station/trade/buy` - Buy from station
- `POST /api/station/trade/sell` - Sell to station
- `POST /api/mining/start` - Start mining
- `GET /api/mining/status` - Get mining status

See API documentation for full endpoint details.

## Troubleshooting

### Container fails to start with "Cannot find package '@stellarburn/shared'"

Build the shared package locally:
```bash
npm run build --workspace=packages/shared
```

This is required because volume mounts overlay the local filesystem, so the built files must exist locally.

### No stations/objects in universe

Generate the universe first:
```bash
docker-compose exec api npm run dev --workspace=packages/world-generator universe
```

Then seed station inventories:
```bash
docker-compose exec api npm run seed-stations --workspace=packages/api
```

### Port conflicts

If ports 3000, 3001, 3002, or 27017 are in use, modify the port mappings in `docker-compose.yml`.

### Database issues

Reset the database:
```bash
docker-compose down -v
docker-compose up -d mongodb api
docker-compose exec api npm run dev --workspace=packages/world-generator universe
docker-compose exec api npm run seed-stations --workspace=packages/api
```

## Game Concepts

### Coordinate System

The universe uses a 3D coordinate system:
- **System coordinates**: Integer values (e.g., 1,2,3)
- **Sector coordinates**: Float values with 0.1 precision (e.g., 1.5,2.3,3.7)
- Each system is a 1x1x1 cube
- Movement within a system is in 0.1 steps
- Jumping moves between systems (1 unit jumps)

### Fuel & Resources

- **Fuel**: Required for movement and jumps
- **Probes**: Autonomous scouts (max 20 per player)
- **Credits**: Currency for trading
- **Cargo**: Mined resources and purchased goods

### Stations

Stations are classified into classes (A, B, C) with different inventories:
- **Fuel & Probes**: Always available at all stations
- **Resources**: Raw materials from mining
- **Goods**: Manufactured items with varying availability

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]
