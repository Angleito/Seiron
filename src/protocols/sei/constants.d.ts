export declare const SYMPHONY_ADDRESSES: {
    readonly ROUTER: "0x0000000000000000000000000000000000000010";
    readonly QUOTER: "0x0000000000000000000000000000000000000011";
    readonly FACTORY: "0x0000000000000000000000000000000000000012";
    readonly MULTICALL: "0x0000000000000000000000000000000000000013";
    readonly ANALYTICS: "0x0000000000000000000000000000000000000014";
};
export declare const SYMPHONY_API: {
    readonly BASE_URL: "https://api.symphony.sei.io";
    readonly VERSION: "v1";
    readonly ENDPOINTS: {
        readonly QUOTE: "/quote";
        readonly SWAP: "/swap";
        readonly ROUTES: "/routes";
        readonly GAS_ESTIMATE: "/gas-estimate";
        readonly ANALYTICS: "/analytics";
        readonly TOKENS: "/tokens";
        readonly PROTOCOLS: "/protocols";
        readonly HEALTH: "/health";
    };
    readonly TIMEOUT: 10000;
    readonly RATE_LIMIT: 100;
};
export declare const SUPPORTED_PROTOCOLS: readonly ["dragonswap", "astroport", "fin", "levana", "kujira", "white-whale", "wyndex"];
export declare const SYMPHONY_FEE_TIERS: {
    readonly STABLE: 1;
    readonly LOW: 5;
    readonly MEDIUM: 30;
    readonly HIGH: 100;
    readonly VOLATILE: 300;
};
export declare const SLIPPAGE_LEVELS: {
    readonly VERY_LOW: 0.1;
    readonly LOW: 0.5;
    readonly MEDIUM: 1;
    readonly HIGH: 2;
    readonly VERY_HIGH: 5;
};
export declare const SYMPHONY_GAS_LIMITS: {
    readonly SIMPLE_SWAP: 150000;
    readonly MULTI_HOP_SWAP: 300000;
    readonly QUOTE: 50000;
    readonly ROUTE_DISCOVERY: 100000;
    readonly CROSS_PROTOCOL: 500000;
};
export declare const ROUTE_OPTIMIZATION: {
    readonly MAX_HOPS: 4;
    readonly MIN_LIQUIDITY: "1000";
    readonly MAX_PRICE_IMPACT: 3;
    readonly ROUTE_TIMEOUT: 5000;
    readonly REFRESH_INTERVAL: 30000;
};
export declare const SYMPHONY_TOKENS: {
    readonly SEI: {
        readonly address: "0x0000000000000000000000000000000000000000";
        readonly symbol: "SEI";
        readonly name: "Sei";
        readonly decimals: 18;
        readonly verified: true;
    };
    readonly USDC: {
        readonly address: "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1";
        readonly symbol: "USDC";
        readonly name: "USD Coin";
        readonly decimals: 6;
        readonly verified: true;
    };
    readonly USDT: {
        readonly address: "0x43D8814FdFB9B8854422Df13F1c66e34E4fa91fD";
        readonly symbol: "USDT";
        readonly name: "Tether USD";
        readonly decimals: 6;
        readonly verified: true;
    };
    readonly WETH: {
        readonly address: "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7";
        readonly symbol: "WETH";
        readonly name: "Wrapped Ethereum";
        readonly decimals: 18;
        readonly verified: true;
    };
    readonly WBTC: {
        readonly address: "0x3BDCEf9e656fD9D03eA98605946b4fbF87C5c412";
        readonly symbol: "WBTC";
        readonly name: "Wrapped Bitcoin";
        readonly decimals: 8;
        readonly verified: true;
    };
    readonly ATOM: {
        readonly address: "0x27292cf0016E5dF1d8b37306B2A98588aCbD6fCA";
        readonly symbol: "ATOM";
        readonly name: "Cosmos";
        readonly decimals: 6;
        readonly verified: true;
    };
    readonly OSMO: {
        readonly address: "0x74C0C58B99b68cF16A717279AC2d056D6FaF1935";
        readonly symbol: "OSMO";
        readonly name: "Osmosis";
        readonly decimals: 6;
        readonly verified: true;
    };
};
export declare const POPULAR_PAIRS: readonly [{
    readonly tokenA: "SEI";
    readonly tokenB: "USDC";
    readonly fee: 30;
}, {
    readonly tokenA: "SEI";
    readonly tokenB: "USDT";
    readonly fee: 30;
}, {
    readonly tokenA: "USDC";
    readonly tokenB: "USDT";
    readonly fee: 1;
}, {
    readonly tokenA: "WETH";
    readonly tokenB: "USDC";
    readonly fee: 30;
}, {
    readonly tokenA: "WBTC";
    readonly tokenB: "USDC";
    readonly fee: 30;
}, {
    readonly tokenA: "ATOM";
    readonly tokenB: "SEI";
    readonly fee: 100;
}, {
    readonly tokenA: "OSMO";
    readonly tokenB: "SEI";
    readonly fee: 100;
}];
export declare const SYMPHONY_LIMITS: {
    readonly MIN_TRADE_AMOUNT: "1";
    readonly MAX_TRADE_AMOUNT: "10000000";
    readonly MAX_ROUTES_PER_QUERY: 10;
    readonly MAX_HOPS_PER_ROUTE: 4;
    readonly QUOTE_VALIDITY_DURATION: 30000;
    readonly ROUTE_CACHE_DURATION: 60000;
};
export declare const SYMPHONY_ERROR_MESSAGES: {
    readonly NETWORK_ERROR: "Network request failed";
    readonly INVALID_TOKEN: "Invalid token address";
    readonly INSUFFICIENT_LIQUIDITY: "Insufficient liquidity for swap";
    readonly SLIPPAGE_EXCEEDED: "Slippage tolerance exceeded";
    readonly ROUTE_NOT_FOUND: "No route found for swap";
    readonly QUOTE_EXPIRED: "Quote has expired";
    readonly GAS_ESTIMATION_FAILED: "Gas estimation failed";
    readonly VALIDATION_FAILED: "Swap validation failed";
    readonly EXECUTION_FAILED: "Swap execution failed";
    readonly TIMEOUT: "Operation timeout";
    readonly RATE_LIMIT_EXCEEDED: "Rate limit exceeded";
    readonly PROTOCOL_UNAVAILABLE: "Protocol temporarily unavailable";
};
export declare const ANALYTICS_METRICS: {
    readonly VOLUME_24H: "volume_24h";
    readonly FEES_24H: "fees_24h";
    readonly TRANSACTIONS_24H: "transactions_24h";
    readonly UNIQUE_USERS_24H: "unique_users_24h";
    readonly AVERAGE_SLIPPAGE: "average_slippage";
    readonly TOP_PAIRS: "top_pairs";
    readonly PROTOCOL_STATS: "protocol_stats";
};
export declare const RISK_PARAMETERS: {
    readonly LOW_RISK: {
        readonly maxPriceImpact: 0.5;
        readonly maxSlippage: 1;
        readonly minLiquidity: "100000";
        readonly maxHops: 2;
    };
    readonly MEDIUM_RISK: {
        readonly maxPriceImpact: 2;
        readonly maxSlippage: 2;
        readonly minLiquidity: "50000";
        readonly maxHops: 3;
    };
    readonly HIGH_RISK: {
        readonly maxPriceImpact: 5;
        readonly maxSlippage: 5;
        readonly minLiquidity: "10000";
        readonly maxHops: 4;
    };
};
export declare const CACHE_CONFIG: {
    readonly QUOTE_CACHE_DURATION: 30000;
    readonly ROUTE_CACHE_DURATION: 60000;
    readonly TOKEN_CACHE_DURATION: 3600000;
    readonly PROTOCOL_CACHE_DURATION: 1800000;
    readonly ANALYTICS_CACHE_DURATION: 300000;
};
export declare const SYMPHONY_ABI_FRAGMENTS: {
    readonly ROUTER: readonly ["function exactInputSingle(address,address,uint256,uint256,address,uint256) external returns (uint256)", "function exactInput(bytes,uint256,uint256,address,uint256) external returns (uint256)", "function exactOutputSingle(address,address,uint256,uint256,address,uint256) external returns (uint256)", "function exactOutput(bytes,uint256,uint256,address,uint256) external returns (uint256)"];
    readonly QUOTER: readonly ["function quoteExactInputSingle(address,address,uint256,uint256) external returns (uint256)", "function quoteExactInput(bytes,uint256) external returns (uint256)", "function quoteExactOutputSingle(address,address,uint256,uint256) external returns (uint256)", "function quoteExactOutput(bytes,uint256) external returns (uint256)"];
};
export declare const SYMPHONY_FEATURES: {
    readonly ROUTE_OPTIMIZATION: true;
    readonly MULTI_PROTOCOL_ROUTING: true;
    readonly REAL_TIME_QUOTES: true;
    readonly SLIPPAGE_PROTECTION: true;
    readonly GAS_OPTIMIZATION: true;
    readonly IMPACT_ANALYSIS: true;
    readonly HISTORICAL_DATA: true;
    readonly ANALYTICS_INTEGRATION: true;
};
//# sourceMappingURL=constants.d.ts.map