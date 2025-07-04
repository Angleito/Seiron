import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';

const router = Router();

/**
 * GET /api/portfolio/data
 * Get complete portfolio data for wallet
 */
router.get('/data', [
  query('walletAddress').isEthereumAddress().withMessage('Valid wallet address required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { walletAddress } = req.query as { walletAddress: string };

  const result = await pipe(
    req.services.portfolio.getPortfolioData(walletAddress),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (portfolioData) => TE.of({ success: true, data: portfolioData })
    )
  )();

  res.json(result);
});

/**
 * GET /api/portfolio/summary
 * Get portfolio summary with key metrics
 */
router.get('/summary', [
  query('walletAddress').isEthereumAddress().withMessage('Valid wallet address required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { walletAddress } = req.query as { walletAddress: string };

  const result = await pipe(
    req.services.portfolio.getPortfolioSummary(walletAddress),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (summary) => TE.of({ success: true, data: summary })
    )
  )();

  res.json(result);
});

/**
 * POST /api/portfolio/lending/supply
 * Create pending supply transaction (requires confirmation)
 */
router.post('/lending/supply', [
  body('walletAddress').isEthereumAddress().withMessage('Valid wallet address required'),
  body('asset').notEmpty().withMessage('Asset is required'),
  body('amount').isNumeric().withMessage('Amount must be numeric'),
  body('onBehalfOf').optional().isEthereumAddress(),
  body('requireConfirmation').optional().isBoolean()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { walletAddress, asset, amount, onBehalfOf, requireConfirmation = true } = req.body;

  const params = {
    walletAddress,
    asset,
    amount: BigInt(Math.floor(parseFloat(amount) * 1e18)),
    onBehalfOf: onBehalfOf || walletAddress
  };

  // If confirmation required, create pending transaction
  if (requireConfirmation) {
    const result = await pipe(
      req.services.portfolio.createPendingLendingOperation('supply', params),
      TE.fold(
        (error) => TE.of({ success: false, error: error.message }),
        (pendingResult) => TE.of({ 
          success: true, 
          data: pendingResult,
          requiresConfirmation: true 
        })
      )
    )();

    return res.json(result);
  }

  // Direct execution without confirmation (backward compatibility)
  const result = await pipe(
    req.services.portfolio.executeLendingOperation('supply', params),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (txResult) => {
        // Send real-time update
        req.services.socket.sendTransactionUpdate(
          walletAddress,
          txResult.txHash,
          'pending'
        );
        return TE.of({ success: true, data: txResult });
      }
    )
  )();

  res.json(result);
});

/**
 * POST /api/portfolio/lending/supply/execute
 * Execute a confirmed supply transaction
 */
router.post('/lending/supply/execute', [
  body('transactionId').isUUID().withMessage('Valid transaction ID required'),
  body('walletAddress').isEthereumAddress().withMessage('Valid wallet address required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { transactionId, walletAddress } = req.body;

  // Get transaction details and execute
  const transactionResult = await pipe(
    req.services.confirmation.getPendingTransaction(transactionId),
    TE.chain(transaction => {
      if (transaction.walletAddress !== walletAddress) {
        return TE.left(new Error('Unauthorized'));
      }
      if (transaction.status !== 'confirmed') {
        return TE.left(new Error('Transaction not confirmed'));
      }
      return TE.right(transaction);
    })
  )();

  if (E.isLeft(transactionResult)) {
    return res.status(400).json({ 
      success: false, 
      error: transactionResult.left.message 
    });
  }

  const transaction = transactionResult.right;
  
  const result = await pipe(
    req.services.portfolio.executeLendingOperation(
      transaction.action as 'supply',
      transaction.parameters,
      transactionId
    ),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (txResult) => {
        req.services.socket.sendTransactionUpdate(
          walletAddress,
          txResult.txHash,
          'pending'
        );
        return TE.of({ success: true, data: txResult });
      }
    )
  )();

  res.json(result);
});

/**
 * POST /api/portfolio/lending/withdraw
 * Create pending withdraw transaction (requires confirmation)
 */
