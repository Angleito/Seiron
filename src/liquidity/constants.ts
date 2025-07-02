// DragonSwap V2 Contract Addresses (Sei Network)
export const DRAGONSWAP_V2_ADDRESSES = {
  FACTORY: '0x0000000000000000000000000000000000000001', // Placeholder
  POSITION_MANAGER: '0x0000000000000000000000000000000000000002', // Placeholder
  QUOTER: '0x0000000000000000000000000000000000000003', // Placeholder
  ROUTER: '0x0000000000000000000000000000000000000004', // Placeholder
  MULTICALL: '0x0000000000000000000000000000000000000005', // Placeholder
} as const;

// Supported fee tiers (in hundredths of a bip)
export const FEE_TIERS = {
  LOWEST: 100,  // 0.01%
  LOW: 500,     // 0.05%
  MEDIUM: 3000, // 0.3%
  HIGH: 10000,  // 1%
} as const;

// Tick spacing for each fee tier
export const TICK_SPACINGS = {
  [FEE_TIERS.LOWEST]: 1,
  [FEE_TIERS.LOW]: 10,
  [FEE_TIERS.MEDIUM]: 60,
  [FEE_TIERS.HIGH]: 200,
} as const;

// Common token addresses on Sei
export const SEI_TOKENS = {
  SEI: '0x0000000000000000000000000000000000000000', // Native SEI
  USDC: '0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1', // USDC on Sei
  USDT: '0x43D8814FdFB9B8854422Df13F1c66e34E4fa91fD', // USDT on Sei  
  WETH: '0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7', // Wrapped ETH
  WBTC: '0x3BDCEf9e656fD9D03eA98605946b4fbF87C5c412', // Wrapped BTC
  ATOM: '0x27292cf0016E5dF1d8b37306B2A98588aCbD6fCA', // Cosmos ATOM
} as const;

// Pool configurations for major pairs
export const MAJOR_POOLS = [
  {
    token0: SEI_TOKENS.SEI,
    token1: SEI_TOKENS.USDC,
    fee: FEE_TIERS.MEDIUM,
    tickSpacing: TICK_SPACINGS[FEE_TIERS.MEDIUM],
  },
  {
    token0: SEI_TOKENS.USDC,
    token1: SEI_TOKENS.USDT,
    fee: FEE_TIERS.LOWEST,
    tickSpacing: TICK_SPACINGS[FEE_TIERS.LOWEST],
  },
  {
    token0: SEI_TOKENS.WETH,
    token1: SEI_TOKENS.USDC,
    fee: FEE_TIERS.MEDIUM,
    tickSpacing: TICK_SPACINGS[FEE_TIERS.MEDIUM],
  },
] as const;

// Mathematical constants
export const Q96 = 2n ** 96n;
export const Q128 = 2n ** 128n;
export const Q192 = 2n ** 192n;

// Price bounds for safety
export const MIN_TICK = -887272;
export const MAX_TICK = 887272;

// Gas limits for different operations
export const GAS_LIMITS = {
  ADD_LIQUIDITY: 300000,
  REMOVE_LIQUIDITY: 250000,
  COLLECT_FEES: 150000,
  ADJUST_RANGE: 400000,
} as const;

// Slippage tolerances (in basis points)
export const SLIPPAGE_TOLERANCE = {
  LOW: 50,     // 0.5%
  MEDIUM: 100, // 1%
  HIGH: 300,   // 3%
} as const;