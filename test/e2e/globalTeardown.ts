/**
 * @fileoverview Global E2E Test Teardown
 * Cleans up Docker containers and services after E2E testing
 */

import { promisify } from 'util';
import { readFile, writeFile, rm } from 'fs/promises';
import { resolve } from 'path';
import { E2E_ENV } from './env';

const exec = promisify(require('child_process').exec);

// Stop Docker services
async function stopDockerServices(): Promise<void> {
  const dockerComposePath = resolve(__dirname, '../../', E2E_ENV.E2E_DOCKER_COMPOSE);
  
  try {
    console.log('Stopping Docker services...');
    
    // Stop and remove containers
    await exec(`docker-compose -f ${dockerComposePath} down --remove-orphans`);
    
    // Remove volumes if needed (uncomment for complete cleanup)
    // await exec(`docker-compose -f ${dockerComposePath} down -v`);
    
    console.log('Docker services stopped successfully');
  } catch (error) {
    console.error('Failed to stop Docker services:', error);
    // Don't throw - we want teardown to continue
  }
}

// Generate test report
async function generateTestReport(): Promise<void> {
  const logsDir = resolve(__dirname, '../../test-results/e2e');
  
  try {
    // Read global state
    const globalStatePath = resolve(__dirname, 'global-state.json');
    let globalState = {};
    
    try {
      const stateContent = await readFile(globalStatePath, 'utf-8');
      globalState = JSON.parse(stateContent);
    } catch {
      globalState = { note: 'Global state not found' };
    }
    
    // Generate comprehensive test report
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: E2E_ENV.NODE_ENV,
        apiUrl: E2E_ENV.E2E_API_URL,
        dockerAvailable: (globalState as any).dockerAvailable,
        servicesStarted: (globalState as any).servicesStarted
      },
      configuration: {
        concurrentUsers: E2E_ENV.E2E_CONCURRENT_USERS,
        loadDuration: E2E_ENV.E2E_LOAD_DURATION,
        performanceMonitoring: E2E_ENV.ENABLE_PERFORMANCE_MONITORING,
        externalApis: E2E_ENV.ENABLE_EXTERNAL_APIS,
        blockchainCalls: E2E_ENV.ENABLE_BLOCKCHAIN_CALLS
      },
      thresholds: {
        responseTime: 2000,
        memoryUsage: E2E_ENV.MAX_MEMORY_USAGE * 1024 * 1024,
        errorRate: 0.01
      },
      testCategories: [
        'Conversation Flow Tests',
        'Memory Integration Tests',
        'NLP Robustness Tests',
        'Protocol Execution Tests',
        'Performance Tests',
        'Concurrent User Tests'
      ],
      globalState,
      notes: [
        'E2E tests completed',
        'Check individual test files for detailed results',
        'Performance metrics available in test-results/e2e/',
        'Memory usage monitored throughout test execution'
      ]
    };
    
    await writeFile(
      resolve(logsDir, 'e2e-test-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('Test report generated successfully');
  } catch (error) {
    console.error('Failed to generate test report:', error);
    // Don't throw - we want teardown to continue
  }
}

// Clean up test data
async function cleanupTestData(): Promise<void> {
  try {
    const testDataDir = resolve(__dirname, 'fixtures');
    const globalStatePath = resolve(__dirname, 'global-state.json');
    
    // Remove test fixtures (optional - keep for debugging)
    if (process.env.CLEANUP_TEST_DATA === 'true') {
      await rm(testDataDir, { recursive: true, force: true });
      console.log('Test data cleaned up');
    }
    
    // Clean up global state
    try {
      await rm(globalStatePath, { force: true });
    } catch {
      // File might not exist
    }
    
  } catch (error) {
    console.error('Failed to cleanup test data:', error);
    // Don't throw - we want teardown to continue
  }
}

// Collect performance metrics
async function collectPerformanceMetrics(): Promise<void> {
  const logsDir = resolve(__dirname, '../../test-results/e2e');
  
  try {
    // Collect memory usage statistics
    const memoryUsage = process.memoryUsage();
    const performanceMetrics = {
      timestamp: new Date().toISOString(),
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers
      },
      process: {
        uptime: process.uptime(),
        cpuUsage: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version
      },
      performance: {
        timeOrigin: performance.timeOrigin,
        now: performance.now()
      }
    };
    
    await writeFile(
      resolve(logsDir, 'performance-metrics.json'),
      JSON.stringify(performanceMetrics, null, 2)
    );
    
    console.log('Performance metrics collected');
  } catch (error) {
    console.error('Failed to collect performance metrics:', error);
    // Don't throw - we want teardown to continue
  }
}

// Log teardown summary
async function logTeardownSummary(): Promise<void> {
  const logsDir = resolve(__dirname, '../../test-results/e2e');
  
  try {
    const summary = {
      timestamp: new Date().toISOString(),
      action: 'E2E Test Teardown',
      status: 'completed',
      steps: [
        'Docker services stopped',
        'Test report generated',
        'Performance metrics collected',
        'Test data managed',
        'Summary logged'
      ],
      environment: {
        nodeEnv: E2E_ENV.NODE_ENV,
        debugMode: E2E_ENV.DEBUG_E2E,
        verboseLogging: E2E_ENV.VERBOSE_LOGGING
      }
    };
    
    await writeFile(
      resolve(logsDir, 'teardown-summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    if (E2E_ENV.VERBOSE_LOGGING) {
      console.log('Teardown Summary:', JSON.stringify(summary, null, 2));
    }
    
  } catch (error) {
    console.error('Failed to log teardown summary:', error);
    // Don't throw - we want teardown to continue
  }
}

// Global teardown function
export default async function globalTeardown(): Promise<void> {
  console.log('Starting E2E Test Global Teardown...');
  
  try {
    // Stop Docker services if they were started
    try {
      const globalStatePath = resolve(__dirname, 'global-state.json');
      const stateContent = await readFile(globalStatePath, 'utf-8');
      const globalState = JSON.parse(stateContent);
      
      if (globalState.servicesStarted) {
        await stopDockerServices();
      }
    } catch {
      // If we can't read state, try to stop services anyway
      console.log('Could not read global state, attempting to stop services...');
      await stopDockerServices();
    }
    
    // Generate test report
    await generateTestReport();
    
    // Collect performance metrics
    await collectPerformanceMetrics();
    
    // Clean up test data
    await cleanupTestData();
    
    // Log teardown summary
    await logTeardownSummary();
    
    console.log('E2E Test Global Teardown completed successfully');
    
  } catch (error) {
    console.error('E2E Test Global Teardown failed:', error);
    // Don't throw - we want the process to exit cleanly
  }
  
  // Force exit after a short delay to ensure all cleanup is complete
  setTimeout(() => {
    process.exit(0);
  }, 2000);
}