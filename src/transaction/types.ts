import { Either } from 'fp-ts/Either';
import { TaskEither } from 'fp-ts/TaskEither';

/**
 * Transaction Flow Types
 * 
 * Core types for managing transaction lifecycle without private keys
 */

export type TransactionStatus = 
  | 'preparing'
  | 'awaiting_confirmation'
  | 'signing'
  | 'broadcasting'
  | 'confirming'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface TransactionRequest {
  id: string;
  type: TransactionType;
  protocol: string;
  action: string;
  params: Record<string, any>;
  estimatedGas?: bigint;
  gasPrice?: bigint;
  nonce?: number;
  chainId: number;
  from: string;
  to?: string;
  value?: bigint;
  data?: string;
  metadata: TransactionMetadata;
  createdAt: Date;
  expiresAt?: Date;
}

export interface TransactionMetadata {
  description: string;
  agent?: string;
  userId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requiresConfirmation: boolean;
  confirmationMessage?: string;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedValue?: string;
  affectedPositions?: string[];
  tags?: string[];
}

export interface PreparedTransaction {
  id: string;
  requestId: string;
  chainId: number;
  from: string;
  to: string;
  value: string; // hex string
  data: string; // hex encoded transaction data
  gas: string; // hex string
  gasPrice?: string; // hex string
  maxFeePerGas?: string; // hex string for EIP-1559
  maxPriorityFeePerGas?: string; // hex string for EIP-1559
  nonce: number;
  type?: number; // transaction type (0 = legacy, 2 = EIP-1559)
}

export interface SignedTransaction {
  id: string;
  requestId: string;
  rawTransaction: string; // hex encoded signed transaction
  hash: string;
  from: string;
  nonce: number;
}

export interface TransactionReceipt {
  transactionHash: string;
  transactionIndex: number;
  blockHash: string;
  blockNumber: number;
  from: string;
  to: string;
  gasUsed: bigint;
  effectiveGasPrice: bigint;
  status: 'success' | 'failed';
  logs: TransactionLog[];
  contractAddress?: string;
}

export interface TransactionLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  transactionIndex: number;
  logIndex: number;
}

export interface TransactionFlow {
  id: string;
  request: TransactionRequest;
  status: TransactionStatus;
  preparedTx?: PreparedTransaction;
  signedTx?: SignedTransaction;
  receipt?: TransactionReceipt;
  error?: TransactionError;
  history: TransactionEvent[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionEvent {
  timestamp: Date;
  status: TransactionStatus;
  message: string;
  details?: any;
}

export interface TransactionError {
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
}

export type TransactionType = 
  | 'lending_supply'
  | 'lending_withdraw'
  | 'lending_borrow'
  | 'lending_repay'
  | 'liquidity_add'
  | 'liquidity_remove'
  | 'swap'
  | 'stake'
  | 'unstake'
  | 'claim_rewards'
  | 'approve'
  | 'transfer'
  | 'batch';

export interface TransactionBuilder {
  buildTransaction(request: TransactionRequest): TaskEither<TransactionError, PreparedTransaction>;
  estimateGas(request: TransactionRequest): TaskEither<TransactionError, bigint>;
  validateTransaction(tx: PreparedTransaction): Either<TransactionError, void>;
}

export interface TransactionSigner {
  signTransaction(tx: PreparedTransaction): TaskEither<TransactionError, SignedTransaction>;
  getAddress(): TaskEither<TransactionError, string>;
  getChainId(): TaskEither<TransactionError, number>;
}

export interface TransactionBroadcaster {
  broadcastTransaction(tx: SignedTransaction): TaskEither<TransactionError, string>;
  waitForReceipt(txHash: string, confirmations?: number): TaskEither<TransactionError, TransactionReceipt>;
  getTransactionStatus(txHash: string): TaskEither<TransactionError, TransactionReceipt | null>;
}

export interface TransactionQueue {
  enqueue(request: TransactionRequest): TaskEither<TransactionError, string>;
  dequeue(): TaskEither<TransactionError, TransactionRequest | null>;
  peek(): TaskEither<TransactionError, TransactionRequest | null>;
  remove(id: string): TaskEither<TransactionError, void>;
  getQueueSize(): number;
  getQueuedTransactions(): TransactionRequest[];
}

export interface TransactionConfirmationRequest {
  flowId: string;
  transaction: PreparedTransaction;
  metadata: TransactionMetadata;
  estimatedGas: bigint;
  estimatedCost: string;
  timeout?: number;
}

export interface TransactionConfirmationResponse {
  approved: boolean;
  signedTransaction?: SignedTransaction;
  rejectionReason?: string;
  timestamp: Date;
}

export interface WalletInterface {
  connect(): TaskEither<TransactionError, void>;
  disconnect(): TaskEither<TransactionError, void>;
  getAddress(): TaskEither<TransactionError, string>;
  getChainId(): TaskEither<TransactionError, number>;
  signTransaction(tx: PreparedTransaction): TaskEither<TransactionError, SignedTransaction>;
  sendTransaction(tx: SignedTransaction): TaskEither<TransactionError, string>;
  isConnected(): boolean;
}

export interface TransactionFlowConfig {
  defaultGasLimit: bigint;
  gasBufferPercentage: number;
  maxGasPrice: bigint;
  confirmationTimeout: number;
  maxRetries: number;
  retryDelay: number;
  queueMaxSize: number;
  enableBatching: boolean;
  batchSize: number;
  batchTimeout: number;
}

export interface TransactionStatistics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  averageGasUsed: bigint;
  averageConfirmationTime: number;
  totalGasSpent: bigint;
  transactionsByType: Record<TransactionType, number>;
}

/**
 * Transaction validation rules
 */
export interface ValidationRule {
  field: string;
  validator: (value: any) => boolean;
  message: string;
}

export interface TransactionValidator {
  validate(request: TransactionRequest): Either<TransactionError[], void>;
  addRule(type: TransactionType, rule: ValidationRule): void;
  removeRule(type: TransactionType, field: string): void;
}

/**
 * Gas estimation strategies
 */
export interface GasEstimationStrategy {
  estimateGas(request: TransactionRequest): TaskEither<TransactionError, bigint>;
  getGasPrice(): TaskEither<TransactionError, bigint>;
  getMaxPriorityFeePerGas(): TaskEither<TransactionError, bigint>;
}

/**
 * Transaction persistence
 */
export interface TransactionStore {
  save(flow: TransactionFlow): TaskEither<TransactionError, void>;
  load(id: string): TaskEither<TransactionError, TransactionFlow | null>;
  update(id: string, updates: Partial<TransactionFlow>): TaskEither<TransactionError, void>;
  delete(id: string): TaskEither<TransactionError, void>;
  findByStatus(status: TransactionStatus): TaskEither<TransactionError, TransactionFlow[]>;
  findByUser(userId: string): TaskEither<TransactionError, TransactionFlow[]>;
  getStatistics(): TaskEither<TransactionError, TransactionStatistics>;
}