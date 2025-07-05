'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePublicClient, useBlockNumber } from 'wagmi';
import { Hash, TransactionReceipt, Transaction } from 'viem';
import { logger } from '@/lib/logger';

export type TransactionStatus = 
  | 'pending'
  | 'confirmed'
  | 'failed'
  | 'not-found';

export interface TransactionStatusInfo {
  status: TransactionStatus;
  transaction?: Transaction;
  receipt?: TransactionReceipt;
  confirmations: number;
  timestamp?: number;
  error?: Error;
}

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

  const [statusInfo, setStatusInfo] = useState<TransactionStatusInfo>({
    status: 'pending',
    confirmations: 0
  });

  const [isWatching, setIsWatching] = useState(watch);
  const [lastCheckedBlock, setLastCheckedBlock] = useState<bigint | null>(null);

  const checkTransactionStatus = useCallback(async () => {
    if (!hash || !publicClient) return;

    try {
      // First, try to get the transaction
      const transaction = await publicClient.getTransaction({ hash }).catch(() => null);
      
      if (!transaction) {
        const newInfo: TransactionStatusInfo = {
          status: 'not-found',
          confirmations: 0,
          error: new Error('Transaction not found')
        };
        setStatusInfo(newInfo);
        onStatusChange?.('not-found', newInfo);
        return;
      }

      // Then try to get the receipt
      const receipt = await publicClient.getTransactionReceipt({ hash }).catch(() => null);
      
      if (!receipt) {
        // Transaction exists but not yet mined
        const newInfo: TransactionStatusInfo = {
          status: 'pending',
          transaction,
          confirmations: 0
        };
        setStatusInfo(newInfo);
        onStatusChange?.('pending', newInfo);
        return;
      }

      // Calculate confirmations
      const confirmations = currentBlockNumber 
        ? Number(currentBlockNumber - receipt.blockNumber + 1n)
        : 0;

      // Get block timestamp
      let timestamp: number | undefined;
      try {
        const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
        timestamp = Number(block.timestamp) * 1000;
      } catch (error) {
        logger.error('Failed to fetch block timestamp:', error);
      }

      // Determine status based on receipt
      const status: TransactionStatus = receipt.status === 'success' 
        ? (confirmations >= requiredConfirmations ? 'confirmed' : 'pending')
        : 'failed';

      const newInfo: TransactionStatusInfo = {
        status,
        transaction,
        receipt,
        confirmations,
        timestamp,
        error: status === 'failed' ? new Error('Transaction reverted') : undefined
      };

      // Check if status changed
      const statusChanged = newInfo.status !== statusInfo.status;
      
      setStatusInfo(newInfo);
      
      if (statusChanged) {
        onStatusChange?.(status, newInfo);
        
        if (status === 'confirmed') {
          onConfirmed?.(receipt);
          setIsWatching(false); // Stop watching once confirmed
        } else if (status === 'failed') {
          onFailed?.(newInfo.error || new Error('Transaction failed'));
          setIsWatching(false); // Stop watching on failure
        }
      }

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      const newInfo: TransactionStatusInfo = {
        status: 'failed',
        confirmations: 0,
        error: err
      };
      setStatusInfo(newInfo);
      onStatusChange?.('failed', newInfo);
      onFailed?.(err);
      setIsWatching(false);
    }
  }, [hash, publicClient, currentBlockNumber, requiredConfirmations, statusInfo.status, onStatusChange, onConfirmed, onFailed]);

  // Check status when block number changes
  useEffect(() => {
    if (
      isWatching && 
      hash && 
      currentBlockNumber && 
      currentBlockNumber !== lastCheckedBlock &&
      statusInfo.status === 'pending'
    ) {
      setLastCheckedBlock(currentBlockNumber);
      checkTransactionStatus();
    }
  }, [currentBlockNumber, hash, isWatching, lastCheckedBlock, statusInfo.status, checkTransactionStatus]);

  // Initial check and polling
  useEffect(() => {
    if (!isWatching || !hash) return;

    // Initial check
    checkTransactionStatus();

    // Set up polling interval
    const interval = setInterval(() => {
      if (statusInfo.status === 'pending') {
        checkTransactionStatus();
      }
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [hash, isWatching, pollingInterval, checkTransactionStatus, statusInfo.status]);

  const startWatching = useCallback(() => {
    setIsWatching(true);
    checkTransactionStatus();
  }, [checkTransactionStatus]);

  const stopWatching = useCallback(() => {
    setIsWatching(false);
  }, []);

  const retry = useCallback(() => {
    setStatusInfo({
      status: 'pending',
      confirmations: 0
    });
    setIsWatching(true);
    checkTransactionStatus();
  }, [checkTransactionStatus]);

  return {
    ...statusInfo,
    isWatching,
    isPending: statusInfo.status === 'pending',
    isConfirmed: statusInfo.status === 'confirmed',
    isFailed: statusInfo.status === 'failed',
    isNotFound: statusInfo.status === 'not-found',
    startWatching,
    stopWatching,
    retry,
    checkStatus: checkTransactionStatus
  };
}