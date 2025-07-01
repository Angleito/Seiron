#!/usr/bin/env node

import { program } from 'commander';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import { createInterface } from 'readline';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs/promises';
import * as path from 'path';

import { 
  loadConfiguration,
  createChainCollector,
  createMarketCollector,
  createDeFiCollector,
  createOracleCollector
} from '../src';
import { DataError, CollectorResult } from '../src/types';
import { createDatasetWriter } from '../src/storage/writer';

// Collection state management
interface CollectionState {
  readonly lastBlockProcessed: number;
  readonly lastTimestamp: number;
  readonly totalDataPoints: number;
  readonly errors: DataError[];
}

// Load or initialize collection state
const loadState = async (statePath: string): Promise<CollectionState> => {
  try {
    const stateData = await fs.readFile(statePath, 'utf-8');
    return JSON.parse(stateData);
  } catch {
    return {
      lastBlockProcessed: 0,
      lastTimestamp: Date.now(),
      totalDataPoints: 0,
      errors: []
    };
  }
};

// Save collection state
const saveState = async (statePath: string, state: CollectionState): Promise<void> => {
  await fs.writeFile(statePath, JSON.stringify(state, null, 2));
};

// Collection interval handler
const runCollectionInterval = async (
  collectors: any,
  interval: number,
  statePath: string
): Promise<void> => {
  const spinner = ora('Starting data collection...').start();
  let state = await loadState(statePath);

  const collect = async () => {
    try {
      spinner.text = 'Collecting blockchain data...';
      
      // Run all collectors in parallel
      const results = await pipe(
        [
          collectors.chain.collectBlocks(state.lastBlockProcessed + 1, state.lastBlockProcessed + 100),
          collectors.market.collectPrices(['SEI', 'ETH', 'BTC', 'USDT', 'USDC']),
          collectors.defi.batchCollect(),
          collectors.oracle.collectPrices(['SEI', 'ETH', 'BTC'])
        ],
        A.map(task => task()),
        tasks => Promise.all(tasks)
      );

      // Process results
      const successCount = results.filter(E.isRight).length;
      const errors = results.filter(E.isLeft).map(r => (r as any).left);

      // Update state
      state = {
        ...state,
        lastBlockProcessed: state.lastBlockProcessed + 100,
        lastTimestamp: Date.now(),
        totalDataPoints: state.totalDataPoints + successCount * 50, // Rough estimate
        errors: [...state.errors.slice(-100), ...errors] // Keep last 100 errors
      };

      await saveState(statePath, state);

      spinner.succeed(
        chalk.green(`Collection complete: ${successCount}/4 collectors succeeded, ${state.totalDataPoints} total data points`)
      );

      // Write collected data
      if (successCount > 0) {
        const writer = createDatasetWriter('datasets/raw');
        for (const result of results) {
          if (E.isRight(result)) {
            await writer.writeRawData(result.right);
          }
        }
      }

    } catch (error) {
      spinner.fail(chalk.red(`Collection error: ${error}`));
      state.errors.push({
        type: 'system',
        message: `Collection failed: ${error}`,
        timestamp: Date.now()
      });
      await saveState(statePath, state);
    }
  };

  // Initial collection
  await collect();

  // Set up interval
  if (interval > 0) {
    console.log(chalk.blue(`\n📊 Collection scheduled every ${interval} seconds\n`));
    setInterval(collect, interval * 1000);
  }
};

// Interactive collection mode
const runInteractiveMode = async (collectors: any): Promise<void> => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const prompt = () => {
    console.log(chalk.cyan('\nAvailable collectors:'));
    console.log('1. Chain data');
    console.log('2. Market data');
    console.log('3. DeFi protocols');
    console.log('4. Oracle feeds');
    console.log('5. All collectors');
    console.log('0. Exit');
    
    rl.question('\nSelect collector (0-5): ', async (answer) => {
      const spinner = ora('Collecting data...').start();
      
      try {
        let result;
        switch (answer) {
          case '1':
            result = await collectors.chain.collectLatestBlocks(10)();
            break;
          case '2':
            result = await collectors.market.collectPrices(['SEI', 'ETH', 'BTC'])();
            break;
          case '3':
            result = await collectors.defi.batchCollect()();
            break;
          case '4':
            result = await collectors.oracle.collectPrices(['SEI', 'ETH', 'BTC'])();
            break;
          case '5':
            const allResults = await Promise.all([
              collectors.chain.collectLatestBlocks(10)(),
              collectors.market.collectPrices(['SEI', 'ETH', 'BTC'])(),
              collectors.defi.batchCollect()(),
              collectors.oracle.collectPrices(['SEI', 'ETH', 'BTC'])()
            ]);
            result = E.right({ allResults });
            break;
          case '0':
            spinner.stop();
            rl.close();
            process.exit(0);
          default:
            spinner.fail('Invalid selection');
            prompt();
            return;
        }

        if (E.isRight(result)) {
          spinner.succeed('Data collected successfully');
          console.log(chalk.green('\nSample data:'));
          console.log(JSON.stringify(result.right, null, 2).slice(0, 500) + '...');
        } else {
          spinner.fail(`Collection failed: ${result.left.message}`);
        }
      } catch (error) {
        spinner.fail(`Error: ${error}`);
      }
      
      prompt();
    });
  };

  console.log(chalk.bold.blue('\n🚀 Sei Portfolio Data Collector - Interactive Mode\n'));
  prompt();
};

