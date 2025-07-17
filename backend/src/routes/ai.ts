import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { rateLimit } from 'express-rate-limit';
import { cacheService, CacheService } from '../utils/cache';
import { createHiveIntelligenceAdapter } from '../adapters/HiveIntelligenceAdapter';

const router = Router();

// Rate limiting for voice processing endpoints
const voiceRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 voice requests per windowMs
  message: 'Too many voice processing requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by IP and userId if available
    const userId = req.body?.userId || req.query?.userId;
    return userId ? `voice_${req.ip}_${userId}` : `voice_${req.ip}`;
  }
});

// Rate limiting for memory operations
const memoryRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // Limit each IP to 100 memory requests per windowMs
  message: 'Too many memory requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.body?.userId || req.query?.userId;
    return userId ? `memory_${req.ip}_${userId}` : `memory_${req.ip}`;
  }
});

// Rate limiting for streaming endpoints
const streamRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // Limit each IP to 20 streaming requests per windowMs
  message: 'Too many streaming requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for blockchain query endpoints
const blockchainRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // Limit each IP to 30 blockchain requests per windowMs
  message: 'Too many blockchain query requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.body?.userId || req.query?.userId;
    return userId ? `blockchain_${req.ip}_${userId}` : `blockchain_${req.ip}`;
  }
});

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
 * POST /api/ai/blockchain/query
 * Query blockchain data using natural language with Hive Intelligence
 */
router.post('/blockchain/query', 
  blockchainRateLimit,
  [
    body('query').notEmpty().withMessage('Query is required'),
    body('userId').optional().notEmpty().withMessage('User ID must not be empty if provided'),
    body('sessionId').optional().notEmpty().withMessage('Session ID must not be empty if provided'),
    body('temperature').optional().isFloat({ min: 0, max: 1 }).withMessage('Temperature must be between 0 and 1'),
    body('includeDataSources').optional().isBoolean().withMessage('Include data sources must be boolean'),
    body('maxTokens').optional().isInt({ min: 1, max: 2000 }).withMessage('Max tokens must be between 1 and 2000'),
    body('contextAware').optional().isBoolean().withMessage('Context aware must be boolean')
  ], 
  async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed', 
      details: errors.array() 
    });
  }

  const { 
    query, 
    userId, 
    sessionId, 
    temperature = 0.3, 
    includeDataSources = true, 
    maxTokens = 500,
    contextAware = false 
  } = req.body;

  // Initialize Hive Intelligence adapter
  const hiveAdapter = createHiveIntelligenceAdapter({
    apiKey: process.env.HIVE_INTELLIGENCE_API_KEY!,
    baseUrl: process.env.HIVE_INTELLIGENCE_BASE_URL,
    maxRequestsPerMinute: parseInt(process.env.HIVE_INTELLIGENCE_RATE_LIMIT || '20'),
    cacheTTL: parseInt(process.env.HIVE_INTELLIGENCE_CACHE_TTL || '300'),
    retryAttempts: parseInt(process.env.HIVE_INTELLIGENCE_RETRY_ATTEMPTS || '2'),
    retryDelay: parseInt(process.env.HIVE_INTELLIGENCE_RETRY_DELAY || '1000')
  });

  const result = await pipe(
    // Initialize adapter
    hiveAdapter.initialize(),
    TE.chain(() => {
      // Load conversation context if context-aware mode is enabled
      if (contextAware && userId && sessionId) {
        return pipe(
          cacheService.get<any>(CacheService.generateKey('ai_memory', userId, sessionId)),
          TE.map(memory => {
            if (memory?.entries) {
              // Extract relevant context for blockchain queries
              const portfolioData = memory.entries.find((entry: any) => entry.key === 'portfolio_data')?.value;
              const recentQueries = memory.entries
                .filter((entry: any) => entry.category === 'interaction' && entry.value?.blockchainQuery)
                .slice(-3)
                .map((entry: any) => entry.value.blockchainQuery);
              
              // Enhance query with context
              let enhancedQuery = query;
              if (portfolioData) {
                enhancedQuery += `\n\nContext: User has portfolio data including ${Object.keys(portfolioData).join(', ')}`;
              }
              if (recentQueries.length > 0) {
                enhancedQuery += `\n\nRecent queries: ${recentQueries.join('; ')}`;
              }
              
              return enhancedQuery;
            }
            return query;
          })
        );
      }
      return TE.right(query);
    }),
    TE.chain(enhancedQuery => {
      // Query Hive Intelligence
      return hiveAdapter.queryBlockchainData({
        query: enhancedQuery,
        temperature,
        includeDataSources,
        maxTokens
      });
    }),
    TE.chain(blockchainResponse => {
      // Save query to memory if user session is provided
      if (userId && sessionId) {
        const queryEntry = {
          id: `blockchain_query_${Date.now()}`,
          userId,
          sessionId,
          key: `blockchain_query_${Date.now()}`,
          value: {
            query,
            response: blockchainResponse.response,
            sources: blockchainResponse.sources,
            creditsUsed: blockchainResponse.creditsUsed,
            timestamp: blockchainResponse.timestamp,
            blockchainQuery: true
          },
          category: 'interaction' as const,
          confidence: 0.9,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        return pipe(
          cacheService.get<any>(CacheService.generateKey('ai_memory', userId, sessionId)),
          TE.chain(existingMemory => {
            const updatedMemory = {
              ...(existingMemory || {}),
              entries: [...(existingMemory?.entries || []), queryEntry],
              lastUpdated: new Date().toISOString(),
              userId,
              sessionId
            };
            return pipe(
              cacheService.set(CacheService.generateKey('ai_memory', userId, sessionId), updatedMemory, 604800),
              TE.map(() => blockchainResponse)
            );
          })
        );
      }
      return TE.right(blockchainResponse);
    })
  )();

  // Clean up adapter resources
  hiveAdapter.destroy();

  if (E.isLeft(result)) {
    return res.status(500).json({
      success: false,
      error: 'Blockchain query failed',
      details: result.left.message
    });
  }

  res.json({
    success: true,
    data: {
      query: result.right.query,
      response: result.right.response,
      sources: result.right.sources,
      creditsUsed: result.right.creditsUsed,
      timestamp: result.right.timestamp,
      contextAware,
      enhancedWithMemory: contextAware && userId && sessionId
    }
  });
});

