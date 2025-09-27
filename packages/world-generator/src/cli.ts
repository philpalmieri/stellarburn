#!/usr/bin/env node

import { Command } from 'commander';
import { generateUniverse } from './generator.js';
import { UniverseConfig } from '@stellarburn/shared';

const program = new Command();

program
  .name('stellarburn-generate')
  .description('StellarBurn Universe Generator')
  .version('1.0.0');

program
  .command('universe')
  .description('Generate a new universe')
  .option('-q, --quadrants <number>', 'Number of quadrants', '4')
  .option('-s, --sectors <number>', 'Sectors per quadrant', '10')  
  .option('-z, --zones <number>', 'Zones per sector', '10')
  .option('--sparsity <number>', 'Universe sparsity (0-1)', '0.05')
  .option('--clear', 'Clear existing universe data')
  .action(async (options) => {
    const config: UniverseConfig = {
      quadrants: parseInt(options.quadrants),
      sectorsPerQuadrant: parseInt(options.sectors),
      zonesPerSector: parseInt(options.zones),
      sparsity: parseFloat(options.sparsity)
    };

    console.log('🌌 StellarBurn Universe Generator');
    console.log('================================');
    console.log(`Quadrants: ${config.quadrants}`);
    console.log(`Sectors per quadrant: ${config.sectorsPerQuadrant}`);
    console.log(`Zones per sector: ${config.zonesPerSector}`);
    console.log(`Universe sparsity: ${config.sparsity * 100}%`);
    console.log(`Total possible sectors: ${Math.pow(config.sectorsPerQuadrant, 4) * config.quadrants}`);
    console.log('');

    try {
      await generateUniverse(config, options.clear);
      console.log('✅ Universe generation completed!');
    } catch (error) {
      console.error('❌ Universe generation failed:', error);
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('Show universe statistics')
  .action(async () => {
    // TODO: Implement universe stats
    console.log('📊 Universe statistics - Coming soon!');
  });

program.parse();