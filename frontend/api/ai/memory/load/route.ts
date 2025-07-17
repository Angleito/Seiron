import { NextRequest, NextResponse } from 'next/server';
import { loadMemories } from '@/lib/conversation-memory';
import * as E from 'fp-ts/Either';

// GET /api/ai/memory/load - Load AI memories for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }
    
    // Load memories from Vercel KV
    const memoriesResult = await loadMemories(userId, sessionId || undefined);
    
    if (E.isLeft(memoriesResult)) {
      console.error('Failed to load memories from KV:', memoriesResult.left);
      
      // Return empty memory structure for graceful degradation
      return NextResponse.json({
        success: true,
        memories: [],
        stats: {
          totalEntries: 0,
          categories: {
            preference: 0,
            context: 0,
            fact: 0,
            interaction: 0
          },
          lastUpdated: new Date().toISOString()
        }
      });
    }
    
    const memories = memoriesResult.right;
    
    // Calculate stats
    const stats = {
      totalEntries: memories.length,
      categories: {
        preference: memories.filter(m => m.category === 'preference').length,
        context: memories.filter(m => m.category === 'context').length,
        fact: memories.filter(m => m.category === 'fact').length,
        interaction: memories.filter(m => m.category === 'interaction').length,
      },
      lastUpdated: memories.length > 0 
        ? Math.max(...memories.map(m => m.updatedAt.getTime()))
        : new Date().toISOString()
    };
    
    return NextResponse.json({
      success: true,
      memories,
      stats
    });
    
  } catch (error) {
    console.error('AI memory load API error:', error);
    
    // Return empty memory structure for graceful degradation
    return NextResponse.json({
      success: true,
      memories: [],
      stats: {
        totalEntries: 0,
        categories: {
          preference: 0,
          context: 0,
          fact: 0,
          interaction: 0
        },
        lastUpdated: new Date().toISOString()
      }
    });
  }
}