/**
 * GET /api/ai/memory/load
 * Load AI memory for a user session
 */
router.get('/memory/load', 
  memoryRateLimit,
  [
    query('userId').notEmpty().withMessage('User ID is required'),
    query('sessionId').optional().notEmpty().withMessage('Session ID must not be empty if provided')
  ], 
  async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, sessionId } = req.query;
  const memoryKey = sessionId 
    ? CacheService.generateKey('ai_memory', userId as string, sessionId as string)
    : CacheService.generateKey('ai_memory', userId as string, 'default');

  const result = await pipe(
    cacheService.get<any>(memoryKey),
    TE.map(memory => {
      if (!memory) {
        // Return empty memory structure that matches useAIMemory expectations
        return {
          memories: [],
          success: true,
          metadata: {
            userId,
            sessionId: sessionId || 'default',
            lastUpdated: new Date().toISOString(),
            totalMemories: 0
          }
        };
      }
      
      // Convert stored memory to expected format
      const memories = memory.entries || memory.contexts || [];
      return {
        memories: memories.map((entry: any) => ({
          id: entry.id || `${entry.key || 'unknown'}_${Date.now()}`,
          userId: entry.userId || userId,
          sessionId: entry.sessionId || sessionId || 'default',
          key: entry.key || 'context',
          value: entry.value || entry,
          category: entry.category || 'context',
          confidence: entry.confidence || 1.0,
          createdAt: entry.createdAt || entry.timestamp || new Date().toISOString(),
          updatedAt: entry.updatedAt || entry.lastUpdated || new Date().toISOString(),
          expiresAt: entry.expiresAt
        })),
        success: true,
        metadata: {
          userId,
          sessionId: sessionId || 'default',
          lastUpdated: memory.lastUpdated || new Date().toISOString(),
          totalMemories: memories.length
        }
      };
    })
  )();

  if (E.isLeft(result)) {
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to load memory',
      details: result.left.message,
      memories: []
    });
  }

  res.json(result.right);
});

/**
 * POST /api/ai/memory/save
 * Save AI memory for a user session - supports both individual entries and bulk saves
 */
