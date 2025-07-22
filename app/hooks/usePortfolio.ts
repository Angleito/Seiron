import { useCallback, useEffect } from 'react';
import { usePortfolioStore } from '../stores/portfolioStore';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';

export function usePortfolio() {
  const portfolioStore = usePortfolioStore();
  const { isAuthenticated, user } = useAuthStore();
  const { setLoading, addNotification } = useUIStore();
  
  // Fetch portfolio data
  const fetchPortfolio = useCallback(async () => {
    if (!isAuthenticated || !user) {
      portfolioStore.setError('Not authenticated');
      return;
    }
    
    try {
      portfolioStore.setLoading(true);
      setLoading('portfolio', true);
      
      // Get auth token from cookie or localStorage
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1];
      
      const response = await fetch('/api/portfolio', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch portfolio');
      }
      
      const data = await response.json();
      
      // Transform API data to store format
      const positions = data.positions.map((pos: any) => ({
        id: pos.symbol,
        symbol: pos.symbol,
        amount: pos.amount,
        value: pos.value,
        price: pos.value / pos.amount,
        pnl: pos.pnl,
        pnlPercentage: (pos.pnl / (pos.value - pos.pnl)) * 100,
        allocation: (pos.value / data.totalValue) * 100,
        type: 'token' as const,
      }));
      
      portfolioStore.setPositions(positions);
      portfolioStore.setStats({
        totalValue: data.totalValue,
        totalPnL: data.totalPnL,
        totalPnLPercentage: (data.totalPnL / (data.totalValue - data.totalPnL)) * 100,
        dailyChange: 0, // TODO: Calculate from historical data
        weeklyChange: 0,
        monthlyChange: 0,
      });
      
      portfolioStore.setLastUpdated(new Date());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch portfolio';
      portfolioStore.setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Portfolio Error',
        message: errorMessage,
      });
    } finally {
      portfolioStore.setLoading(false);
      setLoading('portfolio', false);
    }
  }, [isAuthenticated, user, portfolioStore, setLoading, addNotification]);
  
  // Auto-refresh portfolio every 30 seconds when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Initial fetch
    fetchPortfolio();
    
    // Set up interval
    const interval = setInterval(fetchPortfolio, 30000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchPortfolio]);
  
  // Calculate total allocation
  const totalAllocation = portfolioStore.positions.reduce((sum, pos) => sum + pos.allocation, 0);
  
  // Get positions by type
  const getPositionsByType = useCallback((type: string) => {
    return portfolioStore.positions.filter(pos => pos.type === type);
  }, [portfolioStore.positions]);
  
  // Get top positions by value
  const getTopPositions = useCallback((limit = 5) => {
    return [...portfolioStore.positions]
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  }, [portfolioStore.positions]);
  
  // Calculate portfolio metrics
  const metrics = {
    totalPositions: portfolioStore.positions.length,
    profitablePositions: portfolioStore.positions.filter(p => p.pnl > 0).length,
    losingPositions: portfolioStore.positions.filter(p => p.pnl < 0).length,
    averagePnL: portfolioStore.positions.length > 0
      ? portfolioStore.positions.reduce((sum, p) => sum + p.pnlPercentage, 0) / portfolioStore.positions.length
      : 0,
  };
  
  return {
    // State
    ...portfolioStore,
    
    // Actions
    fetchPortfolio,
    
    // Computed
    totalAllocation,
    metrics,
    getPositionsByType,
    getTopPositions,
    isEmpty: portfolioStore.positions.length === 0,
    isReady: !portfolioStore.isLoading && portfolioStore.lastUpdated !== null,
  };
}