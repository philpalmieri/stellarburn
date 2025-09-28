#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { createPlayer, getPlayerStatus, movePlayer, scanArea, jumpPlayer, systemScan, plotCourse, autopilot } from './game.js';

const program = new Command();

program
  .name('stellarburn')
  .description('StellarBurn CLI Game Client')
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

// Plot course command
program
  .command('plot <playerId> <from> <to>')
  .description('Plot a course from one coordinate to another (e.g., "0,0,0" to "5,3,-2")')
  .action(async (playerId, from, to) => {
    try {
      const result = await plotCourse(playerId, from, to) as any;
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

      console.log(chalk.green(`\n✓ Course plotted successfully! Use 'stellarburn autopilot ${playerId}' to begin.`));
    } catch (error: any) {
      console.log(chalk.red(`✗ ${error.message}`));
    }
  });

// Combined plot and autopilot command
program
  .command('goto <playerId> <destination>')
  .description('Plot course and execute autopilot to destination (e.g., "5,3,-2")')
  .option('-p, --plot-only', 'Only plot the course, don\'t execute')
  .option('-s, --step', 'Execute one step at a time (interactive)')
  .action(async (playerId, destination, options) => {
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

      if (options.plotOnly) {
        console.log(chalk.blue(`\n=== Flight Plan Preview ===`));
        courseResult.path.steps.slice(0, 10).forEach((step: any, index: number) => {
          const stepType = step.type === 'jump' ? chalk.cyan('JUMP') : chalk.white('MOVE');
          const direction = chalk.yellow(step.direction.toUpperCase());
          const coords = `${step.to.x},${step.to.y},${step.to.z}`;
          console.log(`${(index + 1).toString().padStart(2)}: ${stepType} ${direction} to ${coords} (fuel: ${step.fuelCost})`);
        });
        if (courseResult.path.steps.length > 10) {
          console.log(chalk.gray(`... and ${courseResult.path.steps.length - 10} more steps`));
        }
        return;
      }

      // Execute autopilot
      console.log(chalk.blue(`\n=== Autopilot Engaged ===`));
      await executeAutopilot(playerId, courseResult.path.steps, options.step);

    } catch (error: any) {
      console.log(chalk.red(`✗ ${error.message}`));
    }
  });

// Player commands
program
  .argument('<playerId>', 'Player ID')
  .argument('<action>', 'Action to perform')
  .action(async (playerId, action) => {
    try {
      switch (action.toLowerCase()) {
        case 'status':
        case 'stat':
          const status = await getPlayerStatus(playerId);
          console.log(chalk.blue(`=== ${status.name} Status ===`));
          console.log(`Location: ${chalk.yellow(status.coordinatesString)}`);
          console.log(`Fuel: ${chalk.yellow(status.fuel)}/${status.maxFuel}`);
          console.log(`Credits: ${chalk.green(status.credits)}`);
          break;

        case 'scan':
          const scanResult = await scanArea(playerId) as any;
          console.log(chalk.blue(`=== Local Scan ===`));
          console.log(chalk.yellow(`Current Zone: ${scanResult.currentZone.coordinates.x},${scanResult.currentZone.coordinates.y},${scanResult.currentZone.coordinates.z}`));
          
          if (scanResult.currentZone.objects.length > 0) {
            console.log(chalk.white(`Objects in zone:`));
            scanResult.currentZone.objects.forEach((obj: any) => {
              const color = obj.type === 'star' ? chalk.red :
                           obj.type === 'planet' ? chalk.green :
                           obj.type === 'station' ? chalk.cyan : chalk.gray;
              console.log(`  ${color(obj.type)}: ${obj.name} (size: ${obj.size} zones)`);
            });
          } else {
            console.log(chalk.gray(`Empty space`));
          }
          
          console.log(chalk.blue(`\nAdjacent Zones:`));
          Object.entries(scanResult.adjacentZones).forEach(([direction, zone]: [string, any]) => {
            const objectCount = zone.objects.length;
            let status = chalk.gray('empty');

            if (objectCount > 0) {
              const hasStation = zone.objects.some((obj: any) => obj.type === 'station');
              const hasStar = zone.objects.some((obj: any) => obj.type === 'star');

              if (hasStation) status = chalk.cyan('station');
              else if (hasStar) status = chalk.red('star system');
              else status = chalk.green(`${objectCount} objects`);
            }

            console.log(`  ${chalk.yellow(direction.padEnd(5))}: ${status}`);
          });
          break;

        case 'sscan':
        case 'systemscan':
          const systemResult = await systemScan(playerId) as any;
          console.log(chalk.blue(`=== System Scan ===`));
          console.log(chalk.yellow(`System: ${systemResult.systemCoordinates.x},${systemResult.systemCoordinates.y},${systemResult.systemCoordinates.z}`));
          
          if (systemResult.objects.length > 0) {
            console.log(chalk.white(`Objects in system:`));
            systemResult.objects.forEach((obj: any) => {
              const color = obj.type === 'star' ? chalk.red : 
                           obj.type === 'planet' ? chalk.green :
                           obj.type === 'station' ? chalk.cyan : chalk.gray;
              console.log(`  ${color(obj.type)}: ${obj.name} at ${obj.coordinates.x},${obj.coordinates.y},${obj.coordinates.z} (${obj.size} zones)`);
            });
          } else {
            console.log(chalk.gray(`Empty system`));
          }
          
          if (systemResult.otherPlayers.length > 0) {
            console.log(chalk.magenta(`\nOther ships:`));
            systemResult.otherPlayers.forEach((player: any) => {
              console.log(`  ${chalk.magenta(player.name)} at ${player.coordinates.x},${player.coordinates.y},${player.coordinates.z}`);
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

        default:
          console.log(chalk.red(`Unknown action: ${action}`));
          console.log(chalk.gray(`Movement: n, s, e, w, u, d`));
          console.log(chalk.gray(`Jump: jn, js, je, jw, ju, jd`));
          console.log(chalk.gray(`Scan: scan (local), sscan (system)`));
          console.log(chalk.gray(`Navigation: use 'stellarburn goto <playerId> <coords>' instead`));
          console.log(chalk.gray(`Other: status`));
      }
    } catch (error: any) {
      console.log(chalk.red(`✗ ${error.message}`));
    }
  });

async function quickMove(playerId: string, direction: string) {
  try {
    const result = await movePlayer(playerId, direction) as any;
    console.log(result.success ? chalk.green(`✓ ${result.message}`) : chalk.red(`✗ ${result.message}`));
  } catch (error: any) {
    console.log(chalk.red(`✗ ${error.message}`));
  }
}

async function jumpMove(playerId: string, direction: string) {
  try {
    const result = await jumpPlayer(playerId, direction) as any;
    console.log(result.success ? chalk.green(`✓ ${result.message}`) : chalk.red(`✗ ${result.message}`));
    console.log(chalk.yellow(`Fuel remaining: ${result.fuel}`));
    
    if (result.systemScan) {
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

program.parse();