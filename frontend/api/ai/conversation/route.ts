import { NextRequest, NextResponse } from 'next/server';
import { conversationMemory } from '@/lib/conversation-memory';
import * as E from 'fp-ts/Either';

export const runtime = 'edge';

// POST /api/ai/conversation - Create or manage conversation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, sessionId, ...params } = body;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }
    
    switch (action) {
      case 'create': {
        if (!sessionId) {
          return NextResponse.json(
            { error: 'sessionId is required for create action' },
            { status: 400 }
          );
        }
        
        const conversationResult = await conversationMemory.createConversation(
          userId,
          sessionId,
          params.initialContext
        );
        
        if (E.isLeft(conversationResult)) {
          return NextResponse.json(
            { error: 'Failed to create conversation', details: conversationResult.left.message },
            { status: 500 }
          );
        }
        
        return NextResponse.json({
          success: true,
          conversation: conversationResult.right
        });
      }
      
      case 'addTurn': {
        if (!sessionId || !params.role || !params.content) {
          return NextResponse.json(
            { error: 'sessionId, role, and content are required for addTurn action' },
            { status: 400 }
          );
        }
        
        const turnResult = await conversationMemory.addTurn(
          userId,
          sessionId,
          params.role,
          params.content,
          params.metadata
        );
        
        if (E.isLeft(turnResult)) {
          return NextResponse.json(
            { error: 'Failed to add turn', details: turnResult.left.message },
            { status: 500 }
          );
        }
        
        return NextResponse.json({
          success: true,
          turn: turnResult.right
        });
      }
      
      case 'getContext': {
        if (!sessionId) {
          return NextResponse.json(
            { error: 'sessionId is required for getContext action' },
            { status: 400 }
          );
        }
        
        const contextResult = await conversationMemory.getContextForAI(userId, sessionId);
        
        if (E.isLeft(contextResult)) {
          return NextResponse.json(
            { error: 'Failed to get context', details: contextResult.left.message },
            { status: 500 }
          );
        }
        
        return NextResponse.json({
          success: true,
          context: contextResult.right
        });
      }
      
      case 'savePreferences': {
        if (!params.preferences) {
          return NextResponse.json(
            { error: 'preferences are required for savePreferences action' },
            { status: 400 }
          );
        }
        
        const prefResult = await conversationMemory.saveUserPreferences(userId, params.preferences);
        
        if (E.isLeft(prefResult)) {
          return NextResponse.json(
            { error: 'Failed to save preferences', details: prefResult.left.message },
            { status: 500 }
          );
        }
        
        return NextResponse.json({
          success: true,
          message: 'Preferences saved successfully'
        });
      }
      
      case 'cleanup': {
        const cleanupResult = await conversationMemory.cleanupExpiredMemories(userId);
        
        if (E.isLeft(cleanupResult)) {
          return NextResponse.json(
            { error: 'Failed to cleanup memories', details: cleanupResult.left.message },
            { status: 500 }
          );
        }
        
        return NextResponse.json({
          success: true,
          cleanup: cleanupResult.right
        });
      }
      
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Conversation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET /api/ai/conversation - Get conversation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');
    const includeFullHistory = searchParams.get('includeFullHistory') === 'true';
    
    if (!userId || !sessionId) {
      return NextResponse.json(
        { error: 'userId and sessionId parameters are required' },
        { status: 400 }
      );
    }
    
    const conversationResult = await conversationMemory.getConversation(
      userId,
      sessionId,
      includeFullHistory
    );
    
    if (E.isLeft(conversationResult)) {
      return NextResponse.json(
        { error: 'Failed to get conversation', details: conversationResult.left.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      conversation: conversationResult.right
    });
    
  } catch (error) {
    console.error('Get conversation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}