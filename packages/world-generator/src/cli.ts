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
  .option('-s, --size <number>', 'Universe size (extends from -size to +size)', '25')
  .option('--sparsity <number>', 'Universe sparsity (0-1)', '0.05')
  .option('--clear', 'Clear existing universe data')
  .action(async (options) => {
    const config: UniverseConfig = {
      size: parseInt(options.size),
      sparsity: parseFloat(options.sparsity)
    };

    console.log('🌌 StellarBurn Universe Generator (3D)');
    console.log('===================================');
    console.log(`Universe size: ${-config.size} to ${config.size} in each dimension`);
    console.log(`Universe sparsity: ${config.sparsity * 100}%`);
    console.log(`Total possible sectors: ${Math.pow(config.size * 2, 3)}`);
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
    console.log('📊 Universe statistics - Coming soon!');
  });

program.parse();