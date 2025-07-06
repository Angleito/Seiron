import { supabase, setUserContext, validateUserId, sanitizeInput } from '../../lib/supabase.js';

// Rate limiting specific to this endpoint
const RATE_LIMIT = {
  requests: 20, // 20 requests per minute
  window: 60000
};

// Request validation middleware
const validateRequest = (req) => {
  const { sessionId } = req.query;
  const userId = req.headers['x-user-id'] || req.headers['user-id'];
  
  if (!userId || !validateUserId(userId)) {
    return { valid: false, error: 'Missing or invalid user ID' };
  }
  
  // For POST requests, sessionId can be 'new' to create a new session
  if (req.method === 'POST' && sessionId === 'new') {
    return { valid: true, sessionId: null, userId, isNew: true };
  }
  
  if (!sessionId || typeof sessionId !== 'string') {
    return { valid: false, error: 'Missing or invalid session ID' };
  }
  
  return { valid: true, sessionId, userId, isNew: false };
};

// Validate session data
const validateSessionData = (data) => {
  const errors = [];
  
  if (data.title !== undefined) {
    if (typeof data.title !== 'string' || data.title.length < 1 || data.title.length > 255) {
      errors.push('Title must be a string between 1 and 255 characters');
    }
  }
  
  if (data.description !== undefined) {
    if (typeof data.description !== 'string' || data.description.length > 1000) {
      errors.push('Description must be a string with max 1000 characters');
    }
  }
  
  if (data.metadata !== undefined) {
    if (typeof data.metadata !== 'object' || data.metadata === null) {
      errors.push('Metadata must be a valid object');
    }
  }
  
  if (data.is_archived !== undefined) {
    if (typeof data.is_archived !== 'boolean') {
      errors.push('is_archived must be a boolean');
    }
  }
  
  return errors;
};

// Create a new chat session
const createChatSession = async (userId, sessionData) => {
  try {
    await setUserContext(userId);
    
    const { title, description, metadata } = sessionData;
    
    // Prepare session data
    const newSession = {
      user_id: userId,
      title: sanitizeInput(title) || 'New Chat',
      description: sanitizeInput(description) || '',
      metadata: metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
      is_archived: false
    };
    
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .insert([newSession])
      .select()
      .single();
    
    if (error) {
      return {
        success: false,
        error: error.message,
        code: 500
      };
    }
    
    return {
      success: true,
      data: {
        session: {
          id: session.id,
          title: session.title,
          description: session.description,
          created_at: session.created_at,
          updated_at: session.updated_at,
          last_message_at: session.last_message_at,
          metadata: session.metadata,
          is_archived: session.is_archived
        }
      }
    };
    
  } catch (error) {
    console.error('Error creating chat session:', error);
    return {
      success: false,
      error: 'Internal server error',
      code: 500
    };
  }
};

// Update existing chat session
const updateChatSession = async (sessionId, userId, sessionData) => {
  try {
    await setUserContext(userId);
    
    // First, verify the session exists and belongs to the user
    const { data: existingSession, error: fetchError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();
    
    if (fetchError || !existingSession) {
      return {
        success: false,
        error: 'Session not found or access denied',
        code: 404
      };
    }
    
    // Prepare update data
    const updateData = {
      updated_at: new Date().toISOString()
    };
    
    if (sessionData.title !== undefined) {
      updateData.title = sanitizeInput(sessionData.title);
    }
    
    if (sessionData.description !== undefined) {
      updateData.description = sanitizeInput(sessionData.description);
    }
    
    if (sessionData.metadata !== undefined) {
      updateData.metadata = sessionData.metadata;
    }
    
    if (sessionData.is_archived !== undefined) {
      updateData.is_archived = sessionData.is_archived;
    }
    
    // Update the session
    const { data: updatedSession, error: updateError } = await supabase
      .from('chat_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (updateError) {
      return {
        success: false,
        error: updateError.message,
        code: 500
      };
    }
    
    return {
      success: true,
      data: {
        session: {
          id: updatedSession.id,
          title: updatedSession.title,
          description: updatedSession.description,
          created_at: updatedSession.created_at,
          updated_at: updatedSession.updated_at,
          last_message_at: updatedSession.last_message_at,
          metadata: updatedSession.metadata,
          is_archived: updatedSession.is_archived
        }
      }
    };
    
  } catch (error) {
    console.error('Error updating chat session:', error);
    return {
      success: false,
      error: 'Internal server error',
      code: 500
    };
  }
};

// Get existing chat session
const getChatSession = async (sessionId, userId) => {
  try {
    await setUserContext(userId);
    
    const { data: session, error } = await supabase
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
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();
    
    if (error || !session) {
      return {
        success: false,
        error: 'Session not found or access denied',
        code: 404
      };
    }
    
    return {
      success: true,
      data: {
        session: {
          id: session.id,
          title: session.title,
          description: session.description,
          created_at: session.created_at,
          updated_at: session.updated_at,
          last_message_at: session.last_message_at,
          metadata: session.metadata,
          is_archived: session.is_archived,
          message_count: session.message_count?.[0]?.count || 0
        }
      }
    };
    
  } catch (error) {
    console.error('Error fetching chat session:', error);
    return {
      success: false,
      error: 'Internal server error',
      code: 500
    };
  }
};

// Delete chat session
const deleteChatSession = async (sessionId, userId) => {
  try {
    await setUserContext(userId);
    
    // First, verify the session exists and belongs to the user
    const { data: existingSession, error: fetchError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();
    
    if (fetchError || !existingSession) {
      return {
        success: false,
        error: 'Session not found or access denied',
        code: 404
      };
    }
    
    // Delete the session (messages will be deleted automatically due to CASCADE)
    const { error: deleteError } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);
    
    if (deleteError) {
      return {
        success: false,
        error: deleteError.message,
        code: 500
      };
    }
    
    return {
      success: true,
      data: {
        message: 'Session deleted successfully'
      }
    };
    
  } catch (error) {
    console.error('Error deleting chat session:', error);
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
  
  // Only allow GET, POST, and DELETE requests
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only GET, POST, and DELETE requests are supported'
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
    
    const { sessionId, userId, isNew } = validation;
    
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        // Get session details
        if (!sessionId) {
          return res.status(400).json({
            success: false,
            error: 'Session ID is required for GET requests'
          });
        }
        
        const getResult = await getChatSession(sessionId, userId);
        return res.status(getResult.success ? 200 : (getResult.code || 500)).json(getResult);
      
      case 'POST':
        // Create new session or update existing session
        const sessionData = req.body || {};
        
        // Validate session data
        const validationErrors = validateSessionData(sessionData);
        if (validationErrors.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Invalid session data',
            details: validationErrors
          });
        }
        
        let result;
        if (isNew) {
          // Create new session
          result = await createChatSession(userId, sessionData);
        } else {
          // Update existing session
          result = await updateChatSession(sessionId, userId, sessionData);
        }
        
        return res.status(result.success ? (isNew ? 201 : 200) : (result.code || 500)).json(result);
      
      case 'DELETE':
        // Delete session
        if (!sessionId) {
          return res.status(400).json({
            success: false,
            error: 'Session ID is required for DELETE requests'
          });
        }
        
        const deleteResult = await deleteChatSession(sessionId, userId);
        return res.status(deleteResult.success ? 200 : (deleteResult.code || 500)).json(deleteResult);
      
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        });
    }
    
  } catch (error) {
    console.error('API Error in /api/sessions/[sessionId]:', error);
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