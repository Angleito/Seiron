'use client';

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { TransactionHeader } from './parts/TransactionHeader';
import { TokenFlow } from './parts/TokenFlow';
import { KeyMetrics } from './parts/KeyMetrics';
import { TransactionDetails } from './sections/TransactionDetails';

export interface TokenAmount {
  address: string;
  symbol: string;
  amount: bigint;
  decimals: number;
  price?: number;
  logoUrl?: string;
}

export interface ProtocolInfo {
  name: string;
  logoUrl?: string;
  type: 'dex' | 'lending' | 'yield' | 'vault';
}

export interface TransactionPreviewData {
  type: 'swap' | 'lend' | 'borrow' | 'withdraw' | 'supply' | 'provide-liquidity' | 'remove-liquidity' | 'stake' | 'unstake';
  protocol: ProtocolInfo;
  inputToken?: TokenAmount;
  outputToken?: TokenAmount;
  
  // Pricing info
  exchangeRate?: number;
  priceImpact?: number;
  slippage?: number;
  minimumReceived?: bigint;
  
  // Gas info
  estimatedGas: bigint;
  gasPrice: bigint;
  maxFee?: bigint;
  
  // Protocol specific
  apy?: number;
  apr?: number;
  rewards?: TokenAmount[];
  healthFactor?: {
    current: number;
    after: number;
  };
  liquidationPrice?: number;
  ltv?: number;
  
  // Pool info (for liquidity operations)
  poolShare?: number;
  poolTvl?: number;
  volume24h?: number;
  fees24h?: number;
  
  // Timing
  deadline?: number;
  lockPeriod?: number;
}

interface TransactionPreviewProps {
  data: TransactionPreviewData;
  showDetails?: boolean;
  className?: string;
}

export function TransactionPreview({ 
  data, 
  showDetails: initialShowDetails = false,
  className = ''
}: TransactionPreviewProps) {
  const [showDetails, setShowDetails] = useState(initialShowDetails);

  return (
    <div className={`bg-gradient-to-br from-gray-900/50 to-black/50 border border-red-500/10 rounded-lg ${className}`}>
      {/* Main Preview */}
      <div className="p-4">
        <TransactionHeader
          data={data}
          showDetails={showDetails}
          onToggleDetails={() => setShowDetails(!showDetails)}
        />

        {/* Token Flow */}
        {data.inputToken && (
          <div className="space-y-3">
            <TokenFlow
              inputToken={data.inputToken}
              outputToken={data.outputToken}
            />
          </div>
        )}

        {/* Key Metrics */}
        <KeyMetrics data={data} />
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {showDetails && (
          <TransactionDetails data={data} />
        )}
      </AnimatePresence>
    </div>
  );
}