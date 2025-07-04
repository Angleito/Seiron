/**
 * Transaction Flow Management System
 * 
 * This module provides a complete transaction management system that:
 * - Removes private key dependencies from the core application
 * - Manages transaction lifecycle from preparation to confirmation
 * - Integrates with frontend wallets for signing
 * - Provides queuing and batching capabilities
 * - Handles errors and retries gracefully
 * 
 * Key Components:
 * - TransactionFlowManager: Orchestrates the entire flow
 * - TransactionBuilder: Prepares unsigned transactions
 * - WalletAbstraction: Interface for wallet integration
 * - Various implementations for storage, queuing, etc.
 */

export * from './types';
export * from './TransactionFlowManager';
export * from './TransactionBuilder';
export * from './WalletAbstraction';
export * from './implementations';

// Re-export commonly used types for convenience
export type {
  TransactionFlow,
  TransactionRequest,
  PreparedTransaction,
  SignedTransaction,
  TransactionReceipt,
  TransactionStatus,
  TransactionType,
  TransactionError,
  WalletInterface,
  TransactionFlowConfig
} from './types';

// Default configuration
export const defaultTransactionFlowConfig: TransactionFlowConfig = {
  defaultGasLimit: 300000n,
  gasBufferPercentage: 20,
  maxGasPrice: 1000000000000n, // 1000 gwei
  confirmationTimeout: 300000, // 5 minutes
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
  queueMaxSize: 100,
  enableBatching: true,
  batchSize: 10,
  batchTimeout: 10000 // 10 seconds
};