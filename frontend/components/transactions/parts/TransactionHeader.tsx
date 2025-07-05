'use client'

import React from 'react'
import { 
  ChevronDown, 
  ChevronUp,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Coins,
  Wallet,
  Info
} from 'lucide-react'
import { TransactionPreviewData } from '../TransactionPreview'

interface TransactionHeaderProps {
  data: TransactionPreviewData
  showDetails: boolean
  onToggleDetails: () => void
}

export const TransactionHeader = React.memo(function TransactionHeader({
  data,
  showDetails,
  onToggleDetails
}: TransactionHeaderProps) {
  const getTransactionIcon = () => {
    switch (data.type) {
      case 'swap':
        return <ArrowRightLeft className="w-5 h-5" />
      case 'lend':
      case 'supply':
        return <TrendingUp className="w-5 h-5" />
      case 'borrow':
      case 'withdraw':
        return <TrendingDown className="w-5 h-5" />
      case 'provide-liquidity':
      case 'remove-liquidity':
        return <Coins className="w-5 h-5" />
      case 'stake':
      case 'unstake':
        return <Wallet className="w-5 h-5" />
      default:
        return <Info className="w-5 h-5" />
    }
  }

  const getActionText = () => {
    switch (data.type) {
      case 'swap':
        return 'Swap'
      case 'lend':
      case 'supply':
        return 'Supply'
      case 'borrow':
        return 'Borrow'
      case 'withdraw':
        return 'Withdraw'
      case 'provide-liquidity':
        return 'Add Liquidity'
      case 'remove-liquidity':
        return 'Remove Liquidity'
      case 'stake':
        return 'Stake'
      case 'unstake':
        return 'Unstake'
      default:
        return data.type
    }
  }

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
          {getTransactionIcon()}
        </div>
        <div>
          <h3 className="text-white font-semibold">{getActionText()}</h3>
          <p className="text-gray-400 text-sm">{data.protocol.name}</p>
        </div>
      </div>
      <button
        onClick={onToggleDetails}
        className="text-gray-400 hover:text-white transition-colors"
      >
        {showDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
    </div>
  )
})