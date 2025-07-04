/**
 * @fileoverview Usage examples for the SeiAgentKitAdapter
 * Demonstrates how to integrate and use the enhanced SAK tools with real Sei protocols
 */

import { 
  createSeiAgentKitAdapter, 
  DEFAULT_SAK_CONFIGS, 
  mergeSAKConfig,
  SAKIntegrationConfig 
} from '../SeiAgentKitAdapter';
import type { AgentConfig } from '../base/BaseAgent';

// ============================================================================
// Basic Configuration Examples
// ============================================================================

/**
 * Example 1: Basic mainnet configuration
 */
export const createMainnetSAKAdapter = async () => {
  // Agent configuration
  const agentConfig: AgentConfig = {
    id: 'seiron-mainnet-agent',
    name: 'Seiron Mainnet Agent',
    description: 'AI agent for Sei Network mainnet operations',
    maxRetries: 3,
    timeout: 30000,
    enableLogging: true
  };

  // Merge default mainnet config with custom settings
  const sakConfig = mergeSAKConfig(
    DEFAULT_SAK_CONFIGS.mainnet,
    {
      walletPrivateKey: process.env.WALLET_PRIVATE_KEY,
      apiKeys: {
        takara: process.env.TAKARA_API_KEY,
        symphony: process.env.SYMPHONY_API_KEY
      },
      cacheConfig: {
        enabled: true,
        ttlMs: 60000, // 1 minute cache
        maxSize: 2000
      }
    }
  );

  const adapter = createSeiAgentKitAdapter(agentConfig, sakConfig);
  await adapter.installSAKPlugin();
  
  return adapter;
};

/**
 * Example 2: Testnet configuration for development
 */
export const createTestnetSAKAdapter = async () => {
  const agentConfig: AgentConfig = {
    id: 'seiron-testnet-agent',
    name: 'Seiron Testnet Agent',
    description: 'AI agent for Sei Network testnet operations',
    maxRetries: 2,
    timeout: 15000,
    enableLogging: true
  };

  const sakConfig = mergeSAKConfig(
    DEFAULT_SAK_CONFIGS.testnet,
    {
      walletMnemonic: process.env.WALLET_MNEMONIC,
      protocolConfigs: {
        takara: { enabled: true, contractAddresses: {} },
        symphony: { enabled: false, contractAddresses: {} }, // Disable Symphony on testnet
        dragonswap: { enabled: true, contractAddresses: {} },
        silo: { enabled: true, contractAddresses: {} }
      }
    }
  );

  const adapter = createSeiAgentKitAdapter(agentConfig, sakConfig);
  await adapter.installSAKPlugin();
  
  return adapter;
};

// ============================================================================
// Tool Usage Examples
// ============================================================================

/**
 * Example 3: Token operations
 */
export const tokenOperationsExample = async () => {
  const adapter = await createMainnetSAKAdapter();

  try {
    // Check native SEI balance
    const nativeBalance = await adapter.executeSAKTool('get_native_balance', {
      address: '0x742d35Cc6634C0532925a3b8D433C745c0cAECB4'
    });
    console.log('Native SEI balance:', nativeBalance);

    // Check ERC-20 token balance
    const tokenBalance = await adapter.executeSAKTool('get_token_balance', {
      address: '0x742d35Cc6634C0532925a3b8D433C745c0cAECB4',
      tokenAddress: '0x1234567890123456789012345678901234567890',
      tokenType: 'erc20'
    });
    console.log('Token balance:', tokenBalance);

    // Transfer tokens (requires signing wallet)
    const transferResult = await adapter.executeSAKTool('transfer_token', {
      to: '0x9876543210987654321098765432109876543210',
      amount: '1000000000000000000', // 1 token in wei
      tokenAddress: '0x1234567890123456789012345678901234567890',
      tokenType: 'erc20'
    });
    console.log('Transfer result:', transferResult);

  } catch (error) {
    console.error('Token operation failed:', error);
  }
};

/**
 * Example 4: Takara lending operations
 */
