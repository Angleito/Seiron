#!/usr/bin/env node

/**
 * MCP Server Health Check Script
 * Quick utility to check if MCP servers are running and accessible
 */

import axios from 'axios';
import chalk from 'chalk';

const MCP_SERVERS = {
  'sei-blockchain': process.env.MCP_SEI_URL || 'http://localhost:3001',
  'portfolio-manager': process.env.MCP_PORTFOLIO_URL || 'http://localhost:3002',
  'hive-intelligence': process.env.MCP_HIVE_URL || 'http://localhost:3003',
};

async function checkMCPHealth() {
  console.log(chalk.bold.cyan('\n🔍 MCP Server Health Check\n'));

  const results: Record<string, { status: string; tools?: number; error?: string }> = {};

  for (const [name, url] of Object.entries(MCP_SERVERS)) {
    process.stdout.write(`Checking ${name}... `);
    
    try {
      // Check health endpoint
      const healthResponse = await axios.get(`${url}/health`, { timeout: 5000 });
      
      if (healthResponse.status === 200) {
        // Try to get tools
        try {
          const toolsResponse = await axios.get(`${url}/tools`, { timeout: 5000 });
          const toolCount = toolsResponse.data?.tools?.length || 0;
          
          results[name] = {
            status: 'healthy',
            tools: toolCount,
          };
          
          console.log(chalk.green(`✅ Healthy (${toolCount} tools)`));
        } catch {
          results[name] = { status: 'healthy' };
          console.log(chalk.green('✅ Healthy'));
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          results[name] = {
            status: 'offline',
            error: 'Connection refused',
          };
          console.log(chalk.red('❌ Offline'));
        } else if (error.code === 'ETIMEDOUT') {
          results[name] = {
            status: 'timeout',
            error: 'Request timeout',
          };
          console.log(chalk.yellow('⏱️  Timeout'));
        } else {
          results[name] = {
            status: 'error',
            error: error.message,
          };
          console.log(chalk.red(`❌ Error: ${error.message}`));
        }
      }
    }
  }

  // Summary
  console.log(chalk.bold.cyan('\n📊 Summary\n'));
  
  const healthyCount = Object.values(results).filter(r => r.status === 'healthy').length;
  const totalCount = Object.keys(results).length;
  
  console.log(`Healthy servers: ${healthyCount}/${totalCount}`);
  
  if (healthyCount === totalCount) {
    console.log(chalk.green('\n✅ All MCP servers are healthy!'));
  } else if (healthyCount === 0) {
    console.log(chalk.red('\n❌ No MCP servers are running.'));
    console.log(chalk.yellow('\nTo start MCP servers, run:'));
    console.log(chalk.cyan('  ./start-mcp-servers.sh'));
  } else {
    console.log(chalk.yellow('\n⚠️  Some MCP servers are not available.'));
  }

  // Detailed info
  console.log(chalk.bold.cyan('\n🔧 Server URLs:\n'));
  Object.entries(MCP_SERVERS).forEach(([name, url]) => {
    console.log(`${name}: ${url}`);
  });

  // Test a simple MCP call if any server is healthy
  const healthyServer = Object.entries(results).find(([_, r]) => r.status === 'healthy');
  
  if (healthyServer) {
    const [serverName, serverInfo] = healthyServer;
    const serverUrl = MCP_SERVERS[serverName as keyof typeof MCP_SERVERS];
    
    console.log(chalk.bold.cyan(`\n🧪 Testing ${serverName} functionality...\n`));
    
    try {
      let testTool = '';
      let testParams = {};
      
      switch (serverName) {
        case 'sei-blockchain':
          testTool = 'get_block_height';
          testParams = {};
          break;
        case 'portfolio-manager':
          testTool = 'get_portfolio';
          testParams = { address: 'sei1test123' };
          break;
        case 'hive-intelligence':
          testTool = 'analyze_market';
          testParams = { protocol: 'test', timeframe: '1h' };
          break;
      }
      
      const response = await axios.post(`${serverUrl}/execute`, {
        tool: testTool,
        parameters: testParams,
      }, { timeout: 10000 });
      
      console.log(chalk.green(`✅ ${serverName} is fully functional`));
      console.log(`   Tool: ${testTool}`);
      console.log(`   Response: ${JSON.stringify(response.data.result || response.data).substring(0, 100)}...`);
    } catch (error) {
      console.log(chalk.yellow(`⚠️  ${serverName} health check passed but tool execution failed`));
      if (axios.isAxiosError(error)) {
        console.log(`   Error: ${error.response?.data?.error || error.message}`);
      }
    }
  }

  console.log('');
  
  return healthyCount === totalCount;
}

// Run the health check
checkMCPHealth()
  .then(allHealthy => {
    process.exit(allHealthy ? 0 : 1);
  })
  .catch(error => {
    console.error(chalk.red('\n❌ Health check failed:'), error);
    process.exit(1);
  });