router.post('/memory/save', 
  memoryRateLimit,
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('sessionId').notEmpty().withMessage('Session ID is required'),
    body().custom((value) => {
      // Support both individual memory entry and full memory object
      if (value.memory || (value.key && value.value)) {
        return true;
      }
      throw new Error('Either memory object or key/value pair is required');
    })
  ], 
  async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, sessionId, memory, key, value, category = 'context', confidence = 1.0 } = req.body;
  const memoryKey = CacheService.generateKey('ai_memory', userId, sessionId);
  
  const result = await pipe(
    cacheService.get<any>(memoryKey),
    TE.chain(existingMemory => {
      let updatedMemory;
      
      if (memory) {
        // Full memory object save
        updatedMemory = {
          ...memory,
          lastUpdated: new Date().toISOString(),
          userId,
          sessionId
        };
      } else {
        // Individual entry save
        const existingEntries = existingMemory?.entries || [];
        const newEntry = {
          id: `${key}_${Date.now()}`,
          userId,
          sessionId,
          key,
          value,
          category,
          confidence,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Remove existing entry with same key and add new one
        const filteredEntries = existingEntries.filter((entry: any) => entry.key !== key);
        updatedMemory = {
          ...existingMemory,
          entries: [...filteredEntries, newEntry],
          lastUpdated: new Date().toISOString(),
          userId,
          sessionId
        };
      }
      
      // Save with 7 days TTL
      return pipe(
        cacheService.set(memoryKey, updatedMemory, 604800),
        TE.map(() => updatedMemory)
      );
    })
  )();

  if (E.isLeft(result)) {
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to save memory',
      details: result.left.message 
    });
  }

  // Return the saved entry in the expected format for useAIMemory
  if (key && value) {
    const savedEntry = result.right.entries.find((entry: any) => entry.key === key);
    res.json(savedEntry);
  } else {
    res.json({ success: true, message: 'Memory saved successfully', data: result.right });
  }
});

/**
 * PUT /api/ai/memory/update
 * Update specific fields in AI memory or specific entries
 */
router.put('/memory/update', 
  memoryRateLimit,
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('sessionId').notEmpty().withMessage('Session ID is required'),
    body().custom((value) => {
      // Support both full memory updates and individual entry updates
      if (value.updates || (value.key && (value.value !== undefined || value.confidence !== undefined || value.category !== undefined))) {
        return true;
      }
      throw new Error('Either updates object or key with update fields is required');
    })
  ], 
  async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, sessionId, updates, key, value, confidence, category } = req.body;
  const memoryKey = CacheService.generateKey('ai_memory', userId, sessionId);

  const result = await pipe(
    cacheService.get<any>(memoryKey),
    TE.chain(existingMemory => {
      let updatedMemory;
      
      if (updates) {
        // Full memory updates
        updatedMemory = {
          ...(existingMemory || { userId, sessionId, entries: [], preferences: {} }),
          ...updates,
          lastUpdated: new Date().toISOString()
        };
      } else {
        // Individual entry update
        const entries = existingMemory?.entries || [];
        const entryIndex = entries.findIndex((entry: any) => entry.key === key);
        
        if (entryIndex === -1) {
          throw new Error(`Memory entry with key "${key}" not found`);
        }
        
        const updatedEntry = {
          ...entries[entryIndex],
          ...(value !== undefined && { value }),
          ...(confidence !== undefined && { confidence }),
          ...(category !== undefined && { category }),
          updatedAt: new Date().toISOString()
        };
        
        entries[entryIndex] = updatedEntry;
        updatedMemory = {
          ...existingMemory,
          entries,
          lastUpdated: new Date().toISOString()
        };
      }
      
      return pipe(
        cacheService.set(memoryKey, updatedMemory, 604800),
        TE.map(() => updatedMemory)
      );
    })
  )();

  if (E.isLeft(result)) {
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to update memory',
      details: result.left.message 
    });
  }

  // Return updated entry if specific key was updated, otherwise success message
  if (key) {
    const updatedEntry = result.right.entries.find((entry: any) => entry.key === key);
    res.json(updatedEntry);
  } else {
    res.json({ success: true, message: 'Memory updated successfully', data: result.right });
  }
});

/**
 * DELETE /api/ai/memory/delete
 * Delete AI memory for a user session or specific entries
 */
router.delete('/memory/delete', 
  memoryRateLimit,
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('sessionId').notEmpty().withMessage('Session ID is required'),
    body('key').optional().notEmpty().withMessage('Key must not be empty if provided')
  ], 
  async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, sessionId, key } = req.body;
  const memoryKey = CacheService.generateKey('ai_memory', userId, sessionId);

  const result = await pipe(
    key ? 
      // Delete specific entry
      pipe(
        cacheService.get<any>(memoryKey),
        TE.chain(existingMemory => {
          if (!existingMemory) {
            throw new Error('Memory not found');
          }
          
          const entries = existingMemory.entries || [];
          const filteredEntries = entries.filter((entry: any) => entry.key !== key);
          
          if (filteredEntries.length === entries.length) {
            throw new Error(`Entry with key "${key}" not found`);
          }
          
          const updatedMemory = {
            ...existingMemory,
            entries: filteredEntries,
            lastUpdated: new Date().toISOString()
          };
          
          return cacheService.set(memoryKey, updatedMemory, 604800);
        })
      ) :
      // Delete entire memory
      cacheService.del(memoryKey)
  )();

  if (E.isLeft(result)) {
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to delete memory',
      details: result.left.message 
    });
  }

  res.json({ 
    success: true, 
    message: key ? `Memory entry "${key}" deleted successfully` : 'Memory deleted successfully' 
  });
});

