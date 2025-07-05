import { useWalletClient, usePublicClient } from '@privy-io/wagmi'
import { usePrivy } from '@privy-io/react-auth'
import { parseEther, encodeFunctionData, type Address } from 'viem'
import { seiMainnet } from '@/config/privy'
import { logger } from '@/lib/logger'

export interface TransactionRequest {
  to: Address
  value?: bigint
  data?: `0x${string}`
  gasLimit?: bigint
}

export interface PreparedTransaction {
  from: Address
  to: Address
  value?: bigint
  data?: `0x${string}`
  gas?: bigint
  chainId: number
}

export function useWalletOperations() {
  const { authenticated, user } = usePrivy()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  const prepareTransaction = async (
    request: TransactionRequest
  ): Promise<PreparedTransaction | null> => {
    if (!walletClient || !publicClient) {
      logger.error('Wallet or public client not available')
      return null
    }

    try {
      // Estimate gas if not provided
      const gasEstimate = request.gasLimit || await publicClient.estimateGas({
        account: walletClient.account!,
        to: request.to,
        value: request.value,
        data: request.data,
      })

      return {
        from: walletClient.account!.address,
        to: request.to,
        value: request.value,
        data: request.data,
        gas: gasEstimate,
        chainId: seiMainnet.id,
      }
    } catch (error) {
      logger.error('Failed to prepare transaction:', error)
      return null
    }
  }

  const sendTransaction = async (request: TransactionRequest) => {
    if (!walletClient) {
      throw new Error('Wallet not connected')
    }

    try {
      const hash = await walletClient.sendTransaction({
        account: walletClient.account!,
        to: request.to,
        value: request.value,
        data: request.data,
        gas: request.gasLimit,
      })

      return hash
    } catch (error) {
      logger.error('Failed to send transaction:', error)
      throw error
    }
  }

  const signMessage = async (message: string) => {
    if (!walletClient) {
      throw new Error('Wallet not connected')
    }

    try {
      const signature = await walletClient.signMessage({
        account: walletClient.account!,
        message,
      })

      return signature
    } catch (error) {
      logger.error('Failed to sign message:', error)
      throw error
    }
  }

  const signTypedData = async (typedData: any) => {
    if (!walletClient) {
      throw new Error('Wallet not connected')
    }

    try {
      const signature = await walletClient.signTypedData({
        account: walletClient.account!,
        ...typedData,
      })

      return signature
    } catch (error) {
      logger.error('Failed to sign typed data:', error)
      throw error
    }
  }

  const waitForTransaction = async (hash: `0x${string}`) => {
    if (!publicClient) {
      throw new Error('Public client not available')
    }

    try {
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      return receipt
    } catch (error) {
      logger.error('Failed to wait for transaction:', error)
      throw error
    }
  }

  return {
    isConnected: authenticated && !!walletClient,
    address: walletClient?.account?.address,
    walletClient,
    publicClient,
    prepareTransaction,
    sendTransaction,
    signMessage,
    signTypedData,
    waitForTransaction,
  }
}