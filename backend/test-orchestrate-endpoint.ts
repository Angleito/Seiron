import axios from 'axios';

interface TestResult {
  endpoint: string;
  message: string;
  success: boolean;
  response?: any;
  error?: string;
  agentType?: string;
  hasAIContent?: boolean;
}

async function testOrchestrateEndpoint(): Promise<TestResult[]> {
  const baseUrl = 'http://localhost:8000';
  const tests: Array<{endpoint: string, message: string, messageType: string}> = [
    {
      endpoint: '/api/chat/orchestrate',
      message: 'Hello Seiron, how are you today?',
      messageType: 'greeting'
    },
    {
      endpoint: '/api/chat/orchestrate', 
      message: 'Show me my portfolio',
      messageType: 'portfolio_query'
    },
    {
      endpoint: '/api/chat/orchestrate',
      message: 'What is the best way to earn yield on SEI?',
      messageType: 'technical_question'
    },
    {
      endpoint: '/api/chat/orchestrate',
      message: 'How do I lend 1000 USDC?',
      messageType: 'lending_question'
    }
  ];

  const results: TestResult[] = [];

  for (const test of tests) {
    try {
      console.log(`Testing ${test.messageType}: "${test.message}"`);
      
      const response = await axios.post(`${baseUrl}${test.endpoint}`, {
        message: test.message,
        sessionId: 'test-session-123',
        walletAddress: '0x1234567890123456789012345678901234567890'
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });

      const isSuccess = response.status === 200 && response.data;
      const hasMessage = response.data?.message && response.data.message.length > 0;
      const agentType = response.data?.agentType;
      const hasAIContent = hasMessage && (
        response.data.message.includes('dragon') ||
        response.data.message.includes('Seiron') ||
        response.data.message.includes('power') ||
        response.data.message.length > 50 // Substantial response
      );

      results.push({
        endpoint: test.endpoint,
        message: test.message,
        success: isSuccess,
        response: response.data,
        agentType,
        hasAIContent
      });

      console.log(`✓ ${test.messageType} - Success: ${isSuccess}, Agent: ${agentType}, AI Content: ${hasAIContent}`);
      if (hasMessage) {
        console.log(`  Response: ${response.data.message.substring(0, 100)}...`);
      }
      
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
      results.push({
        endpoint: test.endpoint,
        message: test.message,
        success: false,
        error: errorMsg,
        hasAIContent: false
      });
      console.log(`✗ ${test.messageType} - Failed: ${errorMsg}`);
    }
  }

  return results;
}

async function main() {
  console.log('🧪 Testing /api/chat/orchestrate endpoint for real AI responses...\n');
  
  try {
    // Test server connectivity first
    await axios.get('http://localhost:8000/api/health', { timeout: 5000 });
    console.log('✓ Server is running\n');
  } catch (error) {
    console.error('✗ Server not accessible:', error);
    process.exit(1);
  }

  const results = await testOrchestrateEndpoint();
  
  console.log('\n📊 Test Summary:');
  console.log('================');
  
  const successCount = results.filter(r => r.success).length;
  const aiContentCount = results.filter(r => r.hasAIContent).length;
  
  console.log(`Total tests: ${results.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`With AI content: ${aiContentCount}`);
  console.log(`Real AI responses: ${aiContentCount > 0 ? 'YES' : 'NO'}`);

  if (aiContentCount > 0) {
    console.log('\n✅ RESULT: Real AI responses are being generated successfully!');
    console.log('\nAgent types used:');
    results
      .filter(r => r.agentType)
      .forEach(r => console.log(`- ${r.agentType}: "${r.message}"`));
  } else {
    console.log('\n❌ RESULT: No real AI responses detected');
    console.log('\nErrors encountered:');
    results
      .filter(r => r.error)
      .forEach(r => console.log(`- ${r.error}`));
  }
}

main().catch(console.error);