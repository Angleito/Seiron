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