/**
 * SeiMCPAdapter Usage Example
 * 
 * This example demonstrates how to use the SeiMCPAdapter for real-time
 * blockchain interactions with Dragon Ball Z themed responses.
 */

import { SeiMCPAdapter, createMCPAdapter, MCPServerConfig } from '../index';
import { AgentConfig } from '../../base/BaseAgent';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';

/**
 * Example: Setting up the MCP Adapter
 */
async function setupMCPAdapter(): Promise<SeiMCPAdapter> {
  // Agent configuration
  const agentConfig: AgentConfig = {
    id: 'seiron-mcp-agent',
    name: 'Seiron MCP Agent',
    version: '1.0.0',
    description: 'Real-time blockchain agent with Dragon Ball Z theming',
    capabilities: [
      'blockchain_state_monitoring',
      'wallet_balance_tracking',
      'transaction_execution',
      'smart_contract_interaction',
      'real_time_events'
    ],
    settings: {
      dragonBallMode: true,
      powerLevelTracking: true
    }
  };

  // MCP server configuration
  const mcpConfig: MCPServerConfig = {
    endpoint: 'mcp.sei-apis.com',
    port: 443,
    secure: true,
    network: 'mainnet',
    connectionTimeout: 30000,
    heartbeatInterval: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    apiKey: process.env.SEI_MCP_API_KEY
  };

  // Create adapter using factory function
  const adapter = createMCPAdapter(agentConfig, mcpConfig);

  // Initialize the adapter
  await adapter.start();
  
  console.log('🐲 Seiron MCP Adapter initialized! Power level: OVER 9000!');
  
  return adapter;
}

/**
 * Example: Check wallet balance with power level calculation
 */
async function checkWalletBalance(adapter: SeiMCPAdapter, walletAddress: string): Promise<void> {
  console.log(`🔍 Scanning wallet ${walletAddress} for power signatures...`);

  const result = await pipe(
    adapter.getWalletBalance(walletAddress),
    TE.fold(
      (error) => async () => {
        console.error('❌ Scouter malfunction! Error:', error.message);
      },
      (balance) => async () => {
        const powerLevel = balance.totalValueUSD * 100; // Convert to "power level"
        console.log(`✨ Wallet analysis complete!`);
        console.log(`💰 Total Value: $${balance.totalValueUSD.toFixed(2)}`);
        console.log(`⚡ Power Level: ${powerLevel.toFixed(0)}`);
        console.log(`🏆 ${getPowerLevelTier(powerLevel)}`);
        
        // Display token balances
        balance.balances.forEach((token, index) => {
          console.log(`   Token ${index + 1}: ${token.amount} ${token.symbol} ($${token.valueUSD.toFixed(2)})`);
        });
      }
    )
  )();
}

/**
 * Example: Send a transaction with Dragon Ball themed monitoring
 */
async function sendTransactionWithStyle(
  adapter: SeiMCPAdapter,
  from: string,
  to: string,
  amount: string,
  denom: string
): Promise<void> {
  console.log(`🔥 Preparing to unleash ki energy transfer...`);
  console.log(`⚡ From: ${from}`);
  console.log(`🎯 To: ${to}`);
  console.log(`💫 Amount: ${amount} ${denom}`);

  const result = await pipe(
    adapter.sendTransaction({
      from,
      to,
      amount,
      denom,
      memo: '🐲 Seiron powered transaction - Over 9000!'
    }),
    TE.fold(
      (error) => async () => {
        console.error('💥 Transaction failed! The enemy was too strong!');
        console.error('Error:', error.message);
      },
      (response) => async () => {
        if (response.code === 0) {
          console.log('🎉 SUCCESS! Your ki energy has been successfully transferred!');
          console.log(`📋 Transaction Hash: ${response.txHash}`);
          console.log(`⛽ Gas Used: ${response.gasUsed}`);
          console.log(`🏔️ Block Height: ${response.height}`);
          console.log('🌟 Your power grows stronger with each successful transaction!');
        } else {
          console.log('⚠️ Transaction failed. Time to train harder!');
          console.log(`Error: ${response.rawLog}`);
        }
      }
    )
  )();
}

/**
 * Example: Query smart contract with scouter analysis
 */
