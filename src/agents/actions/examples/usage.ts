/**
 * @fileoverview Example usage of agent actions
 * Demonstrates how to integrate DeFi actions with agents
 */

import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { 
  deposit, 
  withdraw, 
  borrow, 
  repay, 
  getHealthFactor,
  addLiquidity,
  removeLiquidity,
  swap,
  collectFees
} from '../index';
import { ActionContext } from '../../base/BaseAgent';

// Example 1: Lending Operations
async function lendingExample() {
  console.log('=== Lending Operations Example ===');
  
  // Create action context
  const context: ActionContext = {
    agentId: 'lending-agent-1',
    walletAddress: '0x1234567890123456789012345678901234567890',
    parameters: {},
    timestamp: new Date()
  };
  
  // 1. Check health factor before operations
  const healthFactorResult = await getHealthFactor(context)();
  
  if (E.isRight(healthFactorResult)) {
    console.log('Current health factor:', healthFactorResult.right.data.healthFactor);
  }
  
  // 2. Deposit USDC to earn interest
  const depositContext: ActionContext = {
    ...context,
    parameters: {
      asset: '0x4567890123456789012345678901234567890123', // USDC address
      amount: '1000', // 1000 USDC
      referralCode: 0
    }
  };
  
  const depositResult = await deposit(depositContext)();
  
  if (E.isRight(depositResult)) {
    console.log('Deposit successful:', depositResult.right.message);
    console.log('Transaction hash:', depositResult.right.data.transaction.txHash);
  } else {
    console.error('Deposit failed:', depositResult.left.message);
  }
  
  // 3. Borrow SEI against collateral
  const borrowContext: ActionContext = {
    ...context,
    parameters: {
      asset: '0x0000000000000000000000000000000000000000', // SEI address
      amount: '100', // 100 SEI
      interestRateMode: 'variable',
      referralCode: 0
    }
  };
  
  const borrowResult = await borrow(borrowContext)();
  
  if (E.isRight(borrowResult)) {
    console.log('Borrow successful:', borrowResult.right.message);
    console.log('New health factor:', borrowResult.right.data.newHealthFactor);
  }
  
  // 4. Repay borrowed amount
  const repayContext: ActionContext = {
    ...context,
    parameters: {
      asset: '0x0000000000000000000000000000000000000000', // SEI address
      amount: 'max', // Repay all
      interestRateMode: 'variable'
    }
  };
  
  const repayResult = await repay(repayContext)();
  
  if (E.isRight(repayResult)) {
    console.log('Repay successful:', repayResult.right.message);
  }
}

// Example 2: Liquidity Operations
async function liquidityExample() {
  console.log('\n=== Liquidity Operations Example ===');
  
  const context: ActionContext = {
    agentId: 'liquidity-agent-1',
    walletAddress: '0x1234567890123456789012345678901234567890',
    parameters: {},
    timestamp: new Date()
  };
  
  // 1. Add liquidity to SEI/USDC pool
  const addLiquidityContext: ActionContext = {
    ...context,
    parameters: {
      token0: '0x0000000000000000000000000000000000000000', // SEI
      token1: '0x4567890123456789012345678901234567890123', // USDC
      fee: 3000, // 0.3% fee tier
      amount0Desired: '1000', // 1000 SEI
      amount1Desired: '500', // 500 USDC
      tickLower: -60000,
      tickUpper: 60000
    }
  };
  
  const addLiquidityResult = await addLiquidity(addLiquidityContext)();
  
  if (E.isRight(addLiquidityResult)) {
    console.log('Liquidity added:', addLiquidityResult.right.message);
    const positionId = addLiquidityResult.right.data.response.positionId;
    console.log('Position ID:', positionId);
    
    // 2. Collect fees after some time
    const collectFeesContext: ActionContext = {
      ...context,
      parameters: {
        positionId
      }
    };
    
    const collectResult = await collectFees(collectFeesContext)();
    
    if (E.isRight(collectResult)) {
      console.log('Fees collected:', collectResult.right.message);
    }
    
    // 3. Remove liquidity
    const removeLiquidityContext: ActionContext = {
      ...context,
      parameters: {
        positionId,
        liquidity: 'max' // Remove all liquidity
      }
    };
    
    const removeResult = await removeLiquidity(removeLiquidityContext)();
    
    if (E.isRight(removeResult)) {
      console.log('Liquidity removed:', removeResult.right.message);
    }
  }
  
  // 4. Perform a swap
  const swapContext: ActionContext = {
    ...context,
    parameters: {
      tokenIn: '0x0000000000000000000000000000000000000000', // SEI
      tokenOut: '0x4567890123456789012345678901234567890123', // USDC
      amountIn: '100', // 100 SEI
      fee: 3000 // 0.3% fee tier
    }
  };
  
  const swapResult = await swap(swapContext)();
  
  if (E.isRight(swapResult)) {
    console.log('Swap successful:', swapResult.right.message);
    console.log('Price impact:', swapResult.right.data.priceImpact + '%');
  }
}

