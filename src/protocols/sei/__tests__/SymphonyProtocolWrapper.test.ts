import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sei } from 'viem/chains';

import {
  SymphonyProtocolWrapper,
  createSymphonyProtocolWrapper,
  defaultSymphonyConfig,
  defaultSymphonyIntegrationConfig,
  SwapQuoteRequest,
  SwapExecuteRequest,
  RouteRequest,
  GasEstimateRequest,
  SYMPHONY_TOKENS,
  validateTokenAddress,
  validateTradeAmount,
  calculateMinimumAmountOut,
  formatTokenAmount,
  parseTokenAmount,
} from '../index';

import { symphonyErrorHandler, createErrorContext, withErrorHandling } from '../errors';

// Mock clients
const mockPublicClient = createPublicClient({
  chain: sei,
  transport: http('https://evm-rpc.sei-apis.com'),
});

const mockWalletClient = createWalletClient({
  chain: sei,
  transport: http('https://evm-rpc.sei-apis.com'),
  account: privateKeyToAccount('0x0000000000000000000000000000000000000000000000000000000000000001'),
});

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('SymphonyProtocolWrapper', () => {
  let symphonyWrapper: SymphonyProtocolWrapper;

  beforeEach(() => {
    symphonyWrapper = createSymphonyProtocolWrapper(
      defaultSymphonyConfig,
      defaultSymphonyIntegrationConfig,
      mockPublicClient,
      mockWalletClient
    );
    mockFetch.mockReset();
  });

  describe('getQuote', () => {
    it('should successfully get a quote', async () => {
      const mockQuoteResponse = {
        route: {
          id: 'test-route-1',
          inputToken: SYMPHONY_TOKENS.SEI,
          outputToken: SYMPHONY_TOKENS.USDC,
          inputAmount: '1000000000000000000',
          outputAmount: '1500000000',
          priceImpact: 0.5,
          executionPrice: '1500',
          midPrice: '1500',
          minimumAmountOut: '1485000000',
          maximumAmountIn: '1000000000000000000',
          routes: [],
          gasEstimate: '150000',
          fees: {
            protocolFee: '1000000',
            gasFee: '5000000',
            liquidityProviderFee: '500000',
            totalFee: '6500000',
          },
        },
        timestamp: Date.now(),
        validUntil: Date.now() + 30000,
        slippageAdjustedAmountOut: '1485000000',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockQuoteResponse,
      });

      const quoteRequest: SwapQuoteRequest = {
        tokenIn: SYMPHONY_TOKENS.SEI.address,
        tokenOut: SYMPHONY_TOKENS.USDC.address,
        amountIn: '1000000000000000000',
        slippagePercent: 1.0,
      };

      const result = await symphonyWrapper.getQuote(quoteRequest)();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.route.id).toBe('test-route-1');
        expect(result.right.route.outputAmount).toBe('1500000000');
      }
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const quoteRequest: SwapQuoteRequest = {
        tokenIn: SYMPHONY_TOKENS.SEI.address,
        tokenOut: SYMPHONY_TOKENS.USDC.address,
        amountIn: '1000000000000000000',
        slippagePercent: 1.0,
      };

      const result = await symphonyWrapper.getQuote(quoteRequest)();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('network_error');
      }
    });

    it('should handle expired quotes', async () => {
      const mockQuoteResponse = {
        route: {
          id: 'test-route-1',
          inputToken: SYMPHONY_TOKENS.SEI,
          outputToken: SYMPHONY_TOKENS.USDC,
          inputAmount: '1000000000000000000',
          outputAmount: '1500000000',
          priceImpact: 0.5,
          executionPrice: '1500',
          midPrice: '1500',
          minimumAmountOut: '1485000000',
          maximumAmountIn: '1000000000000000000',
          routes: [],
          gasEstimate: '150000',
          fees: {
            protocolFee: '1000000',
            gasFee: '5000000',
            liquidityProviderFee: '500000',
            totalFee: '6500000',
          },
        },
        timestamp: Date.now(),
        validUntil: Date.now() - 1000, // Expired
        slippageAdjustedAmountOut: '1485000000',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockQuoteResponse,
      });

      const quoteRequest: SwapQuoteRequest = {
        tokenIn: SYMPHONY_TOKENS.SEI.address,
        tokenOut: SYMPHONY_TOKENS.USDC.address,
        amountIn: '1000000000000000000',
        slippagePercent: 1.0,
      };

      const result = await symphonyWrapper.getQuote(quoteRequest)();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('quote_expired');
      }
    });
  });

  describe('getRoutes', () => {
    it('should successfully get routes', async () => {
      const mockRouteResponse = {
        routes: [
          {
            id: 'test-route-1',
            inputToken: SYMPHONY_TOKENS.SEI,
            outputToken: SYMPHONY_TOKENS.USDC,
            inputAmount: '1000000000000000000',
            outputAmount: '1500000000',
            priceImpact: 0.5,
            executionPrice: '1500',
            midPrice: '1500',
            minimumAmountOut: '1485000000',
            maximumAmountIn: '1000000000000000000',
            routes: [],
            gasEstimate: '150000',
            fees: {
              protocolFee: '1000000',
              gasFee: '5000000',
              liquidityProviderFee: '500000',
              totalFee: '6500000',
            },
          },
        ],
        bestRoute: {
          id: 'test-route-1',
          inputToken: SYMPHONY_TOKENS.SEI,
          outputToken: SYMPHONY_TOKENS.USDC,
          inputAmount: '1000000000000000000',
          outputAmount: '1500000000',
          priceImpact: 0.5,
          executionPrice: '1500',
          midPrice: '1500',
          minimumAmountOut: '1485000000',
          maximumAmountIn: '1000000000000000000',
          routes: [],
          gasEstimate: '150000',
          fees: {
            protocolFee: '1000000',
            gasFee: '5000000',
            liquidityProviderFee: '500000',
            totalFee: '6500000',
          },
        },
        timestamp: Date.now(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRouteResponse,
      });

      const routeRequest: RouteRequest = {
        tokenIn: SYMPHONY_TOKENS.SEI.address,
        tokenOut: SYMPHONY_TOKENS.USDC.address,
        amountIn: '1000000000000000000',
      };

      const result = await symphonyWrapper.getRoutes(routeRequest)();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.routes.length).toBe(1);
        expect(result.right.bestRoute.id).toBe('test-route-1');
      }
    });
  });

  describe('estimateGas', () => {
    it('should successfully estimate gas', async () => {
      const mockGasEstimate = {
        gasLimit: '150000',
        gasPrice: '1000000000',
        estimatedCost: '150000000000000',
        confidence: 0.95,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGasEstimate,
      });

      const gasRequest: GasEstimateRequest = {
        tokenIn: SYMPHONY_TOKENS.SEI.address,
        tokenOut: SYMPHONY_TOKENS.USDC.address,
        amountIn: '1000000000000000000',
        routeId: 'test-route-1',
        recipient: '0x1234567890123456789012345678901234567890',
      };

      const result = await symphonyWrapper.estimateGas(gasRequest)();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.gasLimit).toBe('150000');
        expect(result.right.confidence).toBe(0.95);
      }
    });

    it('should handle low confidence estimates', async () => {
      const mockGasEstimate = {
        gasLimit: '150000',
        gasPrice: '1000000000',
        estimatedCost: '150000000000000',
        confidence: 0.3, // Low confidence
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGasEstimate,
      });

      const gasRequest: GasEstimateRequest = {
        tokenIn: SYMPHONY_TOKENS.SEI.address,
        tokenOut: SYMPHONY_TOKENS.USDC.address,
        amountIn: '1000000000000000000',
        routeId: 'test-route-1',
        recipient: '0x1234567890123456789012345678901234567890',
      };

      const result = await symphonyWrapper.estimateGas(gasRequest)();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('gas_estimation_failed');
      }
    });
  });

  describe('validateSwap', () => {
    it('should validate correct swap parameters', async () => {
      const executeRequest: SwapExecuteRequest = {
        tokenIn: SYMPHONY_TOKENS.SEI.address,
        tokenOut: SYMPHONY_TOKENS.USDC.address,
        amountIn: '1000000000000000000',
        amountOutMinimum: '1485000000',
        recipient: '0x1234567890123456789012345678901234567890',
        deadline: Math.floor(Date.now() / 1000) + 300,
        routeId: 'test-route-1',
        slippagePercent: 1.0,
      };

      const result = await symphonyWrapper.validateSwap(executeRequest)();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.valid).toBe(true);
        expect(result.right.errors.length).toBe(0);
      }
    });

    it('should reject invalid parameters', async () => {
      const executeRequest: SwapExecuteRequest = {
        tokenIn: '', // Invalid token
        tokenOut: SYMPHONY_TOKENS.USDC.address,
        amountIn: '0', // Invalid amount
        amountOutMinimum: '1485000000',
        recipient: '', // Invalid recipient
        deadline: Math.floor(Date.now() / 1000) + 300,
        routeId: 'test-route-1',
        slippagePercent: 60, // Invalid slippage
      };

      const result = await symphonyWrapper.validateSwap(executeRequest)();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('validation_failed');
      }
    });
  });
});

