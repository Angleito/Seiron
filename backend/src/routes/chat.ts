import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { EnhancedUserIntent, OrchestrationResult } from '../services/OrchestratorService';
import { createServiceLogger } from '../services/LoggingService';
import { performance } from 'perf_hooks';

const router = Router();
const logger = createServiceLogger('ChatRoute');

// Parse user message to extract intent
function parseUserIntent(message: string, sessionId: string, walletAddress?: string): EnhancedUserIntent {
  const startTime = performance.now();
  
  logger.debug('Parsing user intent', {
    sessionId,
    walletAddress,
    messageLength: message.length,
    timestamp: new Date().toISOString()
  });
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

  const intent: EnhancedUserIntent = {
    id: `intent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId: sessionId,
    walletAddress: walletAddress || '0x0000000000000000000000000000000000000000',
    type,
    action,
    parameters,
    priority: 'medium' as const,
    context: {
      sessionId,
      timestamp: new Date(),
      source: 'chat' as const,
    },
  };
  
  const duration = performance.now() - startTime;
  logger.debug('User intent parsed', {
    sessionId,
    walletAddress,
    intentId: intent.id,
    intentType: type,
    intentAction: action,
    parameterKeys: Object.keys(parameters),
    duration: Math.round(duration)
  });
  
  return intent;
}

// Format agent response for chat
function formatAgentResponse(result: OrchestrationResult, agentType?: string): string {
  logger.debug('Formatting agent response', {
    agentType,
    hasError: !!result.error,
    hasData: !!result.data,
    intentId: result.intentId,
    executionTime: result.metadata?.executionTime
  });
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

  const finalResponse = response || `🐉 The dragon has completed your task successfully!`;
  
  logger.debug('Agent response formatted', {
    agentType,
    responseLength: finalResponse.length,
    intentId: result.intentId
  });
  
  return finalResponse;
}

/**
 * POST /api/chat/message
 * Process chat message and return AI response
 */
router.post('/message', [
  body('message').notEmpty().withMessage('Message is required'),
  body('walletAddress').isEthereumAddress().withMessage('Valid wallet address required')
], async (req, res) => {
  const startTime = performance.now();
  const requestId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  logger.info('Received chat message request', {
    requestId,
    walletAddress: req.body.walletAddress,
    messageLength: req.body.message?.length || 0,
    timestamp: new Date().toISOString()
  });
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Chat message validation failed', {
      requestId,
      errors: errors.array(),
      walletAddress: req.body.walletAddress
    });
    return res.status(400).json({ errors: errors.array() });
  }

  const { message, walletAddress } = req.body;

  try {
    // Get current portfolio data for context
    const portfolioStartTime = performance.now();
    const portfolioResult = await req.services.portfolio.getPortfolioData(walletAddress)();
    const portfolioData = portfolioResult._tag === 'Right' ? portfolioResult.right : undefined;
    const portfolioDuration = performance.now() - portfolioStartTime;
    
    logger.debug('Portfolio data retrieved', {
      requestId,
      walletAddress,
      hasPortfolioData: !!portfolioData,
      portfolioDuration: Math.round(portfolioDuration),
      portfolioValue: portfolioData?.totalValueUSD
    });
    
    // Process message with AI
    const aiStartTime = performance.now();
    const result = await req.services.ai.processMessageEnhanced(message, walletAddress, portfolioData)();
    const aiDuration = performance.now() - aiStartTime;
    
    if (result._tag === 'Left') {
      logger.error('AI message processing failed', {
        requestId,
        walletAddress,
        error: result.left.message,
        duration: Math.round(performance.now() - startTime)
      });
      return res.json({ success: false, error: result.left.message });
    }
    
    logger.info('AI message processed successfully', {
      requestId,
      walletAddress,
      aiDuration: Math.round(aiDuration),
      totalDuration: Math.round(performance.now() - startTime),
      responseLength: result.right.message.length,
      hasCommand: !!result.right.command,
      confidence: result.right.confidence
    });
    
    // Send real-time update via Socket.io
    try {
      await req.services.socket.sendChatResponse(walletAddress, result.right)();
      logger.debug('Socket.io update sent', {
        requestId,
        walletAddress
      });
    } catch (socketError) {
      logger.warn('Socket.io update failed', {
        requestId,
        walletAddress,
        error: socketError instanceof Error ? socketError.message : String(socketError)
      });
    }
    
    res.json({ success: true, data: result.right });
    
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error('Chat message endpoint error', {
      requestId,
      walletAddress,
      duration: Math.round(duration),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error processing message'
    });
  }

});

/**
 * POST /api/chat/orchestrate
 * Process chat message through orchestrator (migrated from frontend API route)
 * Note: This endpoint doesn't require wallet validation as it may be used before wallet connection
 */
router.post('/orchestrate', [
  body('message').notEmpty().withMessage('Message is required'),
  body('sessionId').notEmpty().withMessage('Session ID is required'),
  body('walletAddress').optional().isEthereumAddress().withMessage('Valid wallet address required if provided')
], async (req, res) => {
  const startTime = performance.now();
  const requestId = `orch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  logger.info('Received orchestrate request', {
    requestId,
    sessionId: req.body.sessionId,
    walletAddress: req.body.walletAddress,
    messageLength: req.body.message?.length || 0,
    timestamp: new Date().toISOString()
  });
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Orchestrate validation failed', {
      requestId,
      errors: errors.array(),
      sessionId: req.body.sessionId
    });
    return res.status(400).json({ errors: errors.array() });
  }

  const { message, sessionId, walletAddress } = req.body;

  try {
    // Parse user intent
    const intentStartTime = performance.now();
    const intent = parseUserIntent(message, sessionId, walletAddress);
    const intentDuration = performance.now() - intentStartTime;
    
    logger.debug('Intent parsed for orchestration', {
      requestId,
      intentId: intent.id,
      intentType: intent.type,
      intentAction: intent.action,
      intentPriority: intent.priority,
      intentDuration: Math.round(intentDuration)
    });

    // Process intent through orchestrator
    const orchestratorStartTime = performance.now();
    const result = await req.services.orchestrator.processIntent(intent)();
    const orchestratorDuration = performance.now() - orchestratorStartTime;

    if (result._tag === 'Left') {
      logger.error('Orchestrator processing failed', {
        requestId,
        intentId: intent.id,
        error: result.left.message,
        errorCode: result.left.code,
        errorComponent: result.left.component,
        orchestratorDuration: Math.round(orchestratorDuration),
        totalDuration: Math.round(performance.now() - startTime)
      });
      
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
    const formattedMessage = formatAgentResponse(orchestrationResult, agentType);
    
    const totalDuration = performance.now() - startTime;
    
    logger.info('Orchestration completed successfully', {
      requestId,
      intentId: intent.id,
      agentType,
      adaptersUsed: orchestrationResult.metadata?.adaptersUsed || [],
      tasksExecuted: orchestrationResult.metadata?.tasksExecuted || 0,
      orchestratorDuration: Math.round(orchestratorDuration),
      totalDuration: Math.round(totalDuration),
      responseLength: formattedMessage.length,
      gasUsed: orchestrationResult.metadata?.gasUsed
    });

    const response = {
      message: formattedMessage,
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
    const duration = performance.now() - startTime;
    logger.error('Chat orchestrate API error', {
      requestId,
      sessionId,
      walletAddress,
      duration: Math.round(duration),
      error: error.message,
      stack: error.stack
    });
    
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
  const requestId = `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { walletAddress } = req.query;

  logger.info('Received chat history request', {
    requestId,
    walletAddress,
    timestamp: new Date().toISOString()
  });

  if (!walletAddress || typeof walletAddress !== 'string') {
    logger.warn('Chat history request missing wallet address', {
      requestId,
      providedWalletAddress: walletAddress
    });
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  try {
    const history = req.services.ai.getConversationHistory(walletAddress);
    
    logger.info('Chat history retrieved successfully', {
      requestId,
      walletAddress,
      messageCount: history.length,
      oldestMessage: history[0]?.timestamp,
      newestMessage: history[history.length - 1]?.timestamp
    });
    
    res.json({ success: true, data: history });
  } catch (error) {
    logger.error('Failed to retrieve chat history', {
      requestId,
      walletAddress,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve chat history' 
    });
  }
});

/**
 * DELETE /api/chat/history
 * Clear conversation history
 */
router.delete('/history', [
  body('walletAddress').isEthereumAddress().withMessage('Valid wallet address required')
], async (req, res) => {
  const requestId = `clear-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  logger.info('Received clear chat history request', {
    requestId,
    walletAddress: req.body.walletAddress,
    timestamp: new Date().toISOString()
  });
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Clear chat history validation failed', {
      requestId,
      errors: errors.array()
    });
    return res.status(400).json({ errors: errors.array() });
  }

  const { walletAddress } = req.body;

  try {
    const result = await req.services.ai.clearConversationHistory(walletAddress)();

    if (result._tag === 'Left') {
      logger.error('Failed to clear chat history', {
        requestId,
        walletAddress,
        error: result.left.message
      });
      return res.json({ success: false, error: result.left.message });
    }

    logger.info('Chat history cleared successfully', {
      requestId,
      walletAddress
    });
    
    res.json({ success: true, message: 'Conversation history cleared' });
  } catch (error) {
    logger.error('Clear chat history endpoint error', {
      requestId,
      walletAddress,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to clear conversation history'
    });
  }

});

