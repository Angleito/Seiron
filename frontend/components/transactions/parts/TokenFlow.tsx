'use client'

import React from 'react'
import { ArrowRight } from 'lucide-react'
import { formatUnits } from 'viem'
import { TokenAmount } from '../TransactionPreview'

interface TokenFlowProps {
  inputToken?: TokenAmount
  outputToken?: TokenAmount
}

export const TokenFlow = React.memo(function TokenFlow({
  inputToken,
  outputToken
}: TokenFlowProps) {
  if (!inputToken) return null

  if (outputToken) {
    // Swap-like visualization
    return (
      <div className="relative">
        <div className="bg-black/30 rounded-lg p-3 border border-red-500/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide">You Pay</p>
              <p className="text-white text-lg font-semibold">
                {formatUnits(inputToken.amount, inputToken.decimals)} {inputToken.symbol}
              </p>
              {inputToken.price && (
                <p className="text-gray-500 text-sm">
                  ${(Number(formatUnits(inputToken.amount, inputToken.decimals)) * inputToken.price).toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-center my-2">
          <div className="p-1.5 bg-red-500/20 rounded-full">
            <ArrowRight className="w-4 h-4 text-red-400" />
          </div>
        </div>
        
        <div className="bg-black/30 rounded-lg p-3 border border-red-500/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide">You Receive</p>
              <p className="text-white text-lg font-semibold">
                {formatUnits(outputToken.amount, outputToken.decimals)} {outputToken.symbol}
              </p>
              {outputToken.price && (
                <p className="text-gray-500 text-sm">
                  ${(Number(formatUnits(outputToken.amount, outputToken.decimals)) * outputToken.price).toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  } else {
    // Single token operation
    return (
      <div className="bg-black/30 rounded-lg p-3 border border-red-500/5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Amount</p>
            <p className="text-white text-lg font-semibold">
              {formatUnits(inputToken.amount, inputToken.decimals)} {inputToken.symbol}
            </p>
            {inputToken.price && (
              <p className="text-gray-500 text-sm">
                ${(Number(formatUnits(inputToken.amount, inputToken.decimals)) * inputToken.price).toFixed(2)}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }
})