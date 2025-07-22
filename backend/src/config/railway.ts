/**
 * Railway-specific configuration and utilities
 * Handles Railway platform integration and deployment-specific settings
 */

import logger from '../utils/logger';

export interface RailwayConfig {
  projectId: string;
  projectName: string;
  serviceId: string;
  serviceName: string;
  environmentId: string;
  environmentName: string;
  deploymentId: string;
  replicaId: string;
  publicDomain: string;
  staticUrl: string;
  gitCommitSha: string;
  gitBranch: string;
  gitRepoName: string;
  gitRepoOwner: string;
  port: number;
  isRailway: boolean;
  isProduction: boolean;
}

/**
 * Parse and validate Railway environment variables
 */
export const getRailwayConfig = (): RailwayConfig => {
  const config: RailwayConfig = {
    projectId: process.env.RAILWAY_PROJECT_ID || '',
    projectName: process.env.RAILWAY_PROJECT_NAME || '',
    serviceId: process.env.RAILWAY_SERVICE_ID || '',
    serviceName: process.env.RAILWAY_SERVICE_NAME || 'seiron-backend',
    environmentId: process.env.RAILWAY_ENVIRONMENT_ID || '',
    environmentName: process.env.RAILWAY_ENVIRONMENT_NAME || 'development',
    deploymentId: process.env.RAILWAY_DEPLOYMENT_ID || '',
    replicaId: process.env.RAILWAY_REPLICA_ID || '',
    publicDomain: process.env.RAILWAY_PUBLIC_DOMAIN || '',
    staticUrl: process.env.RAILWAY_STATIC_URL || '',
    gitCommitSha: process.env.RAILWAY_GIT_COMMIT_SHA || '',
    gitBranch: process.env.RAILWAY_GIT_BRANCH || 'main',
    gitRepoName: process.env.RAILWAY_GIT_REPO_NAME || '',
    gitRepoOwner: process.env.RAILWAY_GIT_REPO_OWNER || '',
    port: parseInt(process.env.PORT || process.env.RAILWAY_PORT || '3000'),
    isRailway: !!process.env.RAILWAY_ENVIRONMENT_ID,
    isProduction: process.env.NODE_ENV === 'production',
  };

  // Log Railway configuration on startup
  if (config.isRailway) {
    logger.info('Railway configuration loaded', {
      serviceName: config.serviceName,
      environmentName: config.environmentName,
      deploymentId: config.deploymentId,
      publicDomain: config.publicDomain,
      port: config.port,
      gitBranch: config.gitBranch,
      gitCommitSha: config.gitCommitSha?.substring(0, 8),
    });
  }

  return config;
};

/**
 * Railway service discovery and connection strings
 */
export const createServiceConnections = () => {
  const config = getRailwayConfig();
  
  return {
    // Database connections
    postgres: {
      url: process.env.DATABASE_URL,
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DATABASE,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
    },

    // Redis connections
    redis: {
      url: process.env.REDIS_URL,
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    },

    // MCP server connections
    mcp: {
      hive: process.env.HIVE_MCP_URL || 'ws://localhost:3001',
      sei: process.env.SEI_MCP_URL || 'ws://localhost:3002',
      portfolio: process.env.PORTFOLIO_MCP_URL || 'ws://localhost:3003',
    },

    // External service URLs
    external: {
      frontend: process.env.FRONTEND_URL || 'http://localhost:3000',
      webhook: process.env.WEBHOOK_URL || `https://${config.publicDomain}`,
      callback: process.env.CALLBACK_BASE_URL || `https://${config.publicDomain}`,
    },
  };
};

/**
 * Railway deployment information
 */
export const getDeploymentInfo = () => {
  const config = getRailwayConfig();
  
  return {
    service: {
      name: config.serviceName,
      version: process.env.SERVICE_VERSION || '1.0.0',
      environment: config.environmentName,
      uptime: Math.floor(process.uptime()),
    },
    deployment: {
      id: config.deploymentId,
      commitSha: config.gitCommitSha,
      branch: config.gitBranch,
      timestamp: new Date().toISOString(),
    },
    platform: {
      isRailway: config.isRailway,
      projectName: config.projectName,
      publicDomain: config.publicDomain,
      port: config.port,
    },
    git: {
      repository: `${config.gitRepoOwner}/${config.gitRepoName}`,
      branch: config.gitBranch,
      commit: config.gitCommitSha,
    },
  };
};

/**
 * Health check configuration for Railway
 */
export const getHealthCheckConfig = () => {
  return {
    endpoints: {
      health: '/health',
      ready: '/ready',
      alive: '/alive',
      metrics: '/metrics',
    },
    timeouts: {
      startup: 40, // seconds
      readiness: 10, // seconds
      liveness: 5, // seconds
    },
    intervals: {
      health: 30, // seconds
      readiness: 10, // seconds
      liveness: 30, // seconds
    },
    retries: {
      health: 3,
      readiness: 3,
      liveness: 3,
    },
  };
};

/**
 * Railway-specific logging configuration
 */
export const createRailwayLogger = () => {
  const config = getRailwayConfig();
  
  return {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    defaultMeta: {
      service: config.serviceName,
      environment: config.environmentName,
      deploymentId: config.deploymentId,
      replicaId: config.replicaId,
    },
    transports: [
      // Console transport for Railway logs
      {
        type: 'console',
        format: 'json',
        level: process.env.LOG_LEVEL || 'info',
      },
    ],
  };
};

/**
 * Environment validation for Railway deployment
 */
export const validateRailwayEnvironment = (): string[] => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required environment variables
  const required = [
    'NODE_ENV',
    'PORT',
  ];

  // Critical environment variables (should be present in production)
  const critical = [
    'DATABASE_URL',
    'REDIS_URL',
    'OPENAI_API_KEY',
    'JWT_SECRET',
  ];

  // Check required variables
  required.forEach(varName => {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  });

  // Check critical variables (warnings in development, errors in production)
  critical.forEach(varName => {
    if (!process.env[varName]) {
      const message = `Missing critical environment variable: ${varName}`;
      if (process.env.NODE_ENV === 'production') {
        errors.push(message);
      } else {
        warnings.push(message);
      }
    }
  });

  // Log warnings
  warnings.forEach(warning => {
    logger.warn('Environment validation warning', { warning });
  });

  return errors;
};

/**
 * Railway startup banner
 */
export const logRailwayStartupBanner = () => {
  const config = getRailwayConfig();
  const deploymentInfo = getDeploymentInfo();
  
  if (config.isRailway) {
    logger.info('🚂 Railway Deployment Started', {
      service: deploymentInfo.service,
      deployment: deploymentInfo.deployment,
      platform: deploymentInfo.platform,
      git: deploymentInfo.git,
    });
  } else {
    logger.info('🏠 Local Development Mode', {
      service: deploymentInfo.service,
      port: config.port,
    });
  }
};

/**
 * Export Railway configuration and utilities
 */
export default {
  getRailwayConfig,
  createServiceConnections,
  getDeploymentInfo,
  getHealthCheckConfig,
  createRailwayLogger,
  validateRailwayEnvironment,
  logRailwayStartupBanner,
};