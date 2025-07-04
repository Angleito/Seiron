import { TaskEither } from 'fp-ts/TaskEither';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { ethers } from 'ethers';
import {
  WalletInterface,
  PreparedTransaction,
  SignedTransaction,
  TransactionError
} from './types';

/**
 * Abstract wallet interface for frontend integration
 * 
 * This provides a common interface for different wallet types:
 * - Browser extension wallets (MetaMask, etc.)
 * - WalletConnect
 * - Injected wallets
 * - Hardware wallets
 * 
 * The implementation handles all wallet-specific logic
 * while providing a consistent API for the transaction flow
 */
export abstract class WalletAbstraction implements WalletInterface {
  protected provider?: ethers.Provider;
  protected signer?: ethers.Signer;
  protected _isConnected: boolean = false;
  protected _chainId?: number;
  protected _address?: string;

  /**
   * Connect to wallet
   */
  abstract connect(): TaskEither<TransactionError, void>;

  /**
   * Disconnect from wallet
   */
  abstract disconnect(): TaskEither<TransactionError, void>;

  /**
   * Get connected address
   */
  public getAddress(): TaskEither<TransactionError, string> {
    if (!this._address) {
      return TE.left(this.createError('NOT_CONNECTED', 'Wallet not connected'));
    }
    return TE.right(this._address);
  }

  /**
   * Get chain ID
   */
  public getChainId(): TaskEither<TransactionError, number> {
    if (!this._chainId) {
      return TE.left(this.createError('NOT_CONNECTED', 'Wallet not connected'));
    }
    return TE.right(this._chainId);
  }

  /**
   * Sign transaction
   */
  public signTransaction(tx: PreparedTransaction): TaskEither<TransactionError, SignedTransaction> {
    if (!this.signer) {
      return TE.left(this.createError('NOT_CONNECTED', 'No signer available'));
    }

    return pipe(
      TE.tryCatch(
        async () => {
          // Convert prepared transaction to ethers format
          const ethersTransaction: ethers.TransactionRequest = {
            from: tx.from,
            to: tx.to,
            value: tx.value,
            data: tx.data,
            gasLimit: tx.gas,
            nonce: tx.nonce,
            chainId: tx.chainId
          };

          // Add gas price parameters based on transaction type
          if (tx.type === 2 && tx.maxFeePerGas && tx.maxPriorityFeePerGas) {
            ethersTransaction.maxFeePerGas = tx.maxFeePerGas;
            ethersTransaction.maxPriorityFeePerGas = tx.maxPriorityFeePerGas;
            ethersTransaction.type = 2;
          } else if (tx.gasPrice) {
            ethersTransaction.gasPrice = tx.gasPrice;
          }

          // Sign the transaction
          const signedTx = await this.signer.signTransaction(ethersTransaction);
          
          // Parse signed transaction to get hash
          const parsedTx = ethers.Transaction.from(signedTx);

          return {
            id: tx.id,
            requestId: tx.requestId,
            rawTransaction: signedTx,
            hash: parsedTx.hash!,
            from: tx.from,
            nonce: tx.nonce
          };
        },
        error => this.createError('SIGNING_FAILED', `Failed to sign transaction: ${error}`)
      )
    );
  }

  /**
   * Send transaction
   */
  public sendTransaction(tx: SignedTransaction): TaskEither<TransactionError, string> {
    if (!this.provider) {
      return TE.left(this.createError('NOT_CONNECTED', 'No provider available'));
    }

    return pipe(
      TE.tryCatch(
        async () => {
          const response = await this.provider!.broadcastTransaction(tx.rawTransaction);
          return response.hash;
        },
        error => this.createError('BROADCAST_FAILED', `Failed to broadcast transaction: ${error}`)
      )
    );
  }

  /**
   * Check connection status
   */
  public isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Create error object
   */
  protected createError(code: string, message: string, details?: any): TransactionError {
    return {
      code,
      message,
      details,
      recoverable: ['TIMEOUT', 'NETWORK_ERROR'].includes(code)
    };
  }
}

/**
 * Browser extension wallet implementation (MetaMask, etc.)
 */
export class BrowserWallet extends WalletAbstraction {
  private ethereum: any;

  constructor() {
    super();
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      this.ethereum = (window as any).ethereum;
    }
  }

  /**
   * Connect to browser wallet
   */
  public connect(): TaskEither<TransactionError, void> {
    if (!this.ethereum) {
      return TE.left(this.createError('NO_WALLET', 'No Ethereum wallet detected'));
    }

    return pipe(
      TE.tryCatch(
        async () => {
          // Request account access
          const accounts = await this.ethereum.request({
            method: 'eth_requestAccounts'
          });

          if (accounts.length === 0) {
            throw new Error('No accounts available');
          }

          // Get chain ID
          const chainId = await this.ethereum.request({
            method: 'eth_chainId'
          });

          // Setup provider and signer
          this.provider = new ethers.BrowserProvider(this.ethereum);
          this.signer = await this.provider.getSigner();
          
          this._address = accounts[0];
          this._chainId = parseInt(chainId, 16);
          this._isConnected = true;

          // Setup event listeners
          this.setupEventListeners();
        },
        error => this.createError('CONNECTION_FAILED', `Failed to connect wallet: ${error}`)
      )
    );
  }

  /**
   * Disconnect from wallet
   */
  public disconnect(): TaskEither<TransactionError, void> {
    return TE.of(() => {
      this._isConnected = false;
      this._address = undefined;
      this._chainId = undefined;
      this.provider = undefined;
      this.signer = undefined;
      this.removeEventListeners();
    })();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.ethereum) return;

    this.ethereum.on('accountsChanged', this.handleAccountsChanged.bind(this));
    this.ethereum.on('chainChanged', this.handleChainChanged.bind(this));
    this.ethereum.on('disconnect', this.handleDisconnect.bind(this));
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    if (!this.ethereum) return;

    this.ethereum.removeListener('accountsChanged', this.handleAccountsChanged);
    this.ethereum.removeListener('chainChanged', this.handleChainChanged);
    this.ethereum.removeListener('disconnect', this.handleDisconnect);
  }

  /**
   * Handle account change
   */
  private handleAccountsChanged(accounts: string[]): void {
    if (accounts.length === 0) {
      this.disconnect();
    } else {
      this._address = accounts[0];
    }
  }

  /**
   * Handle chain change
   */
  private handleChainChanged(chainId: string): void {
    this._chainId = parseInt(chainId, 16);
    // Reload the page as recommended by MetaMask
    window.location.reload();
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(): void {
    this.disconnect();
  }
}

