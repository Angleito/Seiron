/**
 * MCP Test Assertion Helpers
 * Provides custom assertions for testing MCP responses
 */

import { expect } from '@jest/globals';

/**
 * Assert that a value is a valid MCP tool response
 */
export function assertValidToolResponse(response: any): void {
  expect(response).toBeDefined();
  expect(response).toHaveProperty('content');
  
  // Content should not be null or undefined
  expect(response.content).toBeDefined();
  
  // Optional error flag
  if ('isError' in response) {
    expect(typeof response.isError).toBe('boolean');
  }
}

/**
 * Assert that a value is a valid MCP resource response
 */
export function assertValidResourceResponse(response: any): void {
  expect(response).toBeDefined();
  expect(response).toHaveProperty('contents');
  expect(Array.isArray(response.contents)).toBe(true);
  
  response.contents.forEach((content: any) => {
    expect(content).toHaveProperty('uri');
    expect(typeof content.uri).toBe('string');
    
    // Must have either text or blob
    const hasContent = 'text' in content || 'blob' in content;
    expect(hasContent).toBe(true);
    
    if ('mimeType' in content) {
      expect(typeof content.mimeType).toBe('string');
    }
  });
}

/**
 * Assert that a value is a valid market data response
 */
export function assertValidMarketData(data: any): void {
  expect(data).toBeDefined();
  expect(data).toHaveProperty('symbol');
  expect(data).toHaveProperty('price');
  expect(data).toHaveProperty('volume24h');
  expect(data).toHaveProperty('change24h');
  expect(data).toHaveProperty('timestamp');
  
  expect(typeof data.symbol).toBe('string');
  expect(typeof data.price).toBe('number');
  expect(typeof data.volume24h).toBe('number');
  expect(typeof data.change24h).toBe('number');
  expect(typeof data.timestamp).toBe('number');
  
  // Price should be positive
  expect(data.price).toBeGreaterThan(0);
  
  // Volume should be non-negative
  expect(data.volume24h).toBeGreaterThanOrEqual(0);
  
  // Change should be within reasonable bounds
  expect(data.change24h).toBeGreaterThan(-100);
  expect(data.change24h).toBeLessThan(1000);
}

/**
 * Assert that a value is a valid wallet balance response
 */
export function assertValidWalletBalance(data: any): void {
  expect(data).toBeDefined();
  expect(data).toHaveProperty('address');
  expect(data).toHaveProperty('balances');
  
  expect(typeof data.address).toBe('string');
  expect(Array.isArray(data.balances)).toBe(true);
  
  data.balances.forEach((balance: any) => {
    expect(balance).toHaveProperty('denom');
    expect(balance).toHaveProperty('amount');
    expect(typeof balance.denom).toBe('string');
    expect(typeof balance.amount).toBe('string');
    
    // Amount should be a valid number string
    expect(Number(balance.amount)).not.toBeNaN();
    expect(Number(balance.amount)).toBeGreaterThanOrEqual(0);
  });
  
  if ('totalUSD' in data) {
    expect(typeof data.totalUSD).toBe('number');
    expect(data.totalUSD).toBeGreaterThanOrEqual(0);
  }
}

/**
 * Assert that a value is a valid portfolio composition response
 */
export function assertValidPortfolioComposition(data: any): void {
  expect(data).toBeDefined();
  expect(data).toHaveProperty('totalValue');
  expect(data).toHaveProperty('assets');
  
  expect(typeof data.totalValue).toBe('number');
  expect(data.totalValue).toBeGreaterThanOrEqual(0);
  expect(Array.isArray(data.assets)).toBe(true);
  
  let totalPercentage = 0;
  
  data.assets.forEach((asset: any) => {
    expect(asset).toHaveProperty('symbol');
    expect(asset).toHaveProperty('value');
    expect(asset).toHaveProperty('percentage');
    
    expect(typeof asset.symbol).toBe('string');
    expect(typeof asset.value).toBe('number');
    expect(typeof asset.percentage).toBe('number');
    
    expect(asset.value).toBeGreaterThanOrEqual(0);
    expect(asset.percentage).toBeGreaterThanOrEqual(0);
    expect(asset.percentage).toBeLessThanOrEqual(100);
    
    totalPercentage += asset.percentage;
  });
  
  // Total percentage should be close to 100 (allowing for rounding)
  expect(totalPercentage).toBeGreaterThan(99);
  expect(totalPercentage).toBeLessThan(101);
  
  if ('diversificationScore' in data) {
    expect(typeof data.diversificationScore).toBe('number');
    expect(data.diversificationScore).toBeGreaterThanOrEqual(0);
    expect(data.diversificationScore).toBeLessThanOrEqual(1);
  }
}

/**
 * Assert that a value is a valid sentiment analysis response
 */
export function assertValidSentimentAnalysis(data: any): void {
  expect(data).toBeDefined();
  expect(data).toHaveProperty('overall');
  expect(data).toHaveProperty('sources');
  
  expect(typeof data.overall).toBe('number');
  expect(data.overall).toBeGreaterThanOrEqual(-1);
  expect(data.overall).toBeLessThanOrEqual(1);
  
  expect(typeof data.sources).toBe('object');
  
  ['twitter', 'reddit', 'news'].forEach(source => {
    if (source in data.sources) {
      expect(typeof data.sources[source]).toBe('number');
      expect(data.sources[source]).toBeGreaterThanOrEqual(-1);
      expect(data.sources[source]).toBeLessThanOrEqual(1);
    }
  });
  
  if ('trending' in data) {
    expect(typeof data.trending).toBe('boolean');
  }
}

