const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const _ = require('lodash');

const app = express();
const PORT = process.env.PORT || 8002;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data
const mockAssets = {
  'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2': {
    address: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
    symbol: 'SEI',
    name: 'Sei Network',
    decimals: 6,
    supplyAPY: 5.2,
    borrowAPY: 8.5,
    totalSupply: '10000000',
    totalBorrow: '6000000',
    liquidationThreshold: 0.8,
    collateralFactor: 0.75,
    reserveFactor: 0.1,
    utilizationRate: 0.6,
    cash: '4000000',
    oracle: 'sei1oracle1z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
    price: '0.5'
  },
  'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6': {
    address: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    supplyAPY: 3.8,
    borrowAPY: 6.2,
    totalSupply: '50000000',
    totalBorrow: '35000000',
    liquidationThreshold: 0.85,
    collateralFactor: 0.8,
    reserveFactor: 0.05,
    utilizationRate: 0.7,
    cash: '15000000',
    oracle: 'sei1oracle2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
    price: '1.0'
  },
  'sei1weth7z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6': {
    address: 'sei1weth7z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
    symbol: 'WETH',
    name: 'Wrapped Ethereum',
    decimals: 18,
    supplyAPY: 4.5,
    borrowAPY: 7.8,
    totalSupply: '1000000',
    totalBorrow: '700000',
    liquidationThreshold: 0.82,
    collateralFactor: 0.77,
    reserveFactor: 0.08,
    utilizationRate: 0.7,
    cash: '300000',
    oracle: 'sei1oracle3z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
    price: '2400'
  }
};

// Mock user positions
const mockPositions = {};

// Helper functions
const calculateHealthFactor = (collateral, debt, liquidationThreshold) => {
  if (debt === 0) return 999999; // Max health factor
  return (collateral * liquidationThreshold) / debt;
};

const calculateAPY = (principal, rate, time = 1) => {
  return principal * (1 + rate) ** time - principal;
};

const generateLendingPosition = (userAddress, assetAddress, amount, type = 'supply') => {
  const asset = mockAssets[assetAddress];
  if (!asset) throw new Error('Asset not found');
  
  const position = {
    id: uuidv4(),
    userAddress,
    assetAddress,
    asset,
    type,
    amount,
    shares: amount, // Simplified 1:1 ratio
    timestamp: Date.now(),
    lastUpdate: Date.now(),
    accruedInterest: '0',
    apy: type === 'supply' ? asset.supplyAPY : asset.borrowAPY
  };
  
  return position;
};

const updateUserPosition = (userAddress, assetAddress, amount, type) => {
  if (!mockPositions[userAddress]) {
    mockPositions[userAddress] = { supplies: {}, borrows: {} };
  }
  
  const positionKey = type === 'supply' ? 'supplies' : 'borrows';
  
  if (!mockPositions[userAddress][positionKey][assetAddress]) {
    mockPositions[userAddress][positionKey][assetAddress] = {
      amount: '0',
      shares: '0',
      lastUpdate: Date.now()
    };
  }
  
  const currentAmount = parseFloat(mockPositions[userAddress][positionKey][assetAddress].amount);
  const newAmount = currentAmount + parseFloat(amount);
  
  mockPositions[userAddress][positionKey][assetAddress] = {
    amount: newAmount.toString(),
    shares: newAmount.toString(),
    lastUpdate: Date.now()
  };
  
  return mockPositions[userAddress][positionKey][assetAddress];
};

const getUserHealthFactor = (userAddress) => {
  const userPosition = mockPositions[userAddress];
  if (!userPosition) return 999999;
  
  let totalCollateral = 0;
  let totalDebt = 0;
  
  // Calculate total collateral value
  Object.entries(userPosition.supplies || {}).forEach(([assetAddress, position]) => {
    const asset = mockAssets[assetAddress];
    if (asset) {
      const value = parseFloat(position.amount) * parseFloat(asset.price);
      totalCollateral += value * asset.collateralFactor;
    }
  });
  
  // Calculate total debt value
  Object.entries(userPosition.borrows || {}).forEach(([assetAddress, position]) => {
    const asset = mockAssets[assetAddress];
    if (asset) {
      const value = parseFloat(position.amount) * parseFloat(asset.price);
      totalDebt += value;
    }
  });
  
  return calculateHealthFactor(totalCollateral, totalDebt, 0.8);
};

// API Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
});

app.get('/assets', (req, res) => {
  res.json({
    assets: Object.values(mockAssets),
    timestamp: Date.now()
  });
});

app.get('/assets/:address', (req, res) => {
  const asset = mockAssets[req.params.address];
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }
  res.json({ asset, timestamp: Date.now() });
});

app.get('/markets', (req, res) => {
  const markets = Object.values(mockAssets).map(asset => ({
    ...asset,
    marketSize: parseFloat(asset.totalSupply) * parseFloat(asset.price),
    availableLiquidity: parseFloat(asset.cash) * parseFloat(asset.price),
    utilizationRate: asset.utilizationRate
  }));
  
  res.json({
    markets,
    totalMarketSize: markets.reduce((sum, market) => sum + market.marketSize, 0),
    timestamp: Date.now()
  });
});

