// Transaction component types

import { ReactNode } from 'react'

export interface TransactionProps {
  id: string
  type: 'buy' | 'sell' | 'swap' | 'deposit' | 'withdraw' | 'borrow' | 'repay' | 'stake' | 'unstake'
  fromAsset: string
  toAsset: string
  amount: number
  value: number
  timestamp: Date
  txHash: string
  status: 'pending' | 'completed' | 'failed'
  gasUsed?: number
  gasPrice?: string
  blockNumber?: number
  confirmations?: number
  className?: string
  style?: React.CSSProperties
  children?: ReactNode
}

export interface TransactionPreviewProps {
  transaction: TransactionData
  showDetails?: boolean
  showRisk?: boolean
  showGasEstimate?: boolean
  className?: string
  style?: React.CSSProperties
  onConfirm?: () => void
  onCancel?: () => void
  onDetailsToggle?: (show: boolean) => void
}

export interface TransactionConfirmationProps {
  transaction: TransactionData
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  onClose: () => void
  showRiskWarning?: boolean
  showGasEstimate?: boolean
  requireConfirmation?: boolean
  className?: string
  style?: React.CSSProperties
}

export interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  className?: string
  style?: React.CSSProperties
}

export interface TransactionDetailsProps {
  transaction: TransactionData
  expanded?: boolean
  showGasDetails?: boolean
  showEventsLog?: boolean
  showMetadata?: boolean
  className?: string
  style?: React.CSSProperties
  onToggle?: (expanded: boolean) => void
}

export interface TransactionHeaderProps {
  transaction: TransactionData
  showStatus?: boolean
  showTimestamp?: boolean
  showValue?: boolean
  className?: string
  style?: React.CSSProperties
}

export interface TokenFlowProps {
  fromToken: TokenInfo
  toToken: TokenInfo
  amount: string
  rate?: string
  priceImpact?: number
  className?: string
  style?: React.CSSProperties
}

export interface KeyMetricsProps {
  metrics: TransactionMetrics
  showAll?: boolean
  className?: string
  style?: React.CSSProperties
}

export interface RiskWarningProps {
  risk: RiskLevel
  warnings: string[]
  onAcknowledge?: () => void
  onCancel?: () => void
  showDetails?: boolean
  className?: string
  style?: React.CSSProperties
}

export interface TransactionListProps {
  transactions: TransactionData[]
  loading?: boolean
  error?: string
  sortBy?: 'timestamp' | 'value' | 'type' | 'status'
  sortOrder?: 'asc' | 'desc'
  filterBy?: TransactionFilter
  pageSize?: number
  className?: string
  style?: React.CSSProperties
  onTransactionClick?: (transaction: TransactionData) => void
  onSort?: (sortBy: string, sortOrder: 'asc' | 'desc') => void
  onFilter?: (filter: TransactionFilter) => void
}

export interface TransactionStatusProps {
  status: TransactionStatus
  txHash?: string
  confirmations?: number
  requiredConfirmations?: number
  blockNumber?: number
  className?: string
  style?: React.CSSProperties
}

export interface TransactionProgressProps {
  status: TransactionStatus
  progress?: number
  steps?: TransactionStep[]
  currentStep?: number
  className?: string
  style?: React.CSSProperties
}

export interface TransactionReceiptProps {
  transaction: TransactionData
  receipt: TransactionReceipt
  showDetails?: boolean
  className?: string
  style?: React.CSSProperties
}

export interface TransactionHistoryProps {
  walletAddress: string
  dateRange?: {
    from: Date
    to: Date
  }
  types?: TransactionType[]
  protocols?: string[]
  pageSize?: number
  className?: string
  style?: React.CSSProperties
}

// Transaction Data Types
export interface TransactionData {
  id: string
  type: TransactionType
  subtype?: string
  fromAsset: string
  toAsset: string
  fromAmount: string
  toAmount: string
  fromValue: number
  toValue: number
  rate: string
  priceImpact?: number
  slippage?: number
  deadline?: number
  timestamp: Date
  txHash: string
  status: TransactionStatus
  gasUsed?: number
  gasPrice?: string
  gasLimit?: number
  gasValue?: number
  blockNumber?: number
  confirmations?: number
  requiredConfirmations?: number
  protocol?: string
  route?: TransactionRoute[]
  metadata?: Record<string, any>
  error?: TransactionError
}

export interface TokenInfo {
  symbol: string
  name: string
  address: string
  decimals: number
  logoUrl?: string
  price?: number
  balance?: string
  value?: number
}

export interface TransactionMetrics {
  totalValue: number
  gasFee: number
  protocolFee: number
  slippage: number
  priceImpact: number
  expectedOutput: string
  minimumOutput: string
  maximumInput: string
  rate: string
  route: string[]
  deadline: Date
  executionTime?: number
}

export interface TransactionRoute {
  protocol: string
  pool: string
  percentage: number
  fee: number
  gasEstimate: number
  priceImpact: number
}

