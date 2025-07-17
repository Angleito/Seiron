import { VercelRequest, VercelResponse } from '@vercel/node';
import { searchMemories } from '../../../lib/conversation-memory';
import * as E from 'fp-ts/Either';

// Vercel Function handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const userId = req.query.userId as string;
    const query = req.query.query as string;
    const category = req.query.category as any;
    const minConfidence = req.query.minConfidence as string;
    const limit = req.query.limit as string;
    
    if (!userId || !query) {
      return res.status(400).json({ error: 'userId and query parameters are required' });
    }
    
    const searchOptions = {
      ...(category && { category }),
      ...(minConfidence && { minConfidence: parseFloat(minConfidence) }),
      ...(limit && { limit: parseInt(limit, 10) }),
    };
    
    // Search memories in Vercel KV
    const searchResult = await searchMemories(userId, query, searchOptions);
    
    if (E.isLeft(searchResult)) {
      console.error('Failed to search memories in KV:', searchResult.left);
      return res.status(500).json({
        error: 'Failed to search memories',
        details: searchResult.left.message
      });
    }
    
    const memories = searchResult.right;
    
    return res.status(200).json({
      success: true,
      memories,
      query,
      total: memories.length,
      filters: searchOptions
    });
    
  } catch (error) {
    console.error('AI memory search API error:', error);
    return res.status(500).json({
      error: 'Failed to search memories',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}