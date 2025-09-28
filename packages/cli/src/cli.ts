#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { createPlayer, getPlayerStatus, movePlayer, scanArea, jumpPlayer, systemScan, plotCourse, autopilot, getKnownSystems, getAllKnownSystems, getSystemDetails, launchProbe, getActiveProbes, findNearest } from './game.js';

// Reusable display functions for scan results
function displayCurrentZone(zone: any) {
  console.log(chalk.yellow(`Current Zone: ${zone.coordinates.x},${zone.coordinates.y},${zone.coordinates.z}`));

  // Display objects in current zone
  if (zone.objects.length > 0) {
    console.log(chalk.white(`Objects in zone:`));
    zone.objects.forEach((obj: any) => {
      const color = obj.type === 'star' ? chalk.red :
                   obj.type === 'planet' ? chalk.green :
                   obj.type === 'station' ? chalk.cyan : chalk.gray;
      console.log(`  ${color(obj.type)}: ${obj.name} (size: ${obj.size} zones)`);
    });
  }

  // Display other players in current zone
  if (zone.otherPlayers && zone.otherPlayers.length > 0) {
    console.log(chalk.magenta(`Other ships in zone:`));
    zone.otherPlayers.forEach((player: any) => {
      console.log(`  ${chalk.magenta('ship')}: ${player.name} at ${player.coordinates.x.toFixed(1)},${player.coordinates.y.toFixed(1)},${player.coordinates.z.toFixed(1)}`);
    });
  }

  // Display probes in current zone
  if (zone.probes && zone.probes.length > 0) {
    console.log(chalk.yellow(`Probes in zone:`));
    zone.probes.forEach((probe: any) => {
      console.log(`  ${chalk.yellow('probe')}: ID ${probe.id} (fuel: ${probe.fuel}) at ${probe.coordinates.x.toFixed(1)},${probe.coordinates.y.toFixed(1)},${probe.coordinates.z.toFixed(1)}`);
    });
  }

  // Show empty space only if nothing is present
  if (zone.objects.length === 0 &&
      (!zone.otherPlayers || zone.otherPlayers.length === 0) &&
      (!zone.probes || zone.probes.length === 0)) {
    console.log(chalk.gray(`Empty space`));
  }
}

function displayAdjacentZones(adjacentZones: any) {
  console.log(chalk.blue(`\nAdjacent Zones:`));
  Object.entries(adjacentZones).forEach(([direction, zone]: [string, any]) => {
    const objectCount = zone.objects.length;
    const playerCount = zone.otherPlayers ? zone.otherPlayers.length : 0;
    const probeCount = zone.probes ? zone.probes.length : 0;
    let status = chalk.gray('empty');

    if (objectCount > 0 || playerCount > 0 || probeCount > 0) {
      const statusParts = [];

      if (objectCount > 0) {
        const hasStation = zone.objects.some((obj: any) => obj.type === 'station');
        const hasStar = zone.objects.some((obj: any) => obj.type === 'star');

        if (hasStation) statusParts.push(chalk.cyan('station'));
        else if (hasStar) statusParts.push(chalk.red('star system'));
        else statusParts.push(chalk.green(`${objectCount} objects`));
      }

      if (playerCount > 0) {
        statusParts.push(chalk.magenta(`${playerCount} ship${playerCount > 1 ? 's' : ''}`));
      }

      if (probeCount > 0) {
        statusParts.push(chalk.yellow(`${probeCount} probe${probeCount > 1 ? 's' : ''}`));
      }

      status = statusParts.join(', ');
    }

    console.log(`  ${chalk.yellow(direction.padEnd(5))}: ${status}`);
  });
}

function displayLocalScan(scanResult: any) {
  console.log(chalk.blue(`=== Local Scan ===`));
  displayCurrentZone(scanResult.currentZone);
  displayAdjacentZones(scanResult.adjacentZones);
}

// Distance calculation helpers
interface Coordinates3D {
  x: number;
  y: number;
  z: number;
}

function getSystemCoords(coord: Coordinates3D): Coordinates3D {
  return {
    x: Math.floor(coord.x),
    y: Math.floor(coord.y),
    z: Math.floor(coord.z)
  };
}

function calculateJumpDistance(from: Coordinates3D, to: Coordinates3D): number {
  const fromSystem = getSystemCoords(from);
  const toSystem = getSystemCoords(to);

  // Manhattan distance in system jumps
  return Math.abs(toSystem.x - fromSystem.x) +
         Math.abs(toSystem.y - fromSystem.y) +
         Math.abs(toSystem.z - fromSystem.z);
}

