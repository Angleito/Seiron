import { Either, left, right } from 'fp-ts/Either';
import { TaskEither } from 'fp-ts/TaskEither';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { ethers } from 'ethers';
import {
  TransactionRequest,
  PreparedTransaction,
  TransactionError,
  TransactionBuilder as ITransactionBuilder,
  TransactionType,
  GasEstimationStrategy
} from './types';

/**
 * TransactionBuilder - Builds unsigned transactions for various protocols
 * 
 * This service is responsible for:
 * - Converting high-level transaction requests into EVM transaction data
 * - Encoding function calls for different protocols
 * - Estimating gas requirements
 * - Managing nonces
 * - Optimizing transaction parameters
 * 
 * No private keys are used - only transaction preparation
 */
export class TransactionBuilder implements ITransactionBuilder {
  private provider: ethers.Provider;
  private gasStrategy: GasEstimationStrategy;
  private protocolInterfaces: Map<string, ethers.Interface> = new Map();
  private contractAddresses: Map<string, string> = new Map();
  private nonceManager: Map<string, number> = new Map();

  constructor(
    provider: ethers.Provider,
    gasStrategy: GasEstimationStrategy,
    protocolConfigs?: Map<string, { abi: any[]; address: string }>
  ) {
    this.provider = provider;
    this.gasStrategy = gasStrategy;
    
    // Initialize protocol interfaces
    if (protocolConfigs) {
      for (const [protocol, config] of protocolConfigs) {
        this.protocolInterfaces.set(protocol, new ethers.Interface(config.abi));
        this.contractAddresses.set(protocol, config.address);
      }
    }
  }

  /**
   * Build transaction from request
   */
  public buildTransaction(request: TransactionRequest): TaskEither<TransactionError, PreparedTransaction> {
    return pipe(
      this.validateRequest(request),
      TE.fromEither,
      TE.chain(() => this.encodeTransactionData(request)),
      TE.chain(data => this.prepareTransactionParams(request, data)),
      TE.chain(params => this.estimateAndFinalizeTransaction(request, params))
    );
  }

  /**
   * Estimate gas for transaction
   */
  public estimateGas(request: TransactionRequest): TaskEither<TransactionError, bigint> {
    return pipe(
      this.encodeTransactionData(request),
      TE.chain(data => {
        const txParams = {
          from: request.from,
          to: request.to || this.getContractAddress(request.protocol),
          value: request.value || 0n,
          data
        };

        return this.gasStrategy.estimateGas({
          ...request,
          data
        });
      })
    );
  }

  /**
   * Validate prepared transaction
   */
  public validateTransaction(tx: PreparedTransaction): Either<TransactionError, void> {
    // Validate required fields
    if (!tx.from || !ethers.isAddress(tx.from)) {
      return left(this.createError('INVALID_FROM_ADDRESS', 'Invalid from address'));
    }

    if (!tx.to || !ethers.isAddress(tx.to)) {
      return left(this.createError('INVALID_TO_ADDRESS', 'Invalid to address'));
    }

    if (!tx.data || tx.data === '0x') {
      return left(this.createError('INVALID_DATA', 'Transaction data is empty'));
    }

    // Validate gas parameters
    try {
      const gasLimit = BigInt(tx.gas);
      if (gasLimit <= 0n) {
        return left(this.createError('INVALID_GAS_LIMIT', 'Gas limit must be positive'));
      }

      if (tx.gasPrice) {
        const gasPrice = BigInt(tx.gasPrice);
        if (gasPrice <= 0n) {
          return left(this.createError('INVALID_GAS_PRICE', 'Gas price must be positive'));
        }
      }

      if (tx.maxFeePerGas && tx.maxPriorityFeePerGas) {
        const maxFee = BigInt(tx.maxFeePerGas);
        const maxPriority = BigInt(tx.maxPriorityFeePerGas);
        
        if (maxPriority > maxFee) {
          return left(this.createError('INVALID_GAS_PARAMS', 'Max priority fee cannot exceed max fee'));
        }
      }
    } catch (error) {
      return left(this.createError('INVALID_NUMBER_FORMAT', 'Invalid number format in transaction'));
    }

    return right(undefined);
  }

