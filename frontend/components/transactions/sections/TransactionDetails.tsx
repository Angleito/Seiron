'use client'

import React from 'react'
import { formatEther, formatUnits } from 'viem'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { TransactionPreviewData } from '../TransactionPreview'

interface TransactionDetailsProps {
  data: TransactionPreviewData
}

export const TransactionDetails = React.memo(function TransactionDetails({ data }: TransactionDetailsProps) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="px-4 pb-4 space-y-3 border-t border-red-500/10 pt-4">
        {/* Additional Metrics */}
        {data.slippage !== undefined && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Max Slippage</span>
            <span className="text-white">{data.slippage}%</span>
          </div>
        )}
        
        {data.minimumReceived !== undefined && data.minimumReceived > 0n && data.outputToken && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Minimum Received</span>
            <span className="text-white">
              {formatUnits(data.minimumReceived, data.outputToken.decimals)} {data.outputToken.symbol}
            </span>
          </div>
        )}
        
        {data.healthFactor && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Health Factor</span>
            <div className="flex items-center gap-2">
              <span className="text-white">{data.healthFactor.current.toFixed(2)}</span>
              <ArrowRight className="w-3 h-3 text-gray-500" />
              <span className={data.healthFactor.after < 1.5 ? 'text-red-400' : 'text-white'}>
                {data.healthFactor.after.toFixed(2)}
              </span>
            </div>
          </div>
        )}
        
        {data.liquidationPrice && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Liquidation Price</span>
            <span className="text-white">${data.liquidationPrice.toFixed(2)}</span>
          </div>
        )}
        
        {data.poolShare !== undefined && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Pool Share</span>
            <span className="text-white">{data.poolShare.toFixed(4)}%</span>
          </div>
        )}
        
        {data.deadline && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Transaction Deadline</span>
            <span className="text-white">{data.deadline} minutes</span>
          </div>
        )}
        
        {data.lockPeriod && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Lock Period</span>
            <span className="text-white">{data.lockPeriod} days</span>
          </div>
        )}
        
        {/* Rewards */}
        {data.rewards && data.rewards.length > 0 && (
          <div>
            <p className="text-gray-400 text-sm mb-1">Rewards</p>
            <div className="space-y-1">
              {data.rewards.map((reward, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-300">{reward.symbol}</span>
                  <span className="text-green-400">
                    +{formatUnits(reward.amount, reward.decimals)} / day
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Gas Details */}
        <div className="pt-2 border-t border-red-500/10">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Gas Limit</span>
            <span className="text-white">{data.estimatedGas.toString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Gas Price</span>
            <span className="text-white">{formatUnits(data.gasPrice, 9)} Gwei</span>
          </div>
          {data.maxFee !== undefined && data.maxFee > 0n && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Max Fee</span>
              <span className="text-white">{formatEther(data.maxFee)} SEI</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
})