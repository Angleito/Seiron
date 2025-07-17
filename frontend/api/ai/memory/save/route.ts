import { NextRequest, NextResponse } from 'next/server';
import { saveMemory } from '@/lib/conversation-memory';
import * as E from 'fp-ts/Either';

// POST /api/ai/memory/save - Save AI memory entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.userId || !body.key || body.value === undefined) {
      return NextResponse.json(
        { error: 'userId, key, and value are required' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: 'Failed to save memory', details: memoryResult.left.message },
        { status: 500 }
      );
    }
    
    const savedMemory = memoryResult.right;
    
    return NextResponse.json({
      success: true,
      memory: savedMemory
    });
    
  } catch (error) {
    console.error('AI memory save API error:', error);
    return NextResponse.json(
      { error: 'Failed to save memory', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
