/**
 * Global Setup for Supabase Integration Tests
 * Runs once before all tests in the suite
 */

const { spawn } = require('child_process');
const { promises: fs } = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🚀 Starting global setup for Supabase integration tests...');
  
  // Create test results directory
  const testResultsDir = path.join(process.cwd(), 'test-results', 'supabase-integration');
  await fs.mkdir(testResultsDir, { recursive: true });
  
  // Set global test environment
  process.env.NODE_ENV = 'test';
  process.env.JEST_WORKER_ID = '1';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  
  // Setup test database state file
  const testStateFile = path.join(testResultsDir, 'test-state.json');
  const initialState = {
    startTime: new Date().toISOString(),
    testSuite: 'Supabase Integration Tests',
    environment: 'test',
    supabaseUrl: process.env.SUPABASE_URL,
    workers: process.env.JEST_MAX_WORKERS || '50%'
  };
  
  await fs.writeFile(testStateFile, JSON.stringify(initialState, null, 2));
  
  // Store paths for cleanup
  global.__TEST_RESULTS_DIR__ = testResultsDir;
  global.__TEST_STATE_FILE__ = testStateFile;
  
  console.log('✅ Global setup complete');
  console.log(`   - Test results directory: ${testResultsDir}`);
  console.log(`   - Supabase URL: ${process.env.SUPABASE_URL}`);
  console.log(`   - Environment: ${process.env.NODE_ENV}`);
};