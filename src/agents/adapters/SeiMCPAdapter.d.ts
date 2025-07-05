import { TaskEither } from 'fp-ts/TaskEither';
import { BaseAgent, AgentConfig, AgentError } from '../base/BaseAgent';
export interface MCPServerConfig {
    endpoint: string;
    port: number;
    secure: boolean;
    apiKey?: string;
    network: 'mainnet' | 'testnet' | 'devnet';
    connectionTimeout: number;
    heartbeatInterval: number;
    retryAttempts: number;
    retryDelay: number;
}
export interface MCPMessage {
    id: string;
    type: 'request' | 'response' | 'notification' | 'event';
    method: string;
    params?: any;
    result?: any;
    error?: MCPError;
    timestamp: number;
}
export interface MCPError {
    code: number;
    message: string;
    data?: any;
}
export interface MCPTool {
    name: string;
    description: string;
    parameters: Record<string, MCPParameterSchema>;
    returns: MCPParameterSchema;
    category: 'blockchain' | 'defi' | 'wallet' | 'contract' | 'query';
    dragonBallTheme?: string;
    powerLevel?: number;
    requirements?: string[];
    examples?: MCPToolExample[];
}
export interface MCPParameterSchema {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
    required?: boolean;
    format?: string;
    pattern?: string;
    enum?: any[];
    properties?: Record<string, MCPParameterSchema>;
    items?: MCPParameterSchema;
}
export interface MCPToolExample {
    name: string;
    description: string;
    params: Record<string, any>;
    expectedResult: any;
    dragonBallAnalogy?: string;
}
export interface BlockchainState {
    blockNumber: number;
    blockHash: string;
    timestamp: number;
    gasPrice: string;
    networkStatus: 'healthy' | 'congested' | 'offline';
    validators: ValidatorInfo[];
    totalSupply: string;
    inflation: number;
}
export interface ValidatorInfo {
    address: string;
    moniker: string;
    votingPower: number;
    commission: number;
    status: 'active' | 'inactive' | 'jailed';
}
export interface WalletBalance {
    address: string;
    balances: TokenBalance[];
    totalValueUSD: number;
    lastUpdated: number;
}
export interface TokenBalance {
    denom: string;
    amount: string;
    decimals: number;
    symbol: string;
    name: string;
    valueUSD: number;
    logoUri?: string;
}
export interface TransactionRequest {
    from: string;
    to: string;
    amount: string;
    denom: string;
    memo?: string;
    gasLimit?: number;
    gasPrice?: string;
    timeoutHeight?: number;
}
export interface TransactionResponse {
    txHash: string;
    height: number;
    code: number;
    rawLog: string;
    gasUsed: number;
    gasWanted: number;
    timestamp: number;
    events: TransactionEvent[];
}
export interface TransactionEvent {
    type: string;
    attributes: {
        key: string;
        value: string;
    }[];
}
export interface ContractInteraction {
    contractAddress: string;
    method: string;
    args: Record<string, any>;
    sender: string;
    funds?: {
        denom: string;
        amount: string;
    }[];
    gasLimit?: number;
}
export interface ContractQuery {
    contractAddress: string;
    query: Record<string, any>;
}
export interface ContractState {
    address: string;
    codeId: number;
    admin?: string;
    label: string;
    creator: string;
    ibcPortId?: string;
}
export interface MCPContext {
    userId?: string;
    walletAddress?: string;
    chainId: string;
    network: 'mainnet' | 'testnet' | 'devnet';
    permissions: string[];
    sessionId: string;
    blockNumber?: number;
    gasPreference: 'low' | 'medium' | 'high';
    dragonBallMode?: boolean;
    powerLevel?: number;
    metadata?: Record<string, any>;
}
export interface MCPResult<T = any> {
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
        executionTime?: number;
        dragonBallMessage?: string;
    };
}
export declare class SeiMCPAdapter extends BaseAgent {
    private readonly mcpConfig;
    private readonly connectionManager;
    private readonly availableTools;
    private readonly dragonBallTheme;
    private readonly cache;
    constructor(config: AgentConfig, mcpConfig: MCPServerConfig);
    connectToMCP(): Promise<void>;
    disconnectFromMCP(): void;
    getBlockchainState(): TaskEither<AgentError, BlockchainState>;
    getWalletBalance(address: string): TaskEither<AgentError, WalletBalance>;
    getTokenBalances(address: string, tokens: string[]): TaskEither<AgentError, TokenBalance[]>;
    sendTransaction(request: TransactionRequest): TaskEither<AgentError, TransactionResponse>;
    getTransactionHistory(address: string, limit?: number): TaskEither<AgentError, TransactionResponse[]>;
    getTransactionStatus(txHash: string): TaskEither<AgentError, TransactionResponse>;
    queryContract(query: ContractQuery): TaskEither<AgentError, any>;
    executeContract(interaction: ContractInteraction): TaskEither<AgentError, TransactionResponse>;
    getContractState(address: string): TaskEither<AgentError, ContractState>;
    getTokenMetadata(denom: string): TaskEither<AgentError, any>;
    subscribeToEvents(eventTypes: string[], filters?: Record<string, any>): TaskEither<AgentError, void>;
    unsubscribeFromEvents(eventTypes: string[]): TaskEither<AgentError, void>;
    private executeMCPTool;
    private validateToolExists;
    private createMCPContext;
    private executeToolWithContext;
    private addDragonBallTheming;
    private setupConnectionEventHandlers;
    private loadAvailableTools;
    private registerMCPActions;
    private handleGetBlockchainState;
    private handleGetWalletBalance;
    private handleSendTransaction;
    private handleQueryContract;
    private handleExecuteContract;
    private handleGetTransactionHistory;
    private handleSubscribeEvents;
    private isReadOperation;
    private getCacheKey;
    private getFromCache;
    private setInCache;
    protected initialize(): TaskEither<AgentError, void>;
    protected cleanup(): TaskEither<AgentError, void>;
    isConnected(): boolean;
    getAvailableTools(): MCPTool[];
    getMCPConfig(): MCPServerConfig;
}
//# sourceMappingURL=SeiMCPAdapter.d.ts.map