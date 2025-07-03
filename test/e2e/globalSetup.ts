/**
 * @fileoverview Global E2E Test Setup
 * Initializes Docker containers and services for E2E testing
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir } from 'fs/promises';
import { resolve } from 'path';
import { E2E_ENV } from './env';

const exec = promisify(require('child_process').exec);

// Docker service health check
async function waitForService(url: string, timeout: number = 60000): Promise<void> {
  const startTime = Date.now();
  console.log(`Waiting for service at ${url}...`);
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`Service at ${url} is ready`);
        return;
      }
    } catch (error) {
      // Service not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error(`Service at ${url} not ready within ${timeout}ms`);
}

// Check if Docker is available
async function checkDockerAvailability(): Promise<boolean> {
  try {
    await exec('docker --version');
    console.log('Docker is available');
    return true;
  } catch (error) {
    console.warn('Docker is not available. Some E2E tests may be skipped.');
    return false;
  }
}

// Start Docker services
async function startDockerServices(): Promise<void> {
  const dockerComposePath = resolve(__dirname, '../../', E2E_ENV.E2E_DOCKER_COMPOSE);
  
  try {
    console.log(`Starting Docker services using ${dockerComposePath}...`);
    
    // Stop any existing containers
    await exec(`docker-compose -f ${dockerComposePath} down --remove-orphans`);
    
    // Start services
    await exec(`docker-compose -f ${dockerComposePath} up -d`);
    
    // Wait for services to be ready
    await waitForService(`${E2E_ENV.E2E_API_URL}/health`);
    await waitForService('http://localhost:6379', 30000); // Redis health check
    
    console.log('All Docker services are ready');
  } catch (error) {
    console.error('Failed to start Docker services:', error);
    throw error;
  }
}

// Setup test data and fixtures
async function setupTestData(): Promise<void> {
  const testDataDir = resolve(__dirname, 'fixtures');
  
  try {
    await mkdir(testDataDir, { recursive: true });
    
    // Create test user profiles
    const testUsers = [
      {
        userId: 'test-user-1',
        walletAddress: E2E_ENV.E2E_TEST_WALLET,
        preferences: {
          riskTolerance: 'low',
          preferredProtocols: ['YeiFinance'],
          tradingExperience: 'beginner'
        }
      },
      {
        userId: 'test-user-2',
        walletAddress: E2E_ENV.E2E_TEST_WALLET,
        preferences: {
          riskTolerance: 'medium',
          preferredProtocols: ['DragonSwap', 'Takara'],
          tradingExperience: 'intermediate'
        }
      },
      {
        userId: 'test-user-3',
        walletAddress: E2E_ENV.E2E_TEST_WALLET,
        preferences: {
          riskTolerance: 'high',
          preferredProtocols: ['DragonSwap', 'Citrex'],
          tradingExperience: 'expert'
        }
      }
    ];
    
    await writeFile(
      resolve(testDataDir, 'test-users.json'),
      JSON.stringify(testUsers, null, 2)
    );
    
    // Create conversation scenarios
    const conversationScenarios = [
      {
        id: 'simple-lending',
        name: 'Simple Lending Operation',
        turns: [
          {
            input: 'I want to lend 1000 USDC',
            expectedIntent: 'lend',
            expectedParameters: { amount: 1000, asset: 'USDC' }
          }
        ]
      },
      {
        id: 'multi-turn-optimization',
        name: 'Multi-turn Yield Optimization',
        turns: [
          {
            input: 'I want to optimize my yield',
            expectedIntent: 'yield_optimization',
            expectedParameters: {}
          },
          {
            input: 'I have 5000 USDC',
            expectedIntent: 'yield_optimization',
            expectedParameters: { amount: 5000, asset: 'USDC' }
          },
          {
            input: 'I prefer low risk',
            expectedIntent: 'yield_optimization',
            expectedParameters: { amount: 5000, asset: 'USDC', riskLevel: 'low' }
          }
        ]
      },
      {
        id: 'complex-arbitrage',
        name: 'Complex Arbitrage Strategy',
        turns: [
          {
            input: 'Find arbitrage opportunities',
            expectedIntent: 'arbitrage',
            expectedParameters: {}
          },
          {
            input: 'For SEI token',
            expectedIntent: 'arbitrage',
            expectedParameters: { asset: 'SEI' }
          },
          {
            input: 'Execute the best opportunity',
            expectedIntent: 'arbitrage',
            expectedParameters: { asset: 'SEI', action: 'execute' }
          }
        ]
      }
    ];
    
    await writeFile(
      resolve(testDataDir, 'conversation-scenarios.json'),
      JSON.stringify(conversationScenarios, null, 2)
    );
    
    // Create performance test data
    const performanceScenarios = [
      {
        id: 'concurrent-users',
        name: 'Concurrent Users Test',
        userCount: E2E_ENV.E2E_CONCURRENT_USERS,
        duration: E2E_ENV.E2E_LOAD_DURATION,
        scenarios: ['simple-lending', 'multi-turn-optimization']
      },
      {
        id: 'memory-stress',
        name: 'Memory Stress Test',
        userCount: 5,
        duration: 60000,
        scenarios: ['complex-arbitrage']
      }
    ];
    
    await writeFile(
      resolve(testDataDir, 'performance-scenarios.json'),
      JSON.stringify(performanceScenarios, null, 2)
    );
    
    console.log('Test data and fixtures created successfully');
  } catch (error) {
    console.error('Failed to setup test data:', error);
    throw error;
  }
}

// Initialize monitoring and logging
async function initializeMonitoring(): Promise<void> {
  const logsDir = resolve(__dirname, '../../test-results/e2e');
  
  try {
    await mkdir(logsDir, { recursive: true });
    
    // Create performance monitoring configuration
    const monitoringConfig = {
      enabled: E2E_ENV.ENABLE_PERFORMANCE_MONITORING,
      sampleRate: E2E_ENV.PERFORMANCE_SAMPLE_RATE,
      thresholds: {
        responseTime: 2000,
        memoryUsage: E2E_ENV.MAX_MEMORY_USAGE * 1024 * 1024,
        errorRate: 0.01
      },
      logLevel: E2E_ENV.VERBOSE_LOGGING ? 'debug' : 'info'
    };
    
    await writeFile(
      resolve(logsDir, 'monitoring-config.json'),
      JSON.stringify(monitoringConfig, null, 2)
    );
    
    console.log('Performance monitoring initialized');
  } catch (error) {
    console.error('Failed to initialize monitoring:', error);
    throw error;
  }
}

// Global setup function
export default async function globalSetup(): Promise<void> {
  console.log('Starting E2E Test Global Setup...');
  
  try {
    // Check Docker availability
    const dockerAvailable = await checkDockerAvailability();
    
    if (dockerAvailable) {
      // Start Docker services
      await startDockerServices();
    } else {
      console.warn('Docker not available. Running E2E tests in local mode.');
    }
    
    // Setup test data
    await setupTestData();
    
    // Initialize monitoring
    await initializeMonitoring();
    
    // Store global state
    const globalState = {
      dockerAvailable,
      servicesStarted: dockerAvailable,
      testDataReady: true,
      monitoringInitialized: true,
      timestamp: new Date().toISOString()
    };
    
    // Save global state for use in tests
    await writeFile(
      resolve(__dirname, 'global-state.json'),
      JSON.stringify(globalState, null, 2)
    );
    
    console.log('E2E Test Global Setup completed successfully');
    
    // Small delay to ensure all services are fully ready
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.error('E2E Test Global Setup failed:', error);
    throw error;
  }
}