// Type definitions for Cypress tests

export interface WalletState {
  address: string;
  chainId: number;
  balance: string;
  connected: boolean;
}

export interface PortfolioPosition {
  token: string;
  amount: string;
  value: string;
  protocol?: string;
  apy?: string;
}

export interface VoiceCommand {
  text: string;
  intent: 'supply' | 'withdraw' | 'swap' | 'portfolio' | 'info';
  parameters?: {
    amount?: string;
    token?: string;
    protocol?: string;
  };
}

export interface AIResponse {
  message: string;
  action?: {
    type: string;
    parameters: Record<string, any>;
  };
  audioUrl?: string;
}

export interface TransactionRequest {
  action: 'supply' | 'withdraw' | 'swap' | 'approve';
  amount: string;
  token: string;
  protocol: string;
  slippage?: number;
}

export interface TransactionResult {
  hash: string;
  status: 'pending' | 'success' | 'failed';
  gasUsed: string;
  blockNumber?: number;
}