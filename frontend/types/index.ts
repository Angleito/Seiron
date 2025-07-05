// Main types index - centralized exports for all type categories

// Available types
export * from './agent'
export * from './portfolio'
export * from './price-feed'

// Note: Other type files removed during cleanup

// Legacy types (maintained for backward compatibility)
export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface Portfolio {
  totalValue: number
  totalChange24h: number
  assets: Asset[]
}

export interface Asset {
  symbol: string
  name: string
  balance: number
  value: number
  change24h: number
  address?: string
}

export interface Transaction {
  id: string
  type: 'buy' | 'sell' | 'swap'
  fromAsset: string
  toAsset: string
  amount: number
  value: number
  timestamp: Date
  txHash: string
  status: 'pending' | 'completed' | 'failed'
}

// Common utility types
export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}
export type Predicate<T> = (value: T) => boolean

// Note: Other type exports removed during cleanup - files don't exist