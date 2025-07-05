import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { EnhancedUserIntent, OrchestrationResult } from '../services/OrchestratorService';

const router = Router();

// Parse user message to extract intent
function parseUserIntent(message: string, sessionId: string, walletAddress?: string): EnhancedUserIntent {
  // Simple intent parsing - in production, use NLP
  const lowerMessage = message.toLowerCase()
  
  let type: EnhancedUserIntent['type'] = 'info'
  let action = 'general_query'
  const parameters: Record<string, unknown> = {}

  // Lending intents
  if (lowerMessage.includes('lend') || lowerMessage.includes('supply')) {
    type = 'lending'
    action = 'supply'
    // Extract amount and asset
    const amountMatch = lowerMessage.match(/(\d+\.?\d*)\s*(usdc|eth|sei)?/i)
    if (amountMatch) {
      parameters.amount = parseFloat(amountMatch[1])
      parameters.asset = amountMatch[2]?.toUpperCase() || 'USDC'
    }
  } else if (lowerMessage.includes('borrow')) {
    type = 'lending'
    action = 'borrow'
  } else if (lowerMessage.includes('repay')) {
    type = 'lending'
    action = 'repay'
  }
  
  // Liquidity intents
  else if (lowerMessage.includes('liquidity') || lowerMessage.includes('pool')) {
    type = 'liquidity'
    action = lowerMessage.includes('remove') ? 'remove_liquidity' : 'add_liquidity'
  } else if (lowerMessage.includes('swap')) {
    type = 'liquidity'
    action = 'swap'
  }
  
  // Portfolio intents
  else if (lowerMessage.includes('portfolio') || lowerMessage.includes('positions')) {
    type = 'portfolio'
    action = 'show_positions'
  } else if (lowerMessage.includes('rebalance')) {
    type = 'portfolio'
    action = 'rebalance'
  }
  
  // Trading intents
  else if (lowerMessage.includes('buy')) {
    type = 'trading'
    action = 'buy'
  } else if (lowerMessage.includes('sell')) {
    type = 'trading'
    action = 'sell'
  }
  
  // Analysis intents
  else if (lowerMessage.includes('analyze') || lowerMessage.includes('analysis')) {
    type = 'analysis'
    action = 'analyze_market'
  }
  
  // Risk intents
  else if (lowerMessage.includes('risk') || lowerMessage.includes('health')) {
    type = 'risk'
    action = 'assess_risk'
  }

  return {
    id: `intent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId: sessionId,
    walletAddress: walletAddress || '0x0000000000000000000000000000000000000000',
    type,
    action,
    parameters,
    priority: 'medium',
    context: {
      sessionId,
      timestamp: new Date(),
      source: 'chat',
    },
  }
}

// Format agent response for chat
function formatAgentResponse(result: OrchestrationResult, agentType?: string): string {
  if (result.error) {
    return `The dragon encountered turbulence: ${result.error.message}. ${
      result.error.recoverable ? "Seiron will try a different mystical approach." : "Please speak your wish more clearly."
    }`
  }

  // Format based on task result
  const data = result.data as any
  let response = ''

  switch (agentType) {
    case 'hive':
    case 'lending_agent':
      if (data?.action === 'supply') {
        response = `🐉 Seiron has manifested your wish! Successfully supplied ${data.amount} ${data.asset} to ${data.protocol}.\n`
        response += `✨ Dragon's Power Level: ${data.apy}%\n`
        response += `💎 Your treasures now grow with mystical energy!`
      } else if (data?.action === 'borrow') {
        response = `🐉 The dragon has granted your borrowing wish! ${data.amount} ${data.asset} from ${data.protocol}.\n`
        response += `⚡ Dragon's Demand: ${data.apr}%\n`
        response += `🔮 Keep your power level high to maintain the dragon's favor.`
      }
      break

    case 'sak':
    case 'liquidity_agent':
      if (data?.action === 'add_liquidity') {
        response = `🐉 Seiron has channeled your energy into ${data.pool}!\n`
        response += `💫 Mystical Liquidity: ${data.liquidityAmount}\n`
        response += `✨ Dragon's Blessing: ${data.estimatedApr}%`
      } else if (data?.action === 'swap') {
        response = `🐉 The dragon has transformed your treasures!\n`
        response += `⚡ ${data.fromAmount} ${data.fromToken} → ${data.toAmount} ${data.toToken}\n`
        response += `🔮 Mystical Exchange Rate: ${data.executionPrice} ${data.toToken}/${data.fromToken}`
      }
      break

    case 'mcp':
    case 'portfolio_agent':
      if (data?.positions) {
        response = `🐉 Seiron's Vision of Your Treasure Vault:\n\n`
        response += `Total Power Level: $${data.totalValue?.toLocaleString()}\n`
        response += `Dragon's Favor: ${data.change24h > 0 ? '+' : ''}${data.change24h}%\n\n`
        response += `Mystical Treasures:\n`
        data.positions.forEach((pos: any) => {
          response += `• ${pos.asset}: $${pos.value?.toLocaleString()} (${pos.allocation}%)\n`
        })
      }
      break

    default:
      response = `🐉 Seiron has fulfilled your wish! ${JSON.stringify(data)}`
  }

  return response || `🐉 The dragon has completed your task successfully!`
}

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
 * POST /api/chat/orchestrate
 * Process chat message through orchestrator (migrated from frontend API route)
 */
router.post('/orchestrate', [
  body('message').notEmpty().withMessage('Message is required'),
  body('sessionId').notEmpty().withMessage('Session ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { message, sessionId, walletAddress } = req.body;

  try {
    // Parse user intent
    const intent = parseUserIntent(message, sessionId, walletAddress);

    // Process intent through orchestrator
    const result = await req.services.orchestrator.processIntent(intent)();

    if (result._tag === 'Left') {
      return res.json({
        message: `Seiron could not understand your wish: ${result.left.message}. Please speak more clearly to the dragon.`,
        timestamp: new Date().toISOString(),
        agentType: 'orchestrator',
        error: true,
      });
    }

    // Format the response based on the agent that handled it
    const orchestrationResult = result.right;
    const agentType = orchestrationResult.metadata?.adaptersUsed?.[0] || 'orchestrator';

    const response = {
      message: formatAgentResponse(orchestrationResult, agentType),
      timestamp: new Date().toISOString(),
      agentType,
      intentId: orchestrationResult.intentId,
      executionTime: orchestrationResult.metadata.executionTime,
      metadata: {
        intent: intent.type,
        action: intent.action,
        confidence: orchestrationResult.metadata?.confidence,
      }
    };

    return res.json(response);

  } catch (error: any) {
    console.error('Chat orchestrate API error:', error);
    return res.status(500).json({ 
      error: 'Failed to process message',
      message: 'The dragon encountered mystical interference. Please try summoning again.',
    });
  }
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
  body('analysisType').optional().isIn(['comprehensive', 'risk', 'yield', 'market']).withMessage('Invalid analysis type'), // TODO: REMOVE_MOCK - Hard-coded array literals
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