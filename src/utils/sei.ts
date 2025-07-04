/**
 * @fileoverview Sei Network utilities for Seiron platform
 * Provides Sei-specific blockchain utilities, formatting, and validation
 */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { ethers } from 'ethers';

/**
 * Sei Network configuration
 */
export interface SeiNetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

/**
 * Sei network definitions
 */
export const SeiNetworks: Record<string, SeiNetworkConfig> = {
  mainnet: {
    chainId: 1329,
    name: 'Sei Network',
    rpcUrl: 'https://evm-rpc.sei-apis.com',
    explorerUrl: 'https://seitrace.com',
    nativeCurrency: {
      name: 'Sei',
      symbol: 'SEI',
      decimals: 18,
    },
  },
  testnet: {
    chainId: 713715,
    name: 'Sei Testnet',
    rpcUrl: 'https://evm-rpc-testnet.sei-apis.com',
    explorerUrl: 'https://seitrace.com/?chain=arctic-1',
    nativeCurrency: {
      name: 'Sei',
      symbol: 'SEI',
      decimals: 18,
    },
  },
  devnet: {
    chainId: 713715,
    name: 'Sei Devnet',
    rpcUrl: 'https://evm-rpc-arctic-1.sei-apis.com',
    explorerUrl: 'https://seitrace.com/?chain=arctic-1',
    nativeCurrency: {
      name: 'Sei',
      symbol: 'SEI',
      decimals: 18,
    },
  },
};

/**
 * Common Sei token addresses
 */
export const SeiTokens = {
  mainnet: {
    USDC: '0x3894085Ef7Ff0f0aeDf52E2A2704928d259f9c3a',
    USDT: '0x1B073382E63411E3BcCE4A3fcC27E1a8c20CA9A7',
    WETH: '0x160345fC359604fC6e70E3c5fAcbdE5F7A9342d8',
    WSEI: '0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7',
  },
  testnet: {
    USDC: '0x...',
    USDT: '0x...',
    WETH: '0x...',
    WSEI: '0x...',
  },
} as const;

/**
 * Protocol addresses on Sei
 */
export const SeiProtocols = {
  mainnet: {
    yeiFinance: {
      lendingPool: '0x...',
      dataProvider: '0x...',
    },
    dragonSwap: {
      router: '0x...',
      factory: '0x...',
    },
    symphony: {
      vault: '0x...',
      strategy: '0x...',
    },
    takara: {
      lending: '0x...',
      rewards: '0x...',
    },
  },
  testnet: {
    yeiFinance: {
      lendingPool: '0x...',
      dataProvider: '0x...',
    },
    dragonSwap: {
      router: '0x...',
      factory: '0x...',
    },
    symphony: {
      vault: '0x...',
      strategy: '0x...',
    },
    takara: {
      lending: '0x...',
      rewards: '0x...',
    },
  },
} as const;

/**
 * Sei-specific error types
 */
export interface SeiError {
  type: 'sei_error';
  message: string;
  code?: string;
}

/**
 * Gas estimation configuration
 */
export interface GasConfig {
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  gasLimit?: bigint;
}

/**
 * Transaction receipt with Sei-specific fields
 */
export interface SeiTransactionReceipt extends ethers.TransactionReceipt {
  seiSpecific?: {
    cosmosHash?: string;
    cosmosEvents?: any[];
  };
}

/**
 * Validate Sei address
 */
export const isValidSeiAddress = (address: string): boolean => {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
};

/**
 * Format SEI amount with proper decimals
 */
export const formatSeiAmount = (
  amount: bigint | string,
  options: {
    decimals?: number;
    showSymbol?: boolean;
    precision?: number;
  } = {}
): string => {
  const { decimals = 18, showSymbol = true, precision = 4 } = options;

  try {
    const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount;
    const formatted = ethers.formatUnits(amountBigInt, decimals);
    const number = parseFloat(formatted);
    
    let result = number.toFixed(precision).replace(/\.?0+$/, '');
    
    if (showSymbol) {
      result += ' SEI';
    }
    
    return result;
  } catch {
    return '0' + (showSymbol ? ' SEI' : '');
  }
};

/**
 * Parse SEI amount to wei
 */