/**
 * GET /api/ai/memory/search
 * Search through AI memories
 */
router.get('/memory/search', 
  memoryRateLimit,
  [
    query('userId').notEmpty().withMessage('User ID is required'),
    query('query').notEmpty().withMessage('Search query is required'),
    query('sessionId').optional().notEmpty().withMessage('Session ID must not be empty if provided'),
    query('category').optional().isIn(['preference', 'context', 'fact', 'interaction']).withMessage('Invalid category'),
    query('minConfidence').optional().isFloat({ min: 0, max: 1 }).withMessage('Min confidence must be between 0 and 1'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ], 
  async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, query: searchQuery, sessionId, category, minConfidence, limit = 10 } = req.query;
  
  // Get all user memory keys if sessionId not specified
  const memoryKeys = sessionId ? 
    [CacheService.generateKey('ai_memory', userId as string, sessionId as string)] :
    [cacheService.generateKey('ai_memory', userId as string, 'default')]; // For now, just search default session
  
  const result = await pipe(
    TE.tryCatch(
      async () => {
        const allMemories: any[] = [];
        
        for (const key of memoryKeys) {
          const memoryResult = await cacheService.get<any>(key)();
          if (E.isRight(memoryResult) && memoryResult.right) {
            const entries = memoryResult.right.entries || [];
            allMemories.push(...entries);
          }
        }
        
        // Filter memories based on search criteria
        let filteredMemories = allMemories.filter((entry: any) => {
          // Text search in key and value
          const searchText = searchQuery?.toString().toLowerCase() || '';
          const keyMatch = entry.key?.toLowerCase().includes(searchText);
          const valueMatch = JSON.stringify(entry.value || '').toLowerCase().includes(searchText);
          
          // Category filter
          const categoryMatch = !category || entry.category === category;
          
          // Confidence filter
          const confidenceMatch = !minConfidence || (entry.confidence || 1.0) >= parseFloat(minConfidence as string);
          
          return (keyMatch || valueMatch) && categoryMatch && confidenceMatch;
        });
        
        // Sort by confidence descending, then by updatedAt descending
        filteredMemories.sort((a, b) => {
          const confDiff = (b.confidence || 1.0) - (a.confidence || 1.0);
          if (confDiff !== 0) return confDiff;
          
          const dateA = new Date(a.updatedAt || a.createdAt || 0);
          const dateB = new Date(b.updatedAt || b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        });
        
        // Apply limit
        filteredMemories = filteredMemories.slice(0, parseInt(limit as string));
        
        // Format response to match useAIMemory expectations
        return {
          memories: filteredMemories.map((entry: any) => ({
            id: entry.id || `${entry.key}_${Date.now()}`,
            userId: entry.userId || userId,
            sessionId: entry.sessionId || sessionId || 'default',
            key: entry.key || 'unknown',
            value: entry.value,
            category: entry.category || 'context',
            confidence: entry.confidence || 1.0,
            createdAt: entry.createdAt || new Date().toISOString(),
            updatedAt: entry.updatedAt || new Date().toISOString(),
            expiresAt: entry.expiresAt
          })),
          success: true,
          metadata: {
            query: searchQuery,
            totalResults: filteredMemories.length,
            category,
            minConfidence,
            limit: parseInt(limit as string)
          }
        };
      },
      (error) => new Error(`Search failed: ${error}`)
    )
  )();
  
  if (E.isLeft(result)) {
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to search memories',
      details: result.left.message,
      memories: []
    });
  }

  res.json(result.right);
});

/**
 * POST /api/ai/voice/process
 * Process voice input and generate AI response with voice synthesis
 */
