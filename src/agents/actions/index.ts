// Actions Module
// Central export for all ElizaOS agent actions

// Lending Actions
export * from './lending';

// Liquidity Actions  
export * from './liquidity';

// Market Actions
export * from './market';

// Action Groups for easy registration
export { depositAction, withdrawAction, borrowAction, repayAction } from './lending';
export { addLiquidityAction, removeLiquidityAction, swapAction } from './liquidity';
export { monitorAction, analyzeAction } from './market';

// Grouped exports for agent registration
export const lendingActions = [
  'deposit',
  'withdraw', 
  'borrow',
  'repay'
];

export const liquidityActions = [
  'addLiquidity',
  'removeLiquidity',
  'swap'
];

export const marketActions = [
  'monitor',
  'analyze'
];

export const allActions = [
  ...lendingActions,
  ...liquidityActions,
  ...marketActions
];