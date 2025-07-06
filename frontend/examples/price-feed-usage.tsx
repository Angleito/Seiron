import React, { useEffect } from 'react';
import { usePriceFeed, formatPrice, getPriceChange } from '../hooks/usePriceFeed';
import { Asset } from '../types/price-feed';

// Example 1: Basic usage with multiple assets
export function PriceFeedDisplay() {
  const { prices, loading, error, lastUpdate } = usePriceFeed({
    assets: ['SEI', 'BTC', 'ETH'],
    pollInterval: 30000, // 30 seconds
  });

  if (loading) return <div>Loading prices...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="price-feed">
      <h2>Asset Prices</h2>
      {Object.entries(prices).map(([asset, data]) => (
        <div key={asset} className="price-item">
          <span className="asset">{asset}:</span>
          <span className="price">
            {data ? formatPrice(data.price) : 'N/A'}
          </span>
          <span className="source">
            {data ? `(${data.source})` : ''}
          </span>
        </div>
      ))}
      <div className="last-update">
        Last update: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'Never'}
      </div>
    </div>
  );
}

// Example 2: Using price streams with RxJS
export function PriceStreamMonitor() {
  const { getPriceStream, getAssetPriceStream } = usePriceFeed({
    assets: ['SEI', 'BTC'],
    pollInterval: 10000, // 10 seconds for more frequent updates
  });

  useEffect(() => {
    // Subscribe to all prices
    const allPricesSubscription = getPriceStream().subscribe(prices => {
      console.log('All prices updated:', prices);
    });

    // Subscribe to specific asset
    const seiSubscription = getAssetPriceStream('SEI').subscribe(priceData => {
      if (priceData) {
        console.log(`SEI price: ${formatPrice(priceData.price)} from ${priceData.source}`);
      }
    });

    return () => {
      allPricesSubscription.unsubscribe();
      seiSubscription.unsubscribe();
    };
  }, [getPriceStream, getAssetPriceStream]);

  return <div>Check console for price stream updates</div>;
}

// Example 3: Advanced usage with custom configuration
export function AdvancedPriceFeed() {
  const [previousPrices, setPreviousPrices] = React.useState<Record<Asset, number>>({
    SEI: 0,
    BTC: 0,
    ETH: 0
  });

  const { 
    prices, 
    loading, 
    error, 
    refresh,
    getAssetPriceStream 
  } = usePriceFeed({
    assets: ['SEI', 'BTC', 'ETH'],
    pollInterval: 15000, // 15 seconds
    cacheTimeout: 60000, // 1 minute cache
    retryAttempts: 5, // More retries
    retryDelay: 2000, // 2 second delay between retries
  });

  // Track price changes
  useEffect(() => {
    const subscriptions = (['SEI', 'BTC', 'ETH'] as Asset[]).map(asset =>
      getAssetPriceStream(asset).subscribe(priceData => {
        if (priceData && previousPrices[asset] !== 0) {
          const change = getPriceChange(priceData.price, previousPrices[asset]);
          console.log(`${asset} price change: ${change.toFixed(2)}%`);
        }
        if (priceData) {
          setPreviousPrices(prev => ({ ...prev, [asset]: priceData.price }));
        }
      })
    );

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [getAssetPriceStream, previousPrices]);

  const handleRefresh = () => {
    console.log('Manually refreshing prices...');
    refresh();
  };

  return (
    <div className="advanced-price-feed">
      <h2>Advanced Price Feed</h2>
      
      {loading && <div className="loading-indicator">Updating prices...</div>}
      
      <div className="prices-grid">
        {Object.entries(prices).map(([asset, data]) => {
          const assetKey = asset as Asset;
          const priceChange = data && previousPrices[assetKey] 
            ? getPriceChange(data.price, previousPrices[assetKey])
            : 0;
          
          return (
            <div key={asset} className="price-card">
              <h3>{asset}</h3>
              <div className="price-value">
                {data ? formatPrice(data.price) : 'Loading...'}
              </div>
              <div className={`price-change ${priceChange >= 0 ? 'positive' : 'negative'}`}>
                {priceChange !== 0 && `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`}
              </div>
              <div className="price-meta">
                <span>Source: {data?.source || 'N/A'}</span>
                {data?.confidence && (
                  <span>Confidence: {(data.confidence * 100).toFixed(1)}%</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <button onClick={handleRefresh} className="refresh-button">
        Refresh Prices
      </button>
      
      {error && (
        <div className="error-message">
          Error fetching prices: {error.message}
        </div>
      )}
    </div>
  );
}

// Example 4: Integration with trading interface
export function TradingPriceWidget({ asset }: { asset: Asset }) {
  const { prices, loading, getAssetPriceStream } = usePriceFeed({
    assets: [asset],
    pollInterval: 5000, // 5 seconds for real-time feel
  });

  const [priceHistory, setPriceHistory] = React.useState<number[]>([]);
  
  useEffect(() => {
    const subscription = getAssetPriceStream(asset).subscribe(priceData => {
      if (priceData) {
        setPriceHistory(prev => [...prev.slice(-19), priceData.price]);
      }
    });

    return () => subscription.unsubscribe();
  }, [asset, getAssetPriceStream]);

  const currentPrice = prices[asset];
  const sparklineData = priceHistory.length > 1 ? priceHistory : [];
  
  return (
    <div className="trading-price-widget">
      <div className="asset-name">{asset}/USD</div>
      <div className="current-price">
        {loading ? (
          <span className="loading">...</span>
        ) : (
          currentPrice ? formatPrice(currentPrice.price) : 'N/A'
        )}
      </div>
      {sparklineData.length > 0 && (
        <div className="mini-chart">
          {/* Simple sparkline visualization */}
          <svg width="100" height="30" viewBox="0 0 100 30">
            <polyline
              points={sparklineData
                .map((price, i) => {
                  const x = (i / (sparklineData.length - 1)) * 100;
                  const min = Math.min(...sparklineData);
                  const max = Math.max(...sparklineData);
                  // Handle edge case where all prices are the same
                  const range = max - min;
                  const y = range === 0 ? 15 : 30 - ((price - min) / range) * 30;
                  return `${x},${y}`;
                })
                .join(' ')}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

// Example 5: Portfolio value calculation
export function PortfolioValue() {
  const holdings = {
    SEI: 1000,
    BTC: 0.5,
    ETH: 10
  };

  const { prices, loading } = usePriceFeed({
    assets: ['SEI', 'BTC', 'ETH'],
    pollInterval: 30000,
  });

  const totalValue = Object.entries(holdings).reduce((total, [asset, amount]) => {
    const price = prices[asset as Asset]?.price || 0;
    return total + (price * amount);
  }, 0);

  return (
    <div className="portfolio-value">
      <h2>Portfolio Value</h2>
      {loading ? (
        <div>Calculating...</div>
      ) : (
        <>
          <div className="total-value">{formatPrice(totalValue)}</div>
          <div className="holdings">
            {Object.entries(holdings).map(([asset, amount]) => {
              const price = prices[asset as Asset]?.price || 0;
              const value = price * amount;
              return (
                <div key={asset} className="holding">
                  <span>{amount} {asset}</span>
                  <span>{formatPrice(value)}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}