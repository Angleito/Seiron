import { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchWithRetry } from '../../utils/apiRetry';
import { mockDataStore, createMockResponse, createErrorResponse } from '../../lib/mockData';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3001';
const BACKEND_TIMEOUT = 5000; // 5 second timeout for backend requests

function setCorsHeaders(res: VercelResponse, origin: string | undefined) {
  const allowedOrigins = [
    'http://localhost:3000',
    'https://seiron.vercel.app',
    process.env.FRONTEND_URL
  ].filter(Boolean);
  
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : '*';
  
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

// Vercel Function handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin as string | undefined;
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res, origin);
    res.status(200).end();
    return;
  }
  
  setCorsHeaders(res, origin);
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Extract sessionId from query params
    const sessionId = req.query.sessionId as string;
    
    // Validate session ID
    if (!sessionId || sessionId.length < 3) {
      return res.status(400).json(
        createErrorResponse('Invalid session ID', 400)
      );
    }
    
    // Parse query parameters
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const order = (req.query.order || 'desc') as 'asc' | 'desc';
    const cursor = req.query.cursor as string || undefined;
    
    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json(
        createErrorResponse('Invalid pagination parameters', 400)
      );
    }
    
    const authHeader = req.headers['authorization'] as string;
    const userIdHeader = req.headers['x-user-id'] as string;
    const userId = userIdHeader || 'anonymous';
    
    // Try backend first with timeout
    let backendData = null;
    const backendAvailable = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;
    
    if (backendAvailable) {
      try {
        console.log(`[API] Attempting backend request for session ${sessionId}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT);
        
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          order,
          ...(cursor && { cursor })
        });
        
        const response = await fetchWithRetry(
          `${BACKEND_URL}/api/chat/sessions/messages/${sessionId}?${queryParams}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(authHeader && { 'authorization': authHeader }),
              ...(userIdHeader && { 'x-user-id': userIdHeader }),
            },
            signal: controller.signal,
          },
          {
            maxRetries: 1,
            initialDelay: 500,
            onRetry: (attempt, error) => {
              console.warn(`[API] Retrying backend messages request (attempt ${attempt}):`, error.message);
            }
          }
        );
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          backendData = await response.json();
          console.log(`[API] Backend response received for session ${sessionId}`);
        } else {
          console.warn(`[API] Backend request failed with status ${response.status}`);
        }
      } catch (error) {
        console.warn(`[API] Backend request failed, falling back to mock data:`, error instanceof Error ? error.message : error);
      }
    }
    
    // Use backend data if available, otherwise use mock data
    if (backendData) {
      res.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json(backendData);
    }
    
    // Fall back to mock data
    console.log(`[API] Using mock data for session ${sessionId}`);
    
    // Ensure session exists or create it
    const session = mockDataStore.getOrCreateSession(sessionId, userId);
    
    // Get messages with pagination
    const result = mockDataStore.getMessages(sessionId, {
      page,
      limit,
      order,
      cursor
    });
    
    const response = createMockResponse({
      success: true,
      session,
      messages: result.messages,
      pagination: result.pagination
    });
    
    res.setHeader('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Data-Source', 'mock');
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('[API] Messages API error:', error);
    
    return res.status(500).json(
      createErrorResponse('Internal server error', 500)
    );
  }
}