import { usePublicClient } from '@privy-io/wagmi'
import { useWalletOperations } from './useWalletOperations'
import { createSymphonyProtocolWrapperFrontend, defaultSymphonyConfig, defaultSymphonyIntegrationConfig } from '@/src/protocols/sei/adapters/SymphonyProtocolWrapperFrontend'
import type { SwapExecuteRequest, SwapQuoteRequest } from '@/src/protocols/sei/types'
import { pipe } from 'fp-ts/function'
import * as TE from 'fp-ts/TaskEither'
import { useState, useCallback } from 'react'

export interface ProtocolTransaction {
  id: string
  type: 'swap' | 'approve' | 'add_liquidity' | 'remove_liquidity'
  protocol: string
  from: string
  to: string
  value?: bigint
  data: `0x${string}`
  estimatedGas?: bigint
  description: string
  riskLevel: 'low' | 'medium' | 'high'
  tokenIn?: {
    address: string
    symbol: string
    amount: bigint
    decimals: number
  }
  tokenOut?: {
    address: string
    symbol: string
    amount: bigint
    decimals: number
  }
}

export function useProtocolOperations() {
  const publicClient = usePublicClient()
  const { sendTransaction, address, isConnected } = useWalletOperations()
  const [pendingTransactions, setPendingTransactions] = useState<ProtocolTransaction[]>([])

  // Create Symphony protocol wrapper
  const symphonyWrapper = publicClient 
    ? createSymphonyProtocolWrapperFrontend(
        defaultSymphonyConfig,
        defaultSymphonyIntegrationConfig,
        publicClient
      )
    : null

  const getSwapQuote = useCallback(async (request: SwapQuoteRequest) => {
    if (!symphonyWrapper) {
      throw new Error('Protocol wrapper not initialized')
    }

    const result = await symphonyWrapper.getQuote(request)()
    
    if (result._tag === 'Left') {
      throw new Error(result.left.message || 'Failed to get quote')
    }

    return result.right
  }, [symphonyWrapper])

  const prepareSwap = useCallback(async (request: SwapExecuteRequest) => {
    if (!symphonyWrapper || !address) {
      throw new Error('Wallet not connected or protocol wrapper not initialized')
    }

    // First check if we need approval
    const tokenAddress = request.tokenIn as `0x${string}`
    const routerAddress = defaultSymphonyConfig.contractAddress
    
    const allowanceResult = await symphonyWrapper.checkAllowance(
      tokenAddress,
      routerAddress,
      address
    )()

    if (allowanceResult._tag === 'Left') {
      throw new Error('Failed to check allowance')
    }

    const allowance = allowanceResult.right
    const amountIn = BigInt(request.amountIn)

    // Prepare approval transaction if needed
    if (allowance < amountIn) {
      const approvalTx = symphonyWrapper.prepareApprovalTransaction(
        tokenAddress,
        routerAddress,
        amountIn
      )

      const approvalTransaction: ProtocolTransaction = {
        id: `approval-${Date.now()}`,
        type: 'approve',
        protocol: 'Symphony',
        from: address,
        to: tokenAddress,
        data: approvalTx.transaction.data,
        estimatedGas: approvalTx.transaction.gasLimit,
        description: approvalTx.metadata.description,
        riskLevel: approvalTx.metadata.riskLevel,
      }

      setPendingTransactions(prev => [...prev, approvalTransaction])
    }

    // Prepare swap transaction
    const swapResult = await symphonyWrapper.prepareSwapTransaction(request)()

    if (swapResult._tag === 'Left') {
      throw new Error(swapResult.left.message || 'Failed to prepare swap')
    }

    const swapPrep = swapResult.right
    const swapTransaction: ProtocolTransaction = {
      id: `swap-${Date.now()}`,
      type: 'swap',
      protocol: 'Symphony',
      from: address,
      to: swapPrep.transaction.to,
      value: swapPrep.transaction.value,
      data: swapPrep.transaction.data,
      estimatedGas: swapPrep.transaction.gasLimit,
      description: swapPrep.metadata.description,
      riskLevel: swapPrep.metadata.riskLevel,
      tokenIn: swapPrep.metadata.tokenIn ? {
        address: swapPrep.metadata.tokenIn.address,
        symbol: swapPrep.metadata.tokenIn.symbol,
        amount: BigInt(swapPrep.metadata.amountIn || '0'),
        decimals: swapPrep.metadata.tokenIn.decimals,
      } : undefined,
      tokenOut: swapPrep.metadata.tokenOut ? {
        address: swapPrep.metadata.tokenOut.address,
        symbol: swapPrep.metadata.tokenOut.symbol,
        amount: BigInt(swapPrep.metadata.amountOut || '0'),
        decimals: swapPrep.metadata.tokenOut.decimals,
      } : undefined,
    }

    setPendingTransactions(prev => [...prev, swapTransaction])
    return swapTransaction
  }, [symphonyWrapper, address])

  const executeTransaction = useCallback(async (transactionId: string) => {
    const transaction = pendingTransactions.find(tx => tx.id === transactionId)
    if (!transaction) {
      throw new Error('Transaction not found')
    }

    try {
      const hash = await sendTransaction({
        to: transaction.to as `0x${string}`,
        value: transaction.value,
        data: transaction.data,
        gasLimit: transaction.estimatedGas,
      })

      // Remove from pending
      setPendingTransactions(prev => prev.filter(tx => tx.id !== transactionId))

      return hash
    } catch (error) {
      console.error('Transaction execution failed:', error)
      throw error
    }
  }, [pendingTransactions, sendTransaction])

  const rejectTransaction = useCallback((transactionId: string) => {
    setPendingTransactions(prev => prev.filter(tx => tx.id !== transactionId))
  }, [])

  return {
    isConnected,
    address,
    pendingTransactions,
    getSwapQuote,
    prepareSwap,
    executeTransaction,
    rejectTransaction,
  }
}