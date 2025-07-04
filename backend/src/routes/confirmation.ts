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

  const result = await pipe(
    req.services.confirmation.confirmTransaction(transactionId, walletAddress),
    TE.fold(
      (error) => TE.of({ 
        success: false, 
        error: error.message 
      }),
      (confirmationResult) => TE.of({ 
        success: true, 
        data: confirmationResult 
      })
    )
  )();

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
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

  const result = await pipe(
    req.services.confirmation.rejectTransaction(transactionId, walletAddress, reason),
    TE.fold(
      (error) => TE.of({ 
        success: false, 
        error: error.message 
      }),
      (confirmationResult) => TE.of({ 
        success: true, 
        data: confirmationResult 
      })
    )
  )();

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
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

  const result = await pipe(
    req.services.confirmation.getPendingTransactionsForWallet(walletAddress),
    TE.fold(
      (error) => TE.of({ 
        success: false, 
        error: error.message 
      }),
      (transactions) => TE.of({ 
        success: true, 
        data: transactions 
      })
    )
  )();

  res.json(result);
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

  const result = await pipe(
    req.services.confirmation.getPendingTransaction(transactionId),
    TE.fold(
      (error) => TE.of({ 
        success: false, 
        error: error.message 
      }),
      (transaction) => {
        // Verify the requesting user has access to this transaction
        if (req.walletAddress && transaction.walletAddress !== req.walletAddress) {
          return TE.of({ 
            success: false, 
            error: 'Unauthorized access to transaction' 
          });
        }
        
        return TE.of({ 
          success: true, 
          data: transaction 
        });
      }
    )
  )();

  if (!result.success) {
    return res.status(result.error === 'Transaction not found' ? 404 : 403).json(result);
  }

  res.json(result);
});

export { router as confirmationRouter };