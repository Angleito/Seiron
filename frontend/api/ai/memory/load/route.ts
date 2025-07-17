import { NextRequest, NextResponse } from 'next/server';
import { loadMemories } from '@/lib/conversation-memory';
import { mockDataStore, createMockResponse, createErrorResponse } from '@/lib/mockData';
import * as E from 'fp-ts/Either';

const BACKEND_TIMEOUT = 5000; // 5 second timeout for backend requests

// Default empty response structure
const EMPTY_RESPONSE = {
  memories: [],
  preferences: {},
  metadata: {
    source: 'fallback',
    timestamp: new Date().toISOString(),
    userId: null as string | null,
    sessionId: null as string | null
  }
};

// GET /api/ai/memory/load - Load AI memories for a user
export async function GET(request: NextRequest) {
  console.log('[Memory Load API] Request received');
  
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');
    
    console.log(`[Memory Load API] Parameters - userId: ${userId || 'anonymous'}, sessionId: ${sessionId || 'none'}`);
    
    // Handle anonymous users gracefully
    if (!userId || userId === 'anonymous') {
      console.log('[Memory Load API] Anonymous user detected, returning empty memories');
      return NextResponse.json({
        ...EMPTY_RESPONSE,
        metadata: {
          ...EMPTY_RESPONSE.metadata,
          source: 'anonymous',
          userId: 'anonymous',
          sessionId: sessionId || null
        }
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'max-age=60',
          'Content-Type': 'application/json',
          'X-Data-Source': 'anonymous'
        }
      });
    }
    
    // Validate userId format
    if (userId.length < 1 || userId.length > 100) {
      console.warn(`[Memory Load API] Invalid userId format: ${userId}`);
      // Instead of returning error, return empty data with warning
      return NextResponse.json({
        ...EMPTY_RESPONSE,
        metadata: {
          ...EMPTY_RESPONSE.metadata,
          source: 'validation-fallback',
          warning: 'Invalid userId format',
          userId: userId,
          sessionId: sessionId || null
        }
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'max-age=60',
          'Content-Type': 'application/json',
          'X-Data-Source': 'validation-fallback'
        }
      });
    }
    
    console.log(`[Memory Load API] Loading memories for user ${userId}, session ${sessionId || 'all'}`);
    
    // Try loading from Vercel KV first
    let memories = null;
    let kvError = null;
    
    try {
      console.log('[Memory Load API] Attempting to load from Vercel KV...');
      const memoriesResult = await Promise.race([
        loadMemories(userId, sessionId || undefined),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('KV timeout')), BACKEND_TIMEOUT)
        )
      ]) as any;
      
      if (E.isRight(memoriesResult)) {
        memories = memoriesResult.right;
        console.log(`[Memory Load API] Successfully loaded ${memories.length} memories from KV`);
      } else {
        kvError = memoriesResult.left;
        console.warn('[Memory Load API] KV returned error:', kvError);
      }
    } catch (error) {
      kvError = error;
      console.warn('[Memory Load API] KV operation failed:', error instanceof Error ? error.message : error);
    }
    
    // Use KV data if available
    if (memories && Array.isArray(memories) && memories.length > 0) {
      console.log('[Memory Load API] Returning KV data');
      
      // Calculate stats and preferences from KV data
      const preferences = memories
        .filter((m: any) => m.category === 'preference')
        .reduce((acc: any, m: any) => {
          acc[m.key] = m.value;
          return acc;
        }, {});
      
      const stats = {
        totalEntries: memories.length,
        categories: {
          preference: memories.filter((m: any) => m.category === 'preference').length,
          context: memories.filter((m: any) => m.category === 'context').length,
          fact: memories.filter((m: any) => m.category === 'fact').length,
          interaction: memories.filter((m: any) => m.category === 'interaction').length,
        },
        lastUpdated: memories.length > 0 
          ? new Date(Math.max(...memories.map((m: any) => m.updatedAt.getTime()))).toISOString()
          : new Date().toISOString()
      };
      
      return NextResponse.json({
        memories,
        preferences,
        metadata: {
          source: 'kv',
          timestamp: new Date().toISOString(),
          userId,
          sessionId: sessionId || null,
          stats
        }
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'max-age=60',
          'Content-Type': 'application/json',
          'X-Data-Source': 'kv'
        }
      });
    }
    
    // Try mock data as fallback
    console.log(`[Memory Load API] KV unavailable, attempting mock data for user ${userId}`);
    
    try {
      const mockMemories = mockDataStore.getMemories(userId, sessionId || undefined);
      
      if (mockMemories && Array.isArray(mockMemories) && mockMemories.length > 0) {
        console.log(`[Memory Load API] Returning ${mockMemories.length} mock memories`);
        
        // Calculate preferences from mock data
        const preferences = mockMemories
          .filter(m => m.category === 'preference')
          .reduce((acc: any, m) => {
            acc[m.key] = m.value;
            return acc;
          }, {});
        
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
            ? new Date(Math.max(...mockMemories.map(m => new Date(m.updatedAt).getTime()))).toISOString()
            : new Date().toISOString()
        };
        
        return NextResponse.json({
          memories: mockMemories,
          preferences,
          metadata: {
            source: 'mock',
            timestamp: new Date().toISOString(),
            userId,
            sessionId: sessionId || null,
            stats
          }
        }, {
          status: 200,
          headers: {
            'Cache-Control': 'max-age=60',
            'Content-Type': 'application/json',
            'X-Data-Source': 'mock'
          }
        });
      }
    } catch (mockError) {
      console.warn('[Memory Load API] Mock data failed:', mockError instanceof Error ? mockError.message : mockError);
    }
    
    // Final fallback: return empty data structure
    console.log('[Memory Load API] All data sources failed, returning empty response');
    return NextResponse.json({
      ...EMPTY_RESPONSE,
      metadata: {
        ...EMPTY_RESPONSE.metadata,
        source: 'empty-fallback',
        userId,
        sessionId: sessionId || null,
        kvError: kvError instanceof Error ? kvError.message : String(kvError)
      }
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'max-age=60',
        'Content-Type': 'application/json',
        'X-Data-Source': 'empty-fallback'
      }
    });
    
  } catch (error) {
    // Even in case of unexpected errors, return valid JSON
    console.error('[Memory Load API] Unexpected error:', error);
    
    return NextResponse.json({
      ...EMPTY_RESPONSE,
      metadata: {
        ...EMPTY_RESPONSE.metadata,
        source: 'error-fallback',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, {
      status: 200, // Always return 200 to avoid 404
      headers: {
        'Cache-Control': 'max-age=60',
        'Content-Type': 'application/json',
        'X-Data-Source': 'error-fallback'
      }
    });
  }
}
