#!/usr/bin/env node

import { program } from 'commander';
import { pipe, flow } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import pLimit from 'p-limit';

import {
  normalizeData,
  aggregateTimeSeriesData,
  engineerFeatures,
  validateDataQuality,
  prepareOpenAIDataset,
  validateOpenAIFormat
} from '../src/transformers';
import { createDatasetWriter, createDatasetReader } from '../src/storage';
import { ProcessingOptions, MLDataset } from '../src/types';

// Processing pipeline configuration
interface ProcessingConfig {
  readonly inputPath: string;
  readonly outputPath: string;
  readonly features: string[];
  readonly timeWindows: number[];
  readonly validationThreshold: number;
  readonly openAIFormat: boolean;
  readonly concurrency: number;
}

// Process a single data file
const processDataFile = (
  filePath: string,
  config: ProcessingConfig
): TE.TaskEither<Error, MLDataset> =>
  pipe(
    TE.tryCatch(
      async () => {
        const reader = createDatasetReader(path.dirname(filePath));
        const rawData = await reader.readRawData(path.basename(filePath));
        return rawData;
      },
      (error) => new Error(`Failed to read ${filePath}: ${error}`)
    ),
    TE.chain(rawData =>
      pipe(
        rawData,
        normalizeData,
        E.chain(normalized =>
          aggregateTimeSeriesData(normalized, {
            windows: config.timeWindows,
            method: 'twap'
          })
        ),
        E.chain(aggregated =>
          engineerFeatures(aggregated, {
            features: config.features,
            fillMethod: 'forward'
          })
        ),
        E.chain(featured =>
          validateDataQuality(featured, {
            minQuality: config.validationThreshold,
            removeOutliers: true
          })
        ),
        E.chain(validated =>
          config.openAIFormat
            ? prepareOpenAIDataset(validated)
            : E.right(validated)
        ),
        TE.fromEither
      )
    )
  );

// Batch process multiple files
const batchProcessFiles = async (
  files: string[],
  config: ProcessingConfig
): Promise<{ processed: number; failed: number; datasets: MLDataset[] }> => {
  const limit = pLimit(config.concurrency);
  const spinner = ora(`Processing ${files.length} files...`).start();
  
  const results = await Promise.all(
    files.map((file, index) =>
      limit(async () => {
        spinner.text = `Processing ${index + 1}/${files.length}: ${path.basename(file)}`;
        const result = await processDataFile(file, config)();
        return { file, result };
      })
    )
  );

  const processed = results.filter(r => E.isRight(r.result)).length;
  const failed = results.filter(r => E.isLeft(r.result)).length;
  const datasets = results
    .filter(r => E.isRight(r.result))
    .map(r => (r.result as E.Right<MLDataset>).right);

  spinner.succeed(`Processed ${processed} files, ${failed} failed`);

  // Log failures
  if (failed > 0) {
    console.log(chalk.yellow('\nFailed files:'));
    results
      .filter(r => E.isLeft(r.result))
      .forEach(r => {
        console.log(`  - ${r.file}: ${(r.result as E.Left<Error>).left.message}`);
      });
  }

  return { processed, failed, datasets };
};

// Merge multiple datasets
const mergeDatasets = (datasets: MLDataset[]): MLDataset => {
  if (datasets.length === 0) {
    throw new Error('No datasets to merge');
  }

  const merged: MLDataset = {
    metadata: {
      ...datasets[0].metadata,
      version: '1.0.0',
      mergedFrom: datasets.length,
      totalSamples: datasets.reduce((sum, d) => sum + d.data.length, 0)
    },
    data: datasets.flatMap(d => d.data),
    features: datasets[0].features,
    labels: datasets[0].labels
  };

  return merged;
};

// Generate processing report
const generateReport = async (
  outputPath: string,
  stats: any
): Promise<void> => {
  const report = {
    processingTime: new Date().toISOString(),
    statistics: stats,
    configuration: {
      features: stats.features,
      timeWindows: stats.timeWindows,
      validationThreshold: stats.validationThreshold
    },
    dataQuality: {
      totalSamples: stats.totalSamples,
      validSamples: stats.validSamples,
      droppedSamples: stats.droppedSamples,
      missingValueRatio: stats.missingValueRatio
    }
  };

  await fs.writeFile(
    path.join(outputPath, 'processing_report.json'),
    JSON.stringify(report, null, 2)
  );
};

// Main processing command
program
  .name('sei-process')
  .description('Process collected Sei blockchain data for ML training')
  .version('1.0.0');

