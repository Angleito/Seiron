import { Action } from "@elizaos/core";
import { TaskEither, tryCatch, chain, map } from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import { parseEther } from "ethers";
import { State } from "@elizaos/core";

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
        name: "user",
        content: { text: "Deposit 1000 USDC to Yei Finance" }
      },
      {
        name: "assistant",
        content: {
          text: "I'll deposit 1000 USDC to Yei Finance for you.",
          action: "DEPOSIT_LENDING"
        }
      }
    ],
    [
      {
        name: "user",
        content: { text: "Supply 5 ETH to the lending pool" }
      },
      {
        name: "assistant",
        content: {
          text: "Depositing 5 ETH to the lending pool.",
          action: "DEPOSIT_LENDING"
        }
      }
    ]
  ],
  validate: async (runtime, message) => {
    try {
      const text = message.content.text;
      if (!text) return false;
      
      // Parse parameters from text like "Deposit 1000 USDC to Yei Finance"
      const match = text.match(/(?:deposit|supply|lend)\s+(\d+(?:\.\d+)?)\s+(\w+)/i);
      if (!match) return false;
      
      const amount = parseFloat(match[1]);
      const asset = match[2];
      
      if (isNaN(amount) || amount <= 0) {
        return false;
      }
      
      // Check if asset is supported (now includes Takara assets)
      const supportedAssets = ["USDC", "ETH", "WETH", "DAI", "USDT", "SEI", "iSEI", "fastUSD", "uBTC"];
      if (!supportedAssets.includes(asset.toUpperCase())) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  },
  handler: async (runtime, message, state) => {
    // Parse parameters from text
    const text = message.content.text;
    const match = text.match(/(?:deposit|supply|lend)\s+(\d+(?:\.\d+)?)\s+(\w+)(?:\s+to\s+(\w+))?/i);
    
    const params: DepositParams = {
      amount: match![1],
      asset: match![2].toUpperCase(),
      protocol: match?.[3]?.toLowerCase() as 'yei' | 'takara' | 'auto' | undefined
    };
    
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
            const amountInWei = parseEther(params.amount) / BigInt(10 ** (18 - decimals));
            
            // Check allowance first
            const allowance = await lendingManager.checkAllowance(params.asset);
            if (allowance.lt(amountInWei)) {
              await lendingManager.approve(params.asset, amountInWei);
            }
            
            // Execute deposit
            const tx = await lendingManager.deposit(
              params.asset,
              amountInWei,
              params.onBehalfOf || (message as any).userId
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
              newBalance: await lendingManager.getSupplyBalance(params.asset, (message as any).userId)
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
        success: false,
        text: `Failed to deposit: ${result.left.message}`,
        error: true
      };
    }
    
    return {
      success: true,
      ...result.right
    };
  }
};