  /**
   * Register protocol configuration
   */
  public registerProtocol(protocol: string, abi: any[], address: string): void {
    this.protocolInterfaces.set(protocol, new ethers.Interface(abi));
    this.contractAddresses.set(protocol, address);
  }

  /**
   * Validate transaction request
   */
  private validateRequest(request: TransactionRequest): Either<TransactionError, void> {
    if (!request.from || !ethers.isAddress(request.from)) {
      return left(this.createError('INVALID_REQUEST', 'Invalid from address'));
    }

    if (!request.protocol) {
      return left(this.createError('INVALID_REQUEST', 'Protocol not specified'));
    }

    if (!request.action) {
      return left(this.createError('INVALID_REQUEST', 'Action not specified'));
    }

    return right(undefined);
  }

  /**
   * Encode transaction data based on type and protocol
   */
  private encodeTransactionData(request: TransactionRequest): TaskEither<TransactionError, string> {
    return TE.tryCatch(
      async () => {
        const encoder = this.getEncoder(request.type);
        return encoder(request);
      },
      error => this.createError('ENCODING_FAILED', `Failed to encode transaction: ${error}`)
    );
  }

  /**
   * Get encoder function for transaction type
   */
  private getEncoder(type: TransactionType): (request: TransactionRequest) => string {
    const encoders: Record<TransactionType, (request: TransactionRequest) => string> = {
      lending_supply: this.encodeLendingSupply.bind(this),
      lending_withdraw: this.encodeLendingWithdraw.bind(this),
      lending_borrow: this.encodeLendingBorrow.bind(this),
      lending_repay: this.encodeLendingRepay.bind(this),
      liquidity_add: this.encodeLiquidityAdd.bind(this),
      liquidity_remove: this.encodeLiquidityRemove.bind(this),
      swap: this.encodeSwap.bind(this),
      stake: this.encodeStake.bind(this),
      unstake: this.encodeUnstake.bind(this),
      claim_rewards: this.encodeClaimRewards.bind(this),
      approve: this.encodeApprove.bind(this),
      transfer: this.encodeTransfer.bind(this),
      batch: this.encodeBatch.bind(this)
    };

    const encoder = encoders[type];
    if (!encoder) {
      throw new Error(`Unsupported transaction type: ${type}`);
    }

    return encoder;
  }

  /**
   * Encode lending supply transaction
   */
  private encodeLendingSupply(request: TransactionRequest): string {
    const iface = this.getProtocolInterface(request.protocol);
    const { asset, amount, referralCode = 0 } = request.params;

    // Different protocols have different function names
    let functionName: string;
    switch (request.protocol) {
      case 'takara':
      case 'aave':
        functionName = 'supply';
        break;
      case 'compound':
        functionName = 'mint';
        break;
      default:
        functionName = 'deposit';
    }

    return iface.encodeFunctionData(functionName, [
      asset,
      amount,
      request.from,
      referralCode
    ]);
  }

  /**
   * Encode lending withdraw transaction
   */
  private encodeLendingWithdraw(request: TransactionRequest): string {
    const iface = this.getProtocolInterface(request.protocol);
    const { asset, amount } = request.params;

    let functionName: string;
    switch (request.protocol) {
      case 'takara':
      case 'aave':
        functionName = 'withdraw';
        break;
      case 'compound':
        functionName = 'redeem';
        break;
      default:
        functionName = 'withdraw';
    }

    return iface.encodeFunctionData(functionName, [
      asset,
      amount,
      request.from
    ]);
  }

  /**
   * Encode lending borrow transaction
   */
  private encodeLendingBorrow(request: TransactionRequest): string {
    const iface = this.getProtocolInterface(request.protocol);
    const { asset, amount, interestRateMode = 2, referralCode = 0 } = request.params;

    return iface.encodeFunctionData('borrow', [
      asset,
      amount,
      interestRateMode,
      referralCode,
      request.from
    ]);
  }