app.post('/supply', (req, res) => {
  const { userAddress, assetAddress, amount } = req.body;
  
  if (!userAddress || !assetAddress || !amount) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  const asset = mockAssets[assetAddress];
  if (!asset) {
    return res.status(400).json({ error: 'Invalid asset address' });
  }
  
  try {
    const position = generateLendingPosition(userAddress, assetAddress, amount, 'supply');
    updateUserPosition(userAddress, assetAddress, amount, 'supply');
    
    const txHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    
    res.json({
      txHash,
      position,
      healthFactor: getUserHealthFactor(userAddress),
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/withdraw', (req, res) => {
  const { userAddress, assetAddress, amount } = req.body;
  
  if (!userAddress || !assetAddress || !amount) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  const asset = mockAssets[assetAddress];
  if (!asset) {
    return res.status(400).json({ error: 'Invalid asset address' });
  }
  
  try {
    const position = generateLendingPosition(userAddress, assetAddress, `-${amount}`, 'withdraw');
    updateUserPosition(userAddress, assetAddress, `-${amount}`, 'supply');
    
    const txHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    
    res.json({
      txHash,
      position,
      healthFactor: getUserHealthFactor(userAddress),
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/borrow', (req, res) => {
  const { userAddress, assetAddress, amount } = req.body;
  
  if (!userAddress || !assetAddress || !amount) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  const asset = mockAssets[assetAddress];
  if (!asset) {
    return res.status(400).json({ error: 'Invalid asset address' });
  }
  
  // Check if borrow would maintain healthy position
  const currentHealthFactor = getUserHealthFactor(userAddress);
  if (currentHealthFactor < 1.2) {
    return res.status(400).json({ error: 'Insufficient collateral for borrow' });
  }
  
  try {
    const position = generateLendingPosition(userAddress, assetAddress, amount, 'borrow');
    updateUserPosition(userAddress, assetAddress, amount, 'borrow');
    
    const txHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    
    res.json({
      txHash,
      position,
      healthFactor: getUserHealthFactor(userAddress),
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/repay', (req, res) => {
  const { userAddress, assetAddress, amount } = req.body;
  
  if (!userAddress || !assetAddress || !amount) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  const asset = mockAssets[assetAddress];
  if (!asset) {
    return res.status(400).json({ error: 'Invalid asset address' });
  }
  
  try {
    const position = generateLendingPosition(userAddress, assetAddress, `-${amount}`, 'repay');
    updateUserPosition(userAddress, assetAddress, `-${amount}`, 'borrow');
    
    const txHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    
    res.json({
      txHash,
      position,
      healthFactor: getUserHealthFactor(userAddress),
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/positions/:userAddress', (req, res) => {
  const { userAddress } = req.params;
  const userPosition = mockPositions[userAddress];
  
  if (!userPosition) {
    return res.json({
      userAddress,
      supplies: {},
      borrows: {},
      healthFactor: 999999,
      totalCollateral: 0,
      totalDebt: 0,
      timestamp: Date.now()
    });
  }
  
  const healthFactor = getUserHealthFactor(userAddress);
  
  // Calculate totals
  let totalCollateral = 0;
  let totalDebt = 0;
  
  Object.entries(userPosition.supplies || {}).forEach(([assetAddress, position]) => {
    const asset = mockAssets[assetAddress];
    if (asset) {
      totalCollateral += parseFloat(position.amount) * parseFloat(asset.price);
    }
  });
  
  Object.entries(userPosition.borrows || {}).forEach(([assetAddress, position]) => {
    const asset = mockAssets[assetAddress];
    if (asset) {
      totalDebt += parseFloat(position.amount) * parseFloat(asset.price);
    }
  });
  
  res.json({
    userAddress,
    supplies: userPosition.supplies || {},
    borrows: userPosition.borrows || {},
    healthFactor,
    totalCollateral,
    totalDebt,
    timestamp: Date.now()
  });
});

app.get('/analytics', (req, res) => {
  const totalSupply = Object.values(mockAssets).reduce((sum, asset) => 
    sum + parseFloat(asset.totalSupply) * parseFloat(asset.price), 0);
  
  const totalBorrow = Object.values(mockAssets).reduce((sum, asset) => 
    sum + parseFloat(asset.totalBorrow) * parseFloat(asset.price), 0);
  
  res.json({
    totalSupply: totalSupply.toString(),
    totalBorrow: totalBorrow.toString(),
    utilizationRate: totalBorrow / totalSupply,
    uniqueUsers: Object.keys(mockPositions).length,
    avgHealthFactor: Object.keys(mockPositions).reduce((sum, userAddress) => 
      sum + getUserHealthFactor(userAddress), 0) / Math.max(Object.keys(mockPositions).length, 1),
    topAssets: Object.values(mockAssets)
      .sort((a, b) => parseFloat(b.totalSupply) - parseFloat(a.totalSupply))
      .slice(0, 5)
      .map(asset => ({
        symbol: asset.symbol,
        totalSupply: asset.totalSupply,
        supplyAPY: asset.supplyAPY,
        borrowAPY: asset.borrowAPY
      }))
  });
});

app.post('/liquidate', (req, res) => {
  const { borrower, assetBorrow, assetCollateral, amount } = req.body;
  
  if (!borrower || !assetBorrow || !assetCollateral || !amount) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  const healthFactor = getUserHealthFactor(borrower);
  
  if (healthFactor >= 1.0) {
    return res.status(400).json({ error: 'Position is healthy, cannot liquidate' });
  }
  
  const txHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
  
  res.json({
    txHash,
    borrower,
    assetBorrow,
    assetCollateral,
    amountLiquidated: amount,
    collateralSeized: (parseFloat(amount) * 1.05).toString(), // 5% liquidation bonus
    healthFactorAfter: 1.1,
    timestamp: Date.now()
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Takara Mock Server running on port ${PORT}`);
});