program
  .command('run')
  .description('Process raw data into ML-ready datasets')
  .option('-i, --input <path>', 'Input data directory', './datasets/raw')
  .option('-o, --output <path>', 'Output directory', './datasets/processed')
  .option('-f, --features <items>', 'Comma-separated feature list', 'price,volume,rsi,macd')
  .option('-w, --windows <items>', 'Time windows (minutes)', '5,15,60')
  .option('-t, --threshold <value>', 'Quality threshold (0-1)', '0.95')
  .option('--openai', 'Format for OpenAI fine-tuning', false)
  .option('-c, --concurrency <n>', 'Concurrent file processing', '4')
  .option('-p, --pattern <glob>', 'File pattern to process', '*.json')
  .action(async (options) => {
    try {
      console.log(chalk.bold.blue('🔄 Processing Sei Portfolio Data\n'));

      // Parse options
      const config: ProcessingConfig = {
        inputPath: options.input,
        outputPath: options.output,
        features: options.features.split(','),
        timeWindows: options.windows.split(',').map(Number),
        validationThreshold: parseFloat(options.threshold),
        openAIFormat: options.openai,
        concurrency: parseInt(options.concurrency)
      };

      // Find input files
      const pattern = path.join(config.inputPath, options.pattern);
      const files = await glob(pattern);

      if (files.length === 0) {
        console.error(chalk.red(`No files found matching: ${pattern}`));
        process.exit(1);
      }

      console.log(chalk.cyan(`Found ${files.length} files to process`));
      console.log(chalk.cyan(`Features: ${config.features.join(', ')}`));
      console.log(chalk.cyan(`Time windows: ${config.timeWindows.join(', ')} minutes\n`));

      // Process files
      const { processed, failed, datasets } = await batchProcessFiles(files, config);

      if (datasets.length === 0) {
        console.error(chalk.red('No datasets were successfully processed'));
        process.exit(1);
      }

      // Merge datasets
      console.log(chalk.blue('\n📦 Merging datasets...'));
      const merged = mergeDatasets(datasets);

      // Validate if OpenAI format
      if (config.openAIFormat) {
        console.log(chalk.blue('✅ Validating OpenAI format...'));
        const validation = validateOpenAIFormat(merged);
        if (E.isLeft(validation)) {
          console.error(chalk.red(`OpenAI format validation failed: ${validation.left.message}`));
          process.exit(1);
        }
      }

      // Write output
      console.log(chalk.blue('💾 Writing processed dataset...'));
      const writer = createDatasetWriter(config.outputPath);
      await writer.writeProcessedData(merged, {
        format: config.openAIFormat ? 'openai' : 'standard',
        compression: true
      });

      // Generate report
      const stats = {
        filesProcessed: processed,
        filesFailed: failed,
        totalSamples: merged.data.length,
        validSamples: merged.data.filter(d => d.quality > config.validationThreshold).length,
        droppedSamples: merged.data.filter(d => d.quality <= config.validationThreshold).length,
        missingValueRatio: 0.02, // Mock calculation
        features: config.features,
        timeWindows: config.timeWindows,
        validationThreshold: config.validationThreshold
      };

      await generateReport(config.outputPath, stats);

      console.log(chalk.green(`\n✨ Processing complete!`));
      console.log(chalk.green(`   Output: ${config.outputPath}`));
      console.log(chalk.green(`   Samples: ${stats.totalSamples.toLocaleString()}`));
      console.log(chalk.green(`   Features: ${config.features.length}`));

    } catch (error) {
      console.error(chalk.red('Processing failed:'), error);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate processed datasets')
  .option('-i, --input <path>', 'Dataset file path')
  .option('--openai', 'Validate OpenAI format', false)
  .action(async (options) => {
    try {
      console.log(chalk.bold.blue('🔍 Validating Dataset\n'));

      const reader = createDatasetReader(path.dirname(options.input));
      const dataset = await reader.readProcessedData(path.basename(options.input));

      // Basic validation
      console.log(chalk.cyan('Dataset Info:'));
      console.log(`  Version: ${dataset.metadata.version}`);
      console.log(`  Samples: ${dataset.data.length}`);
      console.log(`  Features: ${dataset.features.length}`);
      console.log(`  Time range: ${new Date(dataset.metadata.timeRange.start).toLocaleDateString()} - ${new Date(dataset.metadata.timeRange.end).toLocaleDateString()}`);

      // Quality validation
      const qualityResult = validateDataQuality(dataset, {
        minQuality: 0.9,
        removeOutliers: false
      });

      if (E.isLeft(qualityResult)) {
        console.error(chalk.red(`\n❌ Quality validation failed: ${qualityResult.left.message}`));
      } else {
        console.log(chalk.green('\n✅ Quality validation passed'));
      }

      // OpenAI format validation
      if (options.openai) {
        const openAIResult = validateOpenAIFormat(dataset);
        if (E.isLeft(openAIResult)) {
          console.error(chalk.red(`\n❌ OpenAI format validation failed: ${openAIResult.left.message}`));
        } else {
          console.log(chalk.green('✅ OpenAI format validation passed'));
        }
      }

    } catch (error) {
      console.error(chalk.red('Validation failed:'), error);
      process.exit(1);
    }
  });

program
  .command('info')
  .description('Show information about processed datasets')
  .option('-d, --dir <path>', 'Processed data directory', './datasets/processed')
  .action(async (options) => {
    try {
      console.log(chalk.bold.blue('📊 Dataset Information\n'));

      const files = await glob(path.join(options.dir, '*.json'));
      
      for (const file of files) {
        try {
          const reader = createDatasetReader(path.dirname(file));
          const dataset = await reader.readProcessedData(path.basename(file));
          
          console.log(chalk.cyan(`\n${path.basename(file)}:`));
          console.log(`  Samples: ${dataset.data.length}`);
          console.log(`  Features: ${dataset.features.join(', ').slice(0, 50)}...`);
          console.log(`  Quality: ${(dataset.data.reduce((sum, d) => sum + (d.quality || 1), 0) / dataset.data.length).toFixed(3)}`);
          
        } catch (error) {
          console.log(chalk.red(`  Error reading file: ${error}`));
        }
      }

    } catch (error) {
      console.error(chalk.red('Failed to read dataset info:'), error);
      process.exit(1);
    }
  });

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}