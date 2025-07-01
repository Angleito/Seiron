#!/usr/bin/env node

import { program } from 'commander';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs/promises';
import * as path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Storage } from '@google-cloud/storage';
import archiver from 'archiver';
import { Parser as CsvParser } from 'json2csv';

import { 
  createDatasetReader,
  convertToOpenAIFormat,
  convertToHuggingFaceFormat,
  generateDatasetManifest
} from '../src';
import { MLDataset, ExportFormat } from '../src/types';

// Export configuration
interface ExportConfig {
  readonly format: ExportFormat;
  readonly compress: boolean;
  readonly splitRatio?: number;
  readonly cloudUpload?: {
    provider: 'aws' | 'gcp';
    bucket: string;
    prefix: string;
  };
}

// Convert dataset to CSV format
const exportToCSV = async (
  dataset: MLDataset,
  outputPath: string
): Promise<void> => {
  const csvData = dataset.data.map((sample, index) => ({
    index,
    timestamp: sample.timestamp,
    ...Object.fromEntries(
      dataset.features.map((feature, i) => [feature, sample.features[i]])
    ),
    ...Object.fromEntries(
      dataset.labels.map((label, i) => [`label_${label}`, sample.labels[i]])
    )
  }));

  const fields = [
    'index',
    'timestamp',
    ...dataset.features,
    ...dataset.labels.map(l => `label_${l}`)
  ];

  const parser = new CsvParser({ fields });
  const csv = parser.parse(csvData);
  
  await fs.writeFile(outputPath, csv);
};

// Convert dataset to Parquet format (mock implementation)
const exportToParquet = async (
  dataset: MLDataset,
  outputPath: string
): Promise<void> => {
  // In a real implementation, you would use a library like parquetjs
  console.log(chalk.yellow('Note: Parquet export is a mock implementation'));
  
  const parquetData = {
    schema: {
      timestamp: 'INT64',
      features: dataset.features.map(f => ({ name: f, type: 'DOUBLE' })),
      labels: dataset.labels.map(l => ({ name: l, type: 'DOUBLE' }))
    },
    data: dataset.data
  };

  await fs.writeFile(
    outputPath.replace('.parquet', '.json'),
    JSON.stringify(parquetData, null, 2)
  );
};

// Export dataset for OpenAI fine-tuning
const exportForOpenAI = async (
  dataset: MLDataset,
  outputPath: string,
  splitRatio: number = 0.8
): Promise<void> => {
  const converted = convertToOpenAIFormat(dataset);
  
  if (E.isLeft(converted)) {
    throw new Error(`OpenAI conversion failed: ${converted.left.message}`);
  }

  const data = converted.right;
  const splitIndex = Math.floor(data.length * splitRatio);
  
  // Training set
  const trainingData = data.slice(0, splitIndex);
  await fs.writeFile(
    path.join(outputPath, 'training.jsonl'),
    trainingData.map(d => JSON.stringify(d)).join('\n')
  );

  // Validation set
  const validationData = data.slice(splitIndex);
  await fs.writeFile(
    path.join(outputPath, 'validation.jsonl'),
    validationData.map(d => JSON.stringify(d)).join('\n')
  );

  // Create manifest
  const manifest = {
    training_file: 'training.jsonl',
    validation_file: 'validation.jsonl',
    model: 'gpt-3.5-turbo',
    n_epochs: 3,
    batch_size: 4,
    learning_rate_multiplier: 0.1,
    prompt_loss_weight: 0.01,
    metadata: {
      dataset: 'sei-portfolio',
      features: dataset.features,
      samples: {
        training: trainingData.length,
        validation: validationData.length
      }
    }
  };

  await fs.writeFile(
    path.join(outputPath, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
};

// Export dataset for Hugging Face
const exportForHuggingFace = async (
  dataset: MLDataset,
  outputPath: string
): Promise<void> => {
  const converted = convertToHuggingFaceFormat(dataset);
  
  if (E.isLeft(converted)) {
    throw new Error(`Hugging Face conversion failed: ${converted.left.message}`);
  }

  const { train, test, metadata } = converted.right;

  // Write dataset files
  await fs.writeFile(
    path.join(outputPath, 'train.json'),
    JSON.stringify(train, null, 2)
  );

  await fs.writeFile(
    path.join(outputPath, 'test.json'),
    JSON.stringify(test, null, 2)
  );

  // Write dataset card
  const datasetCard = `---
dataset_info:
  dataset_name: sei-portfolio-ml
  task_type: regression
  features:
    - name: features
      dtype: float32
      shape: [${dataset.features.length}]
    - name: labels
      dtype: float32
      shape: [${dataset.labels.length}]
  splits:
    - name: train
      num_examples: ${train.length}
    - name: test
      num_examples: ${test.length}
---

# Sei Portfolio ML Dataset

This dataset contains financial time series data from the Sei blockchain for training portfolio management models.

## Features
${dataset.features.map(f => `- ${f}`).join('\n')}

## Labels
${dataset.labels.map(l => `- ${l}`).join('\n')}
`;

  await fs.writeFile(
    path.join(outputPath, 'README.md'),
    datasetCard
  );
};

// Compress exported files
const compressExport = async (
  sourceDir: string,
  outputPath: string
): Promise<void> => {
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: 9 }
  });

  archive.pipe(output);
  archive.directory(sourceDir, false);
  await archive.finalize();

  return new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
  });
};

// Upload to cloud storage
const uploadToCloud = async (
  filePath: string,
  config: ExportConfig['cloudUpload']
): Promise<void> => {
  if (!config) return;

  const fileContent = await fs.readFile(filePath);
  const key = `${config.prefix}/${path.basename(filePath)}`;

  if (config.provider === 'aws') {
    const s3Client = new S3Client({});
    await s3Client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: fileContent
    }));
  } else if (config.provider === 'gcp') {
    const storage = new Storage();
    const bucket = storage.bucket(config.bucket);
    await bucket.file(key).save(fileContent);
  }
};

