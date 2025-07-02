/**
 * Example usage of the AI Portfolio Manager with all integrated components
 */

import { AIPortfolioManagerEnhanced } from './AIPortfolioManagerEnhanced';
import { config } from 'dotenv';

// Load environment variables
config();

async function main() {
  // Initialize the enhanced portfolio manager
  const manager = new AIPortfolioManagerEnhanced({
    network: 'sei-mainnet',
    wallet: process.env.WALLET_ADDRESS!,
    aiModel: 'balanced-defi',
    autoExecute: true,
    riskTolerance: 0.7
  });

  // Start the chat interface with performance monitoring
  const chat = await manager.startChat();

  // Example 1: Lending operation
  console.log('\n📊 Example 1: Lending Operation');
  const lendingResponse = await chat.send('Lend 1000 USDC to earn yield');
  console.log('Response:', lendingResponse);

  // Example 2: Check portfolio
  console.log('\n💼 Example 2: Portfolio Status');
  const portfolioResponse = await chat.send('Show my portfolio positions');
  console.log('Response:', portfolioResponse);

  // Example 3: Risk assessment
  console.log('\n⚡ Example 3: Risk Assessment');
  const riskResponse = await chat.send('Analyze my portfolio risk');
  console.log('Response:', riskResponse);

  // Example 4: Yield optimization
  console.log('\n💰 Example 4: Yield Optimization');
  const yieldResponse = await chat.send('How can I improve my yields?');
  console.log('Response:', yieldResponse);

  // Example 5: Liquidity provision
  console.log('\n💧 Example 5: Liquidity Provision');
  const liquidityResponse = await chat.send('Add liquidity to USDC/ETH pool with 500 USDC');
  console.log('Response:', liquidityResponse);

  // Example 6: Market analysis
  console.log('\n📈 Example 6: Market Analysis');
  const marketResponse = await chat.send('Analyze current market conditions');
  console.log('Response:', marketResponse);

  // Get performance metrics
  console.log('\n⚡ Performance Metrics:');
  const metrics = manager.getPerformanceMetrics();
  console.log('Cache Hit Rate:', metrics.cache.hitRate);
  console.log('API Response Time (p95):', metrics.api.p95);
  console.log('Batch Processing Queue:', metrics.batch.queueLength);

  // Example of batch processing
  console.log('\n🚀 Example 7: Batch Strategy Execution');
  const strategy = {
    lending: [
      { type: 'deposit', asset: 'USDC', amount: 1000 },
      { type: 'deposit', asset: 'ETH', amount: 0.5 }
    ],
    liquidity: [
      { type: 'add', pair: 'USDC/ETH', amounts: [500, 0.25] }
    ],
    swaps: [
      { from: 'USDC', to: 'SEI', amount: 200 }
    ]
  };
  
  await manager.executeStrategyBatch(strategy);
  console.log('Strategy queued for batch execution');

  // Chat history
  console.log('\n📝 Chat History:');
  const history = chat.history();
  history.forEach((msg, idx) => {
    console.log(`${idx + 1}. ${msg.role}: ${msg.content.substring(0, 50)}...`);
  });
}

// Run the example
main().catch(console.error);

/**
 * Advanced Usage Examples
 */

// Example: Autonomous portfolio management
async function autonomousManagement() {
  const manager = new AIPortfolioManagerEnhanced({
    network: 'sei-mainnet',
    wallet: process.env.WALLET_ADDRESS!,
    aiModel: 'yield-maximizer',
    autoExecute: true
  });

  // Start autonomous management
  await manager.start({
    initialCapital: 10000,
    assets: ['USDC', 'ETH', 'SEI'],
    rebalanceThreshold: 0.05, // 5% deviation triggers rebalance
    maxGasPrice: 50 // Max gas price in gwei
  });

  console.log('Autonomous portfolio management started');
}

// Example: Performance testing
async function performanceTest() {
  const manager = new AIPortfolioManagerEnhanced({
    network: 'sei-testnet',
    wallet: process.env.TEST_WALLET!,
    aiModel: 'balanced-defi'
  });

  // Warm cache before testing
  await manager.warmCache();

  // Simulate high-frequency operations
  const operations = 1000;
  const startTime = Date.now();

  const promises = [];
  for (let i = 0; i < operations; i++) {
    promises.push(manager.getCachedPortfolioSummary());
  }

  await Promise.all(promises);
  
  const duration = Date.now() - startTime;
  const opsPerSecond = operations / (duration / 1000);

  console.log(`Performance Test Results:`);
  console.log(`Operations: ${operations}`);
  console.log(`Duration: ${duration}ms`);
  console.log(`Ops/sec: ${opsPerSecond.toFixed(2)}`);
  
  const metrics = manager.getPerformanceMetrics();
  console.log(`Cache Hit Rate: ${(metrics.cache.hitRate * 100).toFixed(2)}%`);
}

// Example: Multi-agent coordination
async function multiAgentExample() {
  const manager = new AIPortfolioManagerEnhanced({
    network: 'sei-mainnet',
    wallet: process.env.WALLET_ADDRESS!,
    aiModel: 'smart-liquidity'
  });

  const chat = await manager.startChat();

  // Complex multi-step operation
  const complexOperation = `
    1. Analyze my current positions
    2. Identify underperforming assets
    3. Suggest rebalancing into higher yield opportunities
    4. Execute the rebalancing if approved
  `;

  const response = await chat.send(complexOperation);
  console.log('Multi-agent response:', response);
}

/**
 * Usage with API Server
 * 
 * To use with the API server:
 * 1. Start the API server: npm run api
 * 2. Connect via WebSocket for real-time updates
 * 3. Send intents via HTTP POST to /api/process-intent
 */