/**
 * Assert that a value is a valid risk metrics response
 */
export function assertValidRiskMetrics(data: any): void {
  expect(data).toBeDefined();
  expect(data).toHaveProperty('metrics');
  
  const metrics = data.metrics;
  expect(typeof metrics).toBe('object');
  
  // Check common risk metrics
  if ('volatility' in metrics) {
    expect(typeof metrics.volatility).toBe('number');
    expect(metrics.volatility).toBeGreaterThanOrEqual(0);
  }
  
  if ('sharpeRatio' in metrics) {
    expect(typeof metrics.sharpeRatio).toBe('number');
  }
  
  if ('maxDrawdown' in metrics) {
    expect(typeof metrics.maxDrawdown).toBe('number');
    expect(metrics.maxDrawdown).toBeGreaterThanOrEqual(0);
    expect(metrics.maxDrawdown).toBeLessThanOrEqual(100);
  }
  
  if ('var95' in metrics) {
    expect(typeof metrics.var95).toBe('number');
    expect(metrics.var95).toBeGreaterThanOrEqual(0);
  }
  
  if ('riskScore' in data) {
    expect(typeof data.riskScore).toBe('number');
    expect(data.riskScore).toBeGreaterThanOrEqual(1);
    expect(data.riskScore).toBeLessThanOrEqual(10);
  }
}

/**
 * Assert that a value is a valid MCP error response
 */
export function assertValidErrorResponse(response: any): void {
  expect(response).toBeDefined();
  expect(response).toHaveProperty('error');
  
  const error = response.error;
  expect(error).toHaveProperty('code');
  expect(error).toHaveProperty('message');
  
  expect(typeof error.code).toBe('string');
  expect(typeof error.message).toBe('string');
  
  // Common error codes
  const validErrorCodes = [
    'INVALID_REQUEST',
    'METHOD_NOT_FOUND',
    'INVALID_PARAMS',
    'INTERNAL_ERROR',
    'RATE_LIMIT',
    'AUTH_FAILED',
    'NOT_FOUND',
    'TIMEOUT'
  ];
  
  expect(validErrorCodes).toContain(error.code);
}

/**
 * Assert that a connection is properly established
 */
export function assertValidConnection(client: any): void {
  expect(client).toBeDefined();
  expect(client.connect).toBeDefined();
  expect(client.close).toBeDefined();
  expect(client.listTools).toBeDefined();
  expect(client.callTool).toBeDefined();
  expect(client.listResources).toBeDefined();
  expect(client.readResource).toBeDefined();
}

/**
 * Assert that tool metadata is valid
 */
export function assertValidToolMetadata(tool: any): void {
  expect(tool).toBeDefined();
  expect(tool).toHaveProperty('name');
  expect(tool).toHaveProperty('description');
  
  expect(typeof tool.name).toBe('string');
  expect(typeof tool.description).toBe('string');
  
  if ('inputSchema' in tool) {
    expect(typeof tool.inputSchema).toBe('object');
    expect(tool.inputSchema).toHaveProperty('type');
  }
}

/**
 * Assert that resource metadata is valid
 */
export function assertValidResourceMetadata(resource: any): void {
  expect(resource).toBeDefined();
  expect(resource).toHaveProperty('uri');
  expect(resource).toHaveProperty('name');
  
  expect(typeof resource.uri).toBe('string');
  expect(typeof resource.name).toBe('string');
  
  if ('description' in resource) {
    expect(typeof resource.description).toBe('string');
  }
  
  if ('mimeType' in resource) {
    expect(typeof resource.mimeType).toBe('string');
  }
}

/**
 * Custom matcher for WebSocket events
 */
export function assertValidWebSocketEvent(event: any): void {
  expect(event).toBeDefined();
  expect(event).toHaveProperty('type');
  expect(event).toHaveProperty('data');
  
  expect(typeof event.type).toBe('string');
  expect(typeof event.data).toBe('object');
  
  if ('timestamp' in event) {
    expect(typeof event.timestamp).toBe('string');
    // Verify it's a valid ISO timestamp
    expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp);
  }
  
  if ('id' in event) {
    expect(typeof event.id).toBe('string');
  }
}

/**
 * Assert that performance metrics are valid
 */
export function assertValidPerformanceMetrics(metrics: any): void {
  expect(metrics).toBeDefined();
  
  if ('latency' in metrics) {
    expect(typeof metrics.latency).toBe('number');
    expect(metrics.latency).toBeGreaterThanOrEqual(0);
  }
  
  if ('throughput' in metrics) {
    expect(typeof metrics.throughput).toBe('number');
    expect(metrics.throughput).toBeGreaterThanOrEqual(0);
  }
  
  if ('errorRate' in metrics) {
    expect(typeof metrics.errorRate).toBe('number');
    expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
    expect(metrics.errorRate).toBeLessThanOrEqual(100);
  }
  
  if ('uptime' in metrics) {
    expect(typeof metrics.uptime).toBe('number');
    expect(metrics.uptime).toBeGreaterThanOrEqual(0);
    expect(metrics.uptime).toBeLessThanOrEqual(100);
  }
}