// Main program
program
  .name('sei-collect')
  .description('Collect data from Sei blockchain for AI portfolio training')
  .version('1.0.0');

program
  .command('start')
  .description('Start continuous data collection')
  .option('-i, --interval <seconds>', 'Collection interval in seconds', '60')
  .option('-c, --config <path>', 'Configuration file path', './config/collectors.json')
  .option('-s, --state <path>', 'State file path', './state/collector.json')
  .option('--chain <id>', 'Chain ID (mainnet/testnet/devnet)', 'mainnet')
  .action(async (options) => {
    try {
      console.log(chalk.bold.blue('🚀 Starting Sei Data Collection Service\n'));

      // Load configuration
      const config = await loadConfiguration(options.config);
      const seiConfig = config.networks[options.chain];

      if (!seiConfig) {
        console.error(chalk.red(`Unknown chain: ${options.chain}`));
        process.exit(1);
      }

      // Initialize collectors
      const collectors = {
        chain: createChainCollector(seiConfig),
        market: createMarketCollector(config.marketData),
        defi: createDeFiCollector(seiConfig),
        oracle: createOracleCollector(seiConfig)
      };

      // Ensure state directory exists
      const stateDir = path.dirname(options.state);
      await fs.mkdir(stateDir, { recursive: true });

      // Start collection
      await runCollectionInterval(
        collectors,
        parseInt(options.interval),
        options.state
      );

      // Keep process alive
      process.on('SIGINT', () => {
        console.log(chalk.yellow('\n\n👋 Shutting down collector...'));
        process.exit(0);
      });

    } catch (error) {
      console.error(chalk.red('Failed to start collector:'), error);
      process.exit(1);
    }
  });

program
  .command('interactive')
  .description('Run collector in interactive mode')
  .option('-c, --config <path>', 'Configuration file path', './config/collectors.json')
  .option('--chain <id>', 'Chain ID (mainnet/testnet/devnet)', 'mainnet')
  .action(async (options) => {
    try {
      // Load configuration
      const config = await loadConfiguration(options.config);
      const seiConfig = config.networks[options.chain];

      if (!seiConfig) {
        console.error(chalk.red(`Unknown chain: ${options.chain}`));
        process.exit(1);
      }

      // Initialize collectors
      const collectors = {
        chain: createChainCollector(seiConfig),
        market: createMarketCollector(config.marketData),
        defi: createDeFiCollector(seiConfig),
        oracle: createOracleCollector(seiConfig)
      };

      // Run interactive mode
      await runInteractiveMode(collectors);

    } catch (error) {
      console.error(chalk.red('Failed to start interactive mode:'), error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show collection status')
  .option('-s, --state <path>', 'State file path', './state/collector.json')
  .action(async (options) => {
    try {
      const state = await loadState(options.state);
      
      console.log(chalk.bold.blue('\n📊 Collection Status\n'));
      console.log(`Last block processed: ${chalk.green(state.lastBlockProcessed)}`);
      console.log(`Last collection time: ${chalk.green(new Date(state.lastTimestamp).toLocaleString())}`);
      console.log(`Total data points: ${chalk.green(state.totalDataPoints.toLocaleString())}`);
      console.log(`Recent errors: ${chalk.red(state.errors.length)}`);
      
      if (state.errors.length > 0) {
        console.log(chalk.yellow('\nRecent errors:'));
        state.errors.slice(-5).forEach(error => {
          console.log(`  - ${error.type}: ${error.message}`);
        });
      }
    } catch (error) {
      console.error(chalk.red('Failed to read status:'), error);
      process.exit(1);
    }
  });

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}