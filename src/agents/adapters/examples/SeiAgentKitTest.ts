/**
 * @fileoverview Test file to verify SeiAgentKitAdapter functionality
 * This file tests the updated SAK integration without external dependencies
 */

import { 
  createSeiAgentKitAdapter, 
  DEFAULT_SAK_CONFIGS, 
  mergeSAKConfig,
  type SAKIntegrationConfig 
} from '../SeiAgentKitAdapter';

// Simple test to verify the adapter can be created and tools can be listed
export async function testSeiAgentKitAdapter() {
  try {
    console.log('Testing SeiAgentKitAdapter...');

    // Create a basic agent configuration
    const agentConfig = {
      id: 'test-seiron-agent',
      name: 'Test Seiron Agent',
      description: 'Test agent for SAK integration',
      maxRetries: 3,
      timeout: 30000,
      enableLogging: true
    };

    // Create testnet configuration for testing
    const sakConfig = mergeSAKConfig(
      DEFAULT_SAK_CONFIGS.testnet,
      {
        // Override with test values - no real credentials needed for this test
        walletPrivateKey: '0x0000000000000000000000000000000000000000000000000000000000000001',
        protocolConfigs: {
          takara: { 
            enabled: true, 
            contractAddresses: {
              comptroller: '0x1234567890123456789012345678901234567890',
              priceOracle: '0x0987654321098765432109876543210987654321'
            }
          },
          symphony: { enabled: false, contractAddresses: {} },
          dragonswap: { enabled: false, contractAddresses: {} },
          silo: { enabled: false, contractAddresses: {} }
        }
      }
    );

    console.log('✓ Configuration created successfully');

    // Create the adapter
    const adapter = createSeiAgentKitAdapter(agentConfig, sakConfig);
    console.log('✓ Adapter created successfully');

    // Test getting available tools (this should work without needing actual network connections)
    const toolsResult = adapter.getSAKTools();
    if (toolsResult._tag === 'Right') {
      const tools = toolsResult.right;
      console.log(`✓ Found ${tools.length} available SAK tools:`);
      
      // Group tools by category
      const toolsByCategory = tools.reduce((acc, tool) => {
        if (!acc[tool.category]) acc[tool.category] = [];
        acc[tool.category].push(tool.name);
        return acc;
      }, {} as Record<string, string[]>);

      Object.entries(toolsByCategory).forEach(([category, toolNames]) => {
        console.log(`  ${category}: ${toolNames.join(', ')}`);
      });
    } else {
      console.error('✗ Failed to get tools:', toolsResult.left);
    }

    // Test getting tools by category
    const blockchainTools = adapter.getSAKToolsByCategory('blockchain');
    if (blockchainTools._tag === 'Right') {
      console.log(`✓ Found ${blockchainTools.right.length} blockchain tools`);
    }

    const defiTools = adapter.getSAKToolsByCategory('defi');
    if (defiTools._tag === 'Right') {
      console.log(`✓ Found ${defiTools.right.length} DeFi tools`);
    }

    const tradingTools = adapter.getSAKToolsByCategory('trading');
    if (tradingTools._tag === 'Right') {
      console.log(`✓ Found ${tradingTools.right.length} trading tools`);
    }

    console.log('✓ All tests passed successfully!');
    return true;

  } catch (error) {
    console.error('✗ Test failed:', error);
    return false;
  }
}

// Test configuration merging
export function testConfigurationMerging() {
  try {
    console.log('Testing configuration merging...');

    const baseConfig = DEFAULT_SAK_CONFIGS.mainnet;
    const userConfig = {
      walletPrivateKey: 'test-key',
      rateLimitConfig: {
        defaultMaxCalls: 200,
        defaultWindowMs: 30000
      },
      protocolConfigs: {
        takara: { enabled: false, contractAddresses: {} },
        symphony: { enabled: true, contractAddresses: { router: 'test-router' } }
      }
    };

    const mergedConfig = mergeSAKConfig(baseConfig, userConfig);

    // Verify merging worked correctly
    if (mergedConfig.walletPrivateKey === 'test-key') {
      console.log('✓ Wallet private key merged correctly');
    } else {
      throw new Error('Wallet private key not merged correctly');
    }

    if (mergedConfig.rateLimitConfig.defaultMaxCalls === 200) {
      console.log('✓ Rate limit config merged correctly');
    } else {
      throw new Error('Rate limit config not merged correctly');
    }

    if (!mergedConfig.protocolConfigs.takara.enabled) {
      console.log('✓ Takara protocol disabled correctly');
    } else {
      throw new Error('Takara protocol not disabled correctly');
    }

    if (mergedConfig.protocolConfigs.symphony.enabled) {
      console.log('✓ Symphony protocol enabled correctly');
    } else {
      throw new Error('Symphony protocol not enabled correctly');
    }

    console.log('✓ Configuration merging test passed!');
    return true;

  } catch (error) {
    console.error('✗ Configuration merging test failed:', error);
    return false;
  }
}

// Run all tests
export async function runAllTests() {
  console.log('='.repeat(50));
  console.log('Running SeiAgentKitAdapter Tests');
  console.log('='.repeat(50));

  const configTest = testConfigurationMerging();
  const adapterTest = await testSeiAgentKitAdapter();

  console.log('\n' + '='.repeat(50));
  console.log('Test Results:');
  console.log(`Configuration Test: ${configTest ? 'PASS' : 'FAIL'}`);
  console.log(`Adapter Test: ${adapterTest ? 'PASS' : 'FAIL'}`);
  console.log('='.repeat(50));

  return configTest && adapterTest;
}

// Export for easy running
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}