  /**
   * Encode lending repay transaction
   */
  private encodeLendingRepay(request: TransactionRequest): string {
    const iface = this.getProtocolInterface(request.protocol);
    const { asset, amount, interestRateMode = 2 } = request.params;

    return iface.encodeFunctionData('repay', [
      asset,
      amount,
      interestRateMode,
      request.from
    ]);
  }

  /**
   * Encode liquidity add transaction
   */
  private encodeLiquidityAdd(request: TransactionRequest): string {
    const iface = this.getProtocolInterface(request.protocol);
    const {
      tokenA,
      tokenB,
      amountA,
      amountB,
      amountAMin,
      amountBMin,
      deadline
    } = request.params;

    // Uniswap V2 style
    return iface.encodeFunctionData('addLiquidity', [
      tokenA,
      tokenB,
      amountA,
      amountB,
      amountAMin,
      amountBMin,
      request.from,
      deadline
    ]);
  }

  /**
   * Encode liquidity remove transaction
   */
  private encodeLiquidityRemove(request: TransactionRequest): string {
    const iface = this.getProtocolInterface(request.protocol);
    const {
      tokenA,
      tokenB,
      liquidity,
      amountAMin,
      amountBMin,
      deadline
    } = request.params;

    return iface.encodeFunctionData('removeLiquidity', [
      tokenA,
      tokenB,
      liquidity,
      amountAMin,
      amountBMin,
      request.from,
      deadline
    ]);
  }

  /**
   * Encode swap transaction
   */
  private encodeSwap(request: TransactionRequest): string {
    const iface = this.getProtocolInterface(request.protocol);
    const {
      tokenIn,
      tokenOut,
      amountIn,
      amountOutMin,
      path,
      deadline
    } = request.params;

    if (path && path.length > 2) {
      // Multi-hop swap
      return iface.encodeFunctionData('swapExactTokensForTokens', [
        amountIn,
        amountOutMin,
        path,
        request.from,
        deadline
      ]);
    } else {
      // Direct swap
      return iface.encodeFunctionData('swap', [
        tokenIn,
        tokenOut,
        amountIn,
        amountOutMin,
        request.from,
        deadline
      ]);
    }
  }

  /**
   * Encode stake transaction
   */
  private encodeStake(request: TransactionRequest): string {
    const iface = this.getProtocolInterface(request.protocol);
    const { amount } = request.params;

    return iface.encodeFunctionData('stake', [amount]);
  }

  /**
   * Encode unstake transaction
   */
  private encodeUnstake(request: TransactionRequest): string {
    const iface = this.getProtocolInterface(request.protocol);
    const { amount } = request.params;

    return iface.encodeFunctionData('unstake', [amount]);
  }

  /**
   * Encode claim rewards transaction
   */
  private encodeClaimRewards(request: TransactionRequest): string {
    const iface = this.getProtocolInterface(request.protocol);
    const { assets } = request.params;

    if (assets && assets.length > 0) {
      return iface.encodeFunctionData('claimRewards', [assets, request.from]);
    } else {
      return iface.encodeFunctionData('claimAllRewards', []);
    }
  }

  /**
   * Encode approve transaction
   */
  private encodeApprove(request: TransactionRequest): string {
    const { spender, amount } = request.params;
    
    // Standard ERC20 approve
    const erc20Interface = new ethers.Interface([
      'function approve(address spender, uint256 amount) returns (bool)'
    ]);

    return erc20Interface.encodeFunctionData('approve', [spender, amount]);
  }

  /**
   * Encode transfer transaction
   */
  private encodeTransfer(request: TransactionRequest): string {
    const { recipient, amount } = request.params;

    if (request.params.token) {
      // ERC20 transfer
      const erc20Interface = new ethers.Interface([
        'function transfer(address recipient, uint256 amount) returns (bool)'
      ]);
      return erc20Interface.encodeFunctionData('transfer', [recipient, amount]);
    } else {
      // Native token transfer - no data needed
      return '0x';
    }
  }

