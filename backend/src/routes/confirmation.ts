import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';

const router = Router();

/**
 * POST /api/confirm/:transactionId
 * Confirm a pending transaction
 */
router.post('/confirm/:transactionId', [
  param('transactionId').isUUID().withMessage('Valid transaction ID required'),
  body('walletAddress').isEthereumAddress().withMessage('Valid wallet address required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { transactionId } = req.params;
  const { walletAddress } = req.body;

  // Verify wallet address matches the request context
  if (req.walletAddress && req.walletAddress !== walletAddress) {
    return res.status(403).json({ 
      success: false, 
      error: 'Wallet address mismatch' 
    });
  }

  const result = await req.services.confirmation.confirmTransaction(transactionId, walletAddress)();

  if (result._tag === 'Left') {
    return res.status(400).json({ 
      success: false, 
      error: result.left.message 
    });
  }

  res.json({ 
    success: true, 
    data: result.right 
  });
});

/**
 * POST /api/reject/:transactionId
 * Reject a pending transaction
 */
router.post('/reject/:transactionId', [
  param('transactionId').isUUID().withMessage('Valid transaction ID required'),
  body('walletAddress').isEthereumAddress().withMessage('Valid wallet address required'),
  body('reason').optional().isString().withMessage('Reason must be a string')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { transactionId } = req.params;
  const { walletAddress, reason } = req.body;

  // Verify wallet address matches the request context
  if (req.walletAddress && req.walletAddress !== walletAddress) {
    return res.status(403).json({ 
      success: false, 
      error: 'Wallet address mismatch' 
    });
  }

  const result = await req.services.confirmation.rejectTransaction(transactionId, walletAddress, reason)();

  if (result._tag === 'Left') {
    return res.status(400).json({ 
      success: false, 
      error: result.left.message 
    });
  }

  res.json({ 
    success: true, 
    data: result.right 
  });
});

/**
 * GET /api/pending/:walletAddress
 * Get all pending transactions for a wallet
 */
router.get('/pending/:walletAddress', [
  param('walletAddress').isEthereumAddress().withMessage('Valid wallet address required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { walletAddress } = req.params;

  // Verify wallet address matches the request context
  if (req.walletAddress && req.walletAddress !== walletAddress) {
    return res.status(403).json({ 
      success: false, 
      error: 'Wallet address mismatch' 
    });
  }

  const result = await req.services.confirmation.getPendingTransactionsForWallet(walletAddress)();

  if (result._tag === 'Left') {
    return res.json({ 
      success: false, 
      error: result.left.message 
    });
  }

  res.json({ 
    success: true, 
    data: result.right 
  });
});

/**
 * GET /api/transaction/:transactionId
 * Get details of a specific transaction
 */
router.get('/transaction/:transactionId', [
  param('transactionId').isUUID().withMessage('Valid transaction ID required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { transactionId } = req.params;

  const result = await req.services.confirmation.getPendingTransaction(transactionId)();

  if (result._tag === 'Left') {
    const errorMessage = result.left.message;
    return res.status(errorMessage === 'Transaction not found' ? 404 : 403).json({ 
      success: false, 
      error: errorMessage 
    });
  }

  const transaction = result.right;
  
  // Verify the requesting user has access to this transaction
  if (req.walletAddress && transaction.walletAddress !== req.walletAddress) {
    return res.status(403).json({ 
      success: false, 
      error: 'Unauthorized access to transaction' 
    });
  }

  res.json({ 
    success: true, 
    data: transaction 
  });
});

export { router as confirmationRouter };