router.post('/voice/process', 
  voiceRateLimit,
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('sessionId').notEmpty().withMessage('Session ID is required'),
    body('transcript').notEmpty().withMessage('Voice transcript is required'),
    body('audioMetadata').optional().isObject().withMessage('Audio metadata must be an object'),
    body('voiceSettings').optional().isObject().withMessage('Voice settings must be an object')
  ], 
  async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, sessionId, transcript, audioMetadata, voiceSettings } = req.body;
  
  const result = await pipe(
    // Load conversation memory
    pipe(
      cacheService.get<any>(CacheService.generateKey('ai_memory', userId, sessionId)),
      TE.map(memory => memory || { entries: [], preferences: {} })
    ),
    TE.chain(memory => {
      // Extract portfolio data from memory if available
      const portfolioData = memory.entries?.find((entry: any) => entry.key === 'portfolio_data')?.value;
      
      // Process with AI service
      return req.services?.ai?.processMessage 
        ? req.services.ai.processMessage(transcript, userId, portfolioData)
        : TE.left(new Error('AI service not available'));
    }),
    TE.chain(aiResponse => {
      // Save conversation to memory
      const conversationEntry = {
        id: `conversation_${Date.now()}`,
        userId,
        sessionId,
        key: `conversation_${Date.now()}`,
        value: {
          userTranscript: transcript,
          aiResponse: aiResponse.message,
          audioMetadata,
          timestamp: new Date().toISOString(),
          confidence: aiResponse.confidence,
          command: aiResponse.command
        },
        category: 'interaction' as const,
        confidence: aiResponse.confidence,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return pipe(
        cacheService.get<any>(CacheService.generateKey('ai_memory', userId, sessionId)),
        TE.chain(existingMemory => {
          const updatedMemory = {
            ...existingMemory,
            entries: [...(existingMemory?.entries || []), conversationEntry],
            lastUpdated: new Date().toISOString()
          };
          return pipe(
            cacheService.set(CacheService.generateKey('ai_memory', userId, sessionId), updatedMemory, 604800),
            TE.map(() => aiResponse)
          );
        })
      );
    })
  )();

  if (E.isLeft(result)) {
    return res.status(500).json({
      success: false,
      error: 'Voice processing failed',
      details: result.left.message
    });
  }

  res.json({
    success: true,
    data: {
      response: result.right.message,
      command: result.right.command,
      suggestions: result.right.suggestions,
      confidence: result.right.confidence,
      reasoning: result.right.reasoning,
      voiceSettings: voiceSettings || {
        stability: 0.5,
        similarityBoost: 0.75,
        style: 0.5,
        useSpeakerBoost: true
      }
    }
  });
});

/**
 * POST /api/ai/voice/stream
 * Stream AI response generation for real-time voice processing
 */
router.post('/voice/stream', 
  streamRateLimit,
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('sessionId').notEmpty().withMessage('Session ID is required'),
    body('transcript').notEmpty().withMessage('Voice transcript is required')
  ], 
  async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, sessionId, transcript } = req.body;

  // Set up Server-Sent Events for streaming
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  try {
    // Load conversation memory
    const memoryResult = await cacheService.get<any>(CacheService.generateKey('ai_memory', userId, sessionId))();
    const memory = E.isRight(memoryResult) ? memoryResult.right : { entries: [], preferences: {} };
    
    // Extract portfolio data
    const portfolioData = memory.entries?.find((entry: any) => entry.key === 'portfolio_data')?.value;
    
    // Send initial status
    res.write(`data: ${JSON.stringify({ 
      type: 'status', 
      status: 'processing', 
      message: 'Analyzing your request...' 
    })}\n\n`);

    // Process with AI service (this would typically be a streaming response)
    if (req.services?.ai?.processMessage) {
      const aiResult = await req.services.ai.processMessage(transcript, userId, portfolioData)();
      
      if (E.isRight(aiResult)) {
        // Stream the response (in chunks for demonstration)
        const response = aiResult.right.message;
        const chunks = response.split(' ');
        
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i] + (i < chunks.length - 1 ? ' ' : '');
          res.write(`data: ${JSON.stringify({
            type: 'chunk',
            content: chunk,
            index: i,
            isLast: i === chunks.length - 1
          })}\n\n`);
          
          // Small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Send final response
        res.write(`data: ${JSON.stringify({
          type: 'complete',
          response: aiResult.right.message,
          command: aiResult.right.command,
          suggestions: aiResult.right.suggestions,
          confidence: aiResult.right.confidence
        })}\n\n`);
        
        // Save conversation to memory
        const conversationEntry = {
          id: `conversation_${Date.now()}`,
          userId,
          sessionId,
          key: `conversation_${Date.now()}`,
          value: {
            userTranscript: transcript,
            aiResponse: aiResult.right.message,
            timestamp: new Date().toISOString(),
            confidence: aiResult.right.confidence,
            command: aiResult.right.command,
            streamProcessed: true
          },
          category: 'interaction' as const,
          confidence: aiResult.right.confidence,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const updatedMemory = {
          ...memory,
          entries: [...(memory.entries || []), conversationEntry],
          lastUpdated: new Date().toISOString()
        };
        
        await cacheService.set(CacheService.generateKey('ai_memory', userId, sessionId), updatedMemory, 604800)();
      } else {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: 'AI processing failed',
          details: aiResult.left.message
        })}\n\n`);
      }
    } else {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: 'AI service not available'
      })}\n\n`);
    }
  } catch (error) {
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: 'Stream processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })}\n\n`);
  }

  res.end();
});

