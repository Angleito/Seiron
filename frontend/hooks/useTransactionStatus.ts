'use client';

import { useEffect, useReducer, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { useBlockNumber } from 'wagmi';
import { Hash, TransactionReceipt, Transaction } from 'viem';
// Note: Logger import will be resolved by build system
const logger = {
  error: (message: string, ...args: unknown[]) => console.error(message, ...args)
};
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';

export type TransactionStatus = 
  | 'pending'
  | 'confirmed'
  | 'failed'
  | 'not-found';

export interface TransactionStatusInfo {
  status: TransactionStatus;
  transaction: O.Option<Transaction>;
  receipt: O.Option<TransactionReceipt>;
  confirmations: number;
  timestamp: O.Option<number>;
  error: O.Option<Error>;
  isWatching: boolean;
  lastCheckedBlock: O.Option<bigint>;
}

// Action types for the reducer
export type TransactionStatusAction =
  | { type: 'SET_STATUS'; payload: TransactionStatus }
  | { type: 'SET_TRANSACTION'; payload: Transaction }
  | { type: 'SET_RECEIPT'; payload: TransactionReceipt }
  | { type: 'SET_CONFIRMATIONS'; payload: number }
  | { type: 'SET_TIMESTAMP'; payload: number }
  | { type: 'SET_ERROR'; payload: Error }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_WATCHING'; payload: boolean }
  | { type: 'SET_LAST_CHECKED_BLOCK'; payload: bigint }
  | { type: 'RESET_STATUS' }
  | { type: 'UPDATE_STATUS'; payload: Partial<TransactionStatusInfo> }

export interface UseTransactionStatusOptions {
  // Number of confirmations to wait for
  confirmations?: number;
  // Polling interval in milliseconds
  pollingInterval?: number;
  // Whether to automatically start watching
  watch?: boolean;
  // Callback when status changes
  onStatusChange?: (status: TransactionStatus, info: TransactionStatusInfo) => void;
  // Callback when transaction is confirmed
  onConfirmed?: (receipt: TransactionReceipt) => void;
  // Callback when transaction fails
  onFailed?: (error: Error) => void;
}

// Transaction Status Reducer
const transactionStatusReducer = (
  state: TransactionStatusInfo,
  action: TransactionStatusAction
): TransactionStatusInfo => {
  switch (action.type) {
    case 'SET_STATUS':
      return {
        ...state,
        status: action.payload
      }
    case 'SET_TRANSACTION':
      return {
        ...state,
        transaction: O.some(action.payload)
      }
    case 'SET_RECEIPT':
      return {
        ...state,
        receipt: O.some(action.payload)
      }
    case 'SET_CONFIRMATIONS':
      return {
        ...state,
        confirmations: action.payload
      }
    case 'SET_TIMESTAMP':
      return {
        ...state,
        timestamp: O.some(action.payload)
      }
    case 'SET_ERROR':
      return {
        ...state,
        error: O.some(action.payload),
        status: 'failed'
      }
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: O.none
      }
    case 'SET_WATCHING':
      return {
        ...state,
        isWatching: action.payload
      }
    case 'SET_LAST_CHECKED_BLOCK':
      return {
        ...state,
        lastCheckedBlock: O.some(action.payload)
      }
    case 'RESET_STATUS':
      return {
        ...initialTransactionState,
        isWatching: true
      }
    case 'UPDATE_STATUS':
      return {
        ...state,
        ...action.payload
      }
    default:
      return state
  }
}

// Initial state
const initialTransactionState: TransactionStatusInfo = {
  status: 'pending',
  transaction: O.none,
  receipt: O.none,
  confirmations: 0,
  timestamp: O.none,
  error: O.none,
  isWatching: false,
  lastCheckedBlock: O.none
}

