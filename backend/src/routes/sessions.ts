import { Router } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { createServiceLogger } from '../services/LoggingService';
import { performance } from 'perf_hooks';

const router = Router();
const logger = createServiceLogger('SessionsRoute');

/**
 * GET /api/chat/sessions
 * Get all chat sessions for a user with pagination and filters
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('archived').optional().isBoolean().withMessage('Archived must be a boolean'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc')
], async (req, res) => {
  const startTime = performance.now();
  const requestId = `sessions-list-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const userId = req.headers['x-user-id'] as string || 'anonymous';
  
  logger.info('Received sessions list request', {
    requestId,
    userId,
    query: req.query,
    timestamp: new Date().toISOString()
  });
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Sessions list validation failed', {
      requestId,
      errors: errors.array(),
      userId
    });
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string;
  const archived = req.query.archived === 'true';
  const order = (req.query.order as string) || 'desc';

  try {
    // Get sessions from Supabase
    const sessionsResult = await req.services.supabase.getSessionsForUser(
      userId,
      { page, limit, search, archived, order }
    )();
    
    if (sessionsResult._tag === 'Left') {
      logger.error('Failed to retrieve sessions', {
        requestId,
        userId,
        error: sessionsResult.left.message,
        duration: Math.round(performance.now() - startTime)
      });
      
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve sessions'
      });
    }

    const { sessions, total, totalPages } = sessionsResult.right;
    
    // Get session statistics
    const statsResult = await req.services.supabase.getSessionStats(userId)();
    const stats = statsResult._tag === 'Right' ? statsResult.right : {
      total_sessions: total,
      active_sessions: sessions.filter(s => !s.is_archived).length,
      archived_sessions: sessions.filter(s => s.is_archived).length,
      total_messages: 0
    };

    logger.info('Sessions retrieved successfully', {
      requestId,
      userId,
      sessionCount: sessions.length,
      page,
      limit,
      totalPages,
      duration: Math.round(performance.now() - startTime)
    });

    res.json({
      success: true,
      sessions: sessions.map(session => ({
        id: session.id,
        title: session.session_name || 'Untitled Session',
        description: session.description,
        created_at: session.created_at,
        updated_at: session.updated_at,
        last_message_at: session.last_message_at || session.updated_at,
        metadata: session.metadata || {},
        is_archived: session.is_archived || false,
        message_count: session.message_count || 0
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        nextCursor: page < totalPages ? `page=${page + 1}` : undefined
      },
      stats,
      filters: {
        search,
        archived
      }
    });
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error('Sessions list endpoint error', {
      requestId,
      userId,
      duration: Math.round(duration),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/chat/sessions
 * Create a new chat session
 */
