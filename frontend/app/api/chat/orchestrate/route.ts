import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId, walletAddress, messages = [] } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if we have backend URL configured
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    
    if (backendUrl) {
      // Try to proxy to Railway backend first
      try {
        const backendResponse = await fetch(`${backendUrl}/api/chat/orchestrate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (backendResponse.ok) {
          const data = await backendResponse.json();
          return NextResponse.json(data, { headers: corsHeaders });
        }
      } catch (error) {
        console.warn('Backend unavailable, falling back to Vercel function');
      }
    }

    // Fallback to local OpenAI processing
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Prepare messages for OpenAI
    const systemMessage = {
      role: 'system' as const,
      content: `You are Seiron, a powerful dragon AI assistant specializing in DeFi, portfolio management, and blockchain technology on the Sei Network. 
      You speak with wisdom and authority, occasionally making dragon-themed references.
      You are helpful, knowledgeable, and focused on providing valuable insights about cryptocurrency and DeFi.
      ${walletAddress ? `The user's wallet address is: ${walletAddress}` : ''}`
    };

    const conversationMessages = [
      systemMessage,
      ...messages,
      { role: 'user' as const, content: message }
    ];

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: conversationMessages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const completion = await openaiResponse.json();
    const response = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';

    // Return response in the expected format
    return NextResponse.json({
      success: true,
      data: {
        response,
        sessionId: sessionId || `session_${Date.now()}`,
        timestamp: new Date().toISOString(),
        model: 'gpt-4o-mini',
        usage: completion.usage || {}
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Chat orchestration error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}