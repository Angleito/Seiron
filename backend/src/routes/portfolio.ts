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

  const result = await req.services.portfolio.getPortfolioData(walletAddress)();

  if (result._tag === 'Left') {
    return res.json({ success: false, error: result.left.message });
  }

  res.json({ success: true, data: result.right });

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

  const result = await req.services.portfolio.getPortfolioSummary(walletAddress)();

  if (result._tag === 'Left') {
    return res.json({ success: false, error: result.left.message });
  }

  res.json({ success: true, data: result.right });

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
    const result = await req.services.portfolio.createPendingLendingOperation('supply', params)();

    if (result._tag === 'Left') {
      return res.json({ success: false, error: result.left.message });
    }

    return res.json({ 
      success: true, 
      data: result.right,
      requiresConfirmation: true 
    });

    return res.json(result);
  }

  // Direct execution without confirmation (backward compatibility)
  const result = await req.services.portfolio.executeLendingOperation('supply', params)();

  if (result._tag === 'Left') {
    return res.json({ success: false, error: result.left.message });
  }

  // Send real-time update
  req.services.socket.sendTransactionUpdate(
    walletAddress,
    result.right.txHash,
    'pending'
  );
  
  res.json({ success: true, data: result.right });

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
  const transactionResult = await req.services.confirmation.getPendingTransaction(transactionId)();

  if (transactionResult._tag === 'Left') {
    return res.status(400).json({ 
      success: false, 
      error: transactionResult.left.message 
    });
  }

  const transaction = transactionResult.right as any; // Type assertion for pending transaction
  
  // Validate transaction access
  if (transaction.walletAddress !== walletAddress) {
    return res.status(403).json({ 
      success: false, 
      error: 'Unauthorized' 
    });
  }
  
  if (transaction.status !== 'confirmed') {
    return res.status(400).json({ 
      success: false, 
      error: 'Transaction not confirmed' 
    });
  }
  
  const result = await req.services.portfolio.executeLendingOperation(
    transaction.action as 'supply',
    transaction.parameters,
    transactionId
  )();

  if (result._tag === 'Left') {
    return res.json({ success: false, error: result.left.message });
  }

  req.services.socket.sendTransactionUpdate(
    walletAddress,
    result.right.txHash,
    'pending'
  );
  
  res.json({ success: true, data: result.right });

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
    const result = await req.services.portfolio.createPendingLendingOperation('withdraw', params)();

    if (result._tag === 'Left') {
      return res.json({ success: false, error: result.left.message });
    }

    return res.json({ 
      success: true, 
      data: result.right,
      requiresConfirmation: true 
    });

    return res.json(result);
  }

  // Direct execution without confirmation
  const result = await req.services.portfolio.executeLendingOperation('withdraw', params)();

  if (result._tag === 'Left') {
    return res.json({ success: false, error: result.left.message });
  }

  req.services.socket.sendTransactionUpdate(
    walletAddress,
    result.right.txHash,
    'pending'
  );
  
  res.json({ success: true, data: result.right });

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

  const result = await req.services.portfolio.executeLiquidityOperation('addLiquidity', liquidityParams)();

  if (result._tag === 'Left') {
    return res.json({ success: false, error: result.left.message });
  }

  req.services.socket.sendTransactionUpdate(
    walletAddress,
    result.right.txHash,
    'pending'
  );
  
  res.json({ success: true, data: result.right });

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

  const result = await req.services.portfolio.executeLiquidityOperation('removeLiquidity', removeParams)();

  if (result._tag === 'Left') {
    return res.json({ success: false, error: result.left.message });
  }

  req.services.socket.sendTransactionUpdate(
    walletAddress,
    result.right.txHash,
    'pending'
  );
  
  res.json({ success: true, data: result.right });

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

  const result = await req.services.portfolio.executeLiquidityOperation('collectFees', collectParams)();

  if (result._tag === 'Left') {
    return res.json({ success: false, error: result.left.message });
  }

  req.services.socket.sendTransactionUpdate(
    walletAddress,
    result.right.txHash,
    'pending'
  );
  
  res.json({ success: true, data: result.right });

  res.json(result);
});

export { router as portfolioRouter };