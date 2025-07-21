'use client';

import React, { useState } from 'react';
import { useVercelMCP } from '@/hooks/useVercelMCP';

export function VercelMCPExample() {
  const {
    loading,
    error,
    getMarketData,
    getSentimentAnalysis,
    getPricePredictions,
    checkHealth,
    clearError
  } = useVercelMCP();

  const [result, setResult] = useState<string>('');
  const [selectedTool, setSelectedTool] = useState<string>('market');

  const handleExecute = async () => {
    clearError();
    setResult('');

    try {
      let response: string;
      
      switch (selectedTool) {
        case 'market':
          response = await getMarketData(['SEI', 'BTC']);
          break;
        case 'sentiment':
          response = await getSentimentAnalysis(['SEI']);
          break;
        case 'predictions':
          response = await getPricePredictions('SEI', ['1h', '24h', '7d']);
          break;
        case 'health':
          const health = await checkHealth();
          response = JSON.stringify(health, null, 2);
          break;
        default:
          response = 'Please select a tool';
      }
      
      setResult(response);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Vercel MCP API Example</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Select Tool:</label>
        <select
          value={selectedTool}
          onChange={(e) => setSelectedTool(e.target.value)}
          className="w-full p-2 border rounded-md bg-background"
        >
          <option value="market">Market Data (Hive)</option>
          <option value="sentiment">Sentiment Analysis (Hive)</option>
          <option value="predictions">Price Predictions (Hive)</option>
          <option value="health">Health Check</option>
        </select>
      </div>

      <button
        onClick={handleExecute}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Execute'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">
          Error: {error}
        </div>
      )}

      {result && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Result:</h3>
          <pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded-md overflow-auto whitespace-pre-wrap">
            {result}
          </pre>
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
        <h3 className="font-semibold mb-2">How it works:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Frontend calls Vercel API route at /api/mcp/execute</li>
          <li>API route validates the request and rate limits</li>
          <li>API route forwards the request to the MCP server</li>
          <li>MCP server processes and returns natural language text</li>
          <li>API route returns the response to the frontend</li>
        </ol>
        
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Note: API keys are securely stored in Vercel environment variables and never exposed to the client.
        </p>
      </div>
    </div>
  );
}