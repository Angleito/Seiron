'use client';

import { useState } from 'react';
import { formatUnits, formatEther } from 'viem';
import { 
  Info, 
  ChevronDown, 
  ChevronUp,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Clock,
  Fuel,
  ArrowRight,
  ArrowRightLeft,
  Coins,
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TokenAmount {
  address: string;
  symbol: string;
  amount: bigint;
  decimals: number;
  price?: number;
  logoUrl?: string;
}

interface ProtocolInfo {
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

  const getTransactionIcon = () => {
    switch (data.type) {
      case 'swap':
        return <ArrowRightLeft className="w-5 h-5" />;
      case 'lend':
      case 'supply':
        return <TrendingUp className="w-5 h-5" />;
      case 'borrow':
      case 'withdraw':
        return <TrendingDown className="w-5 h-5" />;
      case 'provide-liquidity':
      case 'remove-liquidity':
        return <Coins className="w-5 h-5" />;
      case 'stake':
      case 'unstake':
        return <Wallet className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getActionText = () => {
    switch (data.type) {
      case 'swap':
        return 'Swap';
      case 'lend':
      case 'supply':
        return 'Supply';
      case 'borrow':
        return 'Borrow';
      case 'withdraw':
        return 'Withdraw';
      case 'provide-liquidity':
        return 'Add Liquidity';
      case 'remove-liquidity':
        return 'Remove Liquidity';
      case 'stake':
        return 'Stake';
      case 'unstake':
        return 'Unstake';
      default:
        return data.type;
    }
  };

  const calculateTotalValue = () => {
    if (data.inputToken?.price) {
      const amount = Number(formatUnits(data.inputToken.amount, data.inputToken.decimals));
      return amount * data.inputToken.price;
    }
    return 0;
  };

  const networkFee = formatEther(data.estimatedGas * data.gasPrice);
  const totalValue = calculateTotalValue();

  return (
    <div className={`bg-gradient-to-br from-gray-900/50 to-black/50 border border-red-500/10 rounded-lg ${className}`}>
      {/* Main Preview */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
              {getTransactionIcon()}
            </div>
            <div>
              <h3 className="text-white font-semibold">{getActionText()}</h3>
              <p className="text-gray-400 text-sm">{data.protocol.name}</p>
            </div>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {showDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {/* Token Flow */}
        {data.inputToken && (
          <div className="space-y-3">
            {data.outputToken ? (
              // Swap-like visualization
              <div className="relative">
                <div className="bg-black/30 rounded-lg p-3 border border-red-500/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-xs uppercase tracking-wide">You Pay</p>
                      <p className="text-white text-lg font-semibold">
                        {formatUnits(data.inputToken.amount, data.inputToken.decimals)} {data.inputToken.symbol}
                      </p>
                      {data.inputToken.price && (
                        <p className="text-gray-500 text-sm">
                          ${(Number(formatUnits(data.inputToken.amount, data.inputToken.decimals)) * data.inputToken.price).toFixed(2)}
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
                        {formatUnits(data.outputToken.amount, data.outputToken.decimals)} {data.outputToken.symbol}
                      </p>
                      {data.outputToken.price && (
                        <p className="text-gray-500 text-sm">
                          ${(Number(formatUnits(data.outputToken.amount, data.outputToken.decimals)) * data.outputToken.price).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Single token operation
              <div className="bg-black/30 rounded-lg p-3 border border-red-500/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">Amount</p>
                    <p className="text-white text-lg font-semibold">
                      {formatUnits(data.inputToken.amount, data.inputToken.decimals)} {data.inputToken.symbol}
                    </p>
                    {data.inputToken.price && (
                      <p className="text-gray-500 text-sm">
                        ${(Number(formatUnits(data.inputToken.amount, data.inputToken.decimals)) * data.inputToken.price).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {data.exchangeRate && (
            <div className="bg-black/30 rounded-lg p-2 border border-red-500/5">
              <p className="text-gray-500 text-xs flex items-center gap-1">
                <ArrowRightLeft className="w-3 h-3" /> Rate
              </p>
              <p className="text-white text-sm font-medium">
                1 {data.inputToken?.symbol} = {data.exchangeRate.toFixed(4)} {data.outputToken?.symbol}
              </p>
            </div>
          )}
          
          {data.priceImpact !== undefined && (
            <div className="bg-black/30 rounded-lg p-2 border border-red-500/5">
              <p className="text-gray-500 text-xs flex items-center gap-1">
                <Percent className="w-3 h-3" /> Price Impact
              </p>
              <p className={`text-sm font-medium ${
                data.priceImpact > 3 ? 'text-red-400' : 
                data.priceImpact > 1 ? 'text-yellow-400' : 
                'text-white'
              }`}>
                {data.priceImpact.toFixed(2)}%
              </p>
            </div>
          )}
          
          {(data.apy || data.apr) && (
            <div className="bg-black/30 rounded-lg p-2 border border-red-500/5">
              <p className="text-gray-500 text-xs flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> {data.apy ? 'APY' : 'APR'}
              </p>
              <p className="text-green-400 text-sm font-medium">
                {(data.apy || data.apr)?.toFixed(2)}%
              </p>
            </div>
          )}
          
          <div className="bg-black/30 rounded-lg p-2 border border-red-500/5">
            <p className="text-gray-500 text-xs flex items-center gap-1">
              <Fuel className="w-3 h-3" /> Network Fee
            </p>
            <p className="text-white text-sm font-medium">
              {parseFloat(networkFee).toFixed(4)} SEI
            </p>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-red-500/10 pt-4">
              {/* Additional Metrics */}
              {data.slippage !== undefined && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Max Slippage</span>
                  <span className="text-white">{data.slippage}%</span>
                </div>
              )}
              
              {data.minimumReceived && data.outputToken && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Minimum Received</span>
                  <span className="text-white">
                    {formatUnits(data.minimumReceived, data.outputToken.decimals)} {data.outputToken.symbol}
                  </span>
                </div>
              )}
              
              {data.healthFactor && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Health Factor</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white">{data.healthFactor.current.toFixed(2)}</span>
                    <ArrowRight className="w-3 h-3 text-gray-500" />
                    <span className={data.healthFactor.after < 1.5 ? 'text-red-400' : 'text-white'}>
                      {data.healthFactor.after.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
              
              {data.liquidationPrice && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Liquidation Price</span>
                  <span className="text-white">${data.liquidationPrice.toFixed(2)}</span>
                </div>
              )}
              
              {data.poolShare !== undefined && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Pool Share</span>
                  <span className="text-white">{data.poolShare.toFixed(4)}%</span>
                </div>
              )}
              
              {data.deadline && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Transaction Deadline</span>
                  <span className="text-white">{data.deadline} minutes</span>
                </div>
              )}
              
              {data.lockPeriod && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Lock Period</span>
                  <span className="text-white">{data.lockPeriod} days</span>
                </div>
              )}
              
              {/* Rewards */}
              {data.rewards && data.rewards.length > 0 && (
                <div>
                  <p className="text-gray-400 text-sm mb-1">Rewards</p>
                  <div className="space-y-1">
                    {data.rewards.map((reward, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-300">{reward.symbol}</span>
                        <span className="text-green-400">
                          +{formatUnits(reward.amount, reward.decimals)} / day
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Gas Details */}
              <div className="pt-2 border-t border-red-500/10">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Gas Limit</span>
                  <span className="text-white">{data.estimatedGas.toString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Gas Price</span>
                  <span className="text-white">{formatUnits(data.gasPrice, 9)} Gwei</span>
                </div>
                {data.maxFee && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Max Fee</span>
                    <span className="text-white">{formatEther(data.maxFee)} SEI</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}