/**
 * GET /api/ai/voice/session/status
 * Get voice session status and statistics
 */
router.get('/voice/session/status', 
  voiceRateLimit,
  [
    query('userId').notEmpty().withMessage('User ID is required'),
    query('sessionId').notEmpty().withMessage('Session ID is required')
  ], 
  async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, sessionId } = req.query;
  
  const result = await pipe(
    cacheService.get<any>(CacheService.generateKey('ai_memory', userId as string, sessionId as string)),
    TE.map(memory => {
      if (!memory) {
        return {
          sessionActive: false,
          totalInteractions: 0,
          lastActivity: null,
          voiceMetrics: {
            averageConfidence: 0,
            totalVoiceTime: 0,
            commandsProcessed: 0
          }
        };
      }
      
      const interactions = memory.entries?.filter((entry: any) => entry.category === 'interaction') || [];
      const voiceInteractions = interactions.filter((entry: any) => entry.value?.userTranscript);
      
      const averageConfidence = voiceInteractions.length > 0 
        ? voiceInteractions.reduce((sum: number, entry: any) => sum + (entry.confidence || 1.0), 0) / voiceInteractions.length
        : 0;
      
      const commandsProcessed = interactions.filter((entry: any) => entry.value?.command).length;
      
      return {
        sessionActive: true,
        totalInteractions: interactions.length,
        voiceInteractions: voiceInteractions.length,
        lastActivity: memory.lastUpdated,
        voiceMetrics: {
          averageConfidence,
          totalVoiceTime: voiceInteractions.length * 5, // Estimate 5 seconds per interaction
          commandsProcessed
        },
        recentInteractions: interactions.slice(-5).map((entry: any) => ({
          timestamp: entry.createdAt,
          type: entry.value?.command ? 'command' : 'conversation',
          confidence: entry.confidence
        }))
      };
    })
  )();

  if (E.isLeft(result)) {
    return res.status(500).json({
      success: false,
      error: 'Failed to get session status',
      details: result.left.message
    });
  }

  res.json({
    success: true,
    data: result.right
  });
});

/**
 * POST /api/ai/voice/context/update
 * Update voice conversation context (portfolio data, preferences, etc.)
 */
router.post('/voice/context/update', 
  voiceRateLimit,
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('sessionId').notEmpty().withMessage('Session ID is required'),
    body('contextType').isIn(['portfolio', 'preferences', 'sei_data', 'market_data']).withMessage('Invalid context type'),
    body('data').isObject().withMessage('Context data is required')
  ], 
  async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, sessionId, contextType, data } = req.body;
  const memoryKey = CacheService.generateKey('ai_memory', userId, sessionId);
  
  const result = await pipe(
    cacheService.get<any>(memoryKey),
    TE.chain(existingMemory => {
      const contextEntry = {
        id: `${contextType}_context_${Date.now()}`,
        userId,
        sessionId,
        key: `${contextType}_data`,
        value: data,
        category: 'context' as const,
        confidence: 1.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const entries = existingMemory?.entries || [];
      // Remove existing context of the same type
      const filteredEntries = entries.filter((entry: any) => entry.key !== `${contextType}_data`);
      
      const updatedMemory = {
        ...existingMemory,
        entries: [...filteredEntries, contextEntry],
        lastUpdated: new Date().toISOString(),
        userId,
        sessionId
      };
      
      return pipe(
        cacheService.set(memoryKey, updatedMemory, 604800),
        TE.map(() => contextEntry)
      );
    })
  )();

  if (E.isLeft(result)) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update voice context',
      details: result.left.message
    });
  }

  res.json({
    success: true,
    data: result.right,
    message: `${contextType} context updated successfully`
  });
});

export { router as aiRouter };