export const takaraLendingExample = async () => {
  const adapter = await createMainnetSAKAdapter();

  try {
    // Get user account data
    const userData = await adapter.executeSAKTool('takara_get_user_data', {
      userAddress: '0x742d35Cc6634C0532925a3b8D433C745c0cAECB4'
    });
    console.log('User account data:', userData);

    // Get health factor
    const healthFactor = await adapter.executeSAKTool('takara_get_health_factor', {
      userAddress: '0x742d35Cc6634C0532925a3b8D433C745c0cAECB4'
    });
    console.log('Health factor:', healthFactor);

    // Supply SEI to Takara
    const supplyResult = await adapter.executeSAKTool('takara_supply', {
      asset: 'SEI',
      amount: '5000000000000000000', // 5 SEI
      onBehalfOf: '0x742d35Cc6634C0532925a3b8D433C745c0cAECB4'
    });
    console.log('Supply result:', supplyResult);

    // Borrow USDT
    const borrowResult = await adapter.executeSAKTool('takara_borrow', {
      asset: 'USDT',
      amount: '100000000', // 100 USDT (6 decimals)
      onBehalfOf: '0x742d35Cc6634C0532925a3b8D433C745c0cAECB4'
    });
    console.log('Borrow result:', borrowResult);

  } catch (error) {
    console.error('Takara operation failed:', error);
  }
};

/**
 * Example 5: Symphony trading operations
 */
export const symphonyTradingExample = async () => {
  const adapter = await createMainnetSAKAdapter();

  try {
    // Get swap quote
    const quote = await adapter.executeSAKTool('symphony_get_quote', {
      tokenIn: 'SEI',
      tokenOut: 'USDT',
      amountIn: '1000000000000000000' // 1 SEI
    });
    console.log('Swap quote:', quote);

    // Get optimal routes
    const routes = await adapter.executeSAKTool('symphony_get_routes', {
      tokenIn: 'SEI',
      tokenOut: 'USDT',
      amountIn: '1000000000000000000'
    });
    console.log('Optimal routes:', routes);

    // Execute swap (this would be enabled when Symphony adapter is fully implemented)
    // const swapResult = await adapter.executeSAKTool('symphony_swap', {
    //   tokenIn: 'SEI',
    //   tokenOut: 'USDT',
    //   amountIn: '1000000000000000000',
    //   amountOutMin: quote.amountOut,
    //   slippage: 0.5
    // });
    // console.log('Swap result:', swapResult);

  } catch (error) {
    console.error('Symphony operation failed:', error);
  }
};

/**
 * Example 6: Batch operations
 */
export const batchOperationsExample = async () => {
  const adapter = await createMainnetSAKAdapter();

  try {
    // Execute multiple operations in batch
    const batchResult = await adapter.executeSAKBatch([
      {
        toolName: 'get_native_balance',
        params: { address: '0x742d35Cc6634C0532925a3b8D433C745c0cAECB4' }
      },
      {
        toolName: 'takara_get_user_data',
        params: { userAddress: '0x742d35Cc6634C0532925a3b8D433C745c0cAECB4' }
      },
      {
        toolName: 'takara_get_health_factor',
        params: { userAddress: '0x742d35Cc6634C0532925a3b8D433C745c0cAECB4' }
      }
    ]);

    console.log('Batch operation results:', batchResult);

  } catch (error) {
    console.error('Batch operation failed:', error);
  }
};

// ============================================================================
// Advanced Usage Examples
// ============================================================================

/**
 * Example 7: Custom configuration with specific protocols
 */