// Main export command
program
  .name('sei-export')
  .description('Export processed Sei blockchain data for ML training')
  .version('1.0.0');

program
  .command('dataset')
  .description('Export processed dataset')
  .requiredOption('-i, --input <path>', 'Input dataset file')
  .requiredOption('-o, --output <path>', 'Output directory')
  .option('-f, --format <type>', 'Export format (csv|parquet|json|openai|huggingface)', 'json')
  .option('-c, --compress', 'Compress output files', false)
  .option('-s, --split <ratio>', 'Train/validation split ratio', '0.8')
  .action(async (options) => {
    try {
      console.log(chalk.bold.blue('📤 Exporting Dataset\n'));

      const spinner = ora('Loading dataset...').start();

      // Load dataset
      const reader = createDatasetReader(path.dirname(options.input));
      const dataset = await reader.readProcessedData(path.basename(options.input));

      spinner.text = 'Exporting dataset...';

      // Create output directory
      await fs.mkdir(options.output, { recursive: true });

      // Export based on format
      switch (options.format) {
        case 'csv':
          await exportToCSV(dataset, path.join(options.output, 'dataset.csv'));
          break;
        
        case 'parquet':
          await exportToParquet(dataset, path.join(options.output, 'dataset.parquet'));
          break;
        
        case 'json':
          await fs.writeFile(
            path.join(options.output, 'dataset.json'),
            JSON.stringify(dataset, null, 2)
          );
          break;
        
        case 'openai':
          await exportForOpenAI(dataset, options.output, parseFloat(options.split));
          break;
        
        case 'huggingface':
          await exportForHuggingFace(dataset, options.output);
          break;
        
        default:
          throw new Error(`Unknown format: ${options.format}`);
      }

      // Generate manifest
      const manifest = await generateDatasetManifest(dataset, {
        format: options.format,
        exportTime: new Date().toISOString(),
        outputPath: options.output
      });

      await fs.writeFile(
        path.join(options.output, 'export_manifest.json'),
        JSON.stringify(manifest, null, 2)
      );

      // Compress if requested
      if (options.compress) {
        spinner.text = 'Compressing files...';
        const zipPath = `${options.output}.zip`;
        await compressExport(options.output, zipPath);
        console.log(chalk.green(`\n✅ Compressed to: ${zipPath}`));
      }

      spinner.succeed('Export complete!');
      console.log(chalk.green(`\n📁 Output: ${options.output}`));
      console.log(chalk.green(`📊 Format: ${options.format}`));
      console.log(chalk.green(`📈 Samples: ${dataset.data.length.toLocaleString()}`));

    } catch (error) {
      console.error(chalk.red('Export failed:'), error);
      process.exit(1);
    }
  });

program
  .command('cloud')
  .description('Upload dataset to cloud storage')
  .requiredOption('-i, --input <path>', 'Input file or directory')
  .requiredOption('-p, --provider <type>', 'Cloud provider (aws|gcp)')
  .requiredOption('-b, --bucket <name>', 'Bucket name')
  .option('--prefix <path>', 'Object key prefix', 'sei-portfolio-data')
  .action(async (options) => {
    try {
      console.log(chalk.bold.blue('☁️  Uploading to Cloud Storage\n'));

      const spinner = ora('Uploading files...').start();

      const stats = await fs.stat(options.input);
      const files = stats.isDirectory()
        ? await fs.readdir(options.input).then(files => 
            files.map(f => path.join(options.input, f))
          )
        : [options.input];

      for (const file of files) {
        spinner.text = `Uploading ${path.basename(file)}...`;
        await uploadToCloud(file, {
          provider: options.provider,
          bucket: options.bucket,
          prefix: options.prefix
        });
      }

      spinner.succeed(`Uploaded ${files.length} files`);
      console.log(chalk.green(`\n✅ Bucket: ${options.bucket}`));
      console.log(chalk.green(`📁 Prefix: ${options.prefix}`));

    } catch (error) {
      console.error(chalk.red('Upload failed:'), error);
      process.exit(1);
    }
  });

program
  .command('manifest')
  .description('Generate export manifest for a dataset')
  .requiredOption('-i, --input <path>', 'Input dataset file')
  .option('-o, --output <path>', 'Output manifest path')
  .action(async (options) => {
    try {
      console.log(chalk.bold.blue('📋 Generating Export Manifest\n'));

      const reader = createDatasetReader(path.dirname(options.input));
      const dataset = await reader.readProcessedData(path.basename(options.input));

      const manifest = await generateDatasetManifest(dataset, {
        sourceFile: options.input,
        generatedAt: new Date().toISOString()
      });

      const outputPath = options.output || options.input.replace('.json', '_manifest.json');
      await fs.writeFile(outputPath, JSON.stringify(manifest, null, 2));

      console.log(chalk.green('✅ Manifest generated'));
      console.log(chalk.cyan('\nDataset Info:'));
      console.log(`  Samples: ${manifest.statistics.totalSamples}`);
      console.log(`  Features: ${manifest.statistics.featureCount}`);
      console.log(`  Time Range: ${manifest.statistics.timeRange.days} days`);
      console.log(`  File Size: ${(manifest.statistics.fileSizeBytes / 1024 / 1024).toFixed(2)} MB`);
      console.log(chalk.green(`\n📄 Output: ${outputPath}`));

    } catch (error) {
      console.error(chalk.red('Manifest generation failed:'), error);
      process.exit(1);
    }
  });

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}