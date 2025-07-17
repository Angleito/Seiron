import { NextRequest, NextResponse } from 'next/server';
import { deleteMemory } from '@/lib/conversation-memory';
import * as E from 'fp-ts/Either';

// DELETE /api/ai/memory/delete - Delete AI memory entry
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.userId;
    const key = body.key;
    
    if (!userId || !key) {
      return NextResponse.json(
        { error: 'userId and key are required' },
        { status: 400 }
      );
    }
    
    // Delete memory from Vercel KV
    const deleteResult = await deleteMemory(userId, key);
    
    if (E.isLeft(deleteResult)) {
      console.error('Failed to delete memory from KV:', deleteResult.left);
      return NextResponse.json(
        { error: 'Failed to delete memory', details: deleteResult.left.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      deleted: true,
      key: key
    });
    
  } catch (error) {
    console.error('AI memory delete API error:', error);
    return NextResponse.json(
      { error: 'Failed to delete memory', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
