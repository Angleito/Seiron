'use client';

import { useEffect, useState } from 'react';
import { formatEther, formatUnits } from 'viem';
import { useWaitForTransactionReceipt } from '@privy-io/wagmi';
import { CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useWalletOperations } from '@/hooks/useWalletOperations';
import { logger } from '@/lib/logger';

interface TransactionDetails {
  id: string;
  type: 'swap' | 'lend' | 'borrow' | 'withdraw' | 'supply';
  protocol: string;
  from: string;
  to?: string;
  value?: bigint;
  data?: string;
  tokenIn?: {
    address: string;
    symbol: string;
    amount: bigint;
    decimals: number;
  };
  tokenOut?: {
    address: string;
    symbol: string;
    amount: bigint;
    decimals: number;
  };
  estimatedGas?: bigint;
  gasPrice?: bigint;
  riskLevel?: 'low' | 'medium' | 'high';
  description?: string;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionDetails | null;
  onApprove: (txId: string, txHash: string) => void;
  onReject: (txId: string) => void;
}

export function TransactionModal({
  isOpen,
  onClose,
  transaction,
  onApprove,
  onReject,
}: TransactionModalProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const { sendTransaction, isConnected } = useWalletOperations();
  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (receipt) {
      setIsApproving(false);
    }
  }, [receipt]);

  if (!isOpen || !transaction) return null;

  const handleApprove = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    setIsApproving(true);
    try {
      const hash = await sendTransaction({
        to: transaction.to as `0x${string}`,
        value: transaction.value,
        data: transaction.data as `0x${string}`,
        gasLimit: transaction.estimatedGas,
      });
      
      setTxHash(hash);
      onApprove(transaction.id, hash);
    } catch (error) {
      logger.error('Transaction failed:', error);
      setIsApproving(false);
      alert('Transaction failed. Please try again.');
    }
  };

  const handleReject = () => {
    onReject(transaction.id);
    onClose();
  };

  const getRiskColor = (level?: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'swap': return 'Token Swap';
      case 'lend': return 'Lending';
      case 'borrow': return 'Borrowing';
      case 'withdraw': return 'Withdrawal';
      case 'supply': return 'Supply';
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 via-black to-red-950 border border-red-500/20 rounded-lg max-w-md w-full p-6 shadow-[0_0_50px_rgba(239,68,68,0.3)]">
        <h2 className="text-2xl font-bold text-white mb-4">Transaction Approval Required</h2>
        
        <div className="space-y-4 mb-6">
          <div className="bg-black/50 rounded-lg p-4 border border-red-500/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Type</span>
              <span className="text-white font-medium">{getTypeLabel(transaction.type)}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Protocol</span>
              <span className="text-white font-medium">{transaction.protocol}</span>
            </div>
            {transaction.riskLevel && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Risk Level</span>
                <span className={`font-medium ${getRiskColor(transaction.riskLevel)}`}>
                  {transaction.riskLevel.toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {transaction.tokenIn && transaction.tokenOut && (
            <div className="bg-black/50 rounded-lg p-4 border border-red-500/10">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-gray-400 text-sm">From</p>
                  <p className="text-white font-medium">
                    {formatUnits(transaction.tokenIn.amount, transaction.tokenIn.decimals)} {transaction.tokenIn.symbol}
                  </p>
                </div>
                <span className="text-red-400">→</span>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">To</p>
                  <p className="text-white font-medium">
                    {formatUnits(transaction.tokenOut.amount, transaction.tokenOut.decimals)} {transaction.tokenOut.symbol}
                  </p>
                </div>
              </div>
            </div>
          )}

          {transaction.estimatedGas && (
            <div className="bg-black/50 rounded-lg p-4 border border-red-500/10">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Estimated Gas</span>
                <span className="text-white font-medium">
                  {formatEther(transaction.estimatedGas)} SEI
                </span>
              </div>
            </div>
          )}

          {transaction.description && (
            <div className="bg-black/50 rounded-lg p-4 border border-red-500/10">
              <p className="text-gray-300">{transaction.description}</p>
            </div>
          )}

          {transaction.riskLevel === 'high' && (
            <div className="flex items-start space-x-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">
                This transaction has been flagged as high risk. Please review carefully before proceeding.
              </p>
            </div>
          )}
        </div>

        {receipt ? (
          <div className="flex items-center justify-center space-x-2 p-4 bg-green-500/10 border border-green-500/30 rounded-lg mb-4">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-300">Transaction confirmed!</span>
          </div>
        ) : isConfirming ? (
          <div className="flex items-center justify-center space-x-2 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-4">
            <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
            <span className="text-yellow-300">Waiting for confirmation...</span>
          </div>
        ) : null}

        <div className="flex space-x-3">
          <button
            onClick={handleReject}
            disabled={isApproving || isConfirming}
            className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Reject
          </button>
          <button
            onClick={handleApprove}
            disabled={isApproving || isConfirming || !!receipt || !isConnected}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg hover:from-red-500 hover:to-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
          >
            {isApproving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Approving...</span>
              </>
            ) : receipt ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Approved</span>
              </>
            ) : (
              <span>Approve in Wallet</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}