#!/usr/bin/env node

/**
 * Frontend MCP verification script
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Frontend MCP Setup...\n');

// 1. Check if package is installed
try {
  const mcpPackage = require('./node_modules/@modelcontextprotocol/sdk/package.json');
  console.log('✅ MCP SDK installed: v' + mcpPackage.version);
} catch (error) {
  console.log('❌ MCP SDK not found. Run: npm install @modelcontextprotocol/sdk');
  process.exit(1);
}

// 2. Check if configuration files exist
const configFiles = [
  'lib/mcp/client.ts',
  'lib/mcp/types.ts',
  'lib/mcp/utils.ts',
  'lib/mcp/servers/hive-intelligence.ts',
  'lib/mcp/servers/sei-blockchain.ts',
  'lib/mcp/servers/portfolio-manager.ts',
  'components/examples/MCPDataExample.tsx'
];

console.log('\n📁 Checking MCP files:');
let allFilesExist = true;

configFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - NOT FOUND`);
    allFilesExist = false;
  }
});

// 3. Check environment variables
console.log('\n🔧 Checking environment setup:');
const envExample = path.join(__dirname, '.env.example');
if (fs.existsSync(envExample)) {
  const envContent = fs.readFileSync(envExample, 'utf8');
  const hasMCPConfig = envContent.includes('VITE_MCP_ENABLED');
  console.log(hasMCPConfig ? '✅ .env.example has MCP configuration' : '❌ .env.example missing MCP configuration');
} else {
  console.log('❌ .env.example not found');
}

// 4. Summary
console.log('\n📊 Summary:');
if (allFilesExist) {
  console.log('✅ All frontend MCP files are in place');
  console.log('\n🎉 Frontend MCP setup is complete!');
  console.log('\nNext steps:');
  console.log('1. Copy .env.example to .env');
  console.log('2. Configure VITE_MCP_* environment variables');
  console.log('3. Import useMCPClient hook in components');
  console.log('4. Test MCP data fetching in the UI');
} else {
  console.log('❌ Some MCP files are missing');
  console.log('\nPlease ensure all MCP implementation files are created');
}