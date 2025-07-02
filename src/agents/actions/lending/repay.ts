import { Action, HandlerCallback, IAgentRuntime, Memory, State } from '@ai16z/eliza';

export interface RepayParams {
  borrowId?: string;
  protocol?: string;
  asset?: string;
  amount?: number; // If not specified, repays entire debt
}

export interface RepayResult {
  success: boolean;
  txHash?: string;
  borrowId: string;
  protocol: string;
  asset: string;
  amountRepaid: number;
  remainingDebt: number;
  interestPaid: number;
  collateralReleased?: boolean;
  collateralAmount?: number;
  collateralAsset?: string;
  error?: string;
}

export const repayAction: Action = {
  name: "REPAY",
  similes: ["repay", "payback", "return", "settle debt", "pay loan"],
  description: "Repay borrowed assets to a lending protocol",
  
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const params = message.content as any;
    
    // Must have either borrowId or protocol+asset
    if (!params.borrowId && (!params.protocol || !params.asset)) {
      return false;
    }
    
    // If amount specified, must be positive
    if (params.amount !== undefined && (typeof params.amount !== 'number' || params.amount <= 0)) {
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
    const params = message.content as RepayParams;
    
    try {
      // Find the borrow position
      const borrowPositions = state.borrowPositions || [];
      let borrowPosition: any;
      
      if (params.borrowId) {
        borrowPosition = borrowPositions.find((p: any) => p.id === params.borrowId);
      } else if (params.protocol && params.asset) {
        // Find the most recent borrow position matching protocol and asset
        borrowPosition = borrowPositions
          .filter((p: any) => 
            p.protocol === params.protocol.toLowerCase() && 
            p.borrowedAsset === params.asset.toUpperCase()
          )
          .sort((a: any, b: any) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime())[0];
      }
      
      if (!borrowPosition) {
        callback({
          text: "Borrow position not found. Please check your borrow ID or protocol/asset combination.",
          action: "REPAY_FAILED"
        });
        return;
      }
      
      // Calculate interest accrued
      const timeHeld = Date.now() - new Date(borrowPosition.entryTime).getTime();
      const daysHeld = timeHeld / (1000 * 60 * 60 * 24);
      const interestAccrued = borrowPosition.borrowedAmount * (borrowPosition.borrowAPY / 100) * (daysHeld / 365);
      const totalDebt = borrowPosition.borrowedAmount + interestAccrued;
      
      // Calculate repayment amount
      const repayAmount = params.amount || totalDebt;
      
      if (repayAmount > totalDebt * 1.1) { // Allow 10% buffer for safety
        callback({
          text: `Repayment amount ${repayAmount} ${borrowPosition.borrowedAsset} exceeds total debt of ${totalDebt.toFixed(2)} ${borrowPosition.borrowedAsset}. Adjusting to full repayment.`,
          action: "REPAY_ADJUSTMENT"
        });
      }
      
      const actualRepayAmount = Math.min(repayAmount, totalDebt);
      const isFullRepayment = actualRepayAmount >= totalDebt * 0.999; // Allow for rounding
      
      // Execute repayment
      const repayResult = await executeRepayment(
        borrowPosition.protocol,
        borrowPosition.borrowedAsset,
        actualRepayAmount,
        borrowPosition.id,
        isFullRepayment
      );
      
      if (!repayResult.success) {
        callback({
          text: `Repayment failed: ${repayResult.error}`,
          action: "REPAY_FAILED"
        });
        return;
      }
      
      // Calculate proportional interest paid
      const proportionalInterest = (actualRepayAmount / totalDebt) * interestAccrued;
      const principalRepaid = actualRepayAmount - proportionalInterest;
      
      // Update agent state
      const updatedBorrowPositions = borrowPositions.map((p: any) => {
        if (p.id === borrowPosition.id) {
          if (isFullRepayment) {
            // Full repayment - mark as closed
            return { 
              ...p, 
              borrowedAmount: 0, 
              closed: true, 
              closedAt: new Date(),
              totalInterestPaid: interestAccrued
            };
          } else {
            // Partial repayment - reduce amount
            return { 
              ...p, 
              borrowedAmount: p.borrowedAmount - principalRepaid,
              lastRepayment: new Date()
            };
          }
        }
        return p;
      }).filter((p: any) => !p.closed || p.closedAt); // Keep closed positions for history
      
      await updateAgentState(runtime, {
        lastAction: 'repay',
        lastActionTime: new Date(),
        borrowPositions: updatedBorrowPositions,
        totalInterestPaid: (state.totalInterestPaid || 0) + proportionalInterest
      });
      
      // Prepare response
      const response: RepayResult = {
        success: true,
        txHash: repayResult.txHash,
        borrowId: borrowPosition.id,
        protocol: borrowPosition.protocol,
        asset: borrowPosition.borrowedAsset,
        amountRepaid: actualRepayAmount,
        remainingDebt: isFullRepayment ? 0 : totalDebt - actualRepayAmount,
        interestPaid: proportionalInterest,
        collateralReleased: isFullRepayment,
        collateralAmount: isFullRepayment ? borrowPosition.collateralAmount : undefined,
        collateralAsset: isFullRepayment ? borrowPosition.collateralAsset : undefined
      };
      
      let responseText = `Successfully repaid ${actualRepayAmount.toFixed(2)} ${borrowPosition.borrowedAsset} to ${borrowPosition.protocol}. Interest paid: ${proportionalInterest.toFixed(2)} ${borrowPosition.borrowedAsset}.`;
      
      if (isFullRepayment) {
        responseText += ` Loan fully repaid! ${borrowPosition.collateralAmount} ${borrowPosition.collateralAsset} collateral has been released.`;
      } else {
        responseText += ` Remaining debt: ${response.remainingDebt.toFixed(2)} ${borrowPosition.borrowedAsset}.`;
      }
      
      responseText += ` Transaction: ${repayResult.txHash}`;
      
      callback({
        text: responseText,
        action: "REPAY_SUCCESS",
        data: response
      });
      
    } catch (error) {
      callback({
        text: `Unexpected error during repayment: ${error.message}`,
        action: "REPAY_ERROR"
      });
    }
  },
  
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Repay my USDC loan on Aave" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "I'll repay your USDC loan on Aave. Calculating total amount due including interest...",
          action: "REPAY"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Pay back 500 DAI to Compound" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "Processing partial repayment of 500 DAI to Compound...",
          action: "REPAY"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Settle my debt for borrow ID compound_borrow_1234567890" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "Settling your full debt for the specified borrow position...",
          action: "REPAY"
        }
      }
    ]
  ]
};

// Helper functions

async function executeRepayment(
  protocol: string,
  asset: string,
  amount: number,
  borrowId: string,
  isFullRepayment: boolean
): Promise<any> {
  // Simulated repayment - in production, this would interact with smart contracts
  await new Promise(resolve => setTimeout(resolve, 1800)); // Simulate transaction time
  
  // Simulate occasional failures
  if (Math.random() < 0.03) {
    return {
      success: false,
      error: "Insufficient balance for repayment. Please ensure you have enough funds."
    };
  }
  
  return {
    success: true,
    txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
    gasUsed: isFullRepayment ? 220000 : 180000
  };
}

async function updateAgentState(runtime: IAgentRuntime, updates: any): Promise<void> {
  const currentState = runtime.character?.settings?.state || {};
  const newState = { ...currentState, ...updates };
  
  if (runtime.character?.settings) {
    runtime.character.settings.state = newState;
  }
}

export default repayAction;