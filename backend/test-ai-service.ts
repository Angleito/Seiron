import { config } from 'dotenv';
import { AIService } from './src/services/AIService';

// Load environment variables
config();

async function testAIService() {
  try {
    console.log('Testing AIService...');
    
    const aiService = new AIService();
    
    const result = await aiService.processMessage(
      'Hello Seiron, how are you today?',
      '0x1234567890123456789012345678901234567890'
    )();
    
    if (result._tag === 'Left') {
      console.error('AI Service failed:', result.left);
      return false;
    } else {
      console.log('AI Service Success:');
      console.log('- Message:', result.right.message);
      console.log('- Confidence:', result.right.confidence);
      console.log('- Reasoning:', result.right.reasoning);
      console.log('- Has Command:', !!result.right.command);
      console.log('- Suggestions:', result.right.suggestions);
      return true;
    }
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

testAIService()
  .then(success => {
    console.log('Test result:', success ? 'SUCCESS' : 'FAILED');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });