const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const _ = require('lodash');

const app = express();
const PORT = process.env.PORT || 8001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data
const mockTokens = {
  'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2': {
    address: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
    symbol: 'SEI',
    name: 'Sei Network',
    decimals: 6,
    verified: true,
    logoURI: 'https://assets.coingecko.com/coins/images/28205/large/Sei_Logo.png'
  },
  'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6': {
    address: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    verified: true,
    logoURI: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png'
  },
  'sei1weth7z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6': {
    address: 'sei1weth7z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
    symbol: 'WETH',
    name: 'Wrapped Ethereum',
    decimals: 18,
    verified: true,
    logoURI: 'https://assets.coingecko.com/coins/images/2518/large/weth.png'
  }
};

const mockPools = [
  {
    address: 'sei1pool1z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
    protocol: 'symphony',
    token0: mockTokens['sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2'],
    token1: mockTokens['sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6'],
    fee: 0.003,
    liquidity: '1000000000',
    sqrtPriceX96: '79228162514264337593543950336'
  },
  {
    address: 'sei1pool2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
    protocol: 'symphony',
    token0: mockTokens['sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6'],
    token1: mockTokens['sei1weth7z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6'],
    fee: 0.003,
    liquidity: '500000000',
    sqrtPriceX96: '79228162514264337593543950336'
  }
];

// Helper functions
const calculateSwapOutput = (inputAmount, reserves0, reserves1, fee = 0.003) => {
  const inputAmountWithFee = inputAmount * (1 - fee);
  const outputAmount = (inputAmountWithFee * reserves1) / (reserves0 + inputAmountWithFee);
  return Math.floor(outputAmount * 0.99); // Add some slippage
};

const generateRoute = (tokenIn, tokenOut, amountIn) => {
  const routeId = uuidv4();
  const timestamp = Date.now();
  
  // Find direct pool or create multi-hop route
  const directPool = mockPools.find(pool => 
    (pool.token0.address === tokenIn && pool.token1.address === tokenOut) ||
    (pool.token1.address === tokenIn && pool.token0.address === tokenOut)
  );

  if (directPool) {
    // Direct route
    const inputToken = mockTokens[tokenIn];
    const outputToken = mockTokens[tokenOut];
    const reserves0 = parseFloat(directPool.liquidity) / 2;
    const reserves1 = parseFloat(directPool.liquidity) / 2;
    const outputAmount = calculateSwapOutput(parseFloat(amountIn), reserves0, reserves1, directPool.fee);
    
    return {
      id: routeId,
      inputToken,
      outputToken,
      inputAmount: amountIn,
      outputAmount: outputAmount.toString(),
      priceImpact: 0.02,
      executionPrice: (outputAmount / parseFloat(amountIn)).toString(),
      midPrice: (outputAmount / parseFloat(amountIn)).toString(),
      minimumAmountOut: Math.floor(outputAmount * 0.995).toString(),
      maximumAmountIn: Math.ceil(parseFloat(amountIn) * 1.005).toString(),
      routes: [{
        protocol: 'symphony',
        poolAddress: directPool.address,
        tokenIn: inputToken,
        tokenOut: outputToken,
        amountIn: amountIn,
        amountOut: outputAmount.toString(),
        fee: directPool.fee,
        sqrtPriceX96After: directPool.sqrtPriceX96
      }],
      gasEstimate: '150000',
      fees: {
        protocolFee: (parseFloat(amountIn) * 0.0003).toString(),
        gasFee: '0.01',
        liquidityProviderFee: (parseFloat(amountIn) * 0.0027).toString(),
        totalFee: (parseFloat(amountIn) * 0.003).toString()
      }
    };
  } else {
    // Multi-hop route via USDC
    const inputToken = mockTokens[tokenIn];
    const outputToken = mockTokens[tokenOut];
    const intermediateToken = mockTokens['sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6'];
    
    const step1Amount = parseFloat(amountIn) * 0.5; // Simulate intermediate conversion
    const step2Amount = step1Amount * 0.98; // Account for slippage
    
    return {
      id: routeId,
      inputToken,
      outputToken,
      inputAmount: amountIn,
      outputAmount: step2Amount.toString(),
      priceImpact: 0.05,
      executionPrice: (step2Amount / parseFloat(amountIn)).toString(),
      midPrice: (step2Amount / parseFloat(amountIn)).toString(),
      minimumAmountOut: Math.floor(step2Amount * 0.995).toString(),
      maximumAmountIn: Math.ceil(parseFloat(amountIn) * 1.005).toString(),
      routes: [
        {
          protocol: 'symphony',
          poolAddress: mockPools[0].address,
          tokenIn: inputToken,
          tokenOut: intermediateToken,
          amountIn: amountIn,
          amountOut: step1Amount.toString(),
          fee: 0.003,
          sqrtPriceX96After: mockPools[0].sqrtPriceX96
        },
        {
          protocol: 'symphony',
          poolAddress: mockPools[1].address,
          tokenIn: intermediateToken,
          tokenOut: outputToken,
          amountIn: step1Amount.toString(),
          amountOut: step2Amount.toString(),
          fee: 0.003,
          sqrtPriceX96After: mockPools[1].sqrtPriceX96
        }
      ],
      gasEstimate: '250000',
      fees: {
        protocolFee: (parseFloat(amountIn) * 0.0006).toString(),
        gasFee: '0.02',
        liquidityProviderFee: (parseFloat(amountIn) * 0.0054).toString(),
        totalFee: (parseFloat(amountIn) * 0.006).toString()
      }
    };
  }
};

// API Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
});

app.get('/tokens', (req, res) => {
  res.json({
    tokens: Object.values(mockTokens),
    timestamp: Date.now()
  });
});

app.get('/tokens/:address', (req, res) => {
  const token = mockTokens[req.params.address];
  if (!token) {
    return res.status(404).json({ error: 'Token not found' });
  }
  res.json({ token, timestamp: Date.now() });
});

app.get('/pools', (req, res) => {
  res.json({
    pools: mockPools,
    timestamp: Date.now()
  });
});

app.post('/quote', (req, res) => {
  const { tokenIn, tokenOut, amountIn, slippagePercent = 0.5 } = req.body;
  
  if (!tokenIn || !tokenOut || !amountIn) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  if (!mockTokens[tokenIn] || !mockTokens[tokenOut]) {
    return res.status(400).json({ error: 'Invalid token address' });
  }
  
  try {
    const route = generateRoute(tokenIn, tokenOut, amountIn);
    const timestamp = Date.now();
    
    res.json({
      route,
      timestamp,
      validUntil: timestamp + 60000, // 1 minute
      slippageAdjustedAmountOut: Math.floor(parseFloat(route.outputAmount) * (1 - slippagePercent / 100)).toString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate quote' });
  }
});

app.post('/routes', (req, res) => {
  const { tokenIn, tokenOut, amountIn, maxRoutes = 3 } = req.body;
  
  if (!tokenIn || !tokenOut || !amountIn) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  try {
    const routes = [];
    for (let i = 0; i < Math.min(maxRoutes, 3); i++) {
      const route = generateRoute(tokenIn, tokenOut, amountIn);
      route.id = uuidv4(); // Generate unique ID for each route
      route.outputAmount = (parseFloat(route.outputAmount) * (1 - i * 0.01)).toString(); // Slightly different amounts
      routes.push(route);
    }
    
    const bestRoute = routes[0];
    
    res.json({
      routes,
      bestRoute,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate routes' });
  }
});

app.post('/execute', (req, res) => {
  const { tokenIn, tokenOut, amountIn, amountOutMinimum, recipient, routeId } = req.body;
  
  if (!tokenIn || !tokenOut || !amountIn || !amountOutMinimum || !recipient) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  // Simulate execution delay
  setTimeout(() => {
    const route = generateRoute(tokenIn, tokenOut, amountIn);
    const txHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    
    res.json({
      txHash,
      route,
      actualAmountIn: amountIn,
      actualAmountOut: route.outputAmount,
      gasUsed: route.gasEstimate,
      effectiveGasPrice: '0.000000020',
      timestamp: Date.now()
    });
  }, 1000 + Math.random() * 2000); // 1-3 second delay
});

app.post('/gas-estimate', (req, res) => {
  const { tokenIn, tokenOut, amountIn, routeId } = req.body;
  
  if (!tokenIn || !tokenOut || !amountIn) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  const route = generateRoute(tokenIn, tokenOut, amountIn);
  
  res.json({
    gasLimit: route.gasEstimate,
    gasPrice: '0.000000020',
    estimatedCost: '0.003',
    confidence: 0.95
  });
});

app.get('/analytics', (req, res) => {
  res.json({
    volume24h: '1000000',
    fees24h: '3000',
    transactionCount24h: 5000,
    uniqueUsers24h: 1200,
    averageSlippage: 0.02,
    topPairs: [
      { pair: 'SEI/USDC', volume: '500000', fees: '1500' },
      { pair: 'USDC/WETH', volume: '300000', fees: '900' },
      { pair: 'SEI/WETH', volume: '200000', fees: '600' }
    ]
  });
});

app.get('/stats', (req, res) => {
  res.json({
    totalValueLocked: '50000000',
    volume24h: '1000000',
    fees24h: '3000',
    activeRoutes: 12,
    supportedTokens: Object.keys(mockTokens).length
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Symphony Mock Server running on port ${PORT}`);
});