export const customProtocolConfiguration = async () => {
  const agentConfig: AgentConfig = {
    id: 'custom-seiron-agent',
    name: 'Custom Seiron Agent',
    description: 'Custom configured agent for specific use case',
    maxRetries: 5,
    timeout: 45000,
    enableLogging: true
  };

  const customSakConfig: SAKIntegrationConfig = {
    seiRpcUrl: 'https://rpc.sei.io',
    seiEvmRpcUrl: 'https://evm-rpc.sei.io',
    chainId: 'pacific-1',
    network: 'mainnet',
    defaultPermissions: ['read', 'write'],
    walletPrivateKey: process.env.WALLET_PRIVATE_KEY,
    apiKeys: {
      takara: process.env.TAKARA_API_KEY,
      symphony: process.env.SYMPHONY_API_KEY,
      dragonswap: process.env.DRAGONSWAP_API_KEY,
      silo: process.env.SILO_API_KEY
    },
    protocolConfigs: {
      takara: {
        enabled: true,
        contractAddresses: {
          comptroller: process.env.TAKARA_COMPTROLLER_ADDRESS || '',
          priceOracle: process.env.TAKARA_ORACLE_ADDRESS || ''
        }
      },
      symphony: {
        enabled: true,
        contractAddresses: {
          router: process.env.SYMPHONY_ROUTER_ADDRESS || '',
          quoter: process.env.SYMPHONY_QUOTER_ADDRESS || ''
        }
      },
      dragonswap: {
        enabled: true,
        contractAddresses: {
          factory: process.env.DRAGONSWAP_FACTORY_ADDRESS || '',
          router: process.env.DRAGONSWAP_ROUTER_ADDRESS || ''
        }
      },
      silo: {
        enabled: true,
        contractAddresses: {
          staking: process.env.SILO_STAKING_ADDRESS || ''
        }
      }
    },
    rateLimitConfig: {
      defaultMaxCalls: 200,
      defaultWindowMs: 60000
    },
    cacheConfig: {
      enabled: true,
      ttlMs: 30000,
      maxSize: 5000
    },
    retryConfig: {
      maxRetries: 5,
      backoffMs: 2000
    }
  };

  const adapter = createSeiAgentKitAdapter(agentConfig, customSakConfig);
  await adapter.installSAKPlugin();
  
  return adapter;
};

/**
 * Example 8: Event listening and monitoring
 */
export const eventMonitoringExample = async () => {
  const adapter = await createMainnetSAKAdapter();

  // Listen to SAK events
  adapter.on('sak:connection:initialized', (data) => {
    console.log('SAK connection initialized:', data);
  });

  adapter.on('sak:tools:loaded', (data) => {
    console.log('SAK tools loaded:', data);
  });

  adapter.on('sak:plugin:initialized', (data) => {
    console.log('SAK plugin initialized:', data);
  });

  // Get available tools
  const availableTools = adapter.getSAKTools();
  if (availableTools._tag === 'Right') {
    console.log('Available SAK tools:', availableTools.right.map(t => t.name));
  }

  // Get tools by category
  const blockchainTools = adapter.getSAKToolsByCategory('blockchain');
  if (blockchainTools._tag === 'Right') {
    console.log('Blockchain tools:', blockchainTools.right.map(t => t.name));
  }

  const defiTools = adapter.getSAKToolsByCategory('defi');
  if (defiTools._tag === 'Right') {
    console.log('DeFi tools:', defiTools.right.map(t => t.name));
  }
};

// ============================================================================
// Error Handling Examples
// ============================================================================

/**
 * Example 9: Comprehensive error handling
 */
export const errorHandlingExample = async () => {
  const adapter = await createMainnetSAKAdapter();

  try {
    const result = await adapter.executeSAKTool('get_native_balance', {
      address: 'invalid-address'
    });

    if (result._tag === 'Left') {
      const error = result.left;
      console.error('SAK operation failed:');
      console.error('- Code:', error.code);
      console.error('- Message:', error.message);
      console.error('- Details:', error.details);
      console.error('- Timestamp:', error.timestamp);
      console.error('- Agent ID:', error.agentId);
    } else {
      console.log('Operation successful:', result.right);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
};

// Export all examples for easy testing
export const examples = {
  createMainnetSAKAdapter,
  createTestnetSAKAdapter,
  tokenOperationsExample,
  takaraLendingExample,
  symphonyTradingExample,
  batchOperationsExample,
  customProtocolConfiguration,
  eventMonitoringExample,
  errorHandlingExample
};