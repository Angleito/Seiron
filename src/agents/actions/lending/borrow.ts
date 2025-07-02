import { Action, HandlerCallback, IAgentRuntime, Memory, State } from '@ai16z/eliza';

export interface BorrowParams {
  protocol: string;
  asset: string;
  amount: number;
  collateralAsset: string;
  collateralAmount: number;
}

export interface BorrowResult {
  success: boolean;
  txHash?: string;
  borrowId?: string;
  protocol: string;
  borrowedAsset: string;
  borrowedAmount: number;
  collateralAsset: string;
  collateralAmount: number;
  borrowAPY: number;
  healthFactor: number;
  liquidationPrice?: number;
  error?: string;
}

export const borrowAction: Action = {
  name: "BORROW",
  similes: ["borrow", "loan", "leverage", "take loan"],
  description: "Borrow assets from a lending protocol using collateral",
  
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const params = message.content as any;
    
    // Validate required parameters
    if (!params.protocol || !params.asset || !params.amount || 
        !params.collateralAsset || !params.collateralAmount) {
      return false;
    }
    
    // Validate amounts are positive
    if (params.amount <= 0 || params.collateralAmount <= 0) {
      return false;
    }
    
    // Validate protocol is supported
    const supportedProtocols = ['aave', 'compound', 'maker'];
    if (!supportedProtocols.includes(params.protocol.toLowerCase())) {
      return false;
    }
    
    // Validate assets are supported
    const supportedAssets = ['USDC', 'USDT', 'DAI', 'ETH', 'WBTC'];
    if (!supportedAssets.includes(params.asset.toUpperCase()) || 
        !supportedAssets.includes(params.collateralAsset.toUpperCase())) {
      return false;
    }
    
    // Don't allow borrowing and collateral to be the same asset
    if (params.asset.toUpperCase() === params.collateralAsset.toUpperCase()) {
      return false;
    }
    
    return true;
  },
  
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback
  ): Promise<void> => {
    const params = message.content as BorrowParams;
    
    try {
      // Normalize inputs
      const protocol = params.protocol.toLowerCase();
      const borrowAsset = params.asset.toUpperCase();
      const collateralAsset = params.collateralAsset.toUpperCase();
      
      // Get collateral and borrow data
      const marketData = await getMarketData(protocol, borrowAsset, collateralAsset);
      
      if (!marketData.success) {
        callback({
          text: `Failed to get market data: ${marketData.error}`,
          action: "BORROW_FAILED"
        });
        return;
      }
      
      // Calculate loan-to-value ratio
      const collateralValue = params.collateralAmount * marketData.collateralPrice;
      const borrowValue = params.amount * marketData.borrowPrice;
      const ltv = borrowValue / collateralValue;
      
      // Check if LTV is within safe limits
      if (ltv > marketData.maxLTV) {
        const maxBorrowAmount = (collateralValue * marketData.maxLTV) / marketData.borrowPrice;
        callback({
          text: `Cannot borrow ${params.amount} ${borrowAsset} with ${params.collateralAmount} ${collateralAsset} as collateral. Maximum borrowable amount: ${maxBorrowAmount.toFixed(2)} ${borrowAsset} (LTV: ${(ltv * 100).toFixed(1)}% exceeds max ${(marketData.maxLTV * 100).toFixed(1)}%)`,
          action: "BORROW_VALIDATION_FAILED"
        });
        return;
      }
      
      // Calculate health factor
      const healthFactor = (collateralValue * marketData.liquidationThreshold) / borrowValue;
      
      // Warn if health factor is low
      if (healthFactor < 1.5) {
        callback({
          text: `Warning: Low health factor (${healthFactor.toFixed(2)}). Your position may be at risk of liquidation. Consider using more collateral.`,
          action: "BORROW_WARNING"
        });
      }
      
      // Calculate liquidation price
      const liquidationPrice = (borrowValue / (params.collateralAmount * marketData.liquidationThreshold));
      
      // Execute borrow transaction
      const borrowResult = await executeBorrow(
        protocol,
        borrowAsset,
        params.amount,
        collateralAsset,
        params.collateralAmount
      );
      
      if (!borrowResult.success) {
        callback({
          text: `Borrow failed: ${borrowResult.error}`,
          action: "BORROW_FAILED"
        });
        return;
      }
      
      // Update agent state
      await updateAgentState(runtime, {
        lastAction: 'borrow',
        lastActionTime: new Date(),
        borrowPositions: [
          ...(state.borrowPositions || []),
          {
            id: borrowResult.borrowId,
            protocol,
            borrowedAsset: borrowAsset,
            borrowedAmount: params.amount,
            collateralAsset,
            collateralAmount: params.collateralAmount,
            borrowAPY: marketData.borrowAPY,
            healthFactor,
            liquidationPrice,
            entryTime: new Date(),
            txHash: borrowResult.txHash
          }
        ]
      });
      
      // Prepare response
      const response: BorrowResult = {
        success: true,
        txHash: borrowResult.txHash,
        borrowId: borrowResult.borrowId,
        protocol,
        borrowedAsset: borrowAsset,
        borrowedAmount: params.amount,
        collateralAsset,
        collateralAmount: params.collateralAmount,
        borrowAPY: marketData.borrowAPY,
        healthFactor,
        liquidationPrice
      };
      
      callback({
        text: `Successfully borrowed ${params.amount} ${borrowAsset} from ${protocol} using ${params.collateralAmount} ${collateralAsset} as collateral. Borrow APY: ${marketData.borrowAPY.toFixed(2)}%. Health Factor: ${healthFactor.toFixed(2)}. Liquidation occurs if ${collateralAsset} price falls below $${liquidationPrice.toFixed(2)}. Transaction: ${borrowResult.txHash}`,
        action: "BORROW_SUCCESS",
        data: response
      });
      
    } catch (error) {
      callback({
        text: `Unexpected error during borrow: ${error.message}`,
        action: "BORROW_ERROR"
      });
    }
  },
  
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Borrow 1000 USDC using 1 ETH as collateral on Aave" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "I'll help you borrow 1000 USDC from Aave using 1 ETH as collateral. Checking market conditions...",
          action: "BORROW"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Take a loan of 5000 DAI with 3 ETH collateral on Compound" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "Processing your 5000 DAI loan request on Compound with 3 ETH collateral...",
          action: "BORROW"
        }
      }
    ]
  ]
};

