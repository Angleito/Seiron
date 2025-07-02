import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';

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
    req.services.ai.processMessage(message, walletAddress, portfolioData),
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

export { router as chatRouter };