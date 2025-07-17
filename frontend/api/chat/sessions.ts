import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchWithRetry } from '../../utils/apiRetry';
import { mockDataStore, createMockResponse } from '../../lib/mockData';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3001';
const BACKEND_TIMEOUT = 5000; // 5 second timeout for backend requests

interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  archived: boolean;
}

interface SessionsResponse {
  success: boolean;
  sessions: ChatSession[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  stats: {
    total_sessions: number;
    active_sessions: number;
    archived_sessions: number;
    total_messages: number;
  };
  filters: {
    search?: string;
    archived: boolean;
  };
}

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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const origin = req.headers.origin as string | undefined;
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res, origin);
    res.status(200).end();
    return;
  }
  
  setCorsHeaders(res, origin);
  
  try {
    const authHeader = req.headers['authorization'] as string;
    const userIdHeader = req.headers['x-user-id'] as string;
    
    if (req.method === 'GET') {
      const queryString = new URLSearchParams(req.query as any).toString();
      
      const response = await fetchWithRetry(
        `${BACKEND_URL}/api/chat/sessions${queryString ? `?${queryString}` : ''}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(authHeader && { 'authorization': authHeader }),
            ...(userIdHeader && { 'x-user-id': userIdHeader }),
          },
        },
        {
          maxRetries: 2,
          initialDelay: 1000,
          onRetry: (attempt, error) => {
            console.warn(`Retrying chat sessions request (attempt ${attempt}):`, error.message);
          }
        }
      );
      
      if (!response.ok) {
        console.error('Backend sessions request failed:', response.status, response.statusText);
        
        // Return graceful fallback for anonymous users when backend is unavailable
        if (response.status === 404 || response.status === 503 || response.status === 502) {
          console.log(`[API] Backend unavailable (${response.status}), using mock data for sessions`);
          
          const userId = req.query.userId as string || userIdHeader || 'anonymous';
          const page = parseInt(req.query.page as string || '1', 10);
          const limit = parseInt(req.query.limit as string || '20', 10);
          const archived = req.query.archived === 'true';
          const search = req.query.search as string || undefined;
          const order = (req.query.order || 'desc') as 'asc' | 'desc';
          
          const result = mockDataStore.getSessions(userId, {
            page,
            limit,
            archived,
            search,
            order
          });
          
          const stats = mockDataStore.getStats(userId);
          
          const response = createMockResponse({
            success: true,
            sessions: result.sessions,
            pagination: result.pagination,
            stats,
            filters: {
              search,
              archived
            }
          });
          
          res.setHeader('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
          res.setHeader('X-Data-Source', 'mock');
          return res.status(200).json(response);
        }
        
        return res.status(response.status).json({
          error: 'Failed to fetch sessions'
        });
      }
      
      const data = await response.json();
      return res.status(200).json(data);
      
    } else if (req.method === 'POST') {
      const body = req.body;
      
      const response = await fetchWithRetry(
        `${BACKEND_URL}/api/chat/sessions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authHeader && { 'authorization': authHeader }),
            ...(userIdHeader && { 'x-user-id': userIdHeader }),
          },
          body: JSON.stringify(body),
        },
        {
          maxRetries: 2,
          initialDelay: 1000,
          onRetry: (attempt, error) => {
            console.warn(`Retrying create session request (attempt ${attempt}):`, error.message);
          }
        }
      );
      
      if (!response.ok) {
        console.error('Backend session creation failed:', response.status, response.statusText);
        return res.status(response.status).json({
          error: 'Failed to create session'
        });
      }
      
      const data = await response.json();
      return res.status(201).json(data);
      
    } else {
      res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }
    
  } catch (error) {
    console.error('Chat sessions API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}