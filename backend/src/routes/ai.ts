import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { cacheService } from '../utils/cache';

const router = Router();

/**
 * POST /api/ai/analyze
 * Generate AI analysis of portfolio
 */
router.post('/analyze', [
  body('walletAddress').isEthereumAddress().withMessage('Valid wallet address required')
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { walletAddress } = req.body;

  try {
    const portfolioResult = await req.services.portfolio.getPortfolioData(walletAddress)();
    if (portfolioResult._tag === 'Left') {
      return res.status(500).json({ success: false, error: portfolioResult.left.message });
    }
    
    const analysisResult = await req.services.ai.generatePortfolioAnalysis(portfolioResult.right, walletAddress)();
    if (analysisResult._tag === 'Left') {
      return res.status(500).json({ success: false, error: analysisResult.left.message });
    }
    
    res.json({ success: true, data: { analysis: analysisResult.right } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/ai/suggest
 * Get AI suggestions for portfolio optimization
 */
router.post('/suggest', [
  body('walletAddress').isEthereumAddress().withMessage('Valid wallet address required'),
  body('riskTolerance').optional().isIn(['low', 'medium', 'high']), // TODO: REMOVE_MOCK - Hard-coded array literals
  body('timeHorizon').optional().isIn(['short', 'medium', 'long']) // TODO: REMOVE_MOCK - Hard-coded array literals
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { walletAddress, riskTolerance = 'medium', timeHorizon = 'medium' } = req.body;

  const result = await pipe(
    req.services.portfolio.getPortfolioData(walletAddress),
    TE.chain(portfolioData => {
      const prompt = `Based on this portfolio data, provide optimization suggestions:
      
Portfolio: ${JSON.stringify(portfolioData, null, 2)}
Risk Tolerance: ${riskTolerance}
Time Horizon: ${timeHorizon}

Provide specific actionable recommendations for:
1. Asset allocation improvements
2. Yield optimization opportunities
3. Risk management strategies
4. Upcoming market opportunities

Format as a JSON object with categories.`;

      return req.services.ai.processMessage(prompt, walletAddress, portfolioData);
    })
  )();

  if (result._tag === 'Left') {
    return res.json({ success: false, error: result.left.message });
  }

  res.json({ success: true, data: result.right });

  res.json(result);
});

/**
 * POST /api/ai/explain
 * Get AI explanation of DeFi concepts or strategies
 */
router.post('/explain', [
  body('concept').notEmpty().withMessage('Concept is required'),
  body('walletAddress').optional().isEthereumAddress()
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { concept, walletAddress } = req.body;

  const prompt = `Explain the DeFi concept: "${concept}"
  
Please provide:
1. Clear definition and how it works
2. Benefits and risks
3. Practical examples on Sei Network
4. How it relates to portfolio management
5. When to use this strategy

Keep the explanation accessible but comprehensive.`;

  const result = await req.services.ai.processMessage(prompt, walletAddress || 'anonymous')();

  if (result._tag === 'Left') {
    return res.json({ success: false, error: result.left.message });
  }

  res.json(result);
});

/**
 * POST /api/ai/risk-assessment
 * Get AI risk assessment for a specific strategy
 */
router.post('/risk-assessment', [
  body('strategy').notEmpty().withMessage('Strategy description is required'),
  body('walletAddress').isEthereumAddress().withMessage('Valid wallet address required'),
  body('amount').optional().isNumeric()
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { strategy, walletAddress, amount } = req.body;

  const result = await pipe(
    req.services.portfolio.getPortfolioData(walletAddress),
    TE.chain(portfolioData => {
      const prompt = `Assess the risk of this strategy for the given portfolio:

Strategy: ${strategy}
${amount ? `Amount: $${amount}` : ''}

Current Portfolio:
${JSON.stringify(portfolioData, null, 2)}

Provide risk assessment including:
1. Risk level (Low/Medium/High)
2. Potential losses and scenarios
3. Impact on portfolio health factor
4. Market risks and timing considerations
5. Recommended position size
6. Exit strategy recommendations

Format as structured analysis.`;

      return req.services.ai.processMessage(prompt, walletAddress, portfolioData);
    })
  )();

  if (result._tag === 'Left') {
    return res.json({ success: false, error: result.left.message });
  }

  res.json(result);
});

/**
 * GET /api/ai/market-insights
 * Get AI-generated market insights and trends
 */
router.get('/market-insights', async (req, res) => {
  const prompt = `Provide current DeFi market insights relevant to Sei Network users:

1. Current market trends affecting DeFi yields
2. Sei Network specific opportunities
3. Risk factors to monitor
4. Recommended strategies for different market conditions
5. Upcoming protocol updates or opportunities

Focus on actionable insights for portfolio management.`;

  const result = await req.services.ai.processMessage(prompt, 'system')();

  if (result._tag === 'Left') {
    return res.json({ success: false, error: result.left.message });
  }

  res.json(result);
});

/**
 * GET /api/ai/memory/load
 * Load AI memory for a user session
 */
router.get('/memory/load', [
  query('userId').notEmpty().withMessage('User ID is required'),
  query('sessionId').notEmpty().withMessage('Session ID is required')
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, sessionId } = req.query;
  const memoryKey = cacheService.generateKey('ai_memory', userId as string, sessionId as string);

  const result = await pipe(
    cacheService.get<any>(memoryKey),
    TE.map(memory => {
      if (!memory) {
        // Return empty memory structure if none exists
        return {
          userId,
          sessionId,
          contexts: [],
          preferences: {},
          lastUpdated: new Date().toISOString()
        };
      }
      return memory;
    })
  )();

  if (E.isLeft(result)) {
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to load memory',
      details: result.left.message 
    });
  }

  res.json({ success: true, data: result.right });
});

/**
 * POST /api/ai/memory/save
 * Save AI memory for a user session
 */
router.post('/memory/save', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('sessionId').notEmpty().withMessage('Session ID is required'),
  body('memory').isObject().withMessage('Memory data is required')
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, sessionId, memory } = req.body;
  const memoryKey = cacheService.generateKey('ai_memory', userId, sessionId);
  
  // Add timestamp to memory
  const memoryWithTimestamp = {
    ...memory,
    lastUpdated: new Date().toISOString()
  };

  // Save with 7 days TTL
  const result = await cacheService.set(memoryKey, memoryWithTimestamp, 604800)();

  if (E.isLeft(result)) {
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to save memory',
      details: result.left.message 
    });
  }

  res.json({ success: true, message: 'Memory saved successfully' });
});