router.post('/', [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object')
], async (req, res) => {
  const startTime = performance.now();
  const requestId = `sessions-create-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const userId = req.headers['x-user-id'] as string || 'anonymous';
  
  logger.info('Received session create request', {
    requestId,
    userId,
    title: req.body.title,
    timestamp: new Date().toISOString()
  });
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Session create validation failed', {
      requestId,
      errors: errors.array(),
      userId
    });
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  const { title, description, metadata } = req.body;

  try {
    // Get or create user first
    const userResult = await req.services.supabase.getOrCreateUserById(userId)();
    
    if (userResult._tag === 'Left') {
      logger.error('Failed to get/create user', {
        requestId,
        userId,
        error: userResult.left.message
      });
      
      return res.status(500).json({
        success: false,
        error: 'Failed to create session'
      });
    }

    // Create session
    const sessionResult = await req.services.supabase.createSessionWithDetails(
      userResult.right.id,
      title,
      description,
      metadata
    )();
    
    if (sessionResult._tag === 'Left') {
      logger.error('Failed to create session', {
        requestId,
        userId,
        error: sessionResult.left.message,
        duration: Math.round(performance.now() - startTime)
      });
      
      return res.status(500).json({
        success: false,
        error: 'Failed to create session'
      });
    }

    logger.info('Session created successfully', {
      requestId,
      userId,
      sessionId: sessionResult.right.id,
      duration: Math.round(performance.now() - startTime)
    });

    res.status(201).json({
      success: true,
      session: {
        id: sessionResult.right.id,
        title: sessionResult.right.session_name,
        description: sessionResult.right.description,
        created_at: sessionResult.right.created_at,
        updated_at: sessionResult.right.updated_at,
        last_message_at: sessionResult.right.created_at,
        metadata: sessionResult.right.metadata || {},
        is_archived: false,
        message_count: 0
      }
    });
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error('Session create endpoint error', {
      requestId,
      userId,
      duration: Math.round(duration),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * PATCH /api/chat/sessions/:sessionId
 * Update a chat session
 */
router.patch('/:sessionId', [
  param('sessionId').isUUID().withMessage('Invalid session ID'),
  body('title').optional().isString().withMessage('Title must be a string'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object'),
  body('is_archived').optional().isBoolean().withMessage('is_archived must be a boolean')
], async (req, res) => {
  const startTime = performance.now();
  const requestId = `sessions-update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const userId = req.headers['x-user-id'] as string || 'anonymous';
  const { sessionId } = req.params;
  
  logger.info('Received session update request', {
    requestId,
    userId,
    sessionId,
    updates: Object.keys(req.body),
    timestamp: new Date().toISOString()
  });
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Session update validation failed', {
      requestId,
      errors: errors.array(),
      userId,
      sessionId
    });
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  const updates = req.body;

  try {
    // Verify session belongs to user
    const verifyResult = await req.services.supabase.verifySessionOwnership(sessionId, userId)();
    
    if (verifyResult._tag === 'Left') {
      logger.warn('Session ownership verification failed', {
        requestId,
        userId,
        sessionId,
        error: verifyResult.left.message
      });
      
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Update session
    const updateResult = await req.services.supabase.updateSession(sessionId, updates)();
    
    if (updateResult._tag === 'Left') {
      logger.error('Failed to update session', {
        requestId,
        userId,
        sessionId,
        error: updateResult.left.message,
        duration: Math.round(performance.now() - startTime)
      });
      
      return res.status(500).json({
        success: false,
        error: 'Failed to update session'
      });
    }

    logger.info('Session updated successfully', {
      requestId,
      userId,
      sessionId,
      duration: Math.round(performance.now() - startTime)
    });

    res.json({
      success: true,
      session: {
        id: updateResult.right.id,
        title: updateResult.right.session_name,
        description: updateResult.right.description,
        created_at: updateResult.right.created_at,
        updated_at: updateResult.right.updated_at,
        last_message_at: updateResult.right.last_message_at || updateResult.right.updated_at,
        metadata: updateResult.right.metadata || {},
        is_archived: updateResult.right.is_archived || false,
        message_count: updateResult.right.message_count || 0
      }
    });
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error('Session update endpoint error', {
      requestId,
      userId,
      sessionId,
      duration: Math.round(duration),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * DELETE /api/chat/sessions/:sessionId
 * Delete a chat session
 */
router.delete('/:sessionId', [
  param('sessionId').isUUID().withMessage('Invalid session ID')
], async (req, res) => {
  const startTime = performance.now();
  const requestId = `sessions-delete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const userId = req.headers['x-user-id'] as string || 'anonymous';
  const { sessionId } = req.params;
  
  logger.info('Received session delete request', {
    requestId,
    userId,
    sessionId,
    timestamp: new Date().toISOString()
  });
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Session delete validation failed', {
      requestId,
      errors: errors.array(),
      userId,
      sessionId
    });
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  try {
    // Verify session belongs to user
    const verifyResult = await req.services.supabase.verifySessionOwnership(sessionId, userId)();
    
    if (verifyResult._tag === 'Left') {
      logger.warn('Session ownership verification failed for delete', {
        requestId,
        userId,
        sessionId,
        error: verifyResult.left.message
      });
      
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Delete all messages in session first
    const deleteMessagesResult = await req.services.supabase.deleteMessagesBySession(sessionId)();
    
    if (deleteMessagesResult._tag === 'Left') {
      logger.warn('Failed to delete session messages', {
        requestId,
        userId,
        sessionId,
        error: deleteMessagesResult.left.message
      });
    }

    // Delete session
    const deleteResult = await req.services.supabase.deleteSession(sessionId)();
    
    if (deleteResult._tag === 'Left') {
      logger.error('Failed to delete session', {
        requestId,
        userId,
        sessionId,
        error: deleteResult.left.message,
        duration: Math.round(performance.now() - startTime)
      });
      
      return res.status(500).json({
        success: false,
        error: 'Failed to delete session'
      });
    }

    logger.info('Session deleted successfully', {
      requestId,
      userId,
      sessionId,
      messagesDeleted: deleteMessagesResult._tag === 'Right' ? deleteMessagesResult.right : 0,
      duration: Math.round(performance.now() - startTime)
    });

    res.json({
      success: true
    });
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error('Session delete endpoint error', {
      requestId,
      userId,
      sessionId,
      duration: Math.round(duration),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/chat/messages/:sessionId
 * Get messages for a specific session
 */
router.get('/messages/:sessionId', [
  param('sessionId').isUUID().withMessage('Invalid session ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('cursor').optional().isString().withMessage('Cursor must be a string'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc')
], async (req, res) => {
  const startTime = performance.now();
  const requestId = `messages-list-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const userId = req.headers['x-user-id'] as string || 'anonymous';
  const { sessionId } = req.params;
  
  logger.info('Received messages list request', {
    requestId,
    userId,
    sessionId,
    query: req.query,
    timestamp: new Date().toISOString()
  });
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Messages list validation failed', {
      requestId,
      errors: errors.array(),
      userId,
      sessionId
    });
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const cursor = req.query.cursor as string;
  const order = (req.query.order as string) || 'desc';

  try {
    // Verify session belongs to user
    const verifyResult = await req.services.supabase.verifySessionOwnership(sessionId, userId)();
    
    if (verifyResult._tag === 'Left') {
      logger.warn('Session ownership verification failed for messages', {
        requestId,
        userId,
        sessionId,
        error: verifyResult.left.message
      });
      
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Get session info
    const sessionResult = await req.services.supabase.getSessionById(sessionId)();
    
    if (sessionResult._tag === 'Left') {
      logger.error('Failed to get session info', {
        requestId,
        userId,
        sessionId,
        error: sessionResult.left.message
      });
      
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Get messages
    const messagesResult = await req.services.supabase.getMessagesForSession(
      sessionId,
      { page, limit, cursor, order }
    )();
    
    if (messagesResult._tag === 'Left') {
      logger.error('Failed to retrieve messages', {
        requestId,
        userId,
        sessionId,
        error: messagesResult.left.message,
        duration: Math.round(performance.now() - startTime)
      });
      
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve messages'
      });
    }

    const { messages, total, totalPages } = messagesResult.right;

    logger.info('Messages retrieved successfully', {
      requestId,
      userId,
      sessionId,
      messageCount: messages.length,
      page,
      limit,
      totalPages,
      duration: Math.round(performance.now() - startTime)
    });

    res.json({
      success: true,
      session: {
        id: sessionResult.right.id,
        title: sessionResult.right.session_name,
        created_at: sessionResult.right.created_at,
        updated_at: sessionResult.right.updated_at,
        last_message_at: sessionResult.right.last_message_at || sessionResult.right.updated_at
      },
      messages: messages.map((msg, index) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata || {},
        created_at: msg.created_at,
        sequence_number: order === 'desc' ? (total - ((page - 1) * limit) - index) : ((page - 1) * limit) + index + 1
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        nextCursor: messages.length > 0 ? messages[messages.length - 1].id : undefined
      }
    });
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error('Messages list endpoint error', {
      requestId,
      userId,
      sessionId,
      duration: Math.round(duration),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export { router as sessionsRouter };