import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';

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
  body('riskTolerance').optional().isIn(['low', 'medium', 'high']),
  body('timeHorizon').optional().isIn(['short', 'medium', 'long'])
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
    }),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (aiResponse) => TE.of({ success: true, data: aiResponse })
    )
  )();

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

  const result = await pipe(
    req.services.ai.processMessage(prompt, walletAddress || 'anonymous'),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (aiResponse) => TE.of({ success: true, data: aiResponse })
    )
  )();

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
    }),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (aiResponse) => TE.of({ success: true, data: aiResponse })
    )
  )();

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

  const result = await pipe(
    req.services.ai.processMessage(prompt, 'system'),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (aiResponse) => TE.of({ success: true, data: aiResponse })
    )
  )();

  res.json(result);
});

export { router as aiRouter };