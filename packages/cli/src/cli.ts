#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { createPlayer, getPlayerStatus, movePlayer, scanArea, jumpPlayer, systemScan } from './game.js';

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
      const result = await createPlayer(name);
      console.log(chalk.green(`✓ Player created: ${result.player.name}`));
      console.log(chalk.blue(`Location: ${result.spawnLocation}`));
      console.log(chalk.yellow(`Fuel: ${result.player.ship.fuel}/${result.player.ship.maxFuel}`));
      console.log(chalk.green(`Credits: ${result.player.credits}`));
      console.log(chalk.gray(`Player ID: ${result.player.id}`));
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
          const scanResult = await scanArea(playerId);
          console.log(chalk.blue(`=== Local Scan ===`));
          console.log(chalk.yellow(`Current Zone: ${scanResult.currentZone.coordinates.x},${scanResult.currentZone.coordinates.y},${scanResult.currentZone.coordinates.z}`));
          
          if (scanResult.currentZone.objects.length > 0) {
            console.log(chalk.white(`Objects in zone:`));
            scanResult.currentZone.objects.forEach(obj => {
              const color = obj.type === 'star' ? chalk.red : 
                           obj.type === 'planet' ? chalk.green :
                           obj.type === 'station' ? chalk.cyan : chalk.gray;
              console.log(`  ${color(obj.type)}: ${obj.name} (size: ${obj.size} zones)`);
            });
          } else {
            console.log(chalk.gray(`Empty space`));
          }
          
          console.log(chalk.blue(`\nAdjacent Zones:`));
          Object.entries(scanResult.adjacentZones).forEach(([direction, zone]) => {
            const objectCount = zone.objects.length;
            let status = chalk.gray('empty');
            
            if (objectCount > 0) {
              const hasStation = zone.objects.some(obj => obj.type === 'station');
              const hasStar = zone.objects.some(obj => obj.type === 'star');
              
              if (hasStation) status = chalk.cyan('station');
              else if (hasStar) status = chalk.red('star system');
              else status = chalk.green(`${objectCount} objects`);
            }
            
            console.log(`  ${chalk.yellow(direction.padEnd(5))}: ${status}`);
          });
          break;

        case 'sscan':
        case 'systemscan':
          const systemResult = await systemScan(playerId);
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
          console.log(chalk.gray(`Other: status`));
      }
    } catch (error: any) {
      console.log(chalk.red(`✗ ${error.message}`));
    }
  });

async function quickMove(playerId: string, direction: string) {
  try {
    const result = await movePlayer(playerId, direction);
    console.log(result.success ? chalk.green(`✓ ${result.message}`) : chalk.red(`✗ ${result.message}`));
  } catch (error: any) {
    console.log(chalk.red(`✗ ${error.message}`));
  }
}

async function jumpMove(playerId: string, direction: string) {
  try {
    const result = await jumpPlayer(playerId, direction);
    console.log(result.success ? chalk.green(`✓ ${result.message}`) : chalk.red(`✗ ${result.message}`));
    console.log(chalk.yellow(`Fuel remaining: ${result.fuel}`));
    
    if (result.systemScan) {
      console.log(chalk.blue(`\n=== System Scan ===`));
      const scan = result.systemScan;
      console.log(chalk.yellow(`System: ${scan.systemCoordinates.x},${scan.systemCoordinates.y},${scan.systemCoordinates.z}`));
      
      if (scan.objects.length > 0) {
        console.log(chalk.white(`Objects in system:`));
        scan.objects.forEach(obj => {
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
        scan.otherPlayers.forEach(player => {
          console.log(`  ${chalk.magenta(player.name)} at ${player.coordinates.x},${player.coordinates.y},${player.coordinates.z}`);
        });
      }
    }
  } catch (error: any) {
    console.log(chalk.red(`✗ ${error.message}`));
  }
}

program.parse();