describe('Symphony Utilities', () => {
  describe('validateTokenAddress', () => {
    it('should validate correct token addresses', () => {
      const result = validateTokenAddress('0x1234567890123456789012345678901234567890');
      expect(E.isRight(result)).toBe(true);
    });

    it('should reject invalid token addresses', () => {
      const result = validateTokenAddress('invalid-address');
      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('invalid_token');
      }
    });
  });

  describe('validateTradeAmount', () => {
    it('should validate correct trade amounts', () => {
      const result = validateTradeAmount('100');
      expect(E.isRight(result)).toBe(true);
    });

    it('should reject amounts below minimum', () => {
      const result = validateTradeAmount('0.5');
      expect(E.isLeft(result)).toBe(true);
    });

    it('should reject zero or negative amounts', () => {
      const result = validateTradeAmount('0');
      expect(E.isLeft(result)).toBe(true);
    });
  });

  describe('calculateMinimumAmountOut', () => {
    it('should calculate minimum amount out correctly', () => {
      const result = calculateMinimumAmountOut('1000', 1.0);
      expect(result).toBe('990');
    });

    it('should handle zero slippage', () => {
      const result = calculateMinimumAmountOut('1000', 0);
      expect(result).toBe('1000');
    });
  });

  describe('formatTokenAmount', () => {
    it('should format token amounts correctly', () => {
      const result = formatTokenAmount('1000000000000000000', 18);
      expect(result).toBe('1');
    });

    it('should handle decimals correctly', () => {
      const result = formatTokenAmount('1500000000000000000', 18);
      expect(result).toBe('1.5');
    });
  });

  describe('parseTokenAmount', () => {
    it('should parse token amounts correctly', () => {
      const result = parseTokenAmount('1', 18);
      expect(result).toBe('1000000000000000000');
    });

    it('should handle decimals correctly', () => {
      const result = parseTokenAmount('1.5', 18);
      expect(result).toBe('1500000000000000000');
    });
  });
});

