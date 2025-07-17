import { NextRequest, NextResponse } from 'next/server';
import { searchMemories } from '@/lib/conversation-memory';
import * as E from 'fp-ts/Either';

// GET /api/ai/memory/search - Search AI memories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const query = searchParams.get('query');
    const category = searchParams.get('category') as any;
    const minConfidence = searchParams.get('minConfidence');
    const limit = searchParams.get('limit');
    
    if (!userId || !query) {
      return NextResponse.json(
        { error: 'userId and query parameters are required' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: 'Failed to search memories', details: searchResult.left.message },
        { status: 500 }
      );
    }
    
    const memories = searchResult.right;
    
    return NextResponse.json({
      success: true,
      memories,
      query,
      total: memories.length,
      filters: searchOptions
    });
    
  } catch (error) {
    console.error('AI memory search API error:', error);
    return NextResponse.json(
      { error: 'Failed to search memories', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
