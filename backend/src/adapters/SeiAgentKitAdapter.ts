import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { GasPrice } from '@cosmjs/stargate';
import axios from 'axios';
import { SeiAgentKitAdapter as ISeiAgentKitAdapter } from '../services/SeiIntegrationService';
import type {
  SAKOperationResult,
  SAKTool
} from '../services/SeiIntegrationService';
import logger from '../utils/logger';

/**
 * Real SeiAgentKitAdapter Implementation
 * 
 * This adapter provides protocol interactions and DeFi operations on the Sei Network
 * using both EVM and CosmWasm interfaces.
 */
export class SeiAgentKitAdapter extends EventEmitter implements ISeiAgentKitAdapter {
  private evmProvider?: ethers.Provider;
  private evmWallet?: ethers.Wallet;
  private cosmWasmClient?: SigningCosmWasmClient;
  private cosmWallet?: DirectSecp256k1HdWallet;
  private availableTools: Map<string, SAKTool> = new Map();
  private rateLimiter: Map<string, number[]> = new Map();

  constructor(private config: {
    seiRpcUrl: string;
    seiEvmRpcUrl: string;
    privateKey?: string;
    mnemonic?: string;
    chainId: string;
    network: 'mainnet' | 'testnet' | 'devnet';
    maxRequestsPerMinute?: number;
  }) {
    super();
    this.initializeTools();
  }

  /**
   * Execute a SAK tool
   */
  public executeSAKTool = (
    toolName: string,
    params: any,
    context?: any
  ): TE.TaskEither<Error, SAKOperationResult> => {
    return pipe(
      this.checkRateLimit(toolName),
      TE.chain(() => this.validateTool(toolName)),
      TE.chain(() => this.executeToolOperation(toolName, params, context)),
      TE.map(result => {
        const operationResult: SAKOperationResult = {
          success: true,
          data: result,
          metadata: {
            toolName,
            timestamp: Date.now(),
            network: this.config.network
          }
        };
        
        this.emit('sak:operation:completed', {
          toolName,
          result: operationResult
        });
        
        return operationResult;
      }),
      TE.mapLeft(error => {
        logger.error(`SAK tool execution failed for ${toolName}:`, error);
        this.emit('sak:operation:failed', {
          toolName,
          error: error.message
        });
        return error;
      })
    );
  };

  /**
   * Execute batch operations
   */
  public executeSAKBatch = (
    operations: any[],
    context?: any
  ): TE.TaskEither<Error, SAKOperationResult[]> => {
    return pipe(
      operations.map(op => this.executeSAKTool(op.toolName, op.params, context)),
      TE.sequenceArray,
      TE.map(results => [...results] as SAKOperationResult[])
    );
  };

  /**
   * Get available SAK tools
   */
  public getSAKTools = (): E.Either<Error, SAKTool[]> => {
    try {
      return E.right(Array.from(this.availableTools.values()));
    } catch (error) {
      return E.left(new Error(`Failed to get SAK tools: ${error}`));
    }
  };

  /**
   * Get SAK tools by category
   */
  public getSAKToolsByCategory = (category: string): E.Either<Error, SAKTool[]> => {
    try {
      const tools = Array.from(this.availableTools.values())
        .filter(tool => tool.category === category);
      return E.right(tools);
    } catch (error) {
      return E.left(new Error(`Failed to get SAK tools by category: ${error}`));
    }
  };

  /**
   * Install SAK plugin
   */
  public installSAKPlugin = (): TE.TaskEither<Error, void> => {
    return TE.tryCatch(
      async () => {
        // Initialize EVM provider
        this.evmProvider = new ethers.JsonRpcProvider(this.config.seiEvmRpcUrl);
        
        // Initialize EVM wallet if private key provided
        if (this.config.privateKey) {
          this.evmWallet = new ethers.Wallet(this.config.privateKey, this.evmProvider);
        }
        
        // Initialize CosmWasm client
        if (this.config.mnemonic) {
          this.cosmWallet = await DirectSecp256k1HdWallet.fromMnemonic(this.config.mnemonic, {
            prefix: 'sei'
          });
          
          this.cosmWasmClient = await SigningCosmWasmClient.connectWithSigner(
            this.config.seiRpcUrl,
            this.cosmWallet,
            {
              gasPrice: GasPrice.fromString('0.025usei')
            }
          );
        }
        
        logger.info('SAK adapter initialized successfully');
        this.emit('sak:initialized');
      },
      error => new Error(`Failed to initialize SAK: ${error}`)
    );
  };

  // ============================================================================
  // Private Implementation Methods
  // ============================================================================

  /**
   * Initialize available tools
   */
  private initializeTools(): void {
    // Token operations
    this.registerTool({
      name: 'get_native_balance',
      category: 'blockchain',
      description: 'Get native SEI balance',
      handler: this.getNativeBalance
    });

    this.registerTool({
      name: 'get_token_balance',
      category: 'blockchain',
      description: 'Get ERC20/CW20 token balance',
      handler: this.getTokenBalance
    });

    this.registerTool({
      name: 'transfer_token',
      category: 'blockchain',
      description: 'Transfer tokens',
      handler: this.transferToken
    });

    // DeFi operations
    this.registerTool({
      name: 'get_liquidity_pools',
      category: 'defi',
      description: 'Get available liquidity pools',
      handler: this.getLiquidityPools
    });

    this.registerTool({
      name: 'get_lending_markets',
      category: 'defi',
      description: 'Get lending market data',
      handler: this.getLendingMarkets
    });

    this.registerTool({
      name: 'estimate_swap',
      category: 'defi',
      description: 'Estimate token swap',
      handler: this.estimateSwap
    });
  }