/**
 * POST /api/chat/analysis
 * Generate portfolio analysis
 */
router.post('/analysis', [
  body('walletAddress').isEthereumAddress().withMessage('Valid wallet address required')
], async (req, res) => {
  const startTime = performance.now();
  const requestId = `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  logger.info('Received portfolio analysis request', {
    requestId,
    walletAddress: req.body.walletAddress,
    timestamp: new Date().toISOString()
  });
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Portfolio analysis validation failed', {
      requestId,
      errors: errors.array()
    });
    return res.status(400).json({ errors: errors.array() });
  }

  const { walletAddress } = req.body;

  try {
    const portfolioStartTime = performance.now();
    const result = await pipe(
      req.services.portfolio.getPortfolioData(walletAddress),
      TE.chain(portfolioData => {
        const portfolioDuration = performance.now() - portfolioStartTime;
        logger.debug('Portfolio data retrieved for analysis', {
          requestId,
          walletAddress,
          portfolioDuration: Math.round(portfolioDuration),
          portfolioValue: (portfolioData as any).totalValueUSD,
          lendingPositions: (portfolioData as any).lendingPositions?.length || 0
        });
        
        return req.services.ai.generatePortfolioAnalysis(portfolioData, walletAddress);
      })
    )();

    if (result._tag === 'Left') {
      logger.error('Portfolio analysis generation failed', {
        requestId,
        walletAddress,
        error: (result.left as Error).message,
        duration: Math.round(performance.now() - startTime)
      });
      return res.json({ success: false, error: (result.left as Error).message });
    }

    const totalDuration = performance.now() - startTime;
    logger.info('Portfolio analysis generated successfully', {
      requestId,
      walletAddress,
      totalDuration: Math.round(totalDuration),
      analysisLength: (result.right as any).length
    });
    
    res.json({ success: true, data: result.right });
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error('Portfolio analysis endpoint error', {
      requestId,
      walletAddress,
      duration: Math.round(duration),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate portfolio analysis'
    });
  }

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

  const result = await req.services.seiIntegration.performHiveSearch(query, metadata, walletAddress)();

  if (result._tag === 'Left') {
    return res.json({ success: false, error: result.left.message });
  }

  // Send real-time update via Socket.io
  req.services.socket.sendChatResponse(walletAddress, {
    type: 'hive_search_results',
    data: result.right
  });
  
  res.json({ success: true, data: result.right });

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

  const result = await req.services.seiIntegration.getHiveAnalytics(query, metadata, walletAddress)();

  if (result._tag === 'Left') {
    return res.json({ success: false, error: result.left.message });
  }

  // Send real-time analytics via Socket.io
  req.services.socket.sendChatResponse(walletAddress, {
    type: 'hive_analytics',
    data: result.right
  });
  
  res.json({ success: true, data: result.right });

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

  const result = await req.services.seiIntegration.executeSAKTool(toolName, params, { ...context, walletAddress })();

  if (result._tag === 'Left') {
    return res.json({ success: false, error: result.left.message });
  }

  // Send real-time update via Socket.io
  req.services.socket.sendChatResponse(walletAddress, {
    type: 'sak_execution_result',
    data: result.right
  });
  
  res.json({ success: true, data: result.right });

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

  const result = await req.services.seiIntegration.executeSAKBatch(operations, { ...context, walletAddress })();

  if (result._tag === 'Left') {
    return res.json({ success: false, error: result.left.message });
  }

  // Send real-time update via Socket.io
  req.services.socket.sendChatResponse(walletAddress, {
    type: 'sak_batch_results',
    data: result.right
  });
  
  res.json({ success: true, data: result.right });

});

/**
 * GET /api/chat/sak-tools
 * Get available SAK tools
 */
router.get('/sak-tools', async (req, res) => {
  const { category } = req.query;

  const result = await req.services.seiIntegration.getSAKTools(category as string)();

  if (result._tag === 'Left') {
    return res.json({ success: false, error: result.left.message });
  }

  res.json({ success: true, data: result.right });

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

  const result = await req.services.seiIntegration.getMCPBlockchainState()();

  if (result._tag === 'Left') {
    return res.json({ success: false, error: result.left.message });
  }

  // Send real-time blockchain state via Socket.io
  req.services.socket.sendChatResponse(walletAddress, {
    type: 'blockchain_state_update',
    data: result.right
  });
  
  res.json({ success: true, data: result.right });

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

  const result = await req.services.seiIntegration.getMCPWalletBalance(walletAddress)();

  if (result._tag === 'Left') {
    return res.json({ success: false, error: result.left.message });
  }

  // Send real-time balance update via Socket.io
  req.services.socket.sendChatResponse(walletAddress, {
    type: 'wallet_balance_update',
    data: result.right
  });
  
  res.json({ success: true, data: result.right });

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

  const result = await req.services.seiIntegration.subscribeMCPEvents(eventTypes, filters, walletAddress)();

  if (result._tag === 'Left') {
    return res.json({ success: false, error: result.left.message });
  }

  res.json({ success: true, data: result.right });

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

  const result = await req.services.portfolioAnalytics.generateEnhancedAnalysis(
    walletAddress,
    analysisType,
    {
      includeHiveInsights,
      includeSAKData,
      includeMCPRealtime
    }
  )();

  if (result._tag === 'Left') {
    return res.json({ success: false, error: result.left.message });
  }

  // Send real-time analysis via Socket.io
  req.services.socket.sendChatResponse(walletAddress, {
    type: 'enhanced_analysis',
    data: result.right
  });
  
  res.json({ success: true, data: result.right });

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

  const result = await req.services.realTimeData.getConnectionStatus(walletAddress)();

  if (result._tag === 'Left') {
    return res.json({ success: false, error: result.left.message });
  }

  res.json({ success: true, data: result.right });

});

export { router as chatRouter };