router.post('/lending/withdraw', [
  body('walletAddress').isEthereumAddress().withMessage('Valid wallet address required'),
  body('asset').notEmpty().withMessage('Asset is required'),
  body('amount').isNumeric().withMessage('Amount must be numeric'),
  body('to').optional().isEthereumAddress(),
  body('requireConfirmation').optional().isBoolean()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { walletAddress, asset, amount, to, requireConfirmation = true } = req.body;

  const params = {
    walletAddress,
    asset,
    amount: BigInt(Math.floor(parseFloat(amount) * 1e18)),
    to: to || walletAddress
  };

  // If confirmation required, create pending transaction
  if (requireConfirmation) {
    const result = await pipe(
      req.services.portfolio.createPendingLendingOperation('withdraw', params),
      TE.fold(
        (error) => TE.of({ success: false, error: error.message }),
        (pendingResult) => TE.of({ 
          success: true, 
          data: pendingResult,
          requiresConfirmation: true 
        })
      )
    )();

    return res.json(result);
  }

  // Direct execution without confirmation
  const result = await pipe(
    req.services.portfolio.executeLendingOperation('withdraw', params),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (txResult) => {
        req.services.socket.sendTransactionUpdate(
          walletAddress,
          txResult.txHash,
          'pending'
        );
        return TE.of({ success: true, data: txResult });
      }
    )
  )();

  res.json(result);
});

/**
 * POST /api/portfolio/liquidity/add
 * Add liquidity to a pool
 */
router.post('/liquidity/add', [
  body('walletAddress').isEthereumAddress().withMessage('Valid wallet address required'),
  body('token0').isEthereumAddress().withMessage('Valid token0 address required'),
  body('token1').isEthereumAddress().withMessage('Valid token1 address required'),
  body('fee').isNumeric().withMessage('Fee must be numeric'),
  body('amount0Desired').isNumeric().withMessage('Amount0 must be numeric'),
  body('amount1Desired').isNumeric().withMessage('Amount1 must be numeric'),
  body('tickLower').isNumeric().withMessage('TickLower must be numeric'),
  body('tickUpper').isNumeric().withMessage('TickUpper must be numeric')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { 
    walletAddress, 
    token0, 
    token1, 
    fee, 
    amount0Desired, 
    amount1Desired, 
    tickLower, 
    tickUpper 
  } = req.body;

  const liquidityParams = {
    token0,
    token1,
    fee: parseInt(fee),
    tickLower: parseInt(tickLower),
    tickUpper: parseInt(tickUpper),
    amount0Desired: BigInt(Math.floor(parseFloat(amount0Desired) * 1e18)),
    amount1Desired: BigInt(Math.floor(parseFloat(amount1Desired) * 1e18)),
    amount0Min: 0n,
    amount1Min: 0n,
    deadline: Math.floor(Date.now() / 1000) + 300 // 5 minutes
  };

  const result = await pipe(
    req.services.portfolio.executeLiquidityOperation('addLiquidity', liquidityParams),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (txResult) => {
        req.services.socket.sendTransactionUpdate(
          walletAddress,
          txResult.txHash,
          'pending'
        );
        return TE.of({ success: true, data: txResult });
      }
    )
  )();

  res.json(result);
});

/**
 * POST /api/portfolio/liquidity/remove
 * Remove liquidity from a position
 */
router.post('/liquidity/remove', [
  body('walletAddress').isEthereumAddress().withMessage('Valid wallet address required'),
  body('positionId').notEmpty().withMessage('Position ID is required'),
  body('liquidity').isNumeric().withMessage('Liquidity must be numeric')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { walletAddress, positionId, liquidity } = req.body;

  const removeParams = {
    positionId,
    liquidity: BigInt(liquidity),
    amount0Min: 0n,
    amount1Min: 0n,
    deadline: Math.floor(Date.now() / 1000) + 300
  };

  const result = await pipe(
    req.services.portfolio.executeLiquidityOperation('removeLiquidity', removeParams),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (txResult) => {
        req.services.socket.sendTransactionUpdate(
          walletAddress,
          txResult.txHash,
          'pending'
        );
        return TE.of({ success: true, data: txResult });
      }
    )
  )();

  res.json(result);
});

/**
 * POST /api/portfolio/liquidity/collect
 * Collect fees from a liquidity position
 */
router.post('/liquidity/collect', [
  body('walletAddress').isEthereumAddress().withMessage('Valid wallet address required'),
  body('positionId').notEmpty().withMessage('Position ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { walletAddress, positionId } = req.body;

  const collectParams = {
    positionId,
    amount0Max: 2n ** 128n - 1n, // Max uint128
    amount1Max: 2n ** 128n - 1n
  };

  const result = await pipe(
    req.services.portfolio.executeLiquidityOperation('collectFees', collectParams),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (txResult) => {
        req.services.socket.sendTransactionUpdate(
          walletAddress,
          txResult.txHash,
          'pending'
        );
        return TE.of({ success: true, data: txResult });
      }
    )
  )();

  res.json(result);
});

export { router as portfolioRouter };