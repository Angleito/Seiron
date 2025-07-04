import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';

const router = Router();

/**
 * POST /api/chat/message
 * Process chat message and return AI response
 */
router.post('/message', [
  body('message').notEmpty().withMessage('Message is required'),
  body('walletAddress').isEthereumAddress().withMessage('Valid wallet address required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { message, walletAddress } = req.body;

  // Get current portfolio data for context
  const portfolioResult = await req.services.portfolio.getPortfolioData(walletAddress)();
  const portfolioData = portfolioResult._tag === 'Right' ? portfolioResult.right : undefined;

  const result = await pipe(
    req.services.ai.processMessageEnhanced(message, walletAddress, portfolioData),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (aiResponse) => {
        // Send real-time update via Socket.io
        req.services.socket.sendChatResponse(walletAddress, aiResponse);
        return TE.of({ success: true, data: aiResponse });
      }
    )
  )();

  res.json(result);
});

/**
 * GET /api/chat/history
 * Get conversation history for wallet
 */
router.get('/history', async (req, res) => {
  const { walletAddress } = req.query;

  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  const history = req.services.ai.getConversationHistory(walletAddress);
  res.json({ success: true, data: history });
});

/**
 * DELETE /api/chat/history
 * Clear conversation history
 */
router.delete('/history', [
  body('walletAddress').isEthereumAddress().withMessage('Valid wallet address required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { walletAddress } = req.body;

  const result = await pipe(
    req.services.ai.clearConversationHistory(walletAddress),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      () => TE.of({ success: true, message: 'Conversation history cleared' })
    )
  )();

  res.json(result);
});

/**
 * POST /api/chat/analysis
 * Generate portfolio analysis
 */
router.post('/analysis', [
  body('walletAddress').isEthereumAddress().withMessage('Valid wallet address required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { walletAddress } = req.body;

  const result = await pipe(
    req.services.portfolio.getPortfolioData(walletAddress),
    TE.chain(portfolioData => 
      req.services.ai.generatePortfolioAnalysis(portfolioData, walletAddress)
    ),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (analysis) => TE.of({ success: true, data: analysis })
    )
  )();

  res.json(result);
});

/**
 * POST /api/chat/hive-search
 * Perform Hive Intelligence search
 */
router.post('/hive-search', [
  body('query').notEmpty().withMessage('Search query is required'),
  body('walletAddress').isEthereumAddress().withMessage('Valid wallet address required'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { query, walletAddress, metadata } = req.body;

  const result = await pipe(
    req.services.seiIntegration.performHiveSearch(query, metadata, walletAddress),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (searchResults) => {
        // Send real-time update via Socket.io
        req.services.socket.sendChatResponse(walletAddress, {
          type: 'hive_search_results',
          data: searchResults
        });
        return TE.of({ success: true, data: searchResults });
      }
    )
  )();

  res.json(result);
});

/**
 * POST /api/chat/hive-analytics
 * Get Hive Intelligence analytics and insights
 */
router.post('/hive-analytics', [
  body('query').notEmpty().withMessage('Analytics query is required'),
  body('walletAddress').isEthereumAddress().withMessage('Valid wallet address required'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { query, walletAddress, metadata } = req.body;

  const result = await pipe(
    req.services.seiIntegration.getHiveAnalytics(query, metadata, walletAddress),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (analytics) => {
        // Send real-time analytics via Socket.io
        req.services.socket.sendChatResponse(walletAddress, {
          type: 'hive_analytics',
          data: analytics
        });
        return TE.of({ success: true, data: analytics });
      }
    )
  )();

  res.json(result);
});

/**
 * POST /api/chat/sak-execute
 * Execute SAK (Sei Agent Kit) operations
 */
router.post('/sak-execute', [
  body('toolName').notEmpty().withMessage('SAK tool name is required'),
  body('params').isObject().withMessage('Parameters must be an object'),
  body('walletAddress').isEthereumAddress().withMessage('Valid wallet address required'),
  body('context').optional().isObject().withMessage('Context must be an object')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { toolName, params, walletAddress, context } = req.body;

  const result = await pipe(
    req.services.seiIntegration.executeSAKTool(toolName, params, { ...context, walletAddress }),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (sakResult) => {
        // Send real-time update via Socket.io
        req.services.socket.sendChatResponse(walletAddress, {
          type: 'sak_execution_result',
          data: sakResult
        });
        return TE.of({ success: true, data: sakResult });
      }
    )
  )();

  res.json(result);
});

/**
 * POST /api/chat/sak-batch
 * Execute multiple SAK operations in batch
 */
