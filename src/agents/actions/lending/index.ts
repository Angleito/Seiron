import { Action } from "@elizaos/core";
import { Contract, ethers } from "ethers";
import { TaskEither, tryCatch, map, chain } from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import { getProvider, getSigner } from "../common/web3";
import { formatUnits, parseUnits } from "../common/utils";
import { LENDING_POOL_ABI, ERC20_ABI } from "../common/abis";

// Action implementations
import { depositAction } from "./deposit";

// Withdraw Action
export const withdrawAction: Action = {
  name: "WITHDRAW_LENDING",
  description: "Withdraw assets from lending protocol",
  similes: ["withdraw", "remove", "take out", "redeem"],
  validate: async (runtime, message) => {
    const { asset, amount } = message.content as any;
    return !!(asset && amount && parseFloat(amount) > 0);
  },
  handler: async (runtime, message, state) => {
    const { asset, amount } = message.content as any;
    
    const result = await pipe(
      tryCatch(
        async () => {
          const signer = await getSigner();
          const lendingPool = new Contract(
            state.contracts.lendingPool,
            LENDING_POOL_ABI,
            signer
          );
          
          const decimals = asset === "USDC" || asset === "USDT" ? 6 : 18;
          const amountWei = parseUnits(amount, decimals);
          
          const tx = await lendingPool.withdraw(
            state.tokens[asset],
            amountWei,
            await signer.getAddress()
          );
          
          const receipt = await tx.wait();
          
          return {
            success: true,
            txHash: receipt.transactionHash,
            amount,
            asset
          };
        },
        (error: unknown) => error as Error
      ),
      map(result => ({
        text: `Successfully withdrew ${amount} ${asset}. Tx: ${result.txHash}`,
        data: result
      }))
    )();
    
    if (result._tag === "Left") {
      return {
        success: false,
        text: `Failed to withdraw: ${result.left.message}`,
        error: true
      };
    }
    
    return {
      success: true,
      ...result.right
    };
  }
};

// Borrow Action
export const borrowAction: Action = {
  name: "BORROW_LENDING",
  description: "Borrow assets using collateral",
  similes: ["borrow", "take loan", "leverage"],
  validate: async (runtime, message) => {
    const { asset, amount } = message.content as any;
    return !!(asset && amount && parseFloat(amount) > 0);
  },
  handler: async (runtime, message, state) => {
    const { asset, amount, interestRateMode = 2 } = message.content as any;
    
    const result = await pipe(
      tryCatch(
        async () => {
          const signer = await getSigner();
          const lendingPool = new Contract(
            state.contracts.lendingPool,
            LENDING_POOL_ABI,
            signer
          );
          
          // Check health factor before borrowing
          const userAddress = await signer.getAddress();
          const userData = await lendingPool.getUserAccountData(userAddress);
          const healthFactor = formatUnits(userData.healthFactor, 18);
          
          if (parseFloat(healthFactor) < 1.5) {
            throw new Error(`Health factor too low: ${healthFactor}. Must be > 1.5`);
          }
          
          const decimals = asset === "USDC" || asset === "USDT" ? 6 : 18;
          const amountWei = parseUnits(amount, decimals);
          
          const tx = await lendingPool.borrow(
            state.tokens[asset],
            amountWei,
            interestRateMode, // 1 = stable, 2 = variable
            0, // referral code
            userAddress
          );
          
          const receipt = await tx.wait();
          
          return {
            success: true,
            txHash: receipt.transactionHash,
            amount,
            asset,
            healthFactor: healthFactor
          };
        },
        (error: unknown) => error as Error
      ),
      map(result => ({
        text: `Borrowed ${amount} ${asset}. Health Factor: ${result.healthFactor}. Tx: ${result.txHash}`,
        data: result
      }))
    )();
    
    if (result._tag === "Left") {
      return {
        success: false,
        text: `Failed to borrow: ${result.left.message}`,
        error: true
      };
    }
    
    return {
      success: true,
      ...result.right
    };
  }
};

// Repay Action
export const repayAction: Action = {
  name: "REPAY_LENDING",
  description: "Repay borrowed assets",
  similes: ["repay", "pay back", "return loan"],
  validate: async (runtime, message) => {
    const { asset, amount } = message.content as any;
    return !!(asset && amount && parseFloat(amount) > 0);
  },
  handler: async (runtime, message, state) => {
    const { asset, amount, interestRateMode = 2 } = message.content as any;
    
    const result = await pipe(
      tryCatch(
        async () => {
          const signer = await getSigner();
          const provider = await getProvider();
          const lendingPool = new Contract(
            state.contracts.lendingPool,
            LENDING_POOL_ABI,
            signer
          );
          
          const tokenAddress = state.tokens[asset];
          const token = new Contract(tokenAddress, ERC20_ABI, signer);
          
          const decimals = asset === "USDC" || asset === "USDT" ? 6 : 18;
          const amountWei = parseUnits(amount, decimals);
          
          // Approve spending
          const approveTx = await token.approve(
            state.contracts.lendingPool,
            amountWei
          );
          await approveTx.wait();
          
          // Repay
          const tx = await lendingPool.repay(
            tokenAddress,
            amountWei,
            interestRateMode,
            await signer.getAddress()
          );
          
          const receipt = await tx.wait();
          
          return {
            success: true,
            txHash: receipt.transactionHash,
            amount,
            asset
          };
        },
        (error: unknown) => error as Error
      ),
      map(result => ({
        text: `Successfully repaid ${amount} ${asset}. Tx: ${result.txHash}`,
        data: result
      }))
    )();
    
    if (result._tag === "Left") {
      return {
        success: false,
        text: `Failed to repay: ${result.left.message}`,
        error: true
      };
    }
    
    return {
      success: true,
      ...result.right
    };
  }
};