export function useTransactionStatus(
  hash?: Hash,
  options: UseTransactionStatusOptions = {}
) {
  const {
    confirmations: requiredConfirmations = 1,
    pollingInterval = 4000,
    watch = true,
    onStatusChange,
    onConfirmed,
    onFailed
  } = options;

  const publicClient = usePublicClient();
  const { data: currentBlockNumber } = useBlockNumber({ watch: true });

  const [statusInfo, dispatch] = useReducer(transactionStatusReducer, {
    ...initialTransactionState,
    isWatching: watch
  });

  const checkTransactionStatus = useCallback(async () => {
    if (!hash || !publicClient) return;

    try {
      // First, try to get the transaction
      const transaction = await publicClient.getTransaction({ hash }).catch(() => null);
      
      if (!transaction) {
        dispatch({ type: 'SET_STATUS', payload: 'not-found' });
        dispatch({ type: 'SET_ERROR', payload: new Error('Transaction not found') });
        dispatch({ type: 'SET_WATCHING', payload: false });
        
        const newInfo = {
          ...statusInfo,
          status: 'not-found' as const,
          error: O.some(new Error('Transaction not found'))
        };
        onStatusChange?.('not-found', newInfo);
        return;
      }

      dispatch({ type: 'SET_TRANSACTION', payload: transaction });

      // Then try to get the receipt
      const receipt = await publicClient.getTransactionReceipt({ hash }).catch(() => null);
      
      if (!receipt) {
        // Transaction exists but not yet mined
        dispatch({ type: 'SET_STATUS', payload: 'pending' });
        dispatch({ type: 'SET_CONFIRMATIONS', payload: 0 });
        
        const newInfo = {
          ...statusInfo,
          status: 'pending' as const,
          transaction: O.some(transaction),
          confirmations: 0
        };
        onStatusChange?.('pending', newInfo);
        return;
      }

      dispatch({ type: 'SET_RECEIPT', payload: receipt });

      // Calculate confirmations
      const confirmations = currentBlockNumber 
        ? Number(currentBlockNumber - receipt.blockNumber + BigInt(1))
        : 0;

      dispatch({ type: 'SET_CONFIRMATIONS', payload: confirmations });

      // Get block timestamp
      try {
        const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
        const timestamp = Number(block.timestamp) * 1000;
        dispatch({ type: 'SET_TIMESTAMP', payload: timestamp });
      } catch (error) {
        logger.error('Failed to fetch block timestamp:', error);
      }

      // Determine status based on receipt
      const status: TransactionStatus = receipt.status === 'success' 
        ? (confirmations >= requiredConfirmations ? 'confirmed' : 'pending')
        : 'failed';

      const statusChanged = status !== statusInfo.status;
      
      dispatch({ type: 'SET_STATUS', payload: status });
      
      if (status === 'failed') {
        dispatch({ type: 'SET_ERROR', payload: new Error('Transaction reverted') });
      } else {
        dispatch({ type: 'CLEAR_ERROR' });
      }

      const newInfo = {
        ...statusInfo,
        status,
        transaction: O.some(transaction),
        receipt: O.some(receipt),
        confirmations,
        error: status === 'failed' ? O.some(new Error('Transaction reverted')) : O.none
      };
      
      if (statusChanged) {
        onStatusChange?.(status, newInfo);
        
        if (status === 'confirmed') {
          onConfirmed?.(receipt);
          dispatch({ type: 'SET_WATCHING', payload: false });
        } else if (status === 'failed') {
          onFailed?.(newInfo.error ? O.getOrElse(() => new Error('Transaction failed'))(newInfo.error) : new Error('Transaction failed'));
          dispatch({ type: 'SET_WATCHING', payload: false });
        }
      }

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      dispatch({ type: 'SET_ERROR', payload: err });
      dispatch({ type: 'SET_WATCHING', payload: false });
      
      const newInfo = {
        ...statusInfo,
        status: 'failed' as const,
        error: O.some(err)
      };
      onStatusChange?.('failed', newInfo);
      onFailed?.(err);
    }
  }, [hash, publicClient, currentBlockNumber, requiredConfirmations, statusInfo.status, onStatusChange, onConfirmed, onFailed]);

  // Check status when block number changes
  useEffect(() => {
    const lastChecked = O.toNullable(statusInfo.lastCheckedBlock);
    
    if (
      statusInfo.isWatching && 
      hash && 
      currentBlockNumber && 
      currentBlockNumber !== lastChecked &&
      statusInfo.status === 'pending'
    ) {
      dispatch({ type: 'SET_LAST_CHECKED_BLOCK', payload: currentBlockNumber });
      checkTransactionStatus();
    }
  }, [currentBlockNumber, hash, statusInfo.isWatching, statusInfo.lastCheckedBlock, statusInfo.status, checkTransactionStatus]);

  // Initial check and polling
  useEffect(() => {
    if (!statusInfo.isWatching || !hash) return;

    // Initial check
    checkTransactionStatus();

    // Set up polling interval
    const interval = setInterval(() => {
      if (statusInfo.status === 'pending') {
        checkTransactionStatus();
      }
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [hash, statusInfo.isWatching, pollingInterval, checkTransactionStatus, statusInfo.status]);

  const startWatching = useCallback(() => {
    dispatch({ type: 'SET_WATCHING', payload: true });
    checkTransactionStatus();
  }, [checkTransactionStatus]);

  const stopWatching = useCallback(() => {
    dispatch({ type: 'SET_WATCHING', payload: false });
  }, []);

  const retry = useCallback(() => {
    dispatch({ type: 'RESET_STATUS' });
    checkTransactionStatus();
  }, [checkTransactionStatus]);

  return {
    ...statusInfo,
    isPending: statusInfo.status === 'pending',
    isConfirmed: statusInfo.status === 'confirmed',
    isFailed: statusInfo.status === 'failed',
    isNotFound: statusInfo.status === 'not-found',
    startWatching,
    stopWatching,
    retry,
    checkStatus: checkTransactionStatus,
    // Functional getters using fp-ts Option
    getTransaction: () => statusInfo.transaction,
    getReceipt: () => statusInfo.receipt,
    getTimestamp: () => statusInfo.timestamp,
    getError: () => statusInfo.error,
    hasError: () => O.isSome(statusInfo.error),
    getErrorMessage: () => pipe(
      statusInfo.error,
      O.map(error => error.message),
      O.getOrElse(() => '')
    )
  };
}