export interface TransactionError {
  code: string
  message: string
  details?: string
  txHash?: string
  blockNumber?: number
  gasUsed?: number
  type: 'insufficient_funds' | 'gas_limit' | 'slippage' | 'deadline' | 'reverted' | 'failed' | 'unknown'
  recoverable: boolean
}

export interface TransactionReceipt {
  txHash: string
  blockNumber: number
  blockHash: string
  gasUsed: number
  gasPrice: string
  status: 'success' | 'failed'
  events: TransactionEvent[]
  logs: TransactionLog[]
  timestamp: Date
}

export interface TransactionEvent {
  type: string
  contract: string
  eventName: string
  signature: string
  parameters: Record<string, any>
  blockNumber: number
  txHash: string
  logIndex: number
}

export interface TransactionLog {
  address: string
  topics: string[]
  data: string
  blockNumber: number
  txHash: string
  logIndex: number
  removed: boolean
}

export interface TransactionStep {
  id: string
  name: string
  description: string
  status: 'pending' | 'active' | 'completed' | 'failed'
  txHash?: string
  blockNumber?: number
  gasUsed?: number
  timestamp?: Date
}

export interface TransactionFilter {
  types?: TransactionType[]
  status?: TransactionStatus[]
  protocols?: string[]
  assets?: string[]
  dateRange?: {
    from: Date
    to: Date
  }
  valueRange?: {
    min: number
    max: number
  }
  gasRange?: {
    min: number
    max: number
  }
}

export interface TransactionSummary {
  totalTransactions: number
  totalValue: number
  totalGasUsed: number
  totalGasFees: number
  averageGasPrice: number
  successRate: number
  byType: Record<TransactionType, number>
  byStatus: Record<TransactionStatus, number>
  byProtocol: Record<string, number>
  topAssets: Array<{
    asset: string
    count: number
    totalValue: number
  }>
}

export interface TransactionSettings {
  slippageTolerance: number
  gasPrice: 'slow' | 'standard' | 'fast' | 'instant'
  deadline: number
  maxGasLimit: number
  autoApprove: boolean
  showAdvanced: boolean
  confirmBeforeExecute: boolean
  enableNotifications: boolean
}

export interface TransactionEstimate {
  gasLimit: number
  gasPrice: string
  gasFee: number
  executionTime: number
  priceImpact: number
  minimumReceived: string
  maximumSent: string
  route: TransactionRoute[]
  warnings: string[]
}

// Type Definitions
export type TransactionType = 
  | 'buy'
  | 'sell'
  | 'swap'
  | 'deposit'
  | 'withdraw'
  | 'borrow'
  | 'repay'
  | 'stake'
  | 'unstake'
  | 'claim'
  | 'approve'
  | 'transfer'
  | 'bridge'
  | 'mint'
  | 'burn'

export type TransactionStatus = 
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'reverted'

export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme'

export type GasSpeed = 'slow' | 'standard' | 'fast' | 'instant'

export interface GasOption {
  speed: GasSpeed
  gasPrice: string
  estimatedTime: number
  cost: number
}

export interface TransactionContext {
  walletAddress: string
  networkId: number
  blockNumber: number
  timestamp: Date
  gasPrice: string
  nonce: number
  balance: string
  allowances: Record<string, string>
}

export interface TransactionBuilder {
  type: TransactionType
  fromAsset: string
  toAsset: string
  amount: string
  slippage: number
  deadline: number
  gasLimit?: number
  gasPrice?: string
  route?: TransactionRoute[]
  build(): TransactionData
  estimate(): Promise<TransactionEstimate>
  validate(): Promise<string[]>
  execute(): Promise<TransactionReceipt>
}

export interface TransactionValidator {
  validate(transaction: TransactionData): Promise<string[]>
  validateBalance(asset: string, amount: string): Promise<boolean>
  validateAllowance(asset: string, spender: string, amount: string): Promise<boolean>
  validateSlippage(slippage: number): boolean
  validateDeadline(deadline: number): boolean
  validateGasLimit(gasLimit: number): boolean
}

export interface TransactionExecutor {
  execute(transaction: TransactionData): Promise<TransactionReceipt>
  estimateGas(transaction: TransactionData): Promise<number>
  simulateTransaction(transaction: TransactionData): Promise<TransactionReceipt>
  getTransactionStatus(txHash: string): Promise<TransactionStatus>
  waitForConfirmation(txHash: string, confirmations: number): Promise<TransactionReceipt>
}

// Event Types
export interface TransactionEventHandlers {
  onTransactionStart?: (transaction: TransactionData) => void
  onTransactionConfirmed?: (transaction: TransactionData) => void
  onTransactionCompleted?: (transaction: TransactionData, receipt: TransactionReceipt) => void
  onTransactionFailed?: (transaction: TransactionData, error: TransactionError) => void
  onTransactionCancelled?: (transaction: TransactionData) => void
  onGasEstimateUpdate?: (estimate: TransactionEstimate) => void
  onSlippageUpdate?: (slippage: number) => void
  onDeadlineUpdate?: (deadline: number) => void
}