/**
 * WalletConnect implementation
 */
export class WalletConnectWallet extends WalletAbstraction {
  private walletConnectProvider: any;

  constructor(walletConnectProvider: any) {
    super();
    this.walletConnectProvider = walletConnectProvider;
  }

  /**
   * Connect via WalletConnect
   */
  public connect(): TaskEither<TransactionError, void> {
    return pipe(
      TE.tryCatch(
        async () => {
          // Enable session (triggers QR Code modal)
          await this.walletConnectProvider.enable();

          // Setup provider and signer
          this.provider = new ethers.BrowserProvider(this.walletConnectProvider);
          this.signer = await this.provider.getSigner();
          
          const accounts = this.walletConnectProvider.accounts;
          this._address = accounts[0];
          this._chainId = this.walletConnectProvider.chainId;
          this._isConnected = true;

          // Setup event listeners
          this.setupEventListeners();
        },
        error => this.createError('CONNECTION_FAILED', `Failed to connect via WalletConnect: ${error}`)
      )
    );
  }

  /**
   * Disconnect WalletConnect session
   */
  public disconnect(): TaskEither<TransactionError, void> {
    return pipe(
      TE.tryCatch(
        async () => {
          await this.walletConnectProvider.disconnect();
          
          this._isConnected = false;
          this._address = undefined;
          this._chainId = undefined;
          this.provider = undefined;
          this.signer = undefined;
        },
        error => this.createError('DISCONNECT_FAILED', `Failed to disconnect: ${error}`)
      )
    );
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.walletConnectProvider.on('accountsChanged', this.handleAccountsChanged.bind(this));
    this.walletConnectProvider.on('chainChanged', this.handleChainChanged.bind(this));
    this.walletConnectProvider.on('disconnect', this.handleDisconnect.bind(this));
  }

  /**
   * Handle account change
   */
  private handleAccountsChanged(accounts: string[]): void {
    if (accounts.length === 0) {
      this.disconnect();
    } else {
      this._address = accounts[0];
    }
  }

  /**
   * Handle chain change
   */
  private handleChainChanged(chainId: number): void {
    this._chainId = chainId;
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(): void {
    this._isConnected = false;
    this._address = undefined;
    this._chainId = undefined;
  }
}

/**
 * Mock wallet for testing
 */
export class MockWallet extends WalletAbstraction {
  private mockAddress: string;
  private mockChainId: number;
  private mockSigner: ethers.Wallet;

  constructor(privateKey: string, provider: ethers.Provider, chainId: number = 1) {
    super();
    this.mockSigner = new ethers.Wallet(privateKey, provider);
    this.mockAddress = this.mockSigner.address;
    this.mockChainId = chainId;
    this.provider = provider;
    this.signer = this.mockSigner;
  }

  public connect(): TaskEither<TransactionError, void> {
    return TE.of(() => {
      this._address = this.mockAddress;
      this._chainId = this.mockChainId;
      this._isConnected = true;
    })();
  }

  public disconnect(): TaskEither<TransactionError, void> {
    return TE.of(() => {
      this._isConnected = false;
      this._address = undefined;
      this._chainId = undefined;
    })();
  }
}

/**
 * Wallet factory to create appropriate wallet instance
 */
export class WalletFactory {
  /**
   * Create wallet instance based on available providers
   */
  public static create(type?: 'browser' | 'walletconnect' | 'mock', options?: any): WalletInterface {
    if (type === 'mock' && options) {
      return new MockWallet(options.privateKey, options.provider, options.chainId);
    }

    if (type === 'walletconnect' && options?.provider) {
      return new WalletConnectWallet(options.provider);
    }

    // Default to browser wallet
    return new BrowserWallet();
  }

  /**
   * Detect available wallet providers
   */
  public static async detectWallets(): Promise<string[]> {
    const wallets: string[] = [];

    if (typeof window !== 'undefined') {
      const ethereum = (window as any).ethereum;
      
      if (ethereum) {
        if (ethereum.isMetaMask) wallets.push('MetaMask');
        if (ethereum.isCoinbaseWallet) wallets.push('Coinbase Wallet');
        if (ethereum.isBraveWallet) wallets.push('Brave Wallet');
        if (ethereum.isRabby) wallets.push('Rabby');
      }
    }

    return wallets;
  }
}