describe('Symphony Error Handling', () => {
  beforeEach(() => {
    symphonyErrorHandler.clearErrorHistory();
  });

  describe('Error Enhancement', () => {
    it('should enhance errors with context', () => {
      const baseError = {
        type: 'network_error' as const,
        message: 'Connection failed',
      };

      const context = createErrorContext('getQuote', '0x1234567890123456789012345678901234567890');
      const enhancedError = symphonyErrorHandler.enhanceError(baseError, context);

      expect(enhancedError.severity).toBe('medium');
      expect(enhancedError.context.operation).toBe('getQuote');
      expect(enhancedError.userMessage).toContain('Network connection issue');
      expect(enhancedError.recoveryStrategy.canRecover).toBe(true);
    });

    it('should determine correct recovery strategies', () => {
      const networkError = {
        type: 'network_error' as const,
        message: 'Connection failed',
      };

      const context = createErrorContext('getQuote');
      const enhancedError = symphonyErrorHandler.enhanceError(networkError, context);

      expect(enhancedError.recoveryStrategy.recoveryAction).toBe('retry');
      expect(enhancedError.recoveryStrategy.maxRetries).toBe(3);
    });
  });

  describe('Error Statistics', () => {
    it('should track error statistics', () => {
      const errors = [
        { type: 'network_error' as const, message: 'Error 1' },
        { type: 'slippage_exceeded' as const, expected: '100', actual: '105', limit: '102' },
        { type: 'network_error' as const, message: 'Error 2' },
      ];

      const context = createErrorContext('test');
      errors.forEach(error => symphonyErrorHandler.enhanceError(error, context));

      const stats = symphonyErrorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByType.network_error).toBe(2);
      expect(stats.errorsByType.slippage_exceeded).toBe(1);
    });
  });

  describe('Error Wrapping', () => {
    it('should wrap operations with error handling', async () => {
      const failingOperation = () => TE.left({
        type: 'network_error' as const,
        message: 'Connection failed',
      });

      const context = createErrorContext('test');
      const result = await withErrorHandling(failingOperation, context)();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.severity).toBe('medium');
        expect(result.left.userMessage).toContain('Network connection issue');
      }
    });
  });
});

describe('Integration Tests', () => {
  it('should handle complete swap flow', async () => {
    // Mock successful quote response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        route: {
          id: 'test-route-1',
          inputToken: SYMPHONY_TOKENS.SEI,
          outputToken: SYMPHONY_TOKENS.USDC,
          inputAmount: '1000000000000000000',
          outputAmount: '1500000000',
          priceImpact: 0.5,
          executionPrice: '1500',
          midPrice: '1500',
          minimumAmountOut: '1485000000',
          maximumAmountIn: '1000000000000000000',
          routes: [],
          gasEstimate: '150000',
          fees: {
            protocolFee: '1000000',
            gasFee: '5000000',
            liquidityProviderFee: '500000',
            totalFee: '6500000',
          },
        },
        timestamp: Date.now(),
        validUntil: Date.now() + 30000,
        slippageAdjustedAmountOut: '1485000000',
      }),
    });

    const quoteRequest: SwapQuoteRequest = {
      tokenIn: SYMPHONY_TOKENS.SEI.address,
      tokenOut: SYMPHONY_TOKENS.USDC.address,
      amountIn: '1000000000000000000',
      slippagePercent: 1.0,
    };

    const quoteResult = await symphonyWrapper.getQuote(quoteRequest)();
    expect(E.isRight(quoteResult)).toBe(true);
  });
});

export {};