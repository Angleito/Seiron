import { Either } from 'fp-ts/Either';
import { TaskEither } from 'fp-ts/TaskEither';
import { BaseAgent, AgentConfig, AgentError, ActionContext, ActionResult } from '../base/BaseAgent';
export interface SAKTool {
    name: string;
    description: string;
    parameters: Record<string, any>;
    execute: (params: Record<string, any>) => Promise<any>;
    category: 'blockchain' | 'defi' | 'trading' | 'analysis' | 'utility';
    permission?: 'read' | 'write' | 'admin';
    rateLimit?: {
        maxCalls: number;
        windowMs: number;
    };
}
export interface SAKOperationResult<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    metadata?: {
        gasUsed?: number;
        txHash?: string;
        blockNumber?: number;
        timestamp?: number;
    };
}
export interface SAKContext {
    userId?: string;
    walletAddress?: string;
    chainId?: number;
    network: 'mainnet' | 'testnet' | 'devnet';
    permissions: string[];
    sessionId?: string;
    metadata?: Record<string, any>;
}
export interface SAKIntegrationConfig {
    seiRpcUrl: string;
    seiEvmRpcUrl: string;
    chainId: string;
    network: 'mainnet' | 'testnet' | 'devnet';
    defaultPermissions: string[];
    walletPrivateKey?: string;
    walletMnemonic?: string;
    apiKeys?: {
        takara?: string;
        symphony?: string;
        dragonswap?: string;
        silo?: string;
    };
    rateLimitConfig: {
        defaultMaxCalls: number;
        defaultWindowMs: number;
    };
    cacheConfig: {
        enabled: boolean;
        ttlMs: number;
        maxSize: number;
    };
    retryConfig: {
        maxRetries: number;
        backoffMs: number;
    };
    protocolConfigs: {
        takara: {
            enabled: boolean;
            contractAddresses: Record<string, string>;
        };
        symphony: {
            enabled: boolean;
            contractAddresses: Record<string, string>;
        };
        dragonswap: {
            enabled: boolean;
            contractAddresses: Record<string, string>;
        };
        silo: {
            enabled: boolean;
            contractAddresses: Record<string, string>;
        };
    };
}
export interface ToolRegistrationBridge {
    registerTool: (tool: SAKTool) => Either<AgentError, void>;
    unregisterTool: (toolName: string) => Either<AgentError, void>;
    getTool: (toolName: string) => Either<AgentError, SAKTool>;
    listTools: () => Either<AgentError, SAKTool[]>;
    getToolsByCategory: (category: string) => Either<AgentError, SAKTool[]>;
}
export interface OperationBridge {
    execute: <T>(toolName: string, params: Record<string, any>, context: SAKContext) => TaskEither<AgentError, SAKOperationResult<T>>;
    executeWithValidation: <T>(toolName: string, params: Record<string, any>, context: SAKContext) => TaskEither<AgentError, SAKOperationResult<T>>;
    executeBatch: <T>(operations: Array<{
        toolName: string;
        params: Record<string, any>;
    }>, context: SAKContext) => TaskEither<AgentError, Array<SAKOperationResult<T>>>;
}
export interface ContextBridge {
    mapActionContextToSAK: (actionContext: ActionContext) => Either<AgentError, SAKContext>;
    mapSAKResultToActionResult: <T>(sakResult: SAKOperationResult<T>) => Either<AgentError, ActionResult>;
    enrichContext: (context: SAKContext, enrichments: Record<string, any>) => SAKContext;
    validateContext: (context: SAKContext) => Either<AgentError, void>;
}
export interface ErrorBridge {
    mapSAKError: (error: any) => AgentError;
    mapAgentError: (error: AgentError) => any;
    isRecoverableError: (error: any) => boolean;
    createRetryStrategy: (error: any) => Either<AgentError, RetryStrategy>;
}
export interface RetryStrategy {
    maxRetries: number;
    backoffMs: number;
    exponentialBackoff: boolean;
    retryCondition: (error: any, attempt: number) => boolean;
}
export declare class SeiAgentKitAdapter extends BaseAgent {
    private readonly sakConfig;
    private readonly toolRegistry;
    private readonly operationBridge;
    private readonly contextBridge;
    private readonly errorBridge;
    private readonly toolRegistrationBridge;
    private readonly cache;
    private readonly rateLimiters;
    private publicClient?;
    private walletClient?;
    private cosmWasmClient?;
    private signingCosmWasmClient?;
    private takaraAdapter?;
    private symphonyAdapter?;
    private dragonswapAdapter?;
    private siloAdapter?;
    constructor(config: AgentConfig, sakConfig: SAKIntegrationConfig);
    registerSAKTool(tool: SAKTool): Either<AgentError, void>;
    executeSAKTool<T>(toolName: string, params: Record<string, any>, context?: Partial<SAKContext>): TaskEither<AgentError, SAKOperationResult<T>>;
    executeSAKBatch<T>(operations: Array<{
        toolName: string;
        params: Record<string, any>;
    }>, context?: Partial<SAKContext>): TaskEither<AgentError, Array<SAKOperationResult<T>>>;
    getSAKTools(): Either<AgentError, SAKTool[]>;
    getSAKToolsByCategory(category: string): Either<AgentError, SAKTool[]>;
    installSAKPlugin(): TaskEither<AgentError, void>;
    private registerSAKActions;
    private handleExecuteSAKTool;
    private handleExecuteSAKBatch;
    private handleListSAKTools;
    private handleGetSAKToolInfo;
    private createSAKContext;
    private initializeSAKPlugin;
    private cleanupSAKPlugin;
    private initializeSAKConnection;
    private loadDefaultSAKTools;
    private setupRateLimiters;
    private setupCache;
    private initializeProtocolAdapters;
    private generateSAKTools;
    private generateTokenTools;
    private generateTakaraTools;
    private generateSymphonyTools;
    private generateDragonSwapTools;
    private generateSiloTools;
    private getFromCache;
    private setInCache;
    private executeGetTokenBalance;
    private executeGetNativeBalance;
    private executeTransferToken;
    private executeApproveToken;
    private executeTakaraSupply;
    private executeTakaraWithdraw;
    private executeTakaraBorrow;
    private executeTakaraRepay;
    private executeTakaraGetUserData;
    private executeTakaraGetReserveData;
    private executeTakaraGetHealthFactor;
    private executeSymphonySwap;
    private executeSymphonyGetQuote;
    private executeSymphonyGetRoutes;
    private executeDragonSwapAddLiquidity;
    private executeDragonSwapRemoveLiquidity;
    private executeDragonSwapGetPoolInfo;
    private executeSiloStake;
    private executeSiloUnstake;
    private executeSiloClaimRewards;
    private executeSiloGetStakingInfo;
    private checkRateLimit;
    protected initialize(): TaskEither<AgentError, void>;
    protected cleanup(): TaskEither<AgentError, void>;
    getToolRegistry(): Map<string, SAKTool>;
    getSAKConfig(): SAKIntegrationConfig;
    getRateLimiters(): Map<string, RateLimiter>;
    getCacheInstance(): Map<string, CacheEntry>;
    getOperationBridge(): OperationBridge;
    getContextBridge(): ContextBridge;
    getErrorBridge(): ErrorBridge;
}
interface CacheEntry {
    data: any;
    expiresAt: number;
}
declare class RateLimiter {
    private maxCalls;
    private windowMs;
    private calls;
    constructor(maxCalls: number, windowMs: number);
    canExecute(): boolean;
    recordExecution(): void;
    private cleanupOldCalls;
}
export declare const createSeiAgentKitAdapter: (agentConfig: AgentConfig, sakConfig: SAKIntegrationConfig) => SeiAgentKitAdapter;
export declare const DEFAULT_SAK_CONFIGS: Record<string, Partial<SAKIntegrationConfig>>;
export declare const mergeSAKConfig: (baseConfig: Partial<SAKIntegrationConfig>, userConfig: Partial<SAKIntegrationConfig>) => SAKIntegrationConfig;
export { SAKTool, SAKOperationResult, SAKContext, SAKIntegrationConfig, ToolRegistrationBridge, OperationBridge, ContextBridge, ErrorBridge, RetryStrategy };
//# sourceMappingURL=SeiAgentKitAdapter.d.ts.map