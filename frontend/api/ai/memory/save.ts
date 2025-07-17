import { VercelRequest, VercelResponse } from '@vercel/node';
import { saveMemory } from '../../../lib/conversation-memory';
import * as E from 'fp-ts/Either';

// Vercel Function handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const body = req.body;
    
    if (!body.userId || !body.key || body.value === undefined) {
      return res.status(400).json({ error: 'userId, key, and value are required' });
    }
    
    // Save memory to Vercel KV
    const memoryResult = await saveMemory(
      body.userId,
      body.sessionId || 'global',
      body.key,
      body.value,
      body.category || 'context',
      body.confidence || 0.8
    );
    
    if (E.isLeft(memoryResult)) {
      console.error('Failed to save memory to KV:', memoryResult.left);
      return res.status(500).json({
        error: 'Failed to save memory',
        details: memoryResult.left.message
      });
    }
    
    const savedMemory = memoryResult.right;
    
    return res.status(200).json({
      success: true,
      memory: savedMemory
    });
    
  } catch (error) {
    console.error('AI memory save API error:', error);
    return res.status(500).json({
      error: 'Failed to save memory',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}