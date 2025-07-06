'use client';

import { useState, useEffect } from 'react';
import { formatEther, formatUnits } from 'viem';
import { 
  XCircle, 
  Loader2, 
  AlertTriangle, 
  Shield, 
  Zap,
  TrendingUp,
  TrendingDown,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSanitizedContent, SANITIZE_CONFIGS } from '@lib/sanitize';

// Safe text renderer for transaction confirmation
function SafeTransactionText({ text, className = "" }: { text: string; className?: string }) {
  const { sanitized, isValid, warnings } = useSanitizedContent(
    text, 
    SANITIZE_CONFIGS.TRANSACTION_DESCRIPTION
  )
  
  // Log warnings in development
  if (process.env.NODE_ENV === 'development' && warnings.length > 0) {
    console.warn('Transaction text sanitization warnings:', warnings)
  }
  
  // If content is potentially unsafe, show a warning
  if (!isValid) {
    return (
      <div className="text-yellow-400 text-size-3">
        ⚠️ Content filtered for security
      </div>
    )
  }
  
  return <span className={className}>{sanitized}</span>
}

interface TokenInfo {
  address: string;
  symbol: string;
  amount: bigint;
  decimals: number;
  price?: number;
  logoUrl?: string;
}

interface TransactionPreview {
  type: 'swap' | 'lend' | 'borrow' | 'withdraw' | 'supply' | 'provide-liquidity' | 'remove-liquidity' | 'stake' | 'unstake';
  protocol: string;
  action: string;
  tokenIn?: TokenInfo;
  tokenOut?: TokenInfo;
  estimatedGas: bigint;
  gasPrice: bigint;
  slippage?: number;
  deadline?: number;
  priceImpact?: number;
  minReceived?: bigint;
  exchangeRate?: number;
  apy?: number;
  healthFactor?: {
    before: number;
    after: number;
  };
}

interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  factors: {
    type: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
  }[];
  recommendations?: string[];
}

interface TransactionConfirmationProps {
  preview: TransactionPreview;
  riskAssessment: RiskAssessment;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
  simulationResult?: {
    success: boolean;
    error?: string;
  };
}

export function TransactionConfirmation({
  preview,
  riskAssessment,
  onConfirm,
  onCancel,
  isProcessing = false,
  simulationResult
}: TransactionConfirmationProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // High risk transactions require countdown
  useEffect(() => {
    if (riskAssessment.level === 'high' || riskAssessment.level === 'critical') {
      setCountdown(5);
    }
  }, [riskAssessment.level]);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [countdown]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'high': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'critical': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low': return <Shield className="w-5 h-5" />;
      case 'medium': return <AlertTriangle className="w-5 h-5" />;
      case 'high': return <AlertTriangle className="w-5 h-5" />;
      case 'critical': return <XCircle className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const getActionDescription = () => {
    switch (preview.type) {
      case 'swap':
        return `Swap ${formatUnits(preview.tokenIn!.amount, preview.tokenIn!.decimals)} ${preview.tokenIn!.symbol} for ${formatUnits(preview.tokenOut!.amount, preview.tokenOut!.decimals)} ${preview.tokenOut!.symbol}`;
      case 'lend':
      case 'supply':
        return `Supply ${formatUnits(preview.tokenIn!.amount, preview.tokenIn!.decimals)} ${preview.tokenIn!.symbol} to ${preview.protocol}`;
      case 'borrow':
        return `Borrow ${formatUnits(preview.tokenOut!.amount, preview.tokenOut!.decimals)} ${preview.tokenOut!.symbol} from ${preview.protocol}`;
      case 'withdraw':
        return `Withdraw ${formatUnits(preview.tokenOut!.amount, preview.tokenOut!.decimals)} ${preview.tokenOut!.symbol} from ${preview.protocol}`;
      case 'provide-liquidity':
        return `Add liquidity to ${preview.tokenIn!.symbol}/${preview.tokenOut!.symbol} pool`;
      case 'remove-liquidity':
        return `Remove liquidity from ${preview.protocol} pool`;
      default:
        return preview.action;
    }
  };

  const canConfirm = countdown === null || countdown === 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="bg-gradient-to-br from-gray-900 via-black to-red-950 border border-red-500/20 rounded-lg shadow-[0_0_50px_rgba(239,68,68,0.3)]">
        {/* Header */}
        <div className="p-6 border-b border-red-500/10">
          <h2 className="text-size-1 font-semibold text-white mb-2">Confirm Transaction</h2>
          <p className="text-gray-400">{getActionDescription()}</p>
        </div>

        {/* Risk Assessment */}
        <div className="p-6 border-b border-red-500/10">
          <div className={`flex items-center justify-between p-4 rounded-lg border ${getRiskColor(riskAssessment.level)}`}>
            <div className="flex items-center space-x-3">
              {getRiskIcon(riskAssessment.level)}
              <div>
                <p className="font-normal">Risk Level: {riskAssessment.level.toUpperCase()}</p>
                <p className="text-size-3 opacity-80">Risk Score: {riskAssessment.score}/100</p>
              </div>
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-size-3 underline hover:no-underline"
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </button>
          </div>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 space-y-3 overflow-hidden"
              >
                {riskAssessment.factors.map((factor, index) => (
                  <div key={index} className="flex items-start space-x-2 text-size-3">
                    <span className={`mt-1 ${
                      factor.severity === 'high' ? 'text-red-400' : 
                      factor.severity === 'medium' ? 'text-yellow-400' : 
                      'text-green-400'
                    }`}>•</span>
                    <SafeTransactionText text={factor.message} className="text-gray-300" />
                  </div>
                ))}
                {riskAssessment.recommendations && riskAssessment.recommendations.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-blue-400 font-normal text-size-3 mb-2">Recommendations:</p>
                    {riskAssessment.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <span className="text-size-3 text-gray-300">•</span>
                        <SafeTransactionText text={rec} className="text-size-3 text-gray-300" />
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Transaction Details */}
        <div className="p-6 space-y-4">
          {/* Token swap visualization */}
          {preview.tokenIn && preview.tokenOut && (
            <div className="bg-black/50 rounded-lg p-4 border border-red-500/10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-gray-400 text-size-3 mb-1">You Pay</p>
                  <p className="text-white text-size-1 font-normal">
                    {formatUnits(preview.tokenIn.amount, preview.tokenIn.decimals)} {preview.tokenIn.symbol}
                  </p>
                  {preview.tokenIn.price && (
                    <p className="text-gray-500 text-size-3">
                      ≈ ${(Number(formatUnits(preview.tokenIn.amount, preview.tokenIn.decimals)) * preview.tokenIn.price).toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="px-4">
                  <Zap className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1 text-right">
                  <p className="text-gray-400 text-size-3 mb-1">You Receive</p>
                  <p className="text-white text-size-1 font-normal">
                    {formatUnits(preview.tokenOut.amount, preview.tokenOut.decimals)} {preview.tokenOut.symbol}
                  </p>
                  {preview.tokenOut.price && (
                    <p className="text-gray-500 text-size-3">
                      ≈ ${(Number(formatUnits(preview.tokenOut.amount, preview.tokenOut.decimals)) * preview.tokenOut.price).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Additional metrics */}
          <div className="grid grid-cols-2 gap-4">
            {preview.priceImpact !== undefined && (
              <div className="bg-black/50 rounded-lg p-3 border border-red-500/10">
                <p className="text-gray-400 text-size-3">Price Impact</p>
                <p className={`font-normal ${preview.priceImpact > 3 ? 'text-red-400' : 'text-white'}`}>
                  {preview.priceImpact.toFixed(2)}%
                </p>
              </div>
            )}
            {preview.slippage !== undefined && (
              <div className="bg-black/50 rounded-lg p-3 border border-red-500/10">
                <p className="text-gray-400 text-size-3">Max Slippage</p>
                <p className="text-white font-normal">{preview.slippage}%</p>
              </div>
            )}
            {preview.apy !== undefined && (
              <div className="bg-black/50 rounded-lg p-3 border border-red-500/10">
                <p className="text-gray-400 text-size-3">APY</p>
                <p className="text-green-400 font-normal">{preview.apy.toFixed(2)}%</p>
              </div>
            )}
            <div className="bg-black/50 rounded-lg p-3 border border-red-500/10">
              <p className="text-gray-400 text-size-3">Network Fee</p>
              <p className="text-white font-normal">
                {formatEther(preview.estimatedGas * preview.gasPrice)} SEI
              </p>
            </div>
          </div>

          {/* Health Factor */}
          {preview.healthFactor && (
            <div className="bg-black/50 rounded-lg p-4 border border-red-500/10">
              <p className="text-gray-400 text-size-3 mb-2">Health Factor Impact</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-white">{preview.healthFactor.before.toFixed(2)}</span>
                  <span className="text-gray-500">→</span>
                  <span className={preview.healthFactor.after < 1.5 ? 'text-red-400' : 'text-white'}>
                    {preview.healthFactor.after.toFixed(2)}
                  </span>
                </div>
                {preview.healthFactor.after < preview.healthFactor.before ? (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                )}
              </div>
              {preview.healthFactor.after < 1.5 && (
                <p className="text-yellow-400 text-size-3 mt-2">
                  ⚠️ Health factor will be below safe threshold
                </p>
              )}
            </div>
          )}

          {/* Simulation Result */}
          {simulationResult && !simulationResult.success && (
            <div className="flex items-start space-x-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
              <div>
                <p className="text-size-3 text-red-300 font-normal">Simulation Failed</p>
                <SafeTransactionText text={simulationResult.error || 'Unknown error'} className="text-size-3 text-red-300/80" />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-red-500/10">
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-normal"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isProcessing || !canConfirm || (simulationResult && !simulationResult.success)}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg hover:from-red-500 hover:to-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-normal flex items-center justify-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : countdown !== null && countdown > 0 ? (
                <span>Confirm ({countdown}s)</span>
              ) : (
                <span>Confirm Transaction</span>
              )}
            </button>
          </div>
          {(riskAssessment.level === 'high' || riskAssessment.level === 'critical') && countdown !== null && countdown > 0 && (
            <p className="text-center text-size-3 text-gray-400 mt-2">
              High risk transaction requires {countdown} second review period
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}