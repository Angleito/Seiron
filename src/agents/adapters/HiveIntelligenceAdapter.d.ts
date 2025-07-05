import { TaskEither } from 'fp-ts/TaskEither';
import { BaseAgent, AgentConfig, AgentError } from '../base/BaseAgent';
export interface HiveIntelligenceConfig {
    baseUrl: string;
    apiKey: string;
    version: string;
    rateLimitConfig: {
        maxRequests: number;
        windowMs: number;
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
    creditConfig: {
        trackUsage: boolean;
        maxCreditsPerQuery: number;
        alertThreshold: number;
    };
}
export interface HiveQuery {
    type: 'search' | 'analytics' | 'portfolio' | 'market' | 'credit';
    query: string;
    parameters?: Record<string, any>;
    metadata?: HiveQueryMetadata;
}
export interface HiveQueryMetadata {
    userId?: string;
    walletAddress?: string;
    chainId?: number;
    network?: string;
    maxResults?: number;
    filters?: Record<string, any>;
    timeRange?: {
        start: string;
        end: string;
    };
}
export interface HiveResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    metadata?: {
        creditsUsed: number;
        queryTime: number;
        resultCount: number;
        timestamp: number;
        queryId: string;
    };
}
export interface HiveSearchResult {
    id: string;
    title: string;
    description: string;
    type: 'transaction' | 'address' | 'token' | 'protocol' | 'event';
    chain: string;
    relevanceScore: number;
    data: Record<string, any>;
    timestamp: string;
}
export interface HiveAnalyticsResult {
    queryId: string;
    analysisType: 'portfolio' | 'market' | 'risk' | 'performance';
    insights: HiveInsight[];
    metrics: Record<string, number>;
    recommendations: HiveRecommendation[];
    timestamp: string;
}
export interface HiveInsight {
    id: string;
    type: 'trend' | 'anomaly' | 'opportunity' | 'risk' | 'correlation';
    title: string;
    description: string;
    confidence: number;
    data: Record<string, any>;
}
export interface HiveRecommendation {
    id: string;
    type: 'buy' | 'sell' | 'hold' | 'monitor' | 'optimize';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    expectedImpact: number;
    actionItems: string[];
}
export interface CreditUsage {
    totalCredits: number;
    usedCredits: number;
    remainingCredits: number;
    resetDate: string;
    queryHistory: CreditQuery[];
}
export interface CreditQuery {
    queryId: string;
    creditsUsed: number;
    queryType: string;
    timestamp: string;
}
export declare class HiveIntelligenceAdapter extends BaseAgent {
    private readonly hiveConfig;
    private readonly cache;
    private readonly rateLimiter;
    private creditUsage;
    private readonly httpClient;
    constructor(config: AgentConfig, hiveConfig: HiveIntelligenceConfig);
    search(query: string, metadata?: HiveQueryMetadata): TaskEither<AgentError, HiveResponse<HiveSearchResult[]>>;
    getAnalytics(query: string, metadata?: HiveQueryMetadata): TaskEither<AgentError, HiveResponse<HiveAnalyticsResult>>;
    analyzePortfolio(walletAddress: string, additionalParams?: Record<string, any>): TaskEither<AgentError, HiveResponse<HiveAnalyticsResult>>;
    getMarketIntelligence(query: string, metadata?: HiveQueryMetadata): TaskEither<AgentError, HiveResponse<HiveAnalyticsResult>>;
    getCreditUsage(): TaskEither<AgentError, CreditUsage>;
    installHivePlugin(): TaskEither<AgentError, void>;
    private executeHiveQuery;
    private performHiveQuery;
    private registerHiveActions;
    private handleHiveSearch;
    private handleHiveAnalytics;
    private handleHivePortfolioAnalysis;
    private handleHiveMarketIntelligence;
    private handleHiveCreditUsage;
    private initializeHivePlugin;
    private cleanupHivePlugin;
    private generateCacheKey;
    private getQueryEndpoint;
    private setupCache;
    private getFromCache;
    private setInCache;
    private checkHiveRateLimit;
    private trackCreditUsage;
    protected initialize(): TaskEither<AgentError, void>;
    protected cleanup(): TaskEither<AgentError, void>;
    getHiveConfig(): HiveIntelligenceConfig;
    getCurrentCreditUsage(): CreditUsage | null;
}
//# sourceMappingURL=HiveIntelligenceAdapter.d.ts.map