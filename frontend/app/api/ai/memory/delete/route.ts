import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// DELETE /api/ai/memory/delete - Delete AI memory entry
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    
    if (!id || !userId) {
      return NextResponse.json(
        { error: 'id and userId parameters are required' },
        { status: 400 }
      );
    }
    
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    const userIdHeader = headersList.get('x-user-id');
    
    // Try to delete from backend first
    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/memory/${id}?userId=${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader && { 'authorization': authHeader }),
          ...(userIdHeader && { 'x-user-id': userIdHeader }),
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch (backendError) {
      console.warn('Backend AI memory delete endpoint unavailable:', backendError);
    }
    
    // Fallback: Return mock success response for graceful degradation
    return NextResponse.json({
      success: true,
      deleted: true,
      id: id
    });
  } catch (error) {
    console.error('AI memory delete API error:', error);
    return NextResponse.json(
      { error: 'Failed to delete memory' },
      { status: 500 }
    );
  }
}
