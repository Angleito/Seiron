'use client';

import { useState, useCallback, useRef } from 'react';
import { useWalletClient, usePublicClient, useAccount } from 'wagmi';
import { Hash, TransactionReceipt } from 'viem';
import { toast } from 'sonner';
import { logger } from '@lib/logger';

export type TransactionStep = 
  | 'idle'
  | 'preparing'
  | 'simulating'
  | 'awaiting-approval'
  | 'approved'
  | 'signing'
  | 'broadcasting'
  | 'confirming'
  | 'confirmed'
  | 'failed';

export interface TransactionRequest {
  to: `0x${string}`;
  data?: `0x${string}`;
  value?: bigint;
  gas?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  nonce?: number;
}

export interface TransactionFlowState {
  step: TransactionStep;
  txHash?: Hash;
  receipt?: TransactionReceipt;
  error?: Error;
  simulationResult?: {
    success: boolean;
    error?: string;
    gasEstimate?: bigint;
  };
}

export interface UseTransactionFlowOptions {
  onStepChange?: (step: TransactionStep) => void;
  onSuccess?: (receipt: TransactionReceipt) => void;
  onError?: (error: Error, step: TransactionStep) => void;
  simulateFirst?: boolean;
  confirmations?: number;
}

export function useTransactionFlow(options: UseTransactionFlowOptions = {}) {
  const { 
    onStepChange, 
    onSuccess, 
    onError, 
    simulateFirst = true,
    confirmations = 1
  } = options;

  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address, chain } = useAccount();
  
  const [state, setState] = useState<TransactionFlowState>({
    step: 'idle'
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const updateState = useCallback((updates: Partial<TransactionFlowState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      if (updates.step && updates.step !== prev.step) {
        onStepChange?.(updates.step);
      }
      return newState;
    });
  }, [onStepChange]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    updateState({
      step: 'idle',
      txHash: undefined,
      receipt: undefined,
      error: undefined,
      simulationResult: undefined
    });
  }, [updateState]);

  const simulate = useCallback(async (request: TransactionRequest) => {
    if (!publicClient || !address) {
      throw new Error('Public client or address not available');
    }

    try {
      // Simulate transaction
      const result = await publicClient.simulateContract({
        address: request.to,
        abi: [], // You might want to pass the ABI here
        functionName: 'unknown', // This would be dynamic based on the transaction
        account: address,
        value: request.value,
        gas: request.gas,
      }).catch((error) => {
        // If simulation fails, we still allow the transaction but warn the user
        return { success: false, error: error.message };
      });

      // Estimate gas if not provided
      let gasEstimate = request.gas;
      if (!gasEstimate) {
        gasEstimate = await publicClient.estimateGas({
          account: address,
          to: request.to,
          data: request.data,
          value: request.value,
        });
      }

      return {
        success: result !== null && !('error' in result),
        error: result && 'error' in result ? result.error : undefined,
        gasEstimate
      };
    } catch (error) {
      logger.error('Simulation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown simulation error',
        gasEstimate: request.gas
      };
    }
  }, [publicClient, address]);

  const execute = useCallback(async (
    request: TransactionRequest,
    options?: {
      skipSimulation?: boolean;
      onApprove?: () => void;
      onReject?: () => void;
    }
  ) => {
    const { skipSimulation = false, onApprove, onReject } = options || {};

    if (!walletClient || !publicClient || !address || !chain) {
      throw new Error('Wallet not connected');
    }

    // Create new abort controller for this transaction
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // Step 1: Prepare
      updateState({ step: 'preparing', error: undefined });

      // Step 2: Simulate (if enabled)
      if (simulateFirst && !skipSimulation) {
        updateState({ step: 'simulating' });
        
        const simulationResult = await simulate(request);
        updateState({ simulationResult });

        if (!simulationResult.success && simulationResult.error) {
          // Continue but warn user
          toast.warning('Transaction simulation failed', {
            description: simulationResult.error
          });
        }

        // Update gas estimate if we got one
        if (simulationResult.gasEstimate) {
          request.gas = simulationResult.gasEstimate;
        }
      }

      // Check if aborted
      if (signal.aborted) {
        throw new Error('Transaction cancelled');
      }

      // Step 3: Await user approval
      updateState({ step: 'awaiting-approval' });
      
      // This is where you would show the confirmation modal
      // For now, we'll proceed directly
      // In real implementation, this would wait for user confirmation
      
      // Step 4: Mark as approved
      updateState({ step: 'approved' });
      onApprove?.();

      // Step 5: Sign transaction
      updateState({ step: 'signing' });
      
      const hash = await walletClient.sendTransaction({
        account: address,
        chain,
        to: request.to,
        data: request.data,
        value: request.value,
        gas: request.gas,
        gasPrice: request.gasPrice,
        maxFeePerGas: request.maxFeePerGas,
        maxPriorityFeePerGas: request.maxPriorityFeePerGas,
        nonce: request.nonce,
      });

      // Check if aborted
      if (signal.aborted) {
        throw new Error('Transaction cancelled');
      }

      updateState({ step: 'broadcasting', txHash: hash });
      toast.info('Transaction sent', {
        description: `Hash: ${hash.slice(0, 10)}...${hash.slice(-8)}`
      });

      // Step 6: Wait for confirmation
      updateState({ step: 'confirming' });
      
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations,
      });

      // Check if aborted
      if (signal.aborted) {
        throw new Error('Transaction cancelled');
      }

      // Step 7: Confirmed
      updateState({ step: 'confirmed', receipt });
      
      if (receipt.status === 'success') {
        toast.success('Transaction confirmed', {
          description: `Block: ${receipt.blockNumber}`
        });
        onSuccess?.(receipt);
      } else {
        throw new Error('Transaction reverted');
      }

      return receipt;

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      
      updateState({ step: 'failed', error: err });
      
      if (!signal.aborted) {
        toast.error('Transaction failed', {
          description: err.message
        });
        onError?.(err, state.step);
      }
      
      onReject?.();
      throw err;
    }
  }, [walletClient, publicClient, address, chain, simulateFirst, simulate, updateState, onSuccess, onError, state.step]);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    updateState({ step: 'failed', error: new Error('Transaction aborted by user') });
  }, [updateState]);

  return {
    state,
    execute,
    reset,
    abort,
    isIdle: state.step === 'idle',
    isPending: ['preparing', 'simulating', 'awaiting-approval', 'signing', 'broadcasting', 'confirming'].includes(state.step),
    isConfirmed: state.step === 'confirmed',
    isFailed: state.step === 'failed',
  };
}