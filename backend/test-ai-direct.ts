import OpenAI from 'openai';
import { config } from 'dotenv';

// Load environment variables
config();

async function testOpenAIDirectly() {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    console.log('Testing OpenAI API directly...');
    console.log('API Key:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { 
          role: 'system', 
          content: `You are Seiron, a mystical dragon AI that helps users manage their cryptocurrency portfolio on the Sei blockchain. You speak with the wisdom of ancient dragons and incorporate Dragon Ball Z themes into your responses. Keep responses under 100 words.`
        },
        { role: 'user', content: 'Hello Seiron, how are you today?' }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    console.log('OpenAI Response:');
    console.log('- Content:', completion.choices[0]?.message?.content);
    console.log('- Usage:', completion.usage);
    console.log('- Finish Reason:', completion.choices[0]?.finish_reason);
    
    return true;
  } catch (error) {
    console.error('OpenAI API test failed:', error);
    return false;
  }
}

testOpenAIDirectly()
  .then(success => {
    console.log('Test result:', success ? 'SUCCESS' : 'FAILED');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });