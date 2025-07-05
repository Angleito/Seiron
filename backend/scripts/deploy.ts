#!/usr/bin/env tsx

import { Either, isLeft, fold, map, chain } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getConfig, validateConfig, formatConfigErrors } from '../src/config';

const execAsync = promisify(exec);

/**
 * Deployment script with functional validation
 * Ensures safe and validated deployments using fp-ts Either types
 */

type DeploymentEnvironment = 'staging' | 'production';
type DeploymentStrategy = 'rolling' | 'blue-green' | 'recreate';

interface DeploymentConfig {
  readonly environment: DeploymentEnvironment;
  readonly strategy: DeploymentStrategy;
  readonly dockerRegistry: string;
  readonly imageName: string;
  readonly imageTag: string;
  readonly replicas: number;
  readonly healthCheckTimeout: number;
}

interface DeploymentError {
  readonly step: string;
  readonly message: string;
  readonly details?: unknown;
}

type DeploymentResult<T> = Either<DeploymentError, T>;

/**
 * Creates a deployment error
 */
const createDeploymentError = (
  step: string,
  message: string,
  details?: unknown
): DeploymentError => ({
  step,
  message,
  details
});

/**
 * Validates deployment configuration
 */
const validateDeploymentConfig = (
  env: string,
  strategy: string
): DeploymentResult<DeploymentConfig> => {
  if (!['staging', 'production'].includes(env)) {
    return E.left(createDeploymentError(
      'validation',
      `Invalid environment: ${env}. Must be 'staging' or 'production'`
    ));
  }

  if (!['rolling', 'blue-green', 'recreate'].includes(strategy)) { // TODO: REMOVE_MOCK - Hard-coded array literals
    return E.left(createDeploymentError(
      'validation',
      `Invalid strategy: ${strategy}. Must be 'rolling', 'blue-green', or 'recreate'`
    ));
  }

  const dockerRegistry = process.env.DOCKER_REGISTRY || 'localhost:5000';
  const imageName = process.env.IMAGE_NAME || 'sei-portfolio-api';
  const imageTag = process.env.IMAGE_TAG || 'latest';
  const replicas = parseInt(process.env.REPLICAS || '2');
  const healthCheckTimeout = parseInt(process.env.HEALTH_CHECK_TIMEOUT || '300');

  return E.right({
    environment: env as DeploymentEnvironment,
    strategy: strategy as DeploymentStrategy,
    dockerRegistry,
    imageName,
    imageTag,
    replicas,
    healthCheckTimeout
  });
};

/**
 * Executes a shell command with error handling
 */
const executeCommand = (command: string, step: string): DeploymentResult<string> => {
  return pipe(
    E.tryCatch(
      () => execAsync(command),
      (error) => createDeploymentError(step, `Command failed: ${command}`, error)
    ),
    map(({ stdout, stderr }) => {
      if (stderr) {
        console.warn(`Warning in ${step}:`, stderr);
      }
      return stdout.trim();
    })
  );
};

/**
 * Validates application configuration
 */
const validateAppConfig = (): DeploymentResult<void> => {
  const configResult = validateConfig();
  
  if (isLeft(configResult)) {
    return E.left(createDeploymentError(
      'config-validation',
      'Application configuration is invalid',
      formatConfigErrors(configResult.left)
    ));
  }
  
  return E.right(undefined);
};

/**
 * Builds Docker image
 */
const buildDockerImage = (config: DeploymentConfig): DeploymentResult<string> => {
  const fullImageName = `${config.dockerRegistry}/${config.imageName}:${config.imageTag}`;
  const buildCommand = `docker build -t ${fullImageName} --target production .`;
  
  console.log(`Building Docker image: ${fullImageName}`);
  
  return pipe(
    executeCommand(buildCommand, 'docker-build'),
    map(() => fullImageName)
  );
};

/**
 * Pushes Docker image to registry
 */
const pushDockerImage = (imageName: string): DeploymentResult<void> => {
  console.log(`Pushing Docker image: ${imageName}`);
  
  return pipe(
    executeCommand(`docker push ${imageName}`, 'docker-push'),
    map(() => undefined)
  );
};

/**
 * Runs database migrations
 */
const runMigrations = (): DeploymentResult<void> => {
  console.log('Running database migrations...');
  
  return pipe(
    executeCommand('npm run migrate', 'migrations'),
    map(() => undefined)
  );
};

/**
 * Deploys using Docker Compose
 */
const deployWithCompose = (config: DeploymentConfig): DeploymentResult<void> => {
  const composeFile = config.environment === 'production' 
    ? 'docker-compose.prod.yml' 
    : 'docker-compose.yml';
  
  console.log(`Deploying with strategy: ${config.strategy}`);
  
  const deployCommand = config.strategy === 'recreate'
    ? `docker-compose -f ${composeFile} up -d --force-recreate`
    : `docker-compose -f ${composeFile} up -d`;
  
  return pipe(
    executeCommand(deployCommand, 'deploy'),
    map(() => undefined)
  );
};

/**
 * Performs health check
 */
const performHealthCheck = (config: DeploymentConfig): DeploymentResult<void> => {
  console.log('Performing health check...');
  
  const healthCheckCommand = `curl -f http://localhost:3000/health || exit 1`;
  
  return pipe(
    executeCommand(healthCheckCommand, 'health-check'),
    map(() => undefined)
  );
};

/**
 * Main deployment pipeline
 */
const deploy = async (
  environment: string,
  strategy: string = 'rolling'
): Promise<Either<DeploymentError, void>> => {
  console.log(`Starting deployment to ${environment} with ${strategy} strategy`);
  
  return pipe(
    validateDeploymentConfig(environment, strategy),
    chain((config) => pipe(
      validateAppConfig(),
      chain(() => buildDockerImage(config)),
      chain((imageName) => pushDockerImage(imageName)),
      chain(() => runMigrations()),
      chain(() => deployWithCompose(config)),
      chain(() => performHealthCheck(config))
    ))
  );
};

/**
 * Rollback deployment
 */
const rollback = async (environment: string): Promise<Either<DeploymentError, void>> => {
  console.log(`Rolling back ${environment} deployment`);
  
  const composeFile = environment === 'production' 
    ? 'docker-compose.prod.yml' 
    : 'docker-compose.yml';
  
  return pipe(
    executeCommand(`docker-compose -f ${composeFile} down`, 'rollback-down'),
    chain(() => executeCommand(
      `docker-compose -f ${composeFile} up -d --scale api=1`, 
      'rollback-up'
    )),
    map(() => undefined)
  );
};

/**
 * Main CLI handler
 */
const main = async (): Promise<void> => {
  const [,, command, environment, strategy] = process.argv;
  
  if (!command || !['deploy', 'rollback'].includes(command)) {
    console.error('Usage: npm run deploy <deploy|rollback> <staging|production> [strategy]');
    console.error('Strategies: rolling (default), blue-green, recreate');
    process.exit(1);
  }
  
  if (!environment || !['staging', 'production'].includes(environment)) {
    console.error('Environment must be either "staging" or "production"');
    process.exit(1);
  }
  
  try {
    const result = command === 'deploy' 
      ? await deploy(environment, strategy)
      : await rollback(environment);
    
    pipe(
      result,
      fold(
        (error) => {
          console.error(`\n❌ Deployment failed at step: ${error.step}`);
          console.error(`Error: ${error.message}`);
          if (error.details) {
            console.error('Details:', error.details);
          }
          process.exit(1);
        },
        () => {
          console.log(`\n✅ ${command} completed successfully!`);
          process.exit(0);
        }
      )
    );
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

export { deploy, rollback, validateDeploymentConfig };