  /**
   * Encode batch transaction
   */
  private encodeBatch(request: TransactionRequest): string {
    const iface = this.getProtocolInterface(request.protocol);
    const { calls } = request.params;

    // Encode each call
    const encodedCalls = calls.map((call: any) => ({
      target: call.target,
      data: this.encodeTransactionData({
        ...request,
        type: call.type,
        params: call.params
      })
    }));

    return iface.encodeFunctionData('multicall', [encodedCalls]);
  }

  /**
   * Prepare transaction parameters
   */
  private prepareTransactionParams(
    request: TransactionRequest,
    data: string
  ): TaskEither<TransactionError, Partial<PreparedTransaction>> {
    return TE.tryCatch(
      async () => {
        const to = request.to || this.getContractAddress(request.protocol);
        const nonce = await this.getNonce(request.from);

        return {
          from: request.from,
          to,
          value: request.value ? `0x${request.value.toString(16)}` : '0x0',
          data,
          nonce,
          chainId: request.chainId
        };
      },
      error => this.createError('PARAMS_FAILED', `Failed to prepare parameters: ${error}`)
    );
  }

  /**
   * Estimate gas and finalize transaction
   */
  private estimateAndFinalizeTransaction(
    request: TransactionRequest,
    params: Partial<PreparedTransaction>
  ): TaskEither<TransactionError, PreparedTransaction> {
    return pipe(
      this.gasStrategy.estimateGas(request),
      TE.chain(gasLimit => {
        // Add gas buffer
        const bufferedGas = gasLimit + (gasLimit * BigInt(20) / BigInt(100)); // 20% buffer

        return this.getGasPrice();
      }),
      TE.chain(gasParams => {
        const preparedTx: PreparedTransaction = {
          id: request.id,
          requestId: request.id,
          ...params as any,
          gas: `0x${params.gas?.toString(16) || '0'}`,
          ...gasParams,
          type: gasParams.maxFeePerGas ? 2 : 0 // EIP-1559 or legacy
        };

        return TE.right(preparedTx);
      })
    );
  }

  /**
   * Get gas price based on network conditions
   */
  private getGasPrice(): TaskEither<TransactionError, any> {
    return TE.tryCatch(
      async () => {
        const feeData = await this.provider.getFeeData();

        if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
          // EIP-1559 transaction
          return {
            maxFeePerGas: `0x${feeData.maxFeePerGas.toString(16)}`,
            maxPriorityFeePerGas: `0x${feeData.maxPriorityFeePerGas.toString(16)}`
          };
        } else {
          // Legacy transaction
          return {
            gasPrice: `0x${(feeData.gasPrice || 0n).toString(16)}`
          };
        }
      },
      error => this.createError('GAS_PRICE_FAILED', `Failed to get gas price: ${error}`)
    );
  }

  /**
   * Get nonce for address
   */
  private async getNonce(address: string): Promise<number> {
    // Check if we have a pending nonce
    const cachedNonce = this.nonceManager.get(address);
    
    const onChainNonce = await this.provider.getTransactionCount(address, 'pending');
    
    if (cachedNonce !== undefined && cachedNonce >= onChainNonce) {
      // Use cached nonce and increment
      const nonce = cachedNonce + 1;
      this.nonceManager.set(address, nonce);
      return nonce;
    } else {
      // Use on-chain nonce
      this.nonceManager.set(address, onChainNonce);
      return onChainNonce;
    }
  }

  /**
   * Get protocol interface
   */
  private getProtocolInterface(protocol: string): ethers.Interface {
    const iface = this.protocolInterfaces.get(protocol);
    if (!iface) {
      throw new Error(`Protocol interface not found: ${protocol}`);
    }
    return iface;
  }

  /**
   * Get contract address for protocol
   */
  private getContractAddress(protocol: string): string {
    const address = this.contractAddresses.get(protocol);
    if (!address) {
      throw new Error(`Contract address not found: ${protocol}`);
    }
    return address;
  }

  /**
   * Create error object
   */
  private createError(code: string, message: string, details?: any): TransactionError {
    return {
      code,
      message,
      details,
      recoverable: false
    };
  }

  /**
   * Reset nonce cache for address
   */
  public resetNonce(address: string): void {
    this.nonceManager.delete(address);
  }
}