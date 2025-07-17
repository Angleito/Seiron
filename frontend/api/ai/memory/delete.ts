import { VercelRequest, VercelResponse } from '@vercel/node';
import { deleteMemory } from '../../../lib/conversation-memory';
import * as E from 'fp-ts/Either';

// Vercel Function handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow DELETE requests
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const body = req.body;
    const userId = body.userId;
    const key = body.key;
    
    if (!userId || !key) {
      return res.status(400).json({ error: 'userId and key are required' });
    }
    
    // Delete memory from Vercel KV
    const deleteResult = await deleteMemory(userId, key);
    
    if (E.isLeft(deleteResult)) {
      console.error('Failed to delete memory from KV:', deleteResult.left);
      return res.status(500).json({
        error: 'Failed to delete memory',
        details: deleteResult.left.message
      });
    }
    
    return res.status(200).json({
      success: true,
      deleted: true,
      key: key
    });
    
  } catch (error) {
    console.error('AI memory delete API error:', error);
    return res.status(500).json({
      error: 'Failed to delete memory',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}