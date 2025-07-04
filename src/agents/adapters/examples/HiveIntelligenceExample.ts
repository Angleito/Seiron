/**
 * @fileoverview HiveIntelligenceAdapter Usage Examples
 * Demonstrates how to use the Hive Intelligence API integration
 */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { HiveIntelligenceAdapter } from '../HiveIntelligenceAdapter';
import { createHiveAdapter } from '../index';
import { AgentConfig } from '../../base/BaseAgent';

/**
 * Example: Creating and configuring the adapter
 */
export async function exampleBasicSetup() {
  // Agent configuration
  const agentConfig: AgentConfig = {
    id: 'hive-demo-agent',
    name: 'Hive Intelligence Demo Agent',
    version: '1.0.0',
    description: 'Demonstration of Hive Intelligence integration',
    capabilities: ['search', 'analytics', 'portfolio', 'market'],
    settings: {}
  };

  // Create adapter with default configuration
  const adapter = createHiveAdapter(agentConfig);

  // Or create with custom configuration
  const customAdapter = createHiveAdapter(agentConfig, {
    baseUrl: 'https://api.hiveintelligence.xyz/v1',
    apiKey: process.env.HIVE_INTELLIGENCE_API_KEY || 'demo-key',
    rateLimitConfig: {
      maxRequests: 50, // Higher limit for premium plan
      windowMs: 60000
    },
    cacheConfig: {
      enabled: true,
      ttlMs: 600000, // 10 minutes cache
      maxSize: 2000
    }
  });

  return adapter;
}

/**
 * Example: Basic search functionality
 */
export async function exampleBasicSearch() {
  const adapter = await exampleBasicSetup();

  console.log('🔍 Performing basic search...');
  
  const searchResult = await adapter.search(
    'Show me recent DeFi transactions on Sei network with high gas usage'
  )();

  if (E.isRight(searchResult)) {
    const response = searchResult.right;
    if (response.success && response.data) {
      console.log(`✅ Found ${response.data.length} results`);
      response.data.forEach((result, index) => {
        console.log(`${index + 1}. ${result.title}`);
        console.log(`   Type: ${result.type}`);
        console.log(`   Relevance: ${(result.relevanceScore * 100).toFixed(1)}%`);
        console.log(`   Chain: ${result.chain}`);
      });
      
      console.log(`💰 Credits used: ${response.metadata?.creditsUsed || 0}`);
      console.log(`⏱️  Query time: ${response.metadata?.queryTime || 0}ms`);
    } else {
      console.log('❌ Search failed:', response.error?.message);
    }
  } else {
    console.log('❌ Search error:', searchResult.left.message);
  }
}

/**
 * Example: Search with metadata filters
 */
export async function exampleAdvancedSearch() {
  const adapter = await exampleBasicSetup();

  console.log('🔍 Performing advanced search with filters...');

  const searchResult = await adapter.search(
    'Find liquidity pools with high APY',
    {
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      maxResults: 10,
      filters: {
        chain: 'sei',
        minAPY: 10,
        protocol: ['DragonSwap', 'Yei Finance']
      },
      timeRange: {
        start: '2024-01-01T00:00:00Z',
        end: '2024-12-31T23:59:59Z'
      }
    }
  )();

  if (E.isRight(searchResult)) {
    const response = searchResult.right;
    if (response.success && response.data) {
      console.log(`✅ Found ${response.data.length} filtered results`);
      response.data.forEach(result => {
        console.log(`- ${result.title} (${result.relevanceScore * 100}% match)`);
        if (result.data.apy) {
          console.log(`  APY: ${result.data.apy}%`);
        }
      });
    }
  } else {
    console.log('❌ Advanced search failed:', searchResult.left.message);
  }
}

/**
 * Example: Portfolio analysis
 */
