import { VercelRequest, VercelResponse } from '@vercel/node';
import { updateMemory } from '../../../lib/conversation-memory';
import * as E from 'fp-ts/Either';

// Vercel Function handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow PUT requests
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    
    if (!body.userId || !body.key) {
      return res.status(400).json({
        error: 'userId and key are required'
      });
    }
    
    // Extract update fields
    const updates: any = {};
    if (body.value !== undefined) updates.value = body.value;
    if (body.confidence !== undefined) updates.confidence = body.confidence;
    if (body.category !== undefined) updates.category = body.category;
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No valid update fields provided'
      });
    }
    
    // Update memory in Vercel KV
    const memoryResult = await updateMemory(body.userId, body.key, updates);
    
    if (E.isLeft(memoryResult)) {
      console.error('Failed to update memory in KV:', memoryResult.left);
      return res.status(500).json({
        error: 'Failed to update memory',
        details: memoryResult.left.message
      });
    }
    
    const updatedMemory = memoryResult.right;
    
    return res.status(200).json({
      success: true,
      memory: updatedMemory
    });
    
  } catch (error) {
    console.error('AI memory update API error:', error);
    return res.status(500).json({
      error: 'Failed to update memory',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}