import { NextRequest, NextResponse } from 'next/server';
import { loadMemories } from '@/lib/conversation-memory';
import { mockDataStore, createMockResponse, createErrorResponse } from '@/lib/mockData';
import * as E from 'fp-ts/Either';

const BACKEND_TIMEOUT = 5000; // 5 second timeout for backend requests

// GET /api/ai/memory/load - Load AI memories for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');
    
    // Validate required parameters
    if (!userId) {
      return NextResponse.json(
        createErrorResponse('userId parameter is required', 400),
        { status: 400 }
      );
    }
    
    // Validate userId format
    if (userId.length < 1 || userId.length > 100) {
      return NextResponse.json(
        createErrorResponse('Invalid userId format', 400),
        { status: 400 }
      );
    }
    
    console.log(`[API] Loading AI memories for user ${userId}, session ${sessionId || 'all'}`);
    
    // Try loading from Vercel KV first
    let memories = null;
    let backendData = null;
    
    try {
      const memoriesResult = await Promise.race([
        loadMemories(userId, sessionId || undefined),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('KV timeout')), BACKEND_TIMEOUT)
        )
      ]) as any;
      
      if (E.isRight(memoriesResult)) {
        memories = memoriesResult.right;
        console.log(`[API] Loaded ${memories.length} memories from KV`);
      } else {
        console.warn('[API] Failed to load memories from KV:', memoriesResult.left);
      }
    } catch (error) {
      console.warn('[API] KV memory load failed, falling back to mock data:', error instanceof Error ? error.message : error);
    }
    
    // Use KV data if available, otherwise use mock data
    if (memories && memories.length > 0) {
      // Calculate stats for KV data
      const stats = {
        totalEntries: memories.length,
        categories: {
          preference: memories.filter((m: any) => m.category === 'preference').length,
          context: memories.filter((m: any) => m.category === 'context').length,
          fact: memories.filter((m: any) => m.category === 'fact').length,
          interaction: memories.filter((m: any) => m.category === 'interaction').length,
        },
        lastUpdated: memories.length > 0 
          ? Math.max(...memories.map((m: any) => m.updatedAt.getTime()))
          : new Date().toISOString()
      };
      
      return NextResponse.json({
        success: true,
        memories,
        stats
      }, {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
          'Content-Type': 'application/json',
          'X-Data-Source': 'kv'
        }
      });
    }
    
    // Fall back to mock data
    console.log(`[API] Using mock AI memories for user ${userId}`);
    
    const mockMemories = mockDataStore.getMemories(userId, sessionId || undefined);
    
    // Calculate stats for mock data
    const stats = {
      totalEntries: mockMemories.length,
      categories: {
        preference: mockMemories.filter(m => m.category === 'preference').length,
        context: mockMemories.filter(m => m.category === 'context').length,
        fact: mockMemories.filter(m => m.category === 'fact').length,
        interaction: mockMemories.filter(m => m.category === 'interaction').length,
      },
      lastUpdated: mockMemories.length > 0 
        ? Math.max(...mockMemories.map(m => new Date(m.updatedAt).getTime()))
        : new Date().toISOString()
    };
    
    const response = createMockResponse({
      success: true,
      memories: mockMemories,
      stats
    });
    
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
        'Content-Type': 'application/json',
        'X-Data-Source': 'mock'
      }
    });
    
  } catch (error) {
    console.error('[API] AI memory load API error:', error);
    
    return NextResponse.json(
      createErrorResponse('Internal server error', 500),
      { status: 500 }
    );
  }
}