async function queryContractWithScouter(
  adapter: SeiMCPAdapter,
  contractAddress: string,
  query: Record<string, any>
): Promise<void> {
  console.log(`🔍 Activating scouter to analyze contract ${contractAddress}...`);

  const result = await pipe(
    adapter.queryContract({
      contractAddress,
      query
    }),
    TE.fold(
      (error) => async () => {
        console.error('❌ Scouter interference detected! Unable to read contract data.');
        console.error('Error:', error.message);
      },
      (data) => async () => {
        console.log('✅ Scouter analysis complete!');
        console.log('📊 Contract Data:', JSON.stringify(data, null, 2));
        console.log('🎯 Intel acquired successfully!');
      }
    )
  )();
}

/**
 * Example: Monitor real-time blockchain events
 */
async function monitorBlockchainEvents(adapter: SeiMCPAdapter): Promise<void> {
  console.log('🔴 Activating Dragon Radar for real-time event monitoring...');

  // Subscribe to various event types
  const eventTypes = [
    'block_new',
    'transaction_complete',
    'token_transfer',
    'contract_execute'
  ];

  const result = await pipe(
    adapter.subscribeToEvents(eventTypes),
    TE.fold(
      (error) => async () => {
        console.error('❌ Dragon Radar malfunction!', error.message);
      },
      () => async () => {
        console.log('📡 Dragon Radar activated! Monitoring for energy signatures...');
      }
    )
  )();

  // Listen for events
  adapter.on('mcp:event', (event) => {
    console.log(`🎯 Energy signature detected: ${event.method}`);
    console.log(`📊 Event data:`, event.params);
  });
}

/**
 * Example: Get current blockchain state
 */
async function getBlockchainPowerReadings(adapter: SeiMCPAdapter): Promise<void> {
  console.log('📊 Scanning blockchain for power level readings...');

  const result = await pipe(
    adapter.getBlockchainState(),
    TE.fold(
      (error) => async () => {
        console.error('❌ Unable to read power levels!', error.message);
      },
      (state) => async () => {
        console.log('✅ Blockchain scan complete!');
        console.log(`🏔️ Block Height: ${state.blockNumber}`);
        console.log(`⛽ Gas Price: ${state.gasPrice}`);
        console.log(`🌐 Network Status: ${state.networkStatus.toUpperCase()}`);
        console.log(`👥 Active Validators: ${state.validators.length}`);
        console.log(`💰 Total Supply: ${state.totalSupply}`);
        console.log(`📈 Inflation Rate: ${(state.inflation * 100).toFixed(2)}%`);
      }
    )
  )();
}

/**
 * Utility function to determine power level tier
 */
function getPowerLevelTier(powerLevel: number): string {
  if (powerLevel < 1000) {
    return '🌱 Earthling Warrior - Keep training!';
  } else if (powerLevel < 10000) {
    return '⚔️ Elite Fighter - Your strength grows!';
  } else if (powerLevel < 100000) {
    return '🌟 Super Saiyan - Incredible power!';
  } else if (powerLevel < 1000000) {
    return '🌌 Legendary Super Saiyan - Mythical strength!';
  } else {
    return '💫 Ultra Instinct Master - Transcendent power!';
  }
}

/**
 * Main example function
 */
async function runMCPAdapterExample(): Promise<void> {
  try {
    // Setup the adapter
    const adapter = await setupMCPAdapter();

    // Example wallet address (replace with actual address)
    const walletAddress = 'sei1example...';

    // Run various examples
    await getBlockchainPowerReadings(adapter);
    console.log('\n' + '='.repeat(50) + '\n');

    await checkWalletBalance(adapter, walletAddress);
    console.log('\n' + '='.repeat(50) + '\n');

    // Example smart contract query
    await queryContractWithScouter(adapter, 'sei1contract...', { 
      balance: { address: walletAddress } 
    });
    console.log('\n' + '='.repeat(50) + '\n');

    // Start event monitoring
    await monitorBlockchainEvents(adapter);

    // Keep the process running to receive events
    console.log('🐲 Seiron MCP Adapter is now running...');
    console.log('Press Ctrl+C to stop the Dragon Radar');

    // Example transaction (commented out for safety)
    /*
    await sendTransactionWithStyle(
      adapter,
      'sei1from...',
      'sei1to...',
      '1000000',
      'usei'
    );
    */

  } catch (error) {
    console.error('💥 Critical system failure!', error);
    process.exit(1);
  }
}

// Export the example function
export { 
  runMCPAdapterExample,
  setupMCPAdapter,
  checkWalletBalance,
  sendTransactionWithStyle,
  queryContractWithScouter,
  monitorBlockchainEvents,
  getBlockchainPowerReadings,
  getPowerLevelTier
};

// Run the example if this file is executed directly
if (require.main === module) {
  runMCPAdapterExample().catch(console.error);
}