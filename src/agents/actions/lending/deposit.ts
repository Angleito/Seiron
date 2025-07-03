import { Action } from "@elizaos/core";
import { TaskEither, tryCatch, chain, map } from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import { parseEther } from "ethers";
import { State, ModelClass } from "../../../types";

interface DepositParams {
  asset: string;
  amount: string;
  onBehalfOf?: string;
  protocol?: 'yei' | 'takara' | 'auto'; // Auto selects best protocol
  strategy?: 'conservative' | 'balanced' | 'aggressive';
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
    
    // Check if asset is supported (now includes Takara assets)
    const supportedAssets = ["USDC", "ETH", "WETH", "DAI", "USDT", "SEI", "iSEI", "fastUSD", "uBTC"];
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
          // Get lending agent from state for multi-protocol support
          const lendingAgent = state.agents?.lending;
          if (!lendingAgent) {
            throw new Error("Lending agent not initialized");
          }
          
          let selectedProtocol = params.protocol || 'auto';
          let protocolComparison = null;
          
          // If auto mode, compare protocols and select best
          if (selectedProtocol === 'auto') {
            const comparisonResult = await lendingAgent.executeAction('compare_protocols', {
              asset: params.asset,
              amount: parseFloat(params.amount)
            });
            
            if (comparisonResult.success) {
              protocolComparison = comparisonResult.data;
              selectedProtocol = protocolComparison.bestProtocol;
            } else {
              // Fallback to Takara if available, else Yei
              const takaraAssets = ["SEI", "iSEI", "fastUSD", "uBTC"];
              selectedProtocol = takaraAssets.includes(params.asset.toUpperCase()) ? 'takara' : 'yei';
            }
          }
          
          let result;
          
          if (selectedProtocol === 'takara') {
            // Use Takara protocol
            result = await lendingAgent.executeAction('takara_supply', {
              asset: params.asset,
              amount: parseFloat(params.amount)
            });
          } else {
            // Use Yei Finance (fallback)
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
            
            result = {
              success: true,
              txHash: receipt.transactionHash,
              amount: params.amount,
              asset: params.asset,
              protocol: 'yei',
              apy: await lendingManager.getDepositAPY(params.asset),
              newBalance: await lendingManager.getSupplyBalance(params.asset, message.userId)
            };
          }
          
          return {
            ...result,
            selectedProtocol,
            protocolComparison,
            strategy: params.strategy || 'balanced'
          };
        },
        (error: unknown) => error as Error
      ),
      map(result => {
        let responseText = `Successfully deposited ${params.amount} ${params.asset} via ${result.selectedProtocol.toUpperCase()} protocol.\n`;
        responseText += `Transaction: ${result.txHash}\n`;
        
        if (result.apy) {
          responseText += `Current APY: ${result.apy}%\n`;
        }
        
        if (result.newBalance) {
          responseText += `New balance: ${result.newBalance} ${params.asset}\n`;
        }
        
        if (result.protocolComparison) {
          responseText += `\n📊 Protocol Analysis:\n`;
          responseText += `• Selected: ${result.selectedProtocol.toUpperCase()}\n`;
          responseText += `• Reason: ${result.protocolComparison.recommendation}\n`;
          if (result.protocolComparison.alternatives.length > 1) {
            responseText += `• Alternatives: ${result.protocolComparison.alternatives.slice(1).map(a => `${a.protocol} (${a.apy.toFixed(2)}%)`).join(', ')}\n`;
          }
        }
        
        if (result.strategy) {
          responseText += `\n🎯 Strategy: ${result.strategy.charAt(0).toUpperCase() + result.strategy.slice(1)}\n`;
        }
        
        return {
          text: responseText.trim(),
          data: result
        };
      })
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