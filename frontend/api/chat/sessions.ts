import type { VercelRequest, VercelResponse } from '@vercel/node';

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

// In-memory storage for demo (replace with database in production)
let sessions: ChatSession[] = [];

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
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    
    if (req.method === 'GET') {
      // Parse query parameters
      const { 
        page = '1',
        limit = '20',
        archived = 'false',
        search = ''
      } = req.query as Record<string, string>;
      
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const isArchived = archived === 'true';
      
      // Filter sessions
      let filteredSessions = sessions.filter(session => 
        session.userId === userId && 
        session.archived === isArchived
      );
      
      // Apply search filter
      if (search) {
        filteredSessions = filteredSessions.filter(session =>
          session.title.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      // Pagination
      const total = filteredSessions.length;
      const totalPages = Math.ceil(total / limitNum);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      
      const paginatedSessions = filteredSessions.slice(startIndex, endIndex);
      
      const response: SessionsResponse = {
        success: true,
        sessions: paginatedSessions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        },
        stats: {
          total_sessions: sessions.filter(s => s.userId === userId).length,
          active_sessions: sessions.filter(s => s.userId === userId && !s.archived).length,
          archived_sessions: sessions.filter(s => s.userId === userId && s.archived).length,
          total_messages: sessions.filter(s => s.userId === userId).reduce((sum, s) => sum + s.messageCount, 0)
        },
        filters: {
          search: search || undefined,
          archived: isArchived
        }
      };
      
      res.status(200).json(response);
      
    } else if (req.method === 'POST') {
      const { title } = req.body as { title: string };
      
      const newSession: ChatSession = {
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        title: title || 'New Chat Session',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
        archived: false
      };
      
      sessions.push(newSession);
      
      res.status(201).json({
        success: true,
        session: newSession
      });
      
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