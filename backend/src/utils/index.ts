/**
 * Utility functions index file
 * Exports all utility functions and services
 */

export { default as logger, loggerStream } from './logger';
export { CacheService, cacheService } from './cache';
export * from './validators';
export * from './constants';

// Re-export common functional programming utilities
export { pipe } from 'fp-ts/function';
export * as TE from 'fp-ts/TaskEither';
export * as E from 'fp-ts/Either';
export * as O from 'fp-ts/Option';

/**
 * Helper function to safely parse JSON
 */
export const safeJsonParse = <T>(jsonString: string, fallback: T): T => {
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return fallback;
  }
};

/**
 * Helper function to format currency values
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'USD',
  decimals: number = 2
): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(amount);
};

/**
 * Helper function to format token amounts
 */
export const formatTokenAmount = (
  amount: string | number,
  decimals: number = 18,
  displayDecimals: number = 6
): string => {
  const parsedAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const formatted = parsedAmount / Math.pow(10, decimals);
  
  return formatted.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: displayDecimals
  });
};

/**
 * Helper function to truncate wallet addresses for display
 */
export const truncateAddress = (address: string, startChars: number = 6, endChars: number = 4): string => {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

/**
 * Helper function to sleep/delay execution
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Helper function to retry async operations
 */
export const retryAsync = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt === maxRetries) break;
      
      await sleep(delayMs * attempt); // Exponential backoff
    }
  }
  
  throw lastError!;
};

/**
 * Helper function to generate unique IDs
 */
export const generateId = (prefix?: string): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substr(2, 9);
  return prefix ? `${prefix}_${timestamp}_${randomPart}` : `${timestamp}_${randomPart}`;
};

/**
 * Helper function to validate environment variables
 */
export const validateEnvVariables = (requiredVars: string[]): void => {
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
};

/**
 * Helper function to create API response format
 */
export const createApiResponse = <T>(
  success: boolean,
  data?: T,
  error?: string,
  meta?: any
) => ({
  success,
  data,
  error,
  meta,
  timestamp: new Date().toISOString()
});

/**
 * Helper function to extract error message safely
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
};

/**
 * Helper function to calculate percentage change
 */
export const calculatePercentageChange = (
  current: number,
  previous: number
): number => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

/**
 * Helper function to debounce function calls
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), waitMs);
  };
};

/**
 * Helper function to chunk arrays
 */
export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};