export async function examplePortfolioAnalysis() {
  const adapter = await exampleBasicSetup();

  console.log('📊 Analyzing portfolio...');

  const walletAddress = '0x1234567890abcdef1234567890abcdef12345678';
  const analysisResult = await adapter.analyzePortfolio(walletAddress, {
    includeHistory: true,
    timeRange: '30d',
    includeRisk: true,
    includePredictions: true
  })();

  if (E.isRight(analysisResult)) {
    const response = analysisResult.right;
    if (response.success && response.data) {
      const analysis = response.data;
      
      console.log(`✅ Portfolio analysis complete for ${walletAddress}`);
      console.log(`📈 Analysis type: ${analysis.analysisType}`);
      
      // Display insights
      console.log('\n🧠 Key Insights:');
      analysis.insights.forEach((insight, index) => {
        console.log(`${index + 1}. ${insight.title} (${insight.type})`);
        console.log(`   ${insight.description}`);
        console.log(`   Confidence: ${(insight.confidence * 100).toFixed(1)}%`);
      });

      // Display metrics
      console.log('\n📊 Portfolio Metrics:');
      Object.entries(analysis.metrics).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });

      // Display recommendations
      console.log('\n💡 Recommendations:');
      analysis.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec.title} (${rec.priority} priority)`);
        console.log(`   Action: ${rec.type.toUpperCase()}`);
        console.log(`   Expected impact: ${(rec.expectedImpact * 100).toFixed(1)}%`);
        console.log(`   Steps: ${rec.actionItems.join(', ')}`);
      });

      console.log(`\n💰 Credits used: ${response.metadata?.creditsUsed || 0}`);
    }
  } else {
    console.log('❌ Portfolio analysis failed:', analysisResult.left.message);
  }
}

/**
 * Example: Market intelligence
 */
export async function exampleMarketIntelligence() {
  const adapter = await exampleBasicSetup();

  console.log('📈 Getting market intelligence...');

  const marketResult = await adapter.getMarketIntelligence(
    'What are the current DeFi trends and opportunities on Sei network?',
    {
      maxResults: 5,
      filters: {
        timeframe: '24h',
        categories: ['lending', 'dex', 'yield-farming']
      }
    }
  )();

  if (E.isRight(marketResult)) {
    const response = marketResult.right;
    if (response.success && response.data) {
      const intelligence = response.data;
      
      console.log('✅ Market intelligence retrieved');
      
      console.log('\n🎯 Market Insights:');
      intelligence.insights.forEach(insight => {
        console.log(`• ${insight.title}`);
        console.log(`  ${insight.description}`);
        console.log(`  Confidence: ${(insight.confidence * 100).toFixed(1)}%`);
      });

      console.log('\n📊 Market Metrics:');
      Object.entries(intelligence.metrics).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });

      console.log('\n🚀 Market Opportunities:');
      intelligence.recommendations.forEach(rec => {
        if (rec.type === 'buy' || rec.type === 'monitor') {
          console.log(`• ${rec.title}`);
          console.log(`  Priority: ${rec.priority}`);
          console.log(`  Expected impact: ${(rec.expectedImpact * 100).toFixed(1)}%`);
        }
      });
    }
  } else {
    console.log('❌ Market intelligence failed:', marketResult.left.message);
  }
}

/**
 * Example: Credit usage monitoring
 */
export async function exampleCreditMonitoring() {
  const adapter = await exampleBasicSetup();

  console.log('💳 Checking credit usage...');

  const creditResult = await adapter.getCreditUsage()();

  if (E.isRight(creditResult)) {
    const usage = creditResult.right;
    
    console.log('✅ Credit usage retrieved');
    console.log(`💰 Total credits: ${usage.totalCredits}`);
    console.log(`📊 Used credits: ${usage.usedCredits}`);
    console.log(`💎 Remaining credits: ${usage.remainingCredits}`);
    console.log(`📅 Reset date: ${usage.resetDate}`);
    
    const usagePercentage = (usage.usedCredits / usage.totalCredits) * 100;
    console.log(`📈 Usage: ${usagePercentage.toFixed(1)}%`);

    if (usagePercentage > 80) {
      console.log('⚠️  Warning: Credit usage is high!');
    }

    console.log('\n📝 Recent queries:');
    usage.queryHistory.slice(-5).forEach((query, index) => {
      console.log(`${index + 1}. ${query.queryType} - ${query.creditsUsed} credits (${query.timestamp})`);
    });
  } else {
    console.log('❌ Credit check failed:', creditResult.left.message);
  }

  // Setup credit alerts
  adapter.on('hive:credit:alert', (event: any) => {
    console.log(`🚨 CREDIT ALERT: Only ${event.remainingCredits} credits remaining!`);
  });
}

/**
 * Example: Using registered actions
 */
export async function exampleUsingActions() {
  const adapter = await exampleBasicSetup();

  console.log('⚡ Using registered actions...');

  // Search action
  const searchActionResult = await adapter.executeAction('hive_search', {
    agentId: 'demo-agent',
    parameters: {
      query: 'Find high-yield DeFi opportunities',
      metadata: { maxResults: 3 }
    },
    state: adapter.getState(),
    metadata: { source: 'demo' }
  })();

  if (E.isRight(searchActionResult)) {
    console.log('✅ Search action successful:', searchActionResult.right.message);
    console.log('📊 Results:', searchActionResult.right.data);
  } else {
    console.log('❌ Search action failed:', searchActionResult.left.message);
  }

  // Portfolio analysis action
  const portfolioActionResult = await adapter.executeAction('hive_portfolio_analysis', {
    agentId: 'demo-agent',
    parameters: {
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      parameters: { includeRisk: true }
    },
    state: adapter.getState(),
    metadata: {}
  })();

  if (E.isRight(portfolioActionResult)) {
    console.log('✅ Portfolio action successful:', portfolioActionResult.right.message);
  } else {
    console.log('❌ Portfolio action failed:', portfolioActionResult.left.message);
  }
}

/**
 * Example: Error handling patterns
 */
export async function exampleErrorHandling() {
  const adapter = await exampleBasicSetup();

  console.log('🛡️  Demonstrating error handling...');

  // Simulate rate limit exceeded
  const queries = Array(25).fill(null).map((_, i) => 
    adapter.search(`test query ${i}`)
  );

  const results = await Promise.all(queries.map(q => q()));
  
  const successful = results.filter(r => E.isRight(r) && r.right.success);
  const rateLimited = results.filter(r => E.isLeft(r) && r.left.code === 'RATE_LIMIT_EXCEEDED');
  const failed = results.filter(r => E.isRight(r) && !r.right.success);

  console.log(`✅ Successful queries: ${successful.length}`);
  console.log(`⏸️  Rate limited queries: ${rateLimited.length}`);
  console.log(`❌ Failed queries: ${failed.length}`);

  // Demonstrate retry logic
  console.log('\n🔄 Demonstrating retry after rate limit...');
  
  // Wait a moment and try again
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const retryResult = await adapter.search('retry after rate limit')();
  
  if (E.isRight(retryResult)) {
    console.log('✅ Retry successful after rate limit');
  } else {
    console.log('❌ Retry still failed:', retryResult.left.message);
  }
}

/**
 * Example: Complete workflow
 */
export async function exampleCompleteWorkflow() {
  console.log('🚀 Starting complete Hive Intelligence workflow...\n');

  try {
    // 1. Setup
    await exampleBasicSetup();
    console.log('✅ Setup complete\n');

    // 2. Basic search
    await exampleBasicSearch();
    console.log('\n');

    // 3. Advanced search
    await exampleAdvancedSearch();
    console.log('\n');

    // 4. Portfolio analysis
    await examplePortfolioAnalysis();
    console.log('\n');

    // 5. Market intelligence
    await exampleMarketIntelligence();
    console.log('\n');

    // 6. Credit monitoring
    await exampleCreditMonitoring();
    console.log('\n');

    // 7. Action usage
    await exampleUsingActions();
    console.log('\n');

    // 8. Error handling
    await exampleErrorHandling();
    console.log('\n');

    console.log('✅ Complete workflow finished successfully!');
  } catch (error) {
    console.error('❌ Workflow failed:', error);
  }
}

// Export all examples
export const HiveIntelligenceExamples = {
  exampleBasicSetup,
  exampleBasicSearch,
  exampleAdvancedSearch,
  examplePortfolioAnalysis,
  exampleMarketIntelligence,
  exampleCreditMonitoring,
  exampleUsingActions,
  exampleErrorHandling,
  exampleCompleteWorkflow
};

// Run complete workflow if this file is executed directly
if (require.main === module) {
  exampleCompleteWorkflow().catch(console.error);
}

export default HiveIntelligenceExamples;