// Example 3: Composing Actions with Functional Programming
async function composedActionsExample() {
  console.log('\n=== Composed Actions Example ===');
  
  const context: ActionContext = {
    agentId: 'composed-agent-1',
    walletAddress: '0x1234567890123456789012345678901234567890',
    parameters: {},
    timestamp: new Date()
  };
  
  // Compose multiple actions using fp-ts
  const composedOperation = pipe(
    // First check health factor
    getHealthFactor(context),
    TE.chain((healthResult) => {
      const healthFactor = parseFloat(healthResult.data.healthFactor);
      
      // If health factor is good, proceed with deposit
      if (healthFactor > 2) {
        return deposit({
          ...context,
          parameters: {
            asset: '0x4567890123456789012345678901234567890123',
            amount: '1000'
          }
        });
      }
      
      // Otherwise, repay some debt first
      return repay({
        ...context,
        parameters: {
          asset: '0x0000000000000000000000000000000000000000',
          amount: '50',
          interestRateMode: 'variable'
        }
      });
    }),
    TE.chain(() => {
      // After deposit/repay, add liquidity
      return addLiquidity({
        ...context,
        parameters: {
          token0: '0x0000000000000000000000000000000000000000',
          token1: '0x4567890123456789012345678901234567890123',
          fee: 3000,
          amount0Desired: '500',
          amount1Desired: '250'
        }
      });
    })
  );
  
  const result = await composedOperation();
  
  if (E.isRight(result)) {
    console.log('Composed operation successful:', result.right.message);
  } else {
    console.error('Composed operation failed:', result.left.message);
  }
}

// Example 4: Error Handling and Recovery
async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===');
  
  const context: ActionContext = {
    agentId: 'error-agent-1',
    walletAddress: '0x1234567890123456789012345678901234567890',
    parameters: {},
    timestamp: new Date()
  };
  
  // Try to borrow with error recovery
  const borrowWithRecovery = pipe(
    borrow({
      ...context,
      parameters: {
        asset: '0x0000000000000000000000000000000000000000',
        amount: '10000', // Large amount that might fail
        interestRateMode: 'variable'
      }
    }),
    TE.orElse((error) => {
      console.log('Borrow failed, attempting smaller amount:', error.message);
      
      // Try with smaller amount
      return borrow({
        ...context,
        parameters: {
          asset: '0x0000000000000000000000000000000000000000',
          amount: '100', // Smaller amount
          interestRateMode: 'variable'
        }
      });
    }),
    TE.orElse((error) => {
      console.log('Still failed, checking health factor:', error.message);
      
      // Check what's wrong with health factor
      return getHealthFactor(context);
    })
  );
  
  const result = await borrowWithRecovery();
  
  if (E.isRight(result)) {
    console.log('Operation successful after recovery:', result.right.message);
  } else {
    console.error('All recovery attempts failed:', result.left.message);
  }
}

// Run examples
async function runExamples() {
  try {
    await lendingExample();
    await liquidityExample();
    await composedActionsExample();
    await errorHandlingExample();
  } catch (error) {
    console.error('Example execution error:', error);
  }
}

// Export for testing
export {
  lendingExample,
  liquidityExample,
  composedActionsExample,
  errorHandlingExample,
  runExamples
};

// Run if executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}