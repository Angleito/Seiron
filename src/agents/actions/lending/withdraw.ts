import { Action, HandlerCallback, IAgentRuntime, Memory, State } from '@ai16z/eliza';

export interface WithdrawParams {
  positionId?: string;
  protocol?: string;
  asset?: string;
  amount?: number; // If not specified, withdraws entire position
}

export interface WithdrawResult {
  success: boolean;
  txHash?: string;
  positionId: string;
  protocol: string;
  asset: string;
  amountWithdrawn: number;
  earnings: number;
  totalReceived: number;
  error?: string;
}

export const withdrawAction: Action = {
  name: "WITHDRAW",
  similes: ["withdraw", "redeem", "exit", "remove", "unstake"],
  description: "Withdraw assets from a lending protocol position",
  
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const params = message.content as any;
    
    // Must have either positionId or protocol+asset
    if (!params.positionId && (!params.protocol || !params.asset)) {
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
    const params = message.content as WithdrawParams;
    
    try {
      // Find the position to withdraw
      const positions = state.positions || [];
      let position: any;
      
      if (params.positionId) {
        position = positions.find((p: any) => p.id === params.positionId);
      } else if (params.protocol && params.asset) {
        // Find the most recent position matching protocol and asset
        position = positions
          .filter((p: any) => 
            p.protocol === params.protocol.toLowerCase() && 
            p.asset === params.asset.toUpperCase()
          )
          .sort((a: any, b: any) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime())[0];
      }
      
      if (!position) {
        callback({
          text: "Position not found. Please check your position ID or protocol/asset combination.",
          action: "WITHDRAW_FAILED"
        });
        return;
      }
      
      // Calculate withdrawal amount
      const withdrawAmount = params.amount || position.amount;
      
      if (withdrawAmount > position.amount) {
        callback({
          text: `Cannot withdraw ${withdrawAmount} ${position.asset}. Position only has ${position.amount} ${position.asset}.`,
          action: "WITHDRAW_VALIDATION_FAILED"
        });
        return;
      }
      
      // Calculate earnings
      const timeHeld = Date.now() - new Date(position.entryTime).getTime();
      const daysHeld = timeHeld / (1000 * 60 * 60 * 24);
      const earnings = position.amount * (position.apy / 100) * (daysHeld / 365);
      const proportionalEarnings = (withdrawAmount / position.amount) * earnings;
      
      // Execute withdrawal
      const withdrawResult = await executeWithdrawal(
        position.protocol,
        position.asset,
        withdrawAmount,
        position.id
      );
      
      if (!withdrawResult.success) {
        callback({
          text: `Withdrawal failed: ${withdrawResult.error}`,
          action: "WITHDRAW_FAILED"
        });
        return;
      }
      
      // Update agent state
      const updatedPositions = positions.map((p: any) => {
        if (p.id === position.id) {
          if (withdrawAmount >= position.amount) {
            // Full withdrawal - mark as closed
            return { ...p, amount: 0, closed: true, closedAt: new Date() };
          } else {
            // Partial withdrawal - reduce amount
            return { ...p, amount: p.amount - withdrawAmount };
          }
        }
        return p;
      }).filter((p: any) => !p.closed || p.closedAt); // Keep closed positions for history
      
      await updateAgentState(runtime, {
        lastAction: 'withdraw',
        lastActionTime: new Date(),
        positions: updatedPositions,
        totalEarnings: (state.totalEarnings || 0) + proportionalEarnings
      });
      
      // Prepare response
      const response: WithdrawResult = {
        success: true,
        txHash: withdrawResult.txHash,
        positionId: position.id,
        protocol: position.protocol,
        asset: position.asset,
        amountWithdrawn: withdrawAmount,
        earnings: proportionalEarnings,
        totalReceived: withdrawAmount + proportionalEarnings
      };
      
      callback({
        text: `Successfully withdrew ${withdrawAmount} ${position.asset} from ${position.protocol}. Earnings: ${proportionalEarnings.toFixed(2)} ${position.asset}. Total received: ${response.totalReceived.toFixed(2)} ${position.asset}. Transaction: ${withdrawResult.txHash}`,
        action: "WITHDRAW_SUCCESS",
        data: response
      });
      
    } catch (error) {
      callback({
        text: `Unexpected error during withdrawal: ${error.message}`,
        action: "WITHDRAW_ERROR"
      });
    }
  },
  
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Withdraw my USDC from Aave" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "I'll withdraw your USDC position from Aave. Processing the withdrawal...",
          action: "WITHDRAW"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Withdraw 500 DAI from position compound_DAI_1234567890" }
      },
      {
        user: "{{agent}}",
        content: { 
          text: "Withdrawing 500 DAI from your Compound position...",
          action: "WITHDRAW"
        }
      }
    ]
  ]
};

// Helper functions

async function executeWithdrawal(
  protocol: string,
  asset: string,
  amount: number,
  positionId: string
): Promise<any> {
  // Simulated withdrawal - in production, this would interact with smart contracts
  await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate transaction time
  
  // Simulate occasional failures
  if (Math.random() < 0.05) {
    return {
      success: false,
      error: "Protocol temporarily unavailable. Please try again."
    };
  }
  
  return {
    success: true,
    txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
    gasUsed: 180000
  };
}

async function updateAgentState(runtime: IAgentRuntime, updates: any): Promise<void> {
  const currentState = runtime.character?.settings?.state || {};
  const newState = { ...currentState, ...updates };
  
  if (runtime.character?.settings) {
    runtime.character.settings.state = newState;
  }
}

export default withdrawAction;