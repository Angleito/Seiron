import { NextRequest, NextResponse } from 'next/server';
import { updateMemory } from '@/lib/conversation-memory';
import * as E from 'fp-ts/Either';

// PUT /api/ai/memory/update - Update AI memory entry
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.userId || !body.key) {
      return NextResponse.json(
        { error: 'userId and key are required' },
        { status: 400 }
      );
    }
    
    // Extract update fields
    const updates: any = {};
    if (body.value !== undefined) updates.value = body.value;
    if (body.confidence !== undefined) updates.confidence = body.confidence;
    if (body.category !== undefined) updates.category = body.category;
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid update fields provided' },
        { status: 400 }
      );
    }
    
    // Update memory in Vercel KV
    const memoryResult = await updateMemory(body.userId, body.key, updates);
    
    if (E.isLeft(memoryResult)) {
      console.error('Failed to update memory in KV:', memoryResult.left);
      return NextResponse.json(
        { error: 'Failed to update memory', details: memoryResult.left.message },
        { status: 500 }
      );
    }
    
    const updatedMemory = memoryResult.right;
    
    return NextResponse.json({
      success: true,
      memory: updatedMemory
    });
    
  } catch (error) {
    console.error('AI memory update API error:', error);
    return NextResponse.json(
      { error: 'Failed to update memory', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
