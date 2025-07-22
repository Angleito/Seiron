/**
 * Global Test Setup
 * Configures environment for end-to-end and security testing
 */

import dotenv from 'dotenv';
import path from 'path';

export default async function globalSetup() {
  // Load test environment variables
  dotenv.config({ path: path.join(__dirname, '../../../.env.test') });
  dotenv.config({ path: path.join(__dirname, '../../../.env') });

  // Set test-specific environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'warn'; // Reduce log noise during tests
  process.env.DISABLE_RATE_LIMITING = 'false'; // Keep rate limiting for security tests
  
  // Ensure required test environment variables
  const requiredTestVars = [
    'JWT_SECRET',
    'FRONTEND_URL'
  ];

  const missingVars = requiredTestVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`Missing test environment variables: ${missingVars.join(', ')}`);
    
    // Set defaults for missing variables
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
    }
    if (!process.env.FRONTEND_URL) {
      process.env.FRONTEND_URL = 'http://localhost:3000';
    }
  }

  // Set test-specific API keys if not provided
  if (!process.env.TEST_API_KEY) {
    process.env.TEST_API_KEY = 'test_api_key_for_automated_testing_12345';
  }
  
  if (!process.env.MCP_API_KEY) {
    process.env.MCP_API_KEY = 'mcp_test_key_for_automated_testing_67890';
  }

  // Configure test database if needed
  if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('test')) {
    console.warn('Warning: Using production Supabase URL in tests. Consider using a test database.');
  }

  console.log('Global test setup completed');
  console.log('Test environment:', {
    NODE_ENV: process.env.NODE_ENV,
    FRONTEND_URL: process.env.FRONTEND_URL,
    hasJwtSecret: !!process.env.JWT_SECRET,
    hasTestApiKey: !!process.env.TEST_API_KEY,
    hasMcpApiKey: !!process.env.MCP_API_KEY,
    hasOpenAiKey: !!process.env.OPENAI_API_KEY,
    hasSupabaseUrl: !!process.env.SUPABASE_URL
  });
}