/**
 * PUT /api/ai/memory/update
 * Update specific fields in AI memory
 */
router.put('/memory/update', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('sessionId').notEmpty().withMessage('Session ID is required'),
  body('updates').isObject().withMessage('Updates are required')
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, sessionId, updates } = req.body;
  const memoryKey = cacheService.generateKey('ai_memory', userId, sessionId);

  const result = await pipe(
    cacheService.get<any>(memoryKey),
    TE.chain(existingMemory => {
      const updatedMemory = {
        ...(existingMemory || { userId, sessionId, contexts: [], preferences: {} }),
        ...updates,
        lastUpdated: new Date().toISOString()
      };
      return cacheService.set(memoryKey, updatedMemory, 604800);
    })
  )();

  if (E.isLeft(result)) {
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to update memory',
      details: result.left.message 
    });
  }

  res.json({ success: true, message: 'Memory updated successfully' });
});

/**
 * DELETE /api/ai/memory/delete
 * Delete AI memory for a user session
 */
router.delete('/memory/delete', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('sessionId').notEmpty().withMessage('Session ID is required')
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, sessionId } = req.body;
  const memoryKey = cacheService.generateKey('ai_memory', userId, sessionId);

  const result = await cacheService.del(memoryKey)();

  if (E.isLeft(result)) {
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to delete memory',
      details: result.left.message 
    });
  }

  res.json({ success: true, message: 'Memory deleted successfully' });
});

/**
 * POST /api/ai/memory/search
 * Search through AI memories
 */
router.post('/memory/search', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('query').notEmpty().withMessage('Search query is required')
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, query: searchQuery } = req.body;
  
  // For now, return a simple response
  // In a production system, this would search across all user sessions
  res.json({ 
    success: true, 
    data: {
      results: [],
      query: searchQuery,
      message: 'Memory search functionality is being implemented'
    }
  });
});

export { router as aiRouter };