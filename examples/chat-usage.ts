/**
 * Example: Using the AI Portfolio Manager Chat Interface
 */

import { AIPortfolioManager } from '../src/AIPortfolioManager';
// import { createWallet } from './utils'; // Your wallet creation utility

async function main() {
  // Initialize your wallet (implementation depends on your wallet provider)
  const wallet = await createWallet({
    privateKey: process.env.WALLET_PRIVATE_KEY,
    network: 'sei-mainnet'
  });

  // Create the AI Portfolio Manager
  const manager = new AIPortfolioManager({
    network: 'sei-mainnet',
    wallet: wallet,
    aiModel: 'balanced-defi',
    language: 'en',
    riskTolerance: 0.5,
    autoExecute: false // Set to true for automatic execution
  });

  // Start the chat interface
  const chat = await manager.startChat();

  // Example conversation flow
  console.log('AI Portfolio Manager initialized. Starting conversation...\n');

  // Check current opportunities
  let response = await chat.send("What are the current lending rates for USDC?");
  console.log('User: What are the current lending rates for USDC?');
  console.log('AI:', response, '\n');

  // Get portfolio status
  response = await chat.send("Show me my current portfolio");
  console.log('User: Show me my current portfolio');
  console.log('AI:', response, '\n');

  // Execute a lending operation
  response = await chat.send("Please lend 1000 USDC at the best available rate");
  console.log('User: Please lend 1000 USDC at the best available rate');
  console.log('AI:', response, '\n');

  // Check liquidity opportunities
  response = await chat.send("What are the best liquidity pools right now?");
  console.log('User: What are the best liquidity pools right now?');
  console.log('AI:', response, '\n');

  // Add liquidity with specific parameters
  response = await chat.send("Add $500 to the SEI/USDC pool with a tight range around current price");
  console.log('User: Add $500 to the SEI/USDC pool with a tight range around current price');
  console.log('AI:', response, '\n');

  // Get strategy recommendations
  response = await chat.send("I have $10,000 to invest. What strategy do you recommend for moderate risk?");
  console.log('User: I have $10,000 to invest. What strategy do you recommend for moderate risk?');
  console.log('AI:', response, '\n');

  // Check performance
  response = await chat.send("How has my portfolio performed in the last 24 hours?");
  console.log('User: How has my portfolio performed in the last 24 hours?');
  console.log('AI:', response, '\n');

  // Complex query
  response = await chat.send("Compare the risk-adjusted returns of lending vs liquidity provision for my portfolio");
  console.log('User: Compare the risk-adjusted returns of lending vs liquidity provision for my portfolio');
  console.log('AI:', response, '\n');

  // Get conversation history
  const history = chat.history();
  console.log(`\nTotal messages in conversation: ${history.length}`);

  // Get portfolio status
  const status = await manager.getStatus();
  console.log('\nFinal Portfolio Status:');
  console.log(`Total Value: $${status.portfolio.totalValue}`);
  console.log(`Active Positions: ${status.activePositions}`);
  console.log(`24h Performance: ${status.performance.percentChange}%`);
}

// Error handling
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});

// Placeholder wallet creation function
async function createWallet(config: any) {
  // This would be your actual wallet implementation
  return {
    address: '0x...',
    // ... other wallet methods
  };
}