/**
 * @fileoverview Chat interface demonstration
 * Shows how to use the natural language DeFi interface
 */

import { ChatInterface } from '../chat/index.js';
import type { ChatSession, ChatResponse } from '../chat/types.js';

/**
 * Demo chat interaction
 */
async function runChatDemo() {
  console.log('🤖 DeFi Chat Assistant Demo\n');
  
  // Create a new chat session
  const session = ChatInterface.createSession({
    walletAddress: '0x1234567890abcdef',
    defaultProtocol: 'dragonswap',
    confirmTransactions: false // Auto-confirm for demo
  });
  
  // Example messages to process
  const messages = [
    'Supply 1000 USDC',
    'Borrow 500 SEI',
    'Show my positions',
    'What\'s the best APY for USDC?',
    'Add liquidity 1000 USDC and 0.5 ETH',
    'Portfolio status',
    'Help'
  ];
  
  let currentSession = session;
  
  for (const message of messages) {
    console.log(`\n👤 User: ${message}`);
    
    // Process the message
    const result = await ChatInterface.processMessage(currentSession, message);
    currentSession = result.session;
    
    // Format and display response
    const formattedResponse = ChatInterface.formatResponse(result.response);
    console.log(`\n🤖 Assistant: ${formattedResponse}`);
    
    // Add a delay for readability
    await sleep(1000);
  }
  
  // Show session summary
  console.log('\n📊 Session Summary:');
  console.log(`- Total messages: ${currentSession.messages.length}`);
  console.log(`- Session duration: ${Math.round((Date.now() - currentSession.startTime) / 1000)}s`);
  console.log(`- Last command: ${currentSession.context.lastCommand?.type || 'none'}`);
}

/**
 * Interactive chat mode
 */
async function runInteractiveChat() {
  console.log('🤖 DeFi Chat Assistant - Interactive Mode\n');
  console.log('Type "exit" to quit, "help" for commands\n');
  
  const session = ChatInterface.createSession({
    walletAddress: '0x1234567890abcdef',
    defaultProtocol: 'dragonswap'
  });
  
  let currentSession = session;
  
  // Note: In a real application, you would use readline or similar
  // This is a simplified version for demonstration
  const simulatedInputs = [
    'check rates',
    'supply 2000 USDC on kujira',
    'show positions',
    'exit'
  ];
  
  for (const input of simulatedInputs) {
    if (input.toLowerCase() === 'exit') {
      console.log('\nGoodbye! 👋');
      break;
    }
    
    console.log(`\n> ${input}`);
    
    const result = await ChatInterface.processMessage(currentSession, input);
    currentSession = result.session;
    
    console.log('\n' + ChatInterface.formatResponse(result.response));
    
    // Show suggestions if available
    if (result.response.suggestions && result.response.suggestions.length > 0) {
      console.log('\n💡 Try these commands:');
      result.response.suggestions.forEach(s => console.log(`  - ${s}`));
    }
  }
}

/**
 * Test error handling
 */
async function testErrorHandling() {
  console.log('🧪 Testing Error Handling\n');
  
  const session = ChatInterface.createSession();
  
  const errorCases = [
    'supply abc xyz',           // Invalid amount
    'borrow 1000 UNKNOWN',      // Unknown token
    'remove liquidity',         // Missing parameters
    'adjust range',             // Missing range values
    'gibberish command here'    // Unparseable
  ];
  
  for (const testCase of errorCases) {
    console.log(`\nTesting: "${testCase}"`);
    const result = await ChatInterface.processMessage(session, testCase);
    console.log(`Response: ${result.response.content}`);
    
    if (result.response.type === 'error') {
      console.log('✅ Error handled correctly');
    }
  }
}

/**
 * Test command suggestions
 */
async function testSuggestions() {
  console.log('🔍 Testing Command Suggestions\n');
  
  const partialCommands = [
    'sup',      // Should suggest "supply"
    'with',     // Should suggest "withdraw"
    'show',     // Should suggest "show positions"
    'check r',  // Should suggest "check rates"
    'add liq'   // Should suggest "add liquidity"
  ];
  
  for (const partial of partialCommands) {
    const suggestions = ChatInterface.getSuggestions(partial);
    console.log(`\n"${partial}" →`);
    suggestions.forEach(s => console.log(`  • ${s}`));
  }
}

/**
 * Utility sleep function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main demo runner
 */
async function main() {
  console.log('=== DeFi Chat Interface Demo ===\n');
  
  // Run different demo modes
  await runChatDemo();
  
  console.log('\n\n' + '='.repeat(50) + '\n');
  await runInteractiveChat();
  
  console.log('\n\n' + '='.repeat(50) + '\n');
  await testErrorHandling();
  
  console.log('\n\n' + '='.repeat(50) + '\n');
  await testSuggestions();
  
  console.log('\n\n✨ Demo completed!');
}

// Run the demo
if (import.meta.url.endsWith(process.argv[1])) {
  main().catch(console.error);
}

export { runChatDemo, runInteractiveChat, testErrorHandling, testSuggestions };