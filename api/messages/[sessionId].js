import { supabase, setUserContext, validateUserId, sanitizeInput } from '../../lib/supabase.js';

// Rate limiting specific to this endpoint
const RATE_LIMIT = {
  requests: 50, // 50 requests per minute
  window: 60000
};

// Request validation middleware
const validateRequest = (req) => {
  const { sessionId } = req.query;
  const userId = req.headers['x-user-id'] || req.headers['user-id'];
  
  if (!sessionId || typeof sessionId !== 'string') {
    return { valid: false, error: 'Missing or invalid session ID' };
  }
  
  if (!userId || !validateUserId(userId)) {
    return { valid: false, error: 'Missing or invalid user ID' };
  }
  
  return { valid: true, sessionId, userId };
};

// Parse pagination parameters
const parsePaginationParams = (query) => {
  const {
    page = '1',
    limit = '20',
    cursor = null,
    order = 'desc' // 'asc' or 'desc'
  } = query;
  
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20)); // Max 100 messages per request
  const offset = (pageNum - 1) * limitNum;
  
  return {
    page: pageNum,
    limit: limitNum,
    offset,
    cursor: cursor ? sanitizeInput(cursor) : null,
    order: order === 'asc' ? 'asc' : 'desc'
  };
};

// Get chat messages for a session
const getChatMessages = async (sessionId, userId, paginationParams) => {
  const { limit, offset, cursor, order } = paginationParams;
  
  try {
    // Set user context for RLS
    await setUserContext(userId);
    
    // First, verify the session exists and belongs to the user
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id, title, created_at, updated_at, last_message_at')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();
    
    if (sessionError || !session) {
      return {
        success: false,
        error: sessionError?.message || 'Session not found or access denied',
        code: 404
      };
    }
    
    // Build the query for messages
    let query = supabase
      .from('chat_messages')
      .select('id, role, content, metadata, created_at, sequence_number')
      .eq('session_id', sessionId)
      .eq('user_id', userId);
    
    // Apply ordering
    if (order === 'asc') {
      query = query.order('sequence_number', { ascending: true });
    } else {
      query = query.order('sequence_number', { ascending: false });
    }
    
    // Apply cursor-based pagination if cursor is provided
    if (cursor) {
      const cursorDate = new Date(cursor);
      if (!isNaN(cursorDate.getTime())) {
        if (order === 'asc') {
          query = query.gt('created_at', cursorDate.toISOString());
        } else {
          query = query.lt('created_at', cursorDate.toISOString());
        }
      }
    }
    
    // Apply limit and offset
    query = query.range(offset, offset + limit - 1);
    
    const { data: messages, error: messagesError } = await query;
    
    if (messagesError) {
      return {
        success: false,
        error: messagesError.message,
        code: 500
      };
    }
    
    // Get total count for pagination info
    const { count: totalCount, error: countError } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('user_id', userId);
    
    if (countError) {
      console.error('Error getting message count:', countError);
    }
    
    // Calculate pagination info
    const hasNext = messages.length === limit;
    const hasPrev = offset > 0;
    const totalPages = totalCount ? Math.ceil(totalCount / limit) : 1;
    
    // Get next cursor for cursor-based pagination
    let nextCursor = null;
    if (hasNext && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      nextCursor = lastMessage.created_at;
    }
    
    return {
      success: true,
      data: {
        session: {
          id: session.id,
          title: session.title,
          created_at: session.created_at,
          updated_at: session.updated_at,
          last_message_at: session.last_message_at
        },
        messages,
        pagination: {
          page: paginationParams.page,
          limit: paginationParams.limit,
          total: totalCount || 0,
          totalPages,
          hasNext,
          hasPrev,
          nextCursor
        }
      }
    };
    
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return {
      success: false,
      error: 'Internal server error',
      code: 500
    };
  }
};

// Main handler function
export default async function handler(req, res) {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only GET requests are supported'
    });
  }
  
  try {
    // Validate request
    const validation = validateRequest(req);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }
    
    const { sessionId, userId } = validation;
    
    // Parse pagination parameters
    const paginationParams = parsePaginationParams(req.query);
    
    // Get chat messages
    const result = await getChatMessages(sessionId, userId, paginationParams);
    
    if (!result.success) {
      return res.status(result.code || 500).json({
        success: false,
        error: result.error
      });
    }
    
    // Return success response
    return res.status(200).json({
      success: true,
      ...result.data
    });
    
  } catch (error) {
    console.error('API Error in /api/messages/[sessionId]:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// API route configuration
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};