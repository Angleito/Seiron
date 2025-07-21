import { useState, useCallback, useEffect } from 'react';
import { VercelMCPClient, MCPToolResult, getMCPClient } from '@/lib/mcp/vercel-client';

export interface UseVercelMCPReturn {
  // State
  loading: boolean;
  error: string | null;
  lastResult: MCPToolResult | null;
  
  // Methods
  executeTool: (server: 'hive' | 'sei' | 'portfolio', tool: string, args?: any) => Promise<MCPToolResult>;
  
  // Hive Intelligence shortcuts
  getMarketData: (symbols: string[]) => Promise<string>;
  getSentimentAnalysis: (symbols: string[]) => Promise<string>;
  getPricePredictions: (symbol: string, timeframes: string[]) => Promise<string>;
  
  // SEI Blockchain shortcuts
  getWalletBalance: (address: string) => Promise<string>;
  getDeFiPositions: (address: string) => Promise<string>;
  
  // Portfolio Manager shortcuts
  analyzePortfolio: (walletAddress: string) => Promise<string>;
  calculateRiskMetrics: (walletAddress: string) => Promise<string>;
  
  // Utility
  checkHealth: () => Promise<any>;
  clearError: () => void;
}

export function useVercelMCP(): UseVercelMCPReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<MCPToolResult | null>(null);
  const [client] = useState(() => getMCPClient());

  const executeTool = useCallback(async (
    server: 'hive' | 'sei' | 'portfolio',
    tool: string,
    args?: any
  ): Promise<MCPToolResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await client.executeTool(server, tool, args);
      setLastResult(result);
      
      if (!result.success) {
        setError(result.error || 'Tool execution failed');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      const errorResult = {
        success: false,
        server,
        tool,
        error: errorMessage,
      };
      setLastResult(errorResult);
      return errorResult;
    } finally {
      setLoading(false);
    }
  }, [client]);

  // Hive Intelligence shortcuts
  const getMarketData = useCallback(async (symbols: string[]): Promise<string> => {
    const result = await executeTool('hive', 'getMarketData', { symbols });
    return result.result || 'Failed to fetch market data';
  }, [executeTool]);

  const getSentimentAnalysis = useCallback(async (symbols: string[]): Promise<string> => {
    const result = await executeTool('hive', 'getSentimentAnalysis', { symbols });
    return result.result || 'Failed to fetch sentiment analysis';
  }, [executeTool]);

  const getPricePredictions = useCallback(async (symbol: string, timeframes: string[]): Promise<string> => {
    const result = await executeTool('hive', 'getPricePredictions', { symbol, timeframes });
    return result.result || 'Failed to fetch price predictions';
  }, [executeTool]);

  // SEI Blockchain shortcuts
  const getWalletBalance = useCallback(async (address: string): Promise<string> => {
    const result = await executeTool('sei', 'getWalletBalance', { address });
    return result.result || 'Failed to fetch wallet balance';
  }, [executeTool]);

  const getDeFiPositions = useCallback(async (address: string): Promise<string> => {
    const result = await executeTool('sei', 'getDeFiPositions', { address });
    return result.result || 'Failed to fetch DeFi positions';
  }, [executeTool]);

  // Portfolio Manager shortcuts
  const analyzePortfolio = useCallback(async (walletAddress: string): Promise<string> => {
    const result = await executeTool('portfolio', 'analyzePortfolioComposition', { walletAddress });
    return result.result || 'Failed to analyze portfolio';
  }, [executeTool]);

  const calculateRiskMetrics = useCallback(async (walletAddress: string): Promise<string> => {
    const result = await executeTool('portfolio', 'calculateRiskMetrics', { walletAddress });
    return result.result || 'Failed to calculate risk metrics';
  }, [executeTool]);

  // Utility methods
  const checkHealth = useCallback(async () => {
    return await client.checkHealth();
  }, [client]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    loading,
    error,
    lastResult,
    
    // Methods
    executeTool,
    
    // Hive Intelligence
    getMarketData,
    getSentimentAnalysis,
    getPricePredictions,
    
    // SEI Blockchain
    getWalletBalance,
    getDeFiPositions,
    
    // Portfolio Manager
    analyzePortfolio,
    calculateRiskMetrics,
    
    // Utility
    checkHealth,
    clearError,
  };
}