// Helper functions

async function getMarketData(protocol: string, borrowAsset: string, collateralAsset: string): Promise<any> {
  // Simulated market data - in production, this would fetch from actual protocols
  const assetPrices: Record<string, number> = {
    USDC: 1,
    USDT: 1,
    DAI: 1,
    ETH: 2500,
    WBTC: 45000
  };
  
  const borrowAPYs: Record<string, Record<string, number>> = {
    aave: { USDC: 5.2, USDT: 5.0, DAI: 5.5, ETH: 3.2, WBTC: 2.8 },
    compound: { USDC: 5.8, USDT: 5.6, DAI: 6.1, ETH: 3.8, WBTC: 3.2 },
    maker: { DAI: 5.0 }
  };
  
  const ltvRatios: Record<string, Record<string, number>> = {
    aave: { ETH: 0.82, WBTC: 0.75, USDC: 0.85, USDT: 0.85, DAI: 0.85 },
    compound: { ETH: 0.75, WBTC: 0.70, USDC: 0.80, USDT: 0.80, DAI: 0.80 },
    maker: { ETH: 0.77, WBTC: 0.70 }
  };
  
  const liquidationThresholds: Record<string, Record<string, number>> = {
    aave: { ETH: 0.86, WBTC: 0.80, USDC: 0.88, USDT: 0.88, DAI: 0.88 },
    compound: { ETH: 0.83, WBTC: 0.78, USDC: 0.85, USDT: 0.85, DAI: 0.85 },
    maker: { ETH: 0.85, WBTC: 0.78 }
  };
  
  if (!borrowAPYs[protocol]?.[borrowAsset]) {
    return {
      success: false,
      error: `Protocol ${protocol} does not support borrowing ${borrowAsset}`
    };
  }
  
  if (!ltvRatios[protocol]?.[collateralAsset]) {
    return {
      success: false,
      error: `Protocol ${protocol} does not accept ${collateralAsset} as collateral`
    };
  }
  
  return {
    success: true,
    borrowAPY: borrowAPYs[protocol][borrowAsset],
    borrowPrice: assetPrices[borrowAsset],
    collateralPrice: assetPrices[collateralAsset],
    maxLTV: ltvRatios[protocol][collateralAsset],
    liquidationThreshold: liquidationThresholds[protocol][collateralAsset]
  };
}

async function executeBorrow(
  protocol: string,
  borrowAsset: string,
  amount: number,
  collateralAsset: string,
  collateralAmount: number
): Promise<any> {
  // Simulated borrow execution - in production, this would interact with smart contracts
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate transaction time
  
  return {
    success: true,
    txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
    borrowId: `${protocol}_borrow_${Date.now()}`,
    gasUsed: 250000
  };
}

async function updateAgentState(runtime: IAgentRuntime, updates: any): Promise<void> {
  const currentState = runtime.character?.settings?.state || {};
  const newState = { ...currentState, ...updates };
  
  if (runtime.character?.settings) {
    runtime.character.settings.state = newState;
  }
}

export default borrowAction;