export const parseSeiAmount = (amount: string): E.Either<SeiError, bigint> => {
  try {
    // Remove 'SEI' suffix if present
    const cleanAmount = amount.replace(/\s*SEI\s*$/i, '').trim();
    
    if (!cleanAmount || isNaN(parseFloat(cleanAmount))) {
      return E.left({
        type: 'sei_error',
        message: `Invalid SEI amount: ${amount}`,
      });
    }

    const parsed = ethers.parseEther(cleanAmount);
    return E.right(parsed);
  } catch (error) {
    return E.left({
      type: 'sei_error',
      message: `Failed to parse SEI amount: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
};

/**
 * Get current network from chain ID
 */
export const getNetworkFromChainId = (chainId: number): O.Option<SeiNetworkConfig> => {
  const network = Object.values(SeiNetworks).find(net => net.chainId === chainId);
  return network ? O.some(network) : O.none;
};

/**
 * Get explorer URL for transaction
 */
export const getTransactionUrl = (
  txHash: string,
  network: 'mainnet' | 'testnet' | 'devnet' = 'mainnet'
): string => {
  const networkConfig = SeiNetworks[network];
  return `${networkConfig.explorerUrl}/tx/${txHash}`;
};

/**
 * Get explorer URL for address
 */
export const getAddressUrl = (
  address: string,
  network: 'mainnet' | 'testnet' | 'devnet' = 'mainnet'
): string => {
  const networkConfig = SeiNetworks[network];
  return `${networkConfig.explorerUrl}/address/${address}`;
};

/**
 * Estimate gas for Sei transaction
 */
export const estimateGas = async (
  provider: ethers.Provider,
  transaction: ethers.TransactionRequest
): Promise<E.Either<SeiError, GasConfig>> => {
  try {
    const [gasEstimate, feeData] = await Promise.all([
      provider.estimateGas(transaction),
      provider.getFeeData(),
    ]);

    // Add 20% buffer to gas estimate
    const gasLimit = (gasEstimate * 120n) / 100n;

    const config: GasConfig = {
      gasLimit,
    };

    // Use EIP-1559 if available
    if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
      config.maxFeePerGas = feeData.maxFeePerGas;
      config.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
    } else if (feeData.gasPrice) {
      config.gasPrice = feeData.gasPrice;
    }

    return E.right(config);
  } catch (error) {
    return E.left({
      type: 'sei_error',
      message: `Gas estimation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
};

/**
 * Check if network is Sei
 */
export const isSeiNetwork = (chainId: number): boolean => {
  return Object.values(SeiNetworks).some(net => net.chainId === chainId);
};

/**
 * Get token address for network
 */
export const getTokenAddress = (
  token: string,
  network: 'mainnet' | 'testnet'
): O.Option<string> => {
  const networkTokens = SeiTokens[network] as Record<string, string>;
  const address = networkTokens[token.toUpperCase()];
  return address ? O.some(address) : O.none;
};

/**
 * Get protocol address for network
 */
export const getProtocolAddress = (
  protocol: string,
  contract: string,
  network: 'mainnet' | 'testnet'
): O.Option<string> => {
  const networkProtocols = SeiProtocols[network] as any;
  const protocolContracts = networkProtocols[protocol];
  
  if (!protocolContracts) {
    return O.none;
  }

  const address = protocolContracts[contract];
  return address ? O.some(address) : O.none;
};

/**
 * Convert Cosmos address to EVM address (if applicable)
 */
export const cosmosToEvmAddress = (cosmosAddress: string): O.Option<string> => {
  // This would require specific Sei conversion logic
  // For now, return none as placeholder
  return O.none;
};

/**
 * Convert EVM address to Cosmos address (if applicable)
 */
export const evmToCosmosAddress = (evmAddress: string): O.Option<string> => {
  // This would require specific Sei conversion logic
  // For now, return none as placeholder
  return O.none;
};

/**
 * SEI price utilities
 */
export class SeiPriceService {
  private cachedPrice: { price: number; timestamp: number } | null = null;
  private readonly cacheTimeout = 60000; // 1 minute

  /**
   * Get SEI price in USD (mock implementation)
   */
  async getSeiPriceUSD(): Promise<E.Either<SeiError, number>> {
    try {
      // Check cache
      if (
        this.cachedPrice &&
        Date.now() - this.cachedPrice.timestamp < this.cacheTimeout
      ) {
        return E.right(this.cachedPrice.price);
      }

      // In a real implementation, this would fetch from an API
      // For now, return a mock price
      const mockPrice = 0.45; // $0.45 per SEI
      
      this.cachedPrice = {
        price: mockPrice,
        timestamp: Date.now(),
      };

      return E.right(mockPrice);
    } catch (error) {
      return E.left({
        type: 'sei_error',
        message: `Failed to fetch SEI price: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  /**
   * Convert SEI amount to USD
   */
  async seiToUsd(seiAmount: bigint): Promise<E.Either<SeiError, number>> {
    return pipe(
      await this.getSeiPriceUSD(),
      E.map(price => {
        const seiFloat = parseFloat(ethers.formatEther(seiAmount));
        return seiFloat * price;
      })
    );
  }

  /**
   * Convert USD amount to SEI
   */
  async usdToSei(usdAmount: number): Promise<E.Either<SeiError, bigint>> {
    return pipe(
      await this.getSeiPriceUSD(),
      E.chain(price => {
        if (price === 0) {
          return E.left({
            type: 'sei_error',
            message: 'Cannot convert USD to SEI: price is zero',
          });
        }
        
        const seiAmount = usdAmount / price;
        return E.right(ethers.parseEther(seiAmount.toString()));
      })
    );
  }
}

/**
 * Sei transaction builder with optimizations
 */
export class SeiTransactionBuilder {
  private transaction: ethers.TransactionRequest = {};

  constructor(private provider: ethers.Provider) {}

  /**
   * Set transaction recipient
   */
  to(address: string): this {
    if (!isValidSeiAddress(address)) {
      throw new Error(`Invalid Sei address: ${address}`);
    }
    this.transaction.to = address;
    return this;
  }

  /**
   * Set transaction value
   */
  value(amount: bigint): this {
    this.transaction.value = amount;
    return this;
  }

  /**
   * Set transaction data
   */
  data(data: string): this {
    this.transaction.data = data;
    return this;
  }

  /**
   * Set gas configuration
   */
  gas(config: Partial<GasConfig>): this {
    Object.assign(this.transaction, config);
    return this;
  }

  /**
   * Auto-estimate gas
   */
  async autoGas(): Promise<this> {
    const gasResult = await estimateGas(this.provider, this.transaction);
    
    if (E.isRight(gasResult)) {
      Object.assign(this.transaction, gasResult.right);
    }
    
    return this;
  }

  /**
   * Build the transaction
   */
  build(): ethers.TransactionRequest {
    return { ...this.transaction };
  }
}

/**
 * Utility to create a Sei provider
 */
export const createSeiProvider = (
  network: 'mainnet' | 'testnet' | 'devnet' = 'mainnet'
): ethers.JsonRpcProvider => {
  const networkConfig = SeiNetworks[network];
  return new ethers.JsonRpcProvider(networkConfig.rpcUrl);
};

/**
 * Utility to create a Sei signer
 */
export const createSeiSigner = (
  privateKey: string,
  network: 'mainnet' | 'testnet' | 'devnet' = 'mainnet'
): ethers.Wallet => {
  const provider = createSeiProvider(network);
  return new ethers.Wallet(privateKey, provider);
};

/**
 * Check transaction status on Sei
 */
export const waitForTransaction = async (
  provider: ethers.Provider,
  txHash: string,
  confirmations: number = 1,
  timeout: number = 60000
): Promise<E.Either<SeiError, SeiTransactionReceipt>> => {
  try {
    const receipt = await provider.waitForTransaction(txHash, confirmations, timeout);
    
    if (!receipt) {
      return E.left({
        type: 'sei_error',
        message: `Transaction not found or timed out: ${txHash}`,
      });
    }

    return E.right(receipt as SeiTransactionReceipt);
  } catch (error) {
    return E.left({
      type: 'sei_error',
      message: `Transaction wait failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
};

/**
 * Common Sei constants
 */
export const SeiConstants = {
  NATIVE_TOKEN_DECIMALS: 18,
  AVERAGE_BLOCK_TIME: 2000, // 2 seconds
  MAX_GAS_LIMIT: 30000000n,
  DEFAULT_GAS_LIMIT: 21000n,
  MIN_GAS_PRICE: 1000000000n, // 1 gwei
} as const;