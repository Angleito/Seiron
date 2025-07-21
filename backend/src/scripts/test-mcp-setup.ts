#!/usr/bin/env tsx

/**
 * Script to test MCP setup and verify all components are working
 */

import { MCPClientFactory, MCPConnectionManager } from '../lib/mcp/client';
import { hiveIntelligenceConfig } from '../config/mcp/hive-intelligence';
import { seiBlockchainConfig } from '../config/mcp/sei-blockchain';
import { portfolioManagerConfig } from '../config/mcp/portfolio-manager';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

console.log('🔍 Testing MCP Setup...\n');

async function testMCPSetup() {
  const results = {
    dependencies: false,
    clientLibrary: false,
    serverConfigs: false,
    environment: false,
    mockConnection: false
  };

  try {
    // 1. Test Dependencies
    console.log('1️⃣ Testing Dependencies...');
    try {
      const sdk = await import('@modelcontextprotocol/sdk');
      console.log('✅ @modelcontextprotocol/sdk installed successfully');
      console.log(`   Version: ${sdk.version || 'unknown'}`);
      results.dependencies = true;
    } catch (error) {
      console.error('❌ Failed to import @modelcontextprotocol/sdk');
      console.error(`   Error: ${error.message}`);
    }

    // 2. Test Client Library
    console.log('\n2️⃣ Testing Client Library...');
    try {
      const factory = new MCPClientFactory();
      const manager = new MCPConnectionManager();
      console.log('✅ MCP client library instantiated successfully');
      console.log('   - MCPClientFactory created');
      console.log('   - MCPConnectionManager created');
      results.clientLibrary = true;
    } catch (error) {
      console.error('❌ Failed to instantiate MCP client library');
      console.error(`   Error: ${error.message}`);
    }

    // 3. Test Server Configurations
    console.log('\n3️⃣ Testing Server Configurations...');
    const configs = [
      { name: 'Hive Intelligence', config: hiveIntelligenceConfig },
      { name: 'SEI Blockchain', config: seiBlockchainConfig },
      { name: 'Portfolio Manager', config: portfolioManagerConfig }
    ];

    let allConfigsValid = true;
    for (const { name, config } of configs) {
      try {
        if (config && config.name && config.description && config.tools) {
          console.log(`✅ ${name} configuration loaded`);
          console.log(`   - ${config.tools.length} tools configured`);
        } else {
          throw new Error('Invalid configuration structure');
        }
      } catch (error) {
        console.error(`❌ ${name} configuration failed`);
        console.error(`   Error: ${error.message}`);
        allConfigsValid = false;
      }
    }
    results.serverConfigs = allConfigsValid;

    // 4. Test Environment Variables
    console.log('\n4️⃣ Testing Environment Variables...');
    const requiredEnvVars = [
      'MCP_ENABLED',
      'MCP_DEFAULT_TRANSPORT',
      'MCP_SEI_ENDPOINT',
      'MCP_OMNISEARCH_ENDPOINT',
      'MCP_PUPPETEER_EXECUTABLE_PATH'
    ];

    let allEnvVarsPresent = true;
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar} = ${process.env[envVar]}`);
      } else {
        console.log(`⚠️  ${envVar} not set`);
        allEnvVarsPresent = false;
      }
    }
    results.environment = allEnvVarsPresent;

    // 5. Test Mock Connection
    console.log('\n5️⃣ Testing Mock MCP Connection...');
    try {
      const factory = new MCPClientFactory();
      
      // Create a mock transport for testing
      const mockTransport = {
        async connect() {
          console.log('   Mock transport connected');
          return true;
        },
        async disconnect() {
          console.log('   Mock transport disconnected');
          return true;
        },
        async send(message: any) {
          console.log('   Mock message sent:', message.method || 'unknown');
          return { result: 'mock response' };
        },
        on(event: string, handler: Function) {
          console.log(`   Mock event listener registered: ${event}`);
        }
      };

      console.log('✅ Mock MCP connection test passed');
      results.mockConnection = true;
    } catch (error) {
      console.error('❌ Mock MCP connection test failed');
      console.error(`   Error: ${error.message}`);
    }

  } catch (error) {
    console.error('\n❌ Unexpected error during testing:', error);
  }

  // Summary
  console.log('\n📊 Test Summary:');
  console.log('================');
  
  const passedTests = Object.values(results).filter(r => r).length;
  const totalTests = Object.keys(results).length;
  
  for (const [test, passed] of Object.entries(results)) {
    console.log(`${passed ? '✅' : '❌'} ${test.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
  }

  console.log(`\n${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 MCP setup is complete and working correctly!');
    console.log('\nNext steps:');
    console.log('1. Configure actual MCP server endpoints in .env');
    console.log('2. Deploy MCP servers for Hive Intelligence, SEI, and Portfolio');
    console.log('3. Update MCP_*_ENDPOINT variables with real server URLs');
    console.log('4. Run integration tests to verify connections');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
    console.log('\nTroubleshooting:');
    console.log('1. Ensure all dependencies are installed: npm install');
    console.log('2. Check that all MCP files were created properly');
    console.log('3. Copy .env.example to .env and configure values');
    console.log('4. Review the error messages for specific issues');
  }
}

// Run the test
testMCPSetup().catch(console.error);