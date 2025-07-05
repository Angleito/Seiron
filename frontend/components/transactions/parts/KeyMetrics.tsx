'use client'

import React from 'react'
import { formatEther, formatUnits } from 'viem'
import { 
  ArrowRightLeft,
  Percent,
  TrendingUp,
  Fuel
} from 'lucide-react'
import { TransactionPreviewData } from '../TransactionPreview'

interface KeyMetricsProps {
  data: TransactionPreviewData
}

export const KeyMetrics = React.memo(function KeyMetrics({ data }: KeyMetricsProps) {
  const networkFee = formatEther(data.estimatedGas * data.gasPrice)

  return (
    <div className="grid grid-cols-2 gap-2 mt-4">
      {data.exchangeRate && (
        <div className="bg-black/30 rounded-lg p-2 border border-red-500/5">
          <p className="text-gray-500 text-xs flex items-center gap-1">
            <ArrowRightLeft className="w-3 h-3" /> Rate
          </p>
          <p className="text-white text-sm font-medium">
            1 {data.inputToken?.symbol} = {data.exchangeRate.toFixed(4)} {data.outputToken?.symbol}
          </p>
        </div>
      )}
      
      {data.priceImpact !== undefined && (
        <div className="bg-black/30 rounded-lg p-2 border border-red-500/5">
          <p className="text-gray-500 text-xs flex items-center gap-1">
            <Percent className="w-3 h-3" /> Price Impact
          </p>
          <p className={`text-sm font-medium ${
            data.priceImpact > 3 ? 'text-red-400' : 
            data.priceImpact > 1 ? 'text-yellow-400' : 
            'text-white'
          }`}>
            {data.priceImpact.toFixed(2)}%
          </p>
        </div>
      )}
      
      {(data.apy || data.apr) && (
        <div className="bg-black/30 rounded-lg p-2 border border-red-500/5">
          <p className="text-gray-500 text-xs flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> {data.apy ? 'APY' : 'APR'}
          </p>
          <p className="text-green-400 text-sm font-medium">
            {(data.apy || data.apr)?.toFixed(2)}%
          </p>
        </div>
      )}
      
      <div className="bg-black/30 rounded-lg p-2 border border-red-500/5">
        <p className="text-gray-500 text-xs flex items-center gap-1">
          <Fuel className="w-3 h-3" /> Network Fee
        </p>
        <p className="text-white text-sm font-medium">
          {parseFloat(networkFee).toFixed(4)} SEI
        </p>
      </div>
    </div>
  )
})