// Get Health Factor
export const getHealthFactorAction: Action = {
  name: "GET_HEALTH_FACTOR",
  description: "Check lending position health factor",
  similes: ["health factor", "liquidation risk", "position health"],
  validate: async () => true,
  handler: async (runtime, message, state) => {
    const result = await pipe(
      tryCatch(
        async () => {
          const signer = await getSigner();
          const lendingPool = new Contract(
            state.contracts.lendingPool,
            LENDING_POOL_ABI,
            signer
          );
          
          const userAddress = await signer.getAddress();
          const userData = await lendingPool.getUserAccountData(userAddress);
          
          const healthFactor = formatUnits(userData.healthFactor, 18);
          const totalCollateralETH = formatUnits(userData.totalCollateralETH, 18);
          const totalDebtETH = formatUnits(userData.totalDebtETH, 18);
          const availableBorrowsETH = formatUnits(userData.availableBorrowsETH, 18);
          
          return {
            healthFactor,
            totalCollateralETH,
            totalDebtETH,
            availableBorrowsETH,
            ltv: formatUnits(userData.ltv, 2),
            liquidationThreshold: formatUnits(userData.currentLiquidationThreshold, 2)
          };
        },
        (error: unknown) => error as Error
      ),
      map(result => ({
        text: `Health Factor: ${result.healthFactor}
               Total Collateral: ${result.totalCollateralETH} ETH
               Total Debt: ${result.totalDebtETH} ETH
               Available to Borrow: ${result.availableBorrowsETH} ETH
               LTV: ${result.ltv}%
               Liquidation at: ${result.liquidationThreshold}%`,
        data: result
      }))
    )();
    
    if (result._tag === "Left") {
      return {
        success: false,
        text: `Failed to get health factor: ${result.left.message}`,
        error: true
      };
    }
    
    return {
      success: true,
      ...result.right
    };
  }
};

// Monitor Position
export const monitorPositionAction: Action = {
  name: "MONITOR_LENDING_POSITION",
  description: "Monitor lending position and send alerts",
  similes: ["monitor position", "watch health", "track lending"],
  validate: async () => true,
  handler: async (runtime, message, state) => {
    const { alertThreshold = 1.5 } = message.content as any;
    
    const result = await pipe(
      tryCatch(
        async () => {
          const checkHealth = async () => {
            const healthResult = await getHealthFactorAction.handler(runtime, message, state) as any;
            const healthFactor = parseFloat(healthResult.data.healthFactor);
            
            if (healthFactor < alertThreshold) {
              // Send alert
              if (state.emit) {
                state.emit('alert', {
                  type: 'HEALTH_FACTOR_LOW',
                  healthFactor,
                  threshold: alertThreshold,
                  message: `Health factor ${healthFactor} is below threshold ${alertThreshold}`
                });
              }
              
              // Suggest actions
              return {
                alert: true,
                healthFactor,
                suggestions: [
                  `Repay some debt to increase health factor`,
                  `Add more collateral`,
                  `Current liquidation threshold: ${healthResult.data.liquidationThreshold}%`
                ]
              };
            }
            
            return {
              alert: false,
              healthFactor,
              message: "Position is healthy"
            };
          };
          
          // Set up monitoring interval
          const intervalId = setInterval(checkHealth, 60000); // Check every minute
          
          // Store interval ID for cleanup
          state.monitors = state.monitors || {};
          state.monitors.lending = intervalId;
          
          // Do initial check
          const initialCheck = await checkHealth();
          
          return {
            monitoring: true,
            interval: "1 minute",
            initialCheck
          };
        },
        (error: unknown) => error as Error
      ),
      map(result => ({
        text: `Monitoring lending position. Initial health factor: ${result.initialCheck.healthFactor}`,
        data: result
      }))
    )();
    
    if (result._tag === "Left") {
      return {
        success: false,
        text: `Failed to start monitoring: ${result.left.message}`,
        error: true
      };
    }
    
    return {
      success: true,
      ...result.right
    };
  }
};

// Export all actions
export const lendingActions: Action[] = [
  depositAction,
  withdrawAction,
  borrowAction,
  repayAction,
  getHealthFactorAction,
  monitorPositionAction
];

// Export individual actions for direct import
export { depositAction };
export const deposit = depositAction;
export const withdraw = withdrawAction;
export const borrow = borrowAction;
export const repay = repayAction;
export const getHealthFactor = getHealthFactorAction;