function calculateMoveDistance(from: Coordinates3D, to: Coordinates3D): number {
  // Check if in same system
  const fromSystem = getSystemCoords(from);
  const toSystem = getSystemCoords(to);

  if (fromSystem.x === toSystem.x && fromSystem.y === toSystem.y && fromSystem.z === toSystem.z) {
    // Same system - calculate Manhattan distance in moves (each move is 0.1 units)
    const deltaX = Math.abs(to.x - from.x);
    const deltaY = Math.abs(to.y - from.y);
    const deltaZ = Math.abs(to.z - from.z);

    return Math.ceil(deltaX / 0.1) + Math.ceil(deltaY / 0.1) + Math.ceil(deltaZ / 0.1);
  } else {
    // Different systems - this is more complex
    const jumpDistance = calculateJumpDistance(from, to);

    // Estimate moves to get to system edge from current position
    const fromSystemCenter = { x: fromSystem.x + 0.5, y: fromSystem.y + 0.5, z: fromSystem.z + 0.5 };
    const toSystemCenter = { x: toSystem.x + 0.5, y: toSystem.y + 0.5, z: toSystem.z + 0.5 };

    // Movement within source system (simplified)
    const fromMoves = Math.ceil(Math.abs(from.x - fromSystemCenter.x) / 0.1) +
                     Math.ceil(Math.abs(from.y - fromSystemCenter.y) / 0.1) +
                     Math.ceil(Math.abs(from.z - fromSystemCenter.z) / 0.1);

    // Movement within target system
    const toMoves = Math.ceil(Math.abs(to.x - toSystemCenter.x) / 0.1) +
                   Math.ceil(Math.abs(to.y - toSystemCenter.y) / 0.1) +
                   Math.ceil(Math.abs(to.z - toSystemCenter.z) / 0.1);

    return jumpDistance + fromMoves + toMoves;
  }
}

const program = new Command();

program
  .name('stellarburn')
  .description('StellarBurn CLI Game Client\n\nUsage Examples:\n  stellarburn create "PlayerName"           - Create new player\n  stellarburn <playerId> status              - Show player status\n  stellarburn <playerId> scan                - Local area scan\n  stellarburn <playerId> db                  - Show known systems\n  stellarburn <playerId> db "1,2,3"         - Show system details\n  stellarburn <playerId> plot "1,2,3"       - Plot course\n  stellarburn <playerId> go "1,2,3"         - Autopilot to destination')
  .version('1.0.0');

// Create player
program
  .command('create <name>')
  .description('Create a new player')
  .action(async (name) => {
    try {
      const result = await createPlayer(name) as any;
      console.log(chalk.green(`✓ Player created: ${result.player.name}`));
      console.log(chalk.blue(`Location: ${result.spawnLocation}`));
      console.log(chalk.yellow(`Fuel: ${result.player.ship.fuel}/${result.player.ship.maxFuel}`));
      console.log(chalk.green(`Credits: ${result.player.credits}`));
      console.log(chalk.gray(`Player ID: ${result.player.id}`));
    } catch (error: any) {
      console.log(chalk.red(`✗ ${error.message}`));
    }
  });