  /**
   * Register a tool
   */
  private registerTool(tool: {
    name: string;
    category: string;
    description: string;
    handler: (params: any) => Promise<any>;
  }): void {
    this.availableTools.set(tool.name, {
      name: tool.name,
      category: tool.category
    });
  }

  /**
   * Execute tool operation
   */
  private executeToolOperation = (
    toolName: string,
    params: any,
    context?: any
  ): TE.TaskEither<Error, any> => {
    return TE.tryCatch(
      async () => {
        switch (toolName) {
          case 'get_native_balance':
            return await this.getNativeBalance(params);
          case 'get_token_balance':
            return await this.getTokenBalance(params);
          case 'transfer_token':
            return await this.transferToken(params);
          case 'get_liquidity_pools':
            return await this.getLiquidityPools(params);
          case 'get_lending_markets':
            return await this.getLendingMarkets(params);
          case 'estimate_swap':
            return await this.estimateSwap(params);
          default:
            throw new Error(`Unknown tool: ${toolName}`);
        }
      },
      error => new Error(`Tool execution failed: ${error}`)
    );
  };

  /**
   * Tool implementations
   */
  private getNativeBalance = async (params: { address: string }): Promise<any> => {
    if (!this.evmProvider) {
      throw new Error('EVM provider not initialized');
    }

    try {
      const balance = await this.evmProvider.getBalance(params.address);
      return {
        address: params.address,
        balance: balance.toString(),
        formatted: ethers.formatEther(balance),
        symbol: 'SEI'
      };
    } catch (error) {
      throw new Error(`Failed to get native balance: ${error}`);
    }
  };

  private getTokenBalance = async (params: {
    address: string;
    tokenAddress: string;
    tokenType: 'erc20' | 'cw20';
  }): Promise<any> => {
    if (params.tokenType === 'erc20' && this.evmProvider) {
      const tokenContract = new ethers.Contract(
        params.tokenAddress,
        ['function balanceOf(address) view returns (uint256)'],
        this.evmProvider
      );
      
      const balance = await tokenContract.balanceOf(params.address);
      return {
        address: params.address,
        tokenAddress: params.tokenAddress,
        balance: balance.toString(),
        type: 'erc20'
      };
    } else if (params.tokenType === 'cw20' && this.cosmWasmClient) {
      const result = await this.cosmWasmClient.queryContractSmart(
        params.tokenAddress,
        { balance: { address: params.address } }
      );
      return {
        address: params.address,
        tokenAddress: params.tokenAddress,
        balance: result.balance,
        type: 'cw20'
      };
    }
    
    throw new Error('Invalid token type or client not initialized');
  };

  private transferToken = async (params: {
    to: string;
    amount: string;
    tokenAddress?: string;
    tokenType?: 'native' | 'erc20' | 'cw20';
  }): Promise<any> => {
    if (!params.tokenType || params.tokenType === 'native') {
      if (!this.evmWallet) {
        throw new Error('Wallet not initialized');
      }
      
      const tx = await this.evmWallet.sendTransaction({
        to: params.to,
        value: params.amount
      });
      
      const receipt = await tx.wait();
      return {
        txHash: receipt?.hash,
        from: this.evmWallet.address,
        to: params.to,
        amount: params.amount,
        status: receipt?.status === 1 ? 'success' : 'failed'
      };
    }
    
    throw new Error('Token transfers not yet implemented');
  };

  private getLiquidityPools = async (params: any): Promise<any> => {
    // This would typically call a DEX aggregator API or smart contract
    // For now, returning mock structure
    return {
      pools: [
        {
          id: 'sei-usdc',
          token0: 'SEI',
          token1: 'USDC',
          tvl: '1000000',
          apy: '12.5'
        }
      ]
    };
  };

  private getLendingMarkets = async (params: any): Promise<any> => {
    // This would typically call lending protocol APIs
    // For now, returning mock structure
    return {
      markets: [
        {
          asset: 'SEI',
          supplyAPY: '5.2',
          borrowAPY: '7.8',
          totalSupply: '5000000',
          totalBorrow: '2000000'
        }
      ]
    };
  };

  private estimateSwap = async (params: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
  }): Promise<any> => {
    // This would typically call DEX router contracts
    // For now, returning mock estimate
    const estimatedOut = (parseFloat(params.amountIn) * 0.98).toString();
    return {
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      estimatedAmountOut: estimatedOut,
      priceImpact: '2.0',
      route: [`${params.tokenIn} -> ${params.tokenOut}`]
    };
  };

  /**
   * Validate tool exists
   */
  private validateTool = (toolName: string): TE.TaskEither<Error, void> => {
    if (!this.availableTools.has(toolName)) {
      return TE.left(new Error(`Tool not found: ${toolName}`));
    }
    return TE.right(undefined);
  };

  /**
   * Check rate limit
   */
  private checkRateLimit = (operation: string): TE.TaskEither<Error, void> => {
    const maxRequests = this.config.maxRequestsPerMinute || 60;
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    
    // Get request timestamps for this operation
    const timestamps = this.rateLimiter.get(operation) || [];
    
    // Remove old timestamps
    const recentTimestamps = timestamps.filter(t => now - t < windowMs);
    
    if (recentTimestamps.length >= maxRequests) {
      return TE.left(new Error('Rate limit exceeded'));
    }
    
    // Add current timestamp
    recentTimestamps.push(now);
    this.rateLimiter.set(operation, recentTimestamps);
    
    return TE.right(undefined);
  };
}