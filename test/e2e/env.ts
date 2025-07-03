/**
 * @fileoverview E2E Test Environment Configuration
 * Sets up environment variables and configuration for E2E testing
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables in order of precedence
config({ path: resolve(__dirname, '../../.env.e2e') });
config({ path: resolve(__dirname, '../../.env.test') });
config({ path: resolve(__dirname, '../../.env') });

// Set default test environment variables
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
process.env.API_PORT = process.env.API_PORT || '3001';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// E2E specific environment variables
process.env.E2E_API_URL = process.env.E2E_API_URL || 'http://localhost:3001';
process.env.E2E_DOCKER_COMPOSE = process.env.E2E_DOCKER_COMPOSE || 'docker-compose.e2e.yml';
process.env.E2E_CONCURRENT_USERS = process.env.E2E_CONCURRENT_USERS || '10';
process.env.E2E_LOAD_DURATION = process.env.E2E_LOAD_DURATION || '300000';

// Test wallet configuration
process.env.E2E_TEST_WALLET = process.env.E2E_TEST_WALLET || '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9';
process.env.E2E_TEST_PRIVATE_KEY = process.env.E2E_TEST_PRIVATE_KEY || 'test-private-key';

// Protocol endpoints for testing
process.env.E2E_YEI_ENDPOINT = process.env.E2E_YEI_ENDPOINT || 'https://api.yei.finance';
process.env.E2E_DRAGON_ENDPOINT = process.env.E2E_DRAGON_ENDPOINT || 'https://api.dragonswap.app';
process.env.E2E_TAKARA_ENDPOINT = process.env.E2E_TAKARA_ENDPOINT || 'https://api.takara.com';

// OpenAI configuration for testing
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key';
process.env.OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4';

// Disable external services in test mode
process.env.ENABLE_EXTERNAL_APIS = process.env.ENABLE_EXTERNAL_APIS || 'false';
process.env.ENABLE_BLOCKCHAIN_CALLS = process.env.ENABLE_BLOCKCHAIN_CALLS || 'false';
process.env.ENABLE_METRICS = process.env.ENABLE_METRICS || 'true';

// Performance monitoring
process.env.ENABLE_PERFORMANCE_MONITORING = process.env.ENABLE_PERFORMANCE_MONITORING || 'true';
process.env.PERFORMANCE_SAMPLE_RATE = process.env.PERFORMANCE_SAMPLE_RATE || '1.0';

// Memory management
process.env.MAX_MEMORY_USAGE = process.env.MAX_MEMORY_USAGE || '512';
process.env.MEMORY_CHECK_INTERVAL = process.env.MEMORY_CHECK_INTERVAL || '10000';

// Conversation timeouts
process.env.CONVERSATION_TIMEOUT = process.env.CONVERSATION_TIMEOUT || '30000';
process.env.MEMORY_PERSISTENCE_TIMEOUT = process.env.MEMORY_PERSISTENCE_TIMEOUT || '10000';

// Test debugging
process.env.DEBUG_E2E = process.env.DEBUG_E2E || 'false';
process.env.VERBOSE_LOGGING = process.env.VERBOSE_LOGGING || 'false';

// Export environment configuration
export const E2E_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  LOG_LEVEL: process.env.LOG_LEVEL,
  API_PORT: parseInt(process.env.API_PORT!),
  REDIS_URL: process.env.REDIS_URL,
  
  // E2E specific
  E2E_API_URL: process.env.E2E_API_URL,
  E2E_DOCKER_COMPOSE: process.env.E2E_DOCKER_COMPOSE,
  E2E_CONCURRENT_USERS: parseInt(process.env.E2E_CONCURRENT_USERS!),
  E2E_LOAD_DURATION: parseInt(process.env.E2E_LOAD_DURATION!),
  
  // Test wallet
  E2E_TEST_WALLET: process.env.E2E_TEST_WALLET,
  E2E_TEST_PRIVATE_KEY: process.env.E2E_TEST_PRIVATE_KEY,
  
  // Protocol endpoints
  E2E_YEI_ENDPOINT: process.env.E2E_YEI_ENDPOINT,
  E2E_DRAGON_ENDPOINT: process.env.E2E_DRAGON_ENDPOINT,
  E2E_TAKARA_ENDPOINT: process.env.E2E_TAKARA_ENDPOINT,
  
  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  
  // Feature flags
  ENABLE_EXTERNAL_APIS: process.env.ENABLE_EXTERNAL_APIS === 'true',
  ENABLE_BLOCKCHAIN_CALLS: process.env.ENABLE_BLOCKCHAIN_CALLS === 'true',
  ENABLE_METRICS: process.env.ENABLE_METRICS === 'true',
  ENABLE_PERFORMANCE_MONITORING: process.env.ENABLE_PERFORMANCE_MONITORING === 'true',
  
  // Performance
  PERFORMANCE_SAMPLE_RATE: parseFloat(process.env.PERFORMANCE_SAMPLE_RATE!),
  MAX_MEMORY_USAGE: parseInt(process.env.MAX_MEMORY_USAGE!),
  MEMORY_CHECK_INTERVAL: parseInt(process.env.MEMORY_CHECK_INTERVAL!),
  
  // Timeouts
  CONVERSATION_TIMEOUT: parseInt(process.env.CONVERSATION_TIMEOUT!),
  MEMORY_PERSISTENCE_TIMEOUT: parseInt(process.env.MEMORY_PERSISTENCE_TIMEOUT!),
  
  // Debugging
  DEBUG_E2E: process.env.DEBUG_E2E === 'true',
  VERBOSE_LOGGING: process.env.VERBOSE_LOGGING === 'true'
};

// Validate required environment variables
const requiredEnvVars = [
  'NODE_ENV',
  'API_PORT',
  'REDIS_URL',
  'E2E_API_URL',
  'E2E_TEST_WALLET',
  'OPENAI_API_KEY'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Log environment configuration in debug mode
if (E2E_ENV.DEBUG_E2E) {
  console.log('E2E Environment Configuration:', {
    NODE_ENV: E2E_ENV.NODE_ENV,
    API_PORT: E2E_ENV.API_PORT,
    E2E_API_URL: E2E_ENV.E2E_API_URL,
    E2E_CONCURRENT_USERS: E2E_ENV.E2E_CONCURRENT_USERS,
    E2E_LOAD_DURATION: E2E_ENV.E2E_LOAD_DURATION,
    ENABLE_EXTERNAL_APIS: E2E_ENV.ENABLE_EXTERNAL_APIS,
    ENABLE_BLOCKCHAIN_CALLS: E2E_ENV.ENABLE_BLOCKCHAIN_CALLS,
    ENABLE_PERFORMANCE_MONITORING: E2E_ENV.ENABLE_PERFORMANCE_MONITORING
  });
}

export default E2E_ENV;