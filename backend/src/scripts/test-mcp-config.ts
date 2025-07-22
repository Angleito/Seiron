#!/usr/bin/env node

/**
 * Test script for MCP configuration and HTTP client
 * 
 * This script validates that the MCP servers are properly configured
 * and can be reached via HTTP
 */

import { getConfig } from '../config';
import { getMCPHttpClient } from '../utils/mcp-http-client';
import { createServiceLogger } from '../services/LoggingService';

const logger = createServiceLogger('MCPConfigTest');

async function testMCPConfiguration() {
  logger.info('Starting MCP configuration test...');

  try {
    // Test 1: Configuration loading
    logger.info('Testing configuration loading...');
    const config = getConfig();
    
    if (!config.mcp.enabled) {
      logger.warn('MCP is disabled in configuration');
      return;
    }

    logger.info('MCP Configuration:', {
      enabled: config.mcp.enabled,
      servers: {
        hiveIntelligence: {
          url: config.mcp.servers.hiveIntelligence.url,
          hasApiKey: !!config.mcp.servers.hiveIntelligence.apiKey,
          timeout: config.mcp.servers.hiveIntelligence.timeout
        },
        seiBlockchain: {
          url: config.mcp.servers.seiBlockchain.url,
          hasApiKey: !!config.mcp.servers.seiBlockchain.apiKey,
          timeout: config.mcp.servers.seiBlockchain.timeout
        },
        portfolioManager: {
          url: config.mcp.servers.portfolioManager.url,
          hasApiKey: !!config.mcp.servers.portfolioManager.apiKey,
          timeout: config.mcp.servers.portfolioManager.timeout
        }
      }
    });

    // Test 2: MCP HTTP Client initialization
    logger.info('Testing MCP HTTP client initialization...');
    const mcpClient = getMCPHttpClient();
    logger.info('MCP HTTP client initialized successfully');

    // Test 3: Health checks
    logger.info('Testing MCP server health checks...');
    const healthResults = await mcpClient.healthCheckAll();
    
    logger.info('Health check results:', healthResults);

    const healthySvrs = Object.entries(healthResults)
      .filter(([, isHealthy]) => isHealthy)
      .map(([server]) => server);
    
    const unhealthyServers = Object.entries(healthResults)
      .filter(([, isHealthy]) => !isHealthy)
      .map(([server]) => server);

    if (healthySvrs.length > 0) {
      logger.info(`Healthy servers: ${healthySvrs.join(', ')}`);
    }

    if (unhealthyServers.length > 0) {
      logger.warn(`Unhealthy servers: ${unhealthyServers.join(', ')}`);
    }

    // Test 4: List available tools (if servers are healthy)
    for (const server of healthySvrs as ('hiveIntelligence' | 'seiBlockchain' | 'portfolioManager')[]) {
      try {
        logger.info(`Listing tools for ${server}...`);
        const tools = await mcpClient.listTools(server);
        logger.info(`Available tools on ${server}:`, tools);
      } catch (error) {
        logger.warn(`Failed to list tools for ${server}:`, error instanceof Error ? error.message : error);
      }
    }

    logger.info('MCP configuration test completed successfully');

  } catch (error) {
    logger.error('MCP configuration test failed:', error);
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testMCPConfiguration()
    .then(() => {
      logger.info('Test completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Test failed:', error);
      process.exit(1);
    });
}

export { testMCPConfiguration };