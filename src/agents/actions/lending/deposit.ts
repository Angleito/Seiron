import { Action } from "@elizaos/core";
import { TaskEither, tryCatch, chain, map } from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import { parseEther } from "ethers";
import { State, ModelClass } from "../../../types";

interface DepositParams {
  asset: string;
  amount: string;
  onBehalfOf?: string;
}

export const depositAction: Action = {
  name: "DEPOSIT_LENDING",
  description: "Deposit assets into lending protocol",
  similes: [
    "lend",
    "supply",
    "deposit to lending",
    "add to lending pool",
    "provide liquidity to lending"
  ],
  examples: [
    [
      {
        user: "user",
        content: { text: "Deposit 1000 USDC to Yei Finance" }
      },
      {
        user: "assistant",
        content: {
          text: "I'll deposit 1000 USDC to Yei Finance for you.",
          action: "DEPOSIT_LENDING"
        }
      }
    ],
    [
      {
        user: "user",
        content: { text: "Supply 5 ETH to the lending pool" }
      },
      {
        user: "assistant",
        content: {
          text: "Depositing 5 ETH to the lending pool.",
          action: "DEPOSIT_LENDING"
        }
      }
    ]
  ],
  validate: async (runtime, message) => {
    const params = message.content as DepositParams;
    
    if (!params.asset || !params.amount) {
      return false;
    }
    
    const amount = parseFloat(params.amount);
    if (isNaN(amount) || amount <= 0) {
      return false;
    }
    
    // Check if asset is supported
    const supportedAssets = ["USDC", "ETH", "WETH", "DAI", "USDT"];
    if (!supportedAssets.includes(params.asset.toUpperCase())) {
      return false;
    }
    
    return true;
  },
  handler: async (runtime, message, state) => {
    const params = message.content as DepositParams;
    
    const depositResult: TaskEither<Error, any> = pipe(
      tryCatch(
        async () => {
          // Get lending manager from state
          const lendingManager = state.managers?.lending;
          if (!lendingManager) {
            throw new Error("Lending manager not initialized");
          }
          
          // Convert amount to proper decimals
          const decimals = params.asset === "USDC" || params.asset === "USDT" ? 6 : 18;
          const amountInWei = parseEther(params.amount).div(BigInt(10 ** (18 - decimals)));
          
          // Check allowance first
          const allowance = await lendingManager.checkAllowance(params.asset);
          if (allowance.lt(amountInWei)) {
            await lendingManager.approve(params.asset, amountInWei);
          }
          
          // Execute deposit
          const tx = await lendingManager.deposit(
            params.asset,
            amountInWei,
            params.onBehalfOf || message.userId
          );
          
          // Wait for confirmation
          const receipt = await tx.wait();
          
          return {
            success: true,
            txHash: receipt.transactionHash,
            amount: params.amount,
            asset: params.asset,
            apy: await lendingManager.getDepositAPY(params.asset),
            newBalance: await lendingManager.getSupplyBalance(params.asset, message.userId)
          };
        },
        (error: unknown) => error as Error
      ),
      map(result => ({
        text: `Successfully deposited ${params.amount} ${params.asset}. 
                Transaction: ${result.txHash}
                Current APY: ${result.apy}%
                New balance: ${result.newBalance} ${params.asset}`,
        data: result
      }))
    );
    
    const result = await depositResult();
    
    if (result._tag === "Left") {
      return {
        text: `Failed to deposit: ${result.left.message}`,
        error: true
      };
    }
    
    return result.right;
  }
};