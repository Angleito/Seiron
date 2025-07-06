import { supabase, setUserContext, validateUserId, sanitizeInput } from '../../lib/supabase.js';

// Rate limiting specific to this endpoint
const RATE_LIMIT = {
  requests: 30, // 30 requests per minute
  window: 60000
};

// Request validation middleware
const validateRequest = (req) => {
  const userId = req.headers['x-user-id'] || req.headers['user-id'];
  
  if (!userId || !validateUserId(userId)) {
    return { valid: false, error: 'Missing or invalid user ID' };
  }
  
  return { valid: true, userId };
};

// Parse query parameters
const parseQueryParams = (query) => {
  const {
    page = '1',
    limit = '20',
    search = '',
    archived = 'false',
    order = 'desc' // 'asc' or 'desc'
  } = query;
  
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20)); // Max 50 sessions per request
  const offset = (pageNum - 1) * limitNum;
  const showArchived = archived === 'true';
  const searchTerm = sanitizeInput(search);
  
  return {
    page: pageNum,
    limit: limitNum,
    offset,
    search: searchTerm,
    archived: showArchived,
    order: order === 'asc' ? 'asc' : 'desc'
  };
};

// Get chat sessions for a user
const getChatSessions = async (userId, queryParams) => {
  const { limit, offset, search, archived, order } = queryParams;
  
  try {
    // Set user context for RLS
    await setUserContext(userId);
    
    // Build the query
    let query = supabase
      .from('chat_sessions')
      .select(`
        id,
        title,
        description,
        created_at,
        updated_at,
        last_message_at,
        metadata,
        is_archived,
        message_count:chat_messages(count)
      `)
      .eq('user_id', userId);
    
    // Filter by archived status
    query = query.eq('is_archived', archived);
    
    // Apply search filter if provided
    if (search && search.length > 0) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    // Apply ordering
    if (order === 'asc') {
      query = query.order('last_message_at', { ascending: true });
    } else {
      query = query.order('last_message_at', { ascending: false });
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    const { data: sessions, error: sessionsError } = await query;
    
    if (sessionsError) {
      return {
        success: false,
        error: sessionsError.message,
        code: 500
      };
    }
    
    // Get total count for pagination info
    let countQuery = supabase
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_archived', archived);
    
    // Apply search filter to count query if provided
    if (search && search.length > 0) {
      countQuery = countQuery.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    const { count: totalCount, error: countError } = await countQuery;
    
    if (countError) {
      console.error('Error getting session count:', countError);
    }
    
    // Calculate pagination info
    const hasNext = sessions.length === limit;
    const hasPrev = offset > 0;
    const totalPages = totalCount ? Math.ceil(totalCount / limit) : 1;
    
    // Format sessions data
    const formattedSessions = sessions.map(session => ({
      id: session.id,
      title: session.title,
      description: session.description,
      created_at: session.created_at,
      updated_at: session.updated_at,
      last_message_at: session.last_message_at,
      metadata: session.metadata,
      is_archived: session.is_archived,
      message_count: session.message_count?.[0]?.count || 0
    }));
    
    return {
      success: true,
      data: {
        sessions: formattedSessions,
        pagination: {
          page: queryParams.page,
          limit: queryParams.limit,
          total: totalCount || 0,
          totalPages,
          hasNext,
          hasPrev
        },
        filters: {
          search: search,
          archived: archived
        }
      }
    };
    
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return {
      success: false,
      error: 'Internal server error',
      code: 500
    };
  }
};

// Get session statistics
const getSessionStats = async (userId) => {
  try {
    await setUserContext(userId);
    
    // Get stats for active sessions
    const { data: activeStats, error: activeError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('is_archived', false);
    
    // Get stats for archived sessions
    const { data: archivedStats, error: archivedError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('is_archived', true);
    
    // Get total message count
    const { data: messageStats, error: messageError } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('user_id', userId);
    
    if (activeError || archivedError || messageError) {
      console.error('Error getting session stats:', { activeError, archivedError, messageError });
      return null;
    }
    
    return {
      total_sessions: (activeStats?.length || 0) + (archivedStats?.length || 0),
      active_sessions: activeStats?.length || 0,
      archived_sessions: archivedStats?.length || 0,
      total_messages: messageStats?.length || 0
    };
    
  } catch (error) {
    console.error('Error fetching session stats:', error);
    return null;
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
    
    const { userId } = validation;
    
    // Parse query parameters
    const queryParams = parseQueryParams(req.query);
    
    // Get chat sessions
    const result = await getChatSessions(userId, queryParams);
    
    if (!result.success) {
      return res.status(result.code || 500).json({
        success: false,
        error: result.error
      });
    }
    
    // Get session statistics
    const stats = await getSessionStats(userId);
    
    // Return success response
    return res.status(200).json({
      success: true,
      ...result.data,
      stats: stats || {
        total_sessions: 0,
        active_sessions: 0,
        archived_sessions: 0,
        total_messages: 0
      }
    });
    
  } catch (error) {
    console.error('API Error in /api/sessions:', error);
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