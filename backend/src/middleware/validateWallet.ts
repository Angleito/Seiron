import { Request, Response, NextFunction } from 'express';
import { isAddress } from 'viem';
import { isAddress as ethersIsAddress } from 'ethers';

export interface WalletValidationError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Middleware to validate wallet addresses from request headers, query params, or body
 * Supports both Ethereum and Sei wallet addresses
 */
export const validateWallet = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    // Extract wallet address from various sources
    const walletAddress = 
      req.headers['x-wallet-address'] as string ||
      req.query.walletAddress as string ||
      req.body.walletAddress as string;

    // Check if wallet address is provided
    if (!walletAddress) {
      const error: WalletValidationError = new Error('Wallet address is required');
      error.statusCode = 400;
      error.code = 'MISSING_WALLET_ADDRESS';
      throw error;
    }

    // Validate wallet address format
    if (!isValidWalletAddress(walletAddress)) {
      const error: WalletValidationError = new Error('Invalid wallet address format');
      error.statusCode = 400;
      error.code = 'INVALID_WALLET_ADDRESS';
      throw error;
    }

    // Normalize the wallet address
    const normalizedAddress = normalizeWalletAddress(walletAddress);

    // Add wallet address to request object for downstream middleware
    req.walletAddress = normalizedAddress;

    // Also ensure it's available in the body for consistency
    if (req.body && typeof req.body === 'object') {
      req.body.walletAddress = normalizedAddress;
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validate if a string is a valid wallet address
 * Supports Ethereum-compatible addresses (0x...) and Sei addresses (sei1...)
 */
function isValidWalletAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  // Trim whitespace
  const trimmedAddress = address.trim();

  // Check Ethereum-style addresses (0x...)
  if (trimmedAddress.startsWith('0x')) {
    // Use both viem and ethers for validation
    return isAddress(trimmedAddress) || ethersIsAddress(trimmedAddress);
  }

  // Check Sei addresses (sei1...)
  if (trimmedAddress.startsWith('sei1')) {
    return isValidSeiAddress(trimmedAddress);
  }

  // Check for other Cosmos-based addresses that might be relevant
  if (trimmedAddress.match(/^[a-z]+1[a-z0-9]{38,59}$/)) {
    return isValidCosmosAddress(trimmedAddress);
  }

  return false;
}

/**
 * Validate Sei-specific address format
 */
function isValidSeiAddress(address: string): boolean {
  // Sei addresses follow bech32 format: sei1 + 39 character alphanumeric
  const seiAddressRegex = /^sei1[a-z0-9]{39}$/;
  return seiAddressRegex.test(address);
}

/**
 * Validate general Cosmos-based address format
 */
function isValidCosmosAddress(address: string): boolean {
  // Cosmos addresses: [prefix]1[39-59 character bech32]
  const cosmosAddressRegex = /^[a-z]+1[a-z0-9]{38,59}$/;
  return cosmosAddressRegex.test(address);
}

/**
 * Normalize wallet address format
 */
function normalizeWalletAddress(address: string): string {
  const trimmedAddress = address.trim();
  
  // For Ethereum addresses, ensure proper checksum
  if (trimmedAddress.startsWith('0x')) {
    return trimmedAddress.toLowerCase();
  }
  
  // For Sei and other cosmos addresses, keep as lowercase
  return trimmedAddress.toLowerCase();
}

/**
 * Optional middleware for routes that don't require wallet validation
 * but want to extract wallet address if present
 */
export const optionalWalletValidation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const walletAddress = 
      req.headers['x-wallet-address'] as string ||
      req.query.walletAddress as string ||
      req.body.walletAddress as string;

    if (walletAddress && isValidWalletAddress(walletAddress)) {
      req.walletAddress = normalizeWalletAddress(walletAddress);
      if (req.body && typeof req.body === 'object') {
        req.body.walletAddress = req.walletAddress;
      }
    }

    next();
  } catch (error) {
    // For optional validation, continue even if validation fails
    next();
  }
};

/**
 * Middleware to validate and extract multiple wallet addresses
 * Useful for endpoints that work with multiple wallets
 */
export const validateMultipleWallets = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const walletAddresses = req.body.walletAddresses as string[];

    if (!walletAddresses || !Array.isArray(walletAddresses)) {
      const error: WalletValidationError = new Error('Wallet addresses array is required');
      error.statusCode = 400;
      error.code = 'MISSING_WALLET_ADDRESSES';
      throw error;
    }

    if (walletAddresses.length === 0) {
      const error: WalletValidationError = new Error('At least one wallet address is required');
      error.statusCode = 400;
      error.code = 'EMPTY_WALLET_ADDRESSES';
      throw error;
    }

    // Validate each address
    const invalidAddresses: string[] = [];
    const validAddresses: string[] = [];

    walletAddresses.forEach((address, index) => {
      if (!isValidWalletAddress(address)) {
        invalidAddresses.push(`Index ${index}: ${address}`);
      } else {
        validAddresses.push(normalizeWalletAddress(address));
      }
    });

    if (invalidAddresses.length > 0) {
      const error: WalletValidationError = new Error(
        `Invalid wallet addresses: ${invalidAddresses.join(', ')}`
      );
      error.statusCode = 400;
      error.code = 'INVALID_WALLET_ADDRESSES';
      throw error;
    }

    // Replace with normalized addresses
    req.body.walletAddresses = validAddresses;

    next();
  } catch (error) {
    next(error);
  }
};

export { isValidWalletAddress, normalizeWalletAddress };