// Player commands with consistent playerId-first pattern
program
  .argument('<playerId>', 'Player ID')
  .argument('<action>', 'Action to perform')
  .argument('[target]', 'Optional target/coordinates for actions like db, plot, go')
  .allowUnknownOption(true)
  .action(async (playerId, action, target) => {
    // Handle case where coordinates start with dash by checking raw process arguments
    if (!target) {
      const args = process.argv.slice(2); // Remove 'node' and script name
      if (args.length >= 3) {
        const possibleTarget = args[2];
        if (possibleTarget && possibleTarget.includes(',')) {
          target = possibleTarget;
        }
      }
    }
    try {
      switch (action.toLowerCase()) {
        case 'status':
        case 'stat':
          const status = await getPlayerStatus(playerId);
          console.log(chalk.blue(`=== ${status.name} Status ===`));
          console.log(`Location: ${chalk.yellow(status.coordinatesString)}`);
          console.log(`Fuel: ${chalk.yellow(status.fuel)}/${status.maxFuel}`);
          console.log(`Probes: ${chalk.cyan(status.probes)}`);
          console.log(`Credits: ${chalk.green(status.credits)}`);
          break;

        case 'scan':
          const scanResult = await scanArea(playerId) as any;
          displayLocalScan(scanResult);
          break;

        case 'sscan':
        case 'systemscan':
          const systemResult = await systemScan(playerId) as any;
          console.log(chalk.blue(`=== System Scan ===`));
          console.log(chalk.yellow(`System: ${systemResult.systemCoordinates.x},${systemResult.systemCoordinates.y},${systemResult.systemCoordinates.z}`));
          
          if (systemResult.objects.length > 0) {
            console.log(chalk.white(`Objects in system (sorted by distance):`));
            systemResult.objects.forEach((obj: any) => {
              const color = obj.type === 'star' ? chalk.red :
                           obj.type === 'planet' ? chalk.green :
                           obj.type === 'station' ? chalk.cyan : chalk.gray;
              const distanceInfo = obj.distance ? ` (${obj.distance.toFixed(2)} units away, ${obj.size} zones)` : ` (${obj.size} zones)`;
              console.log(`  ${color(obj.type)}: ${obj.name} at ${obj.coordinates.x},${obj.coordinates.y},${obj.coordinates.z}${distanceInfo}`);
            });
          } else {
            console.log(chalk.gray(`Empty system`));
          }
          
          if (systemResult.otherPlayers.length > 0) {
            console.log(chalk.magenta(`\nOther ships (sorted by distance):`));
            systemResult.otherPlayers.forEach((player: any) => {
              const distanceInfo = player.distance ? ` (${player.distance.toFixed(2)} units away)` : '';
              console.log(`  ${chalk.magenta(player.name)} at ${player.coordinates.x},${player.coordinates.y},${player.coordinates.z}${distanceInfo}`);
            });
          }

          if (systemResult.probes && systemResult.probes.length > 0) {
            console.log(chalk.yellow(`\nProbes in system (sorted by distance):`));
            systemResult.probes.forEach((probe: any) => {
              const distanceInfo = probe.distance ? ` (${probe.distance.toFixed(2)} units away)` : '';
              console.log(`  ${chalk.yellow('probe')}: ID ${probe.id} (fuel: ${probe.fuel})${distanceInfo}`);
            });
          }
          break;

        // Regular movement
        case 'n': case 'north':
          await quickMove(playerId, 'north');
          break;
        case 's': case 'south':
          await quickMove(playerId, 'south');
          break;
        case 'e': case 'east':
          await quickMove(playerId, 'east');
          break;
        case 'w': case 'west':
          await quickMove(playerId, 'west');
          break;
        case 'u': case 'up':
          await quickMove(playerId, 'up');
          break;
        case 'd': case 'down':
          await quickMove(playerId, 'down');
          break;

        // Jump movement
        case 'jn': case 'jumpnorth':
          await jumpMove(playerId, 'north');
          break;
        case 'js': case 'jumpsouth':
          await jumpMove(playerId, 'south');
          break;
        case 'je': case 'jumpeast':
          await jumpMove(playerId, 'east');
          break;
        case 'jw': case 'jumpwest':
          await jumpMove(playerId, 'west');
          break;
        case 'ju': case 'jumpup':
          await jumpMove(playerId, 'up');
          break;
        case 'jd': case 'jumpdown':
          await jumpMove(playerId, 'down');
          break;

        // Probe commands
        case 'probe':
          if (!target) {
            console.log(chalk.red('✗ Probe requires direction'));
            console.log(chalk.gray('Usage: stellarburn <playerId> probe n (or s/e/w/u/d)'));
            break;
          }
          await launchProbeCommand(playerId, target);
          break;

        case 'probes':
          await showActiveProbes(playerId);
          break;

        // Database commands
        case 'db':
          if (target) {
            // Remove quotes if present
            const coordinates = target.replace(/["']/g, '');
            await showSystemDetails(playerId, coordinates);
          } else {
            await showKnownSystems(playerId);
          }
          break;

        case 'dball':
          await showAllKnownSystems(playerId);
          break;

        // Navigation commands
        case 'plot':
          if (!target) {
            console.log(chalk.red('✗ Plot requires destination coordinates'));
            console.log(chalk.gray('Usage: stellarburn <playerId> plot "1,2,3"'));
            break;
          }
          const plotDestination = target.replace(/["']/g, '');
          await plotCourseTo(playerId, plotDestination);
          break;

        case 'go':
          if (!target) {
            console.log(chalk.red('✗ Go requires destination coordinates'));
            console.log(chalk.gray('Usage: stellarburn <playerId> go "1,2,3"'));
            break;
          }
          const goDestination = target.replace(/["']/g, '');
          await gotoDestination(playerId, goDestination);
          break;

        // Nearest command
        case 'nearest':
          if (!target) {
            console.log(chalk.red('✗ Nearest requires entity type'));
            console.log(chalk.gray('Usage: stellarburn <playerId> nearest station (or planet/star/player/probe)'));
            break;
          }
          await findNearestEntity(playerId, target);
          break;

        default:
          console.log(chalk.red(`Unknown action: ${action}`));
          console.log(chalk.blue(`\nAvailable actions for ${playerId}:`));
          console.log(chalk.gray(`  status           - Show player status`));
          console.log(chalk.gray(`  scan             - Local area scan`));
          console.log(chalk.gray(`  sscan            - System scan`));
          console.log(chalk.gray(`  db               - Show known systems with objects`));
          console.log(chalk.gray(`  db "x,y,z"       - Show specific system details`));
          console.log(chalk.gray(`  dball            - Show all known systems`));
          console.log(chalk.gray(`  nearest station  - Find nearest station/planet/star/player/probe`));
          console.log(chalk.gray(`  plot "x,y,z"     - Plot course to coordinates`));
          console.log(chalk.gray(`  go "x,y,z"       - Autopilot to coordinates`));
          console.log(chalk.gray(`  n,s,e,w,u,d      - Move in direction`));
          console.log(chalk.gray(`  jn,js,je,jw,ju,jd - Jump in direction`));
          console.log(chalk.gray(`  probe n          - Launch probe in direction (scans 10 systems)`));
          console.log(chalk.gray(`  probes           - Show active probes status`));
          console.log(chalk.blue(`\nTip: Use quotes around coordinates like "1,2,3"`));
      }
    } catch (error: any) {
      console.log(chalk.red(`✗ ${error.message}`));
    }
  });

async function quickMove(playerId: string, direction: string) {
  try {
    const result = await movePlayer(playerId, direction) as any;
    console.log(result.success ? chalk.green(`✓ ${result.message}`) : chalk.red(`✗ ${result.message}`));

    // Display local scan results if available
    if (result.success && result.localScan) {
      console.log(); // Add blank line
      displayLocalScan(result.localScan);
    }
  } catch (error: any) {
    console.log(chalk.red(`✗ ${error.message}`));
  }
}

async function jumpMove(playerId: string, direction: string) {
  try {
    const result = await jumpPlayer(playerId, direction) as any;
    console.log(result.success ? chalk.green(`✓ ${result.message}`) : chalk.red(`✗ ${result.message}`));
    console.log(chalk.yellow(`Fuel remaining: ${result.fuel}`));

    // Display system scan results
    if (result.success && result.systemScan) {
      console.log(chalk.blue(`\n=== System Scan ===`));
      const scan = result.systemScan;
      console.log(chalk.yellow(`System: ${scan.systemCoordinates.x},${scan.systemCoordinates.y},${scan.systemCoordinates.z}`));

      if (scan.objects.length > 0) {
        console.log(chalk.white(`Objects in system:`));
        scan.objects.forEach((obj: any) => {
          const color = obj.type === 'star' ? chalk.red :
                       obj.type === 'planet' ? chalk.green :
                       obj.type === 'station' ? chalk.cyan : chalk.gray;
          console.log(`  ${color(obj.type)}: ${obj.name} at ${obj.coordinates.x},${obj.coordinates.y},${obj.coordinates.z} (${obj.size} zones)`);
        });
      } else {
        console.log(chalk.gray(`Empty system`));
      }

      if (scan.otherPlayers.length > 0) {
        console.log(chalk.magenta(`\nOther ships:`));
        scan.otherPlayers.forEach((player: any) => {
          console.log(`  ${chalk.magenta(player.name)} at ${player.coordinates.x},${player.coordinates.y},${player.coordinates.z}`);
        });
      }
    }
  } catch (error: any) {
    console.log(chalk.red(`✗ ${error.message}`));
  }
}

// Database helper functions
async function showKnownSystems(playerId: string) {
  try {
    const result = await getKnownSystems(playerId) as any;
    console.log(chalk.blue(`=== Known Systems Database ===`));
    console.log(chalk.yellow(`Total Known: ${result.totalKnownSystems} systems`));
    console.log(chalk.yellow(`With Objects: ${result.systemsWithObjects} systems`));
    console.log(chalk.gray(`Player Location: ${result.player.x},${result.player.y},${result.player.z}`));

    if (result.systems.length === 0) {
      console.log(chalk.gray(`No systems with objects discovered yet.`));
      console.log(chalk.gray(`Explore the universe to discover stars, planets, and stations!`));
      return;
    }

    const playerCoords = result.player;

    console.log(chalk.blue(`\n=== Systems with Objects (sorted by distance) ===`));
    result.systems.forEach((system: any, index: number) => {
      // Parse system coordinates
      const [x, y, z] = system.coordinates.split(',').map(Number);
      const systemCoords = { x, y, z };

      // Calculate jump distance
      const jumpDistance = calculateJumpDistance(playerCoords, systemCoords);
      const distanceDisplay = jumpDistance === 0 ?
        chalk.green('(current system)') :
        chalk.yellow(`(${jumpDistance} jump${jumpDistance > 1 ? 's' : ''})`);

      console.log(chalk.white(`${(index + 1).toString().padStart(2)}. System ${chalk.yellow(system.coordinates)} ${distanceDisplay}`));

      const starCount = system.objects.filter((obj: any) => obj.type === 'star').length;
      const planetCount = system.objects.filter((obj: any) => obj.type === 'planet').length;
      const stationCount = system.objects.filter((obj: any) => obj.type === 'station').length;
      const asteroidCount = system.objects.filter((obj: any) => obj.type === 'asteroid').length;

      const parts = [];
      if (starCount > 0) parts.push(chalk.red(`${starCount} star${starCount > 1 ? 's' : ''}`));
      if (planetCount > 0) parts.push(chalk.green(`${planetCount} planet${planetCount > 1 ? 's' : ''}`));
      if (stationCount > 0) parts.push(chalk.cyan(`${stationCount} station${stationCount > 1 ? 's' : ''}`));
      if (asteroidCount > 0) parts.push(chalk.gray(`${asteroidCount} asteroid${asteroidCount > 1 ? 's' : ''}`));

      console.log(`    ${parts.join(', ')}`);
    });

    console.log(chalk.blue(`\nTip: Use 'db ${result.systems[0]?.coordinates}' for detailed system info`));
  } catch (error: any) {
    console.log(chalk.red(`✗ ${error.message}`));
  }
}

async function showAllKnownSystems(playerId: string) {
  try {
    const result = await getAllKnownSystems(playerId) as any;
    console.log(chalk.blue(`=== Complete Known Systems Database (sorted by distance) ===`));
    console.log(chalk.yellow(`Total Systems: ${result.totalKnownSystems}`));
    console.log(chalk.gray(`Player Location: ${result.player.x},${result.player.y},${result.player.z}`));

    if (result.systems.length === 0) {
      console.log(chalk.gray(`No systems discovered yet. Start exploring!`));
      return;
    }

    const withObjects = result.systems.filter((sys: any) => !sys.isEmpty);
    const empty = result.systems.filter((sys: any) => sys.isEmpty);

    console.log(chalk.blue(`\n=== Systems with Objects (${withObjects.length}) ===`));
    withObjects.forEach((system: any, index: number) => {
      console.log(`${chalk.yellow(system.coordinates)} - ${chalk.green(system.objectCount)} objects`);
    });

    if (empty.length > 0) {
      console.log(chalk.blue(`\n=== Empty Systems (${empty.length}) ===`));
      empty.slice(0, 10).forEach((system: any) => {
        console.log(chalk.gray(system.coordinates));
      });
      if (empty.length > 10) {
        console.log(chalk.gray(`... and ${empty.length - 10} more empty systems`));
      }
    }
  } catch (error: any) {
    console.log(chalk.red(`✗ ${error.message}`));
  }
}

async function showSystemDetails(playerId: string, coordinates: string) {
  try {
    const result = await getSystemDetails(playerId, coordinates) as any;
    const system = result.system;

    console.log(chalk.blue(`=== System ${chalk.yellow(coordinates)} Details ===`));
    console.log(chalk.gray(`Player Location: ${result.player.x},${result.player.y},${result.player.z}`));

    if (system.isEmpty) {
      console.log(chalk.gray(`This system is empty space.`));
      return;
    }

    console.log(chalk.green(`Objects: ${system.objectCount}`));
    if (system.discovered) {
      console.log(chalk.gray(`Discovered: ${new Date(system.discovered).toLocaleDateString()}`));
    }

    console.log(chalk.blue(`\n=== Objects in System ===`));
    system.objects.forEach((obj: any, index: number) => {
      const color = obj.type === 'star' ? chalk.red :
                   obj.type === 'planet' ? chalk.green :
                   obj.type === 'station' ? chalk.cyan : chalk.gray;

      // Calculate movement distance
      const moveDistance = calculateMoveDistance(result.player, obj.coordinates);
      const jumpDistance = calculateJumpDistance(result.player, obj.coordinates);

      let distanceInfo;
      if (jumpDistance === 0) {
        // Same system
        distanceInfo = chalk.green(`${moveDistance} moves`);
      } else {
        // Different system - show total moves including jumps
        distanceInfo = chalk.yellow(`${jumpDistance} jumps, ${moveDistance} total moves`);
      }

      console.log(`${(index + 1).toString().padStart(2)}. ${color(obj.type.toUpperCase())}: ${chalk.white(obj.name)}`);
      console.log(`    Location: ${obj.coordinates.x},${obj.coordinates.y},${obj.coordinates.z}`);
      console.log(`    Size: ${obj.size} | Distance: ${obj.distance} units | Travel: ${distanceInfo}`);

      if (obj.resources && obj.resources.length > 0) {
        console.log(`    Resources: ${obj.resources.join(', ')}`);
      }
    });

    if (system.dynamicObjects.ships.length > 0) {
      console.log(chalk.magenta(`\n=== Ships in System ===`));
      system.dynamicObjects.ships.forEach((ship: any) => {
        console.log(`  ${chalk.magenta(ship.name)} at ${ship.coordinates.x},${ship.coordinates.y},${ship.coordinates.z}`);
      });
    }
  } catch (error: any) {
    console.log(chalk.red(`✗ ${error.message}`));
  }
}

async function plotCourseTo(playerId: string, destination: string) {
  try {
    // First get player's current position
    const status = await getPlayerStatus(playerId);
    const currentPos = `${status.coordinates.x},${status.coordinates.y},${status.coordinates.z}`;

    const result = await plotCourse(playerId, currentPos, destination) as any;
    console.log(chalk.blue(`=== Course Plot ===`));
    console.log(chalk.yellow(`From: ${result.from}`));
    console.log(chalk.yellow(`To: ${result.to}`));
    console.log(chalk.green(`Total Steps: ${result.path.steps.length}`));
    console.log(chalk.green(`Total Fuel Cost: ${result.path.totalFuelCost}`));
    console.log(chalk.green(`Total Distance: ${result.path.totalDistance.toFixed(1)}`));
    console.log(chalk.green(`Estimated Time: ${result.path.estimatedTime} steps`));

    console.log(chalk.blue(`\n=== Flight Plan ===`));
    result.path.steps.slice(0, 10).forEach((step: any, index: number) => {
      const stepType = step.type === 'jump' ? chalk.cyan('JUMP') : chalk.white('MOVE');
      const direction = chalk.yellow(step.direction.toUpperCase());
      const coords = `${step.to.x},${step.to.y},${step.to.z}`;
      console.log(`${(index + 1).toString().padStart(2)}: ${stepType} ${direction} to ${coords} (fuel: ${step.fuelCost})`);
    });

    if (result.path.steps.length > 10) {
      console.log(chalk.gray(`... and ${result.path.steps.length - 10} more steps`));
    }

    console.log(chalk.green(`\n✓ Course plotted successfully! Use '${playerId} go "${destination}"' to begin autopilot.`));
  } catch (error: any) {
    console.log(chalk.red(`✗ ${error.message}`));
  }
}

async function gotoDestination(playerId: string, destination: string) {
  try {
    // First get player's current position
    const status = await getPlayerStatus(playerId);
    const currentPos = `${status.coordinates.x},${status.coordinates.y},${status.coordinates.z}`;

    console.log(chalk.blue(`=== Navigation System ===`));
    console.log(chalk.yellow(`Current position: ${currentPos}`));
    console.log(chalk.yellow(`Destination: ${destination}`));
    console.log(chalk.gray(`Player: ${status.name} (Fuel: ${status.fuel}/${status.maxFuel})`));

    // Plot the course
    console.log(chalk.blue(`\nPlotting course...`));
    const courseResult = await plotCourse(playerId, currentPos, destination) as any;

    console.log(chalk.green(`✓ Course plotted successfully!`));
    console.log(chalk.green(`Total Steps: ${courseResult.path.steps.length}`));
    console.log(chalk.green(`Total Fuel Cost: ${courseResult.path.totalFuelCost}`));
    console.log(chalk.green(`Total Distance: ${courseResult.path.totalDistance.toFixed(1)}`));

    // Execute autopilot
    console.log(chalk.blue(`\n=== Autopilot Engaged ===`));
    await executeAutopilot(playerId, courseResult.path.steps, false);

  } catch (error: any) {
    console.log(chalk.red(`✗ ${error.message}`));
  }
}

async function executeAutopilot(playerId: string, steps: any[], stepMode: boolean = false) {
  let remainingSteps = [...steps];
  let stepCount = 0;

  while (remainingSteps.length > 0) {
    stepCount++;

    if (stepMode && stepCount > 1) {
      // In step mode, prompt user to continue
      console.log(chalk.yellow(`\nPress Enter to continue autopilot (${remainingSteps.length} steps remaining), or 'q' to quit:`));
      const input = await new Promise<string>((resolve) => {
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        process.stdin.once('data', (data) => {
          process.stdin.pause();
          resolve(data.toString().trim());
        });
      });

      if (input.toLowerCase() === 'q' || input.toLowerCase() === 'quit') {
        console.log(chalk.yellow('Autopilot disengaged.'));
        return;
      }
    }

    try {
      console.log(chalk.blue(`Step ${stepCount}: Executing autopilot step...`));
      const result = await autopilot(playerId, remainingSteps) as any;

      if (result.success) {
        if (result.completed) {
          console.log(chalk.green(`✓ ${result.message}`));
          console.log(chalk.green(`🎯 Destination reached!`));
          break;
        } else {
          console.log(chalk.green(`✓ ${result.message}`));
          remainingSteps = result.remainingPath || [];

          if (result.step) {
            const stepType = result.step.type === 'jump' ? chalk.cyan('JUMP') : chalk.white('MOVE');
            const direction = chalk.yellow(result.step.direction.toUpperCase());
            console.log(`   ${stepType} ${direction} - ${remainingSteps.length} steps remaining`);
          }
        }
      } else {
        if (result.blocked) {
          console.log(chalk.red(`❌ Autopilot blocked: ${result.message}`));
          console.log(chalk.yellow(`Obstruction detected. Manual navigation required.`));
          break;
        } else {
          console.log(chalk.red(`❌ Autopilot error: ${result.message}`));
          break;
        }
      }

      // Small delay between steps for readability
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error: any) {
      console.log(chalk.red(`❌ Autopilot failed: ${error.message}`));
      break;
    }
  }
}

async function launchProbeCommand(playerId: string, direction: string) {
  try {
    const result = await launchProbe(playerId, direction) as any;
    console.log(result.success ? chalk.green(`✓ ${result.message}`) : chalk.red(`✗ ${result.message}`));
    console.log(chalk.cyan(`Probes remaining: ${result.probesRemaining}`));

    if (result.success && result.discoveredSystems) {
      console.log(chalk.blue(`\n=== Probe Scan Results ===`));

      const systemsWithObjects = result.discoveredSystems.filter((sys: any) =>
        sys.systemScan.objects && sys.systemScan.objects.length > 0
      );

      const emptySystems = result.discoveredSystems.filter((sys: any) =>
        !sys.systemScan.objects || sys.systemScan.objects.length === 0
      );

      if (systemsWithObjects.length > 0) {
        console.log(chalk.green(`\nSystems with objects discovered:`));
        systemsWithObjects.forEach((sys: any, index: number) => {
          const coords = sys.coordinates;
          console.log(chalk.yellow(`${index + 1}. System ${coords.x},${coords.y},${coords.z}`));

          sys.systemScan.objects.forEach((obj: any) => {
            const color = obj.type === 'star' ? chalk.red :
                         obj.type === 'planet' ? chalk.green :
                         obj.type === 'station' ? chalk.cyan : chalk.gray;
            console.log(`   ${color(obj.type)}: ${obj.name} at ${obj.coordinates.x},${obj.coordinates.y},${obj.coordinates.z}`);
          });

          if (sys.systemScan.otherPlayers.length > 0) {
            console.log(chalk.magenta(`   Ships: ${sys.systemScan.otherPlayers.map((p: any) => p.name).join(', ')}`));
          }
        });
      }

      if (emptySystems.length > 0) {
        console.log(chalk.gray(`\nEmpty systems: ${emptySystems.length} systems scanned with no objects`));
        const coords = emptySystems.map((sys: any) => `${sys.coordinates.x},${sys.coordinates.y},${sys.coordinates.z}`);
        console.log(chalk.gray(`${coords.slice(0, 5).join(', ')}${emptySystems.length > 5 ? '...' : ''}`));
      }

      console.log(chalk.blue(`\n✓ Probe data has been added to your navigation database`));
    }
  } catch (error: any) {
    console.log(chalk.red(`✗ ${error.message}`));
  }
}

async function showActiveProbes(playerId: string) {
  try {
    const probes = await getActiveProbes(playerId) as any[];
    console.log(chalk.blue(`=== Active Probes ===`));

    if (probes.length === 0) {
      console.log(chalk.gray(`No active probes. Launch probes with 'probe <direction>' command.`));
      return;
    }

    console.log(chalk.yellow(`Found ${probes.length} active probe${probes.length > 1 ? 's' : ''}:`));

    probes.forEach((probe: any, index: number) => {
      const direction = probe.direction.x > 0 ? 'east' :
                       probe.direction.x < 0 ? 'west' :
                       probe.direction.y > 0 ? 'north' :
                       probe.direction.y < 0 ? 'south' :
                       probe.direction.z > 0 ? 'up' : 'down';

      const launchedTime = new Date(probe.launchedAt).toLocaleTimeString();
      const lastActivity = new Date(probe.lastActivity).toLocaleTimeString();

      console.log(chalk.cyan(`\n${index + 1}. Probe ${probe.id.slice(-8)}`));
      console.log(`   Direction: ${chalk.yellow(direction)}`);
      console.log(`   Position: ${chalk.white(`${probe.coordinates.x},${probe.coordinates.y},${probe.coordinates.z}`)}`);
      console.log(`   Fuel: ${chalk.green(`${probe.fuel}/${probe.maxFuel}`)}`);
      console.log(`   Launched: ${chalk.gray(launchedTime)}`);
      console.log(`   Last Activity: ${chalk.gray(lastActivity)}`);
      console.log(`   Status: ${chalk.green(probe.status)}`);
    });

    console.log(chalk.blue(`\nProbes are visible as bright orange dots in the universe map.`));
  } catch (error: any) {
    console.log(chalk.red(`✗ ${error.message}`));
  }
}

async function findNearestEntity(playerId: string, entityType: string) {
  try {
    const result = await findNearest(playerId, entityType);

    if (!result.nearest) {
      console.log(chalk.yellow(`=== Nearest ${entityType.toUpperCase()} ===`));
      console.log(chalk.gray(`No ${entityType} found in your known systems.`));
      console.log(chalk.blue(`🔭 Explore more systems to discover ${entityType}s!`));
      return;
    }

    const nearest = result.nearest;
    console.log(chalk.yellow(`=== Nearest ${entityType.toUpperCase()} ===`));

    // Display entity info using same style as db command
    const color = nearest.type === 'star' ? chalk.red :
                 nearest.type === 'planet' ? chalk.green :
                 nearest.type === 'station' ? chalk.cyan :
                 nearest.type === 'player' ? chalk.magenta :
                 nearest.type === 'probe' ? chalk.yellow : chalk.gray;

    console.log(`${color(nearest.type)}: ${nearest.name}`);
    console.log(`Distance: ${chalk.white(nearest.distance.toFixed(2))} units`);
    console.log(`Coordinates: ${chalk.white(`${nearest.coordinates.x},${nearest.coordinates.y},${nearest.coordinates.z}`)}`);

    if (nearest.systemCoordinates) {
      console.log(`System: ${chalk.gray(`${nearest.systemCoordinates.x},${nearest.systemCoordinates.y},${nearest.systemCoordinates.z}`)}`);
    }

    // Show routing suggestion
    console.log(chalk.blue(`\n💡 To go there:`));
    console.log(chalk.cyan(`   stellarburn ${playerId} plot "${nearest.coordinates.x},${nearest.coordinates.y},${nearest.coordinates.z}"`));
    console.log(chalk.cyan(`   stellarburn ${playerId} go "${nearest.coordinates.x},${nearest.coordinates.y},${nearest.coordinates.z}"`));

  } catch (error: any) {
    console.log(chalk.red(`✗ ${error.message}`));
  }
}

program.parse();