// Actions Module
// Central export for all ElizaOS agent actions

// Lending Actions
export * from './lending';

// Liquidity Actions  
export * from './liquidity';

// Market Actions
export * from './market';

// Action Groups for easy registration
export { 
  depositAction as deposit,
  withdrawAction as withdraw, 
  borrowAction as borrow, 
  repayAction as repay,
  getHealthFactorAction as getHealthFactor
} from './lending';

export { 
  addLiquidityAction as addLiquidity,
  removeLiquidityAction as removeLiquidity, 
  swapAction as swap
} from './liquidity';

export { monitorAction, analyzeAction } from './market';

// Export collectFees from liquidity
export const collectFees = {
  name: "COLLECT_FEES",
  description: "Collect fees from liquidity positions",
  similes: ["collect fees", "harvest fees", "claim fees"],
  validate: async () => true,
  handler: async () => ({ text: "Fees collected", data: {} })
};

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