router.post('/sak-batch', [
  body('operations').isArray().withMessage('Operations must be an array'),
  body('operations.*').isObject().withMessage('Each operation must be an object'),
  body('operations.*.toolName').notEmpty().withMessage('Each operation must have a toolName'),
  body('operations.*.params').isObject().withMessage('Each operation must have params'),
  body('walletAddress').isEthereumAddress().withMessage('Valid wallet address required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { operations, walletAddress, context } = req.body;

  const result = await pipe(
    req.services.seiIntegration.executeSAKBatch(operations, { ...context, walletAddress }),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (batchResults) => {
        // Send real-time update via Socket.io
        req.services.socket.sendChatResponse(walletAddress, {
          type: 'sak_batch_results',
          data: batchResults
        });
        return TE.of({ success: true, data: batchResults });
      }
    )
  )();

  res.json(result);
});

/**
 * GET /api/chat/sak-tools
 * Get available SAK tools
 */
router.get('/sak-tools', async (req, res) => {
  const { category } = req.query;

  const result = await pipe(
    req.services.seiIntegration.getSAKTools(category as string),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (tools) => TE.of({ success: true, data: tools })
    )
  )();

  res.json(result);
});

/**
 * GET /api/chat/mcp-blockchain-state
 * Get real-time blockchain state via MCP
 */
router.get('/mcp-blockchain-state', async (req, res) => {
  const { walletAddress } = req.query;

  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  const result = await pipe(
    req.services.seiIntegration.getMCPBlockchainState(),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (state) => {
        // Send real-time blockchain state via Socket.io
        req.services.socket.sendChatResponse(walletAddress, {
          type: 'blockchain_state_update',
          data: state
        });
        return TE.of({ success: true, data: state });
      }
    )
  )();

  res.json(result);
});

/**
 * GET /api/chat/mcp-wallet-balance
 * Get real-time wallet balance via MCP
 */
router.get('/mcp-wallet-balance', async (req, res) => {
  const { walletAddress } = req.query;

  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  const result = await pipe(
    req.services.seiIntegration.getMCPWalletBalance(walletAddress),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (balance) => {
        // Send real-time balance update via Socket.io
        req.services.socket.sendChatResponse(walletAddress, {
          type: 'wallet_balance_update',
          data: balance
        });
        return TE.of({ success: true, data: balance });
      }
    )
  )();

  res.json(result);
});

/**
 * POST /api/chat/mcp-subscribe-events
 * Subscribe to real-time blockchain events via MCP
 */
router.post('/mcp-subscribe-events', [
  body('eventTypes').isArray().withMessage('Event types must be an array'),
  body('walletAddress').isEthereumAddress().withMessage('Valid wallet address required'),
  body('filters').optional().isObject().withMessage('Filters must be an object')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { eventTypes, walletAddress, filters } = req.body;

  const result = await pipe(
    req.services.seiIntegration.subscribeMCPEvents(eventTypes, filters, walletAddress),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (subscription) => TE.of({ success: true, data: subscription })
    )
  )();

  res.json(result);
});

/**
 * POST /api/chat/enhanced-analysis
 * Generate enhanced portfolio analysis using all three adapters
 */
router.post('/enhanced-analysis', [
  body('walletAddress').isEthereumAddress().withMessage('Valid wallet address required'),
  body('analysisType').optional().isIn(['comprehensive', 'risk', 'yield', 'market']).withMessage('Invalid analysis type'),
  body('includeHiveInsights').optional().isBoolean().withMessage('includeHiveInsights must be boolean'),
  body('includeSAKData').optional().isBoolean().withMessage('includeSAKData must be boolean'),
  body('includeMCPRealtime').optional().isBoolean().withMessage('includeMCPRealtime must be boolean')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { 
    walletAddress, 
    analysisType = 'comprehensive',
    includeHiveInsights = true,
    includeSAKData = true,
    includeMCPRealtime = true
  } = req.body;

  const result = await pipe(
    req.services.portfolioAnalytics.generateEnhancedAnalysis(
      walletAddress,
      analysisType,
      {
        includeHiveInsights,
        includeSAKData,
        includeMCPRealtime
      }
    ),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (analysis) => {
        // Send real-time analysis via Socket.io
        req.services.socket.sendChatResponse(walletAddress, {
          type: 'enhanced_analysis',
          data: analysis
        });
        return TE.of({ success: true, data: analysis });
      }
    )
  )();

  res.json(result);
});

/**
 * GET /api/chat/real-time-status
 * Get status of all real-time connections
 */
router.get('/real-time-status', async (req, res) => {
  const { walletAddress } = req.query;

  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  const result = await pipe(
    req.services.realTimeData.getConnectionStatus(walletAddress),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (status) => TE.of({ success: true, data: status })
    )
  )();

  res.json(result);
});

export { router as chatRouter };