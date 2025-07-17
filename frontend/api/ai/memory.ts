import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Memory {
  id: string;
  userId: string;
  sessionId: string;
  content: string;
  type: 'conversation' | 'preference' | 'context';
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

interface MemoryResponse {
  success: boolean;
  memories?: Memory[];
  memory?: Memory;
  error?: string;
}

// In-memory storage for demo (replace with database in production)
let memories: Memory[] = [];

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
    const { sessionId, type, content, memoryId } = req.query as Record<string, string>;
    
    if (req.method === 'GET') {
      // Load memories
      let filteredMemories = memories.filter(m => m.userId === userId);
      
      if (sessionId) {
        filteredMemories = filteredMemories.filter(m => m.sessionId === sessionId);
      }
      
      if (type) {
        filteredMemories = filteredMemories.filter(m => m.type === type);
      }
      
      const response: MemoryResponse = {
        success: true,
        memories: filteredMemories.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      };
      
      res.status(200).json(response);
      
    } else if (req.method === 'POST') {
      // Save memory
      const { sessionId, content, type, metadata } = req.body as {
        sessionId: string;
        content: string;
        type: 'conversation' | 'preference' | 'context';
        metadata?: Record<string, any>;
      };
      
      if (!sessionId || !content) {
        res.status(400).json({
          success: false,
          error: 'sessionId and content are required'
        });
        return;
      }
      
      const newMemory: Memory = {
        id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        sessionId,
        content,
        type: type || 'conversation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: metadata || {}
      };
      
      memories.push(newMemory);
      
      res.status(201).json({
        success: true,
        memory: newMemory
      });
      
    } else if (req.method === 'PUT') {
      // Update memory
      const { content, metadata } = req.body as {
        content?: string;
        metadata?: Record<string, any>;
      };
      
      if (!memoryId) {
        res.status(400).json({
          success: false,
          error: 'memoryId is required for updates'
        });
        return;
      }
      
      const memoryIndex = memories.findIndex(m => 
        m.id === memoryId && m.userId === userId
      );
      
      if (memoryIndex === -1) {
        res.status(404).json({
          success: false,
          error: 'Memory not found'
        });
        return;
      }
      
      if (content) {
        memories[memoryIndex].content = content;
      }
      
      if (metadata) {
        memories[memoryIndex].metadata = { ...memories[memoryIndex].metadata, ...metadata };
      }
      
      memories[memoryIndex].updatedAt = new Date().toISOString();
      
      res.status(200).json({
        success: true,
        memory: memories[memoryIndex]
      });
      
    } else if (req.method === 'DELETE') {
      // Delete memory
      if (!memoryId) {
        res.status(400).json({
          success: false,
          error: 'memoryId is required for deletion'
        });
        return;
      }
      
      const memoryIndex = memories.findIndex(m => 
        m.id === memoryId && m.userId === userId
      );
      
      if (memoryIndex === -1) {
        res.status(404).json({
          success: false,
          error: 'Memory not found'
        });
        return;
      }
      
      memories.splice(memoryIndex, 1);
      
      res.status(200).json({
        success: true
      });
      
    } else {
      res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }
    
  } catch (error) {
    console.error('AI memory API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}