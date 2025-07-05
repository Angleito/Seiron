'use client';

import { useState } from 'react';
import { parseEther, parseUnits } from 'viem';
import { useAccount } from 'wagmi';
import { Toaster } from 'sonner';
import { TransactionConfirmation } from './TransactionConfirmation';
import { TransactionPreview, TransactionPreviewData } from './TransactionPreview';
import { RiskWarning, RiskAssessmentData } from './RiskWarning';
import { useTransactionFlow } from '../../hooks/useTransactionFlow';
import { useTransactionStatus } from '../../hooks/useTransactionStatus';
import { logger } from '@lib/logger';

export function TransactionDemo() {
  const { address } = useAccount();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<'swap' | 'lend' | 'high-risk'>('swap');

  const { state, execute, reset } = useTransactionFlow({
    onSuccess: (receipt) => {
      logger.info('Transaction successful:', receipt);
      setShowConfirmation(false);
    },
    onError: (error) => {
      logger.error('Transaction failed:', error);
    }
  });

  // Demo transaction data
  const swapPreview: TransactionPreviewData = {
    type: 'swap',
    protocol: { name: 'DragonSwap', type: 'dex' },
    inputToken: {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'SEI',
      amount: parseEther('100'),
      decimals: 18,
      price: 0.45
    },
    outputToken: {
      address: '0x1234567890123456789012345678901234567890',
      symbol: 'USDC',
      amount: parseUnits('44.5', 6),
      decimals: 6,
      price: 1
    },
    exchangeRate: 0.445,
    priceImpact: 0.5,
    slippage: 0.5,
    minimumReceived: parseUnits('44.28', 6),
    estimatedGas: BigInt(200000),
    gasPrice: parseUnits('5', 9),
    deadline: 20
  };

  const lendPreview: TransactionPreviewData = {
    type: 'supply',
    protocol: { name: 'Yei Finance', type: 'lending' },
    inputToken: {
      address: '0x1234567890123456789012345678901234567890',
      symbol: 'USDC',
      amount: parseUnits('1000', 6),
      decimals: 6,
      price: 1
    },
    apy: 8.5,
    healthFactor: { current: 2.5, after: 3.2 },
    estimatedGas: BigInt(150000),
    gasPrice: parseUnits('5', 9),
  };

  const highRiskPreview: TransactionPreviewData = {
    type: 'swap',
    protocol: { name: 'Unknown DEX', type: 'dex' },
    inputToken: {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'SEI',
      amount: parseEther('1000'),
      decimals: 18,
      price: 0.45
    },
    outputToken: {
      address: '0x9999999999999999999999999999999999999999',
      symbol: 'MEME',
      amount: parseUnits('1000000', 18),
      decimals: 18,
      price: 0.0004
    },
    exchangeRate: 1000,
    priceImpact: 15.5,
    slippage: 5,
    estimatedGas: BigInt(300000),
    gasPrice: parseUnits('5', 9),
  };

  const swapRiskAssessment: RiskAssessmentData = {
    level: 'low',
    score: 85,
    summary: 'This transaction appears safe with minimal risks.',
    factors: [
      {
        id: '1',
        type: 'price-impact',
        severity: 'low',
        title: 'Low Price Impact',
        description: 'Price impact is within acceptable range (0.5%)',
        impact: 'You will receive close to market rate',
        mitigation: 'Consider splitting large trades'
      },
      {
        id: '2',
        type: 'protocol',
        severity: 'low',
        title: 'Established Protocol',
        description: 'DragonSwap is a well-audited DEX on Sei',
        impact: 'Low smart contract risk',
      }
    ],
    recommendations: [
      'Transaction looks good to proceed',
      'Consider setting slippage to 0.5% or lower'
    ],
    protocolAudits: [
      {
        name: 'DragonSwap V2 Audit',
        date: '2024-01-15',
        auditor: 'CertiK',
        reportUrl: '#'
      }
    ]
  };

  const lendRiskAssessment: RiskAssessmentData = {
    level: 'medium',
    score: 65,
    summary: 'Moderate risk due to lending protocol exposure.',
    factors: [
      {
        id: '1',
        type: 'smart-contract',
        severity: 'medium',
        title: 'Smart Contract Risk',
        description: 'Lending protocols carry inherent smart contract risks',
        impact: 'Potential loss of funds if exploited',
        mitigation: 'Only supply what you can afford to lose'
      },
      {
        id: '2',
        type: 'liquidity',
        severity: 'low',
        title: 'Withdrawal Availability',
        description: 'Funds may not always be immediately withdrawable',
        impact: 'Temporary inability to access funds',
        mitigation: 'Monitor utilization rates'
      }
    ],
    recommendations: [
      'Start with a smaller amount to test the protocol',
      'Monitor your position regularly',
      'Be aware of the current utilization rate'
    ]
  };

  const highRiskAssessment: RiskAssessmentData = {
    level: 'critical',
    score: 25,
    summary: 'This transaction carries extreme risks and is not recommended.',
    factors: [
      {
        id: '1',
        type: 'price-impact',
        severity: 'critical',
        title: 'Extreme Price Impact',
        description: 'Price impact of 15.5% will result in significant loss',
        impact: 'You will lose approximately $69.75 to slippage',
        mitigation: 'Reduce trade size or use a different pool'
      },
      {
        id: '2',
        type: 'protocol',
        severity: 'high',
        title: 'Unknown Protocol',
        description: 'This protocol has not been audited or verified',
        impact: 'High risk of scams or exploits',
        mitigation: 'Use only verified protocols'
      },
      {
        id: '3',
        type: 'liquidity',
        severity: 'high',
        title: 'Low Liquidity',
        description: 'The pool has insufficient liquidity for this trade',
        impact: 'Extreme slippage and potential failed transactions',
        mitigation: 'Trade smaller amounts or find deeper liquidity'
      }
    ],
    recommendations: [
      'DO NOT proceed with this transaction',
      'Find a more liquid pool or reduce trade size significantly',
      'Verify the protocol before trading',
      'Consider the extreme price impact'
    ]
  };

  const getCurrentPreview = () => {
    switch (selectedDemo) {
      case 'swap': return swapPreview;
      case 'lend': return lendPreview;
      case 'high-risk': return highRiskPreview;
    }
  };

  const getCurrentRiskAssessment = () => {
    switch (selectedDemo) {
      case 'swap': return swapRiskAssessment;
      case 'lend': return lendRiskAssessment;
      case 'high-risk': return highRiskAssessment;
    }
  };

  const handleConfirm = async () => {
    if (!address) {
      logger.error('No wallet connected');
      return;
    }

    // Demo transaction request
    const txRequest = {
      to: '0x742d35Cc6634C0532925a3b844Bc9e7595f7F3eE' as `0x${string}`,
      value: parseEther('0.1'),
      data: '0x' as `0x${string}`,
    };

    try {
      await execute(txRequest, {
        onApprove: () => logger.debug('Transaction approved by user'),
        onReject: () => logger.debug('Transaction rejected by user')
      });
    } catch (error) {
      logger.error('Transaction execution failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950 p-8">
      <Toaster position="top-right" theme="dark" />
      
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Transaction Components Demo</h1>
          <p className="text-gray-400">Demonstrating transaction confirmation, preview, and risk warning components</p>
        </div>

        {/* Demo Selector */}
        <div className="flex space-x-4">
          <button
            onClick={() => setSelectedDemo('swap')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedDemo === 'swap' 
                ? 'bg-red-500 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Safe Swap
          </button>
          <button
            onClick={() => setSelectedDemo('lend')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedDemo === 'lend' 
                ? 'bg-red-500 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Lending Supply
          </button>
          <button
            onClick={() => setSelectedDemo('high-risk')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedDemo === 'high-risk' 
                ? 'bg-red-500 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            High Risk Trade
          </button>
        </div>

        {/* Transaction Preview */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Transaction Preview</h2>
          <TransactionPreview data={getCurrentPreview()} showDetails={true} />
        </div>

        {/* Risk Warning */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Risk Assessment</h2>
          <RiskWarning 
            assessment={getCurrentRiskAssessment()} 
            showDetails={true}
            requiresAcknowledgment={selectedDemo === 'high-risk'}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowConfirmation(true)}
            className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg hover:from-red-500 hover:to-red-400 transition-all font-semibold"
          >
            Open Confirmation Modal
          </button>
        </div>

        {/* Transaction Status */}
        {state.txHash && (
          <div className="bg-gray-900 border border-red-500/20 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-2">Transaction Status</h3>
            <p className="text-gray-400 text-sm">Hash: {state.txHash}</p>
            <p className="text-gray-400 text-sm">Status: {state.step}</p>
          </div>
        )}

        {/* Transaction Confirmation Modal */}
        {showConfirmation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <TransactionConfirmation
              preview={{
                type: getCurrentPreview().type,
                protocol: getCurrentPreview().protocol.name,
                action: 'Execute transaction',
                tokenIn: getCurrentPreview().inputToken,
                tokenOut: getCurrentPreview().outputToken,
                estimatedGas: getCurrentPreview().estimatedGas,
                gasPrice: getCurrentPreview().gasPrice,
                slippage: getCurrentPreview().slippage,
                priceImpact: getCurrentPreview().priceImpact,
                exchangeRate: getCurrentPreview().exchangeRate,
                apy: getCurrentPreview().apy,
                healthFactor: getCurrentPreview().healthFactor
              }}
              riskAssessment={getCurrentRiskAssessment()}
              onConfirm={handleConfirm}
              onCancel={() => setShowConfirmation(false)}
              isProcessing={state.isPending}
            />
          </div>
        )}
      </div>
    </div>
  );
}