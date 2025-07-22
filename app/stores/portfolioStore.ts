import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface Position {
  id: string;
  symbol: string;
  name?: string;
  amount: number;
  value: number;
  price: number;
  pnl: number;
  pnlPercentage: number;
  allocation: number;
  type: 'token' | 'lp' | 'lending' | 'staking';
}

export interface Transaction {
  id: string;
  hash: string;
  type: 'buy' | 'sell' | 'swap' | 'deposit' | 'withdraw' | 'stake' | 'unstake';
  symbol: string;
  amount: number;
  value: number;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
  from?: string;
  to?: string;
}

export interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  lastUpdated: Date;
}

export interface PortfolioStats {
  totalValue: number;
  totalPnL: number;
  totalPnLPercentage: number;
  dailyChange: number;
  weeklyChange: number;
  monthlyChange: number;
}

export interface PortfolioState {
  // State
  positions: Position[];
  transactions: Transaction[];
  marketData: Record<string, MarketData>;
  stats: PortfolioStats | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Actions
  setPositions: (positions: Position[]) => void;
  addPosition: (position: Position) => void;
  updatePosition: (id: string, updates: Partial<Position>) => void;
  removePosition: (id: string) => void;
  
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  
  setMarketData: (marketData: Record<string, MarketData>) => void;
  updateMarketData: (symbol: string, data: MarketData) => void;
  
  setStats: (stats: PortfolioStats) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastUpdated: (date: Date) => void;
  
  reset: () => void;
}

const initialState = {
  positions: [],
  transactions: [],
  marketData: {},
  stats: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

export const usePortfolioStore = create<PortfolioState>()(
  immer((set) => ({
    ...initialState,
    
    setPositions: (positions) => set((state) => {
      state.positions = positions;
      state.lastUpdated = new Date();
    }),
    
    addPosition: (position) => set((state) => {
      state.positions.push(position);
      state.lastUpdated = new Date();
    }),
    
    updatePosition: (id, updates) => set((state) => {
      const index = state.positions.findIndex(p => p.id === id);
      if (index !== -1) {
        state.positions[index] = { ...state.positions[index], ...updates };
        state.lastUpdated = new Date();
      }
    }),
    
    removePosition: (id) => set((state) => {
      state.positions = state.positions.filter(p => p.id !== id);
      state.lastUpdated = new Date();
    }),
    
    setTransactions: (transactions) => set((state) => {
      state.transactions = transactions;
    }),
    
    addTransaction: (transaction) => set((state) => {
      state.transactions.unshift(transaction);
    }),
    
    updateTransaction: (id, updates) => set((state) => {
      const index = state.transactions.findIndex(t => t.id === id);
      if (index !== -1) {
        state.transactions[index] = { ...state.transactions[index], ...updates };
      }
    }),
    
    setMarketData: (marketData) => set((state) => {
      state.marketData = marketData;
      state.lastUpdated = new Date();
    }),
    
    updateMarketData: (symbol, data) => set((state) => {
      state.marketData[symbol] = data;
      state.lastUpdated = new Date();
    }),
    
    setStats: (stats) => set((state) => {
      state.stats = stats;
    }),
    
    setLoading: (loading) => set((state) => {
      state.isLoading = loading;
    }),
    
    setError: (error) => set((state) => {
      state.error = error;
    }),
    
    setLastUpdated: (date) => set((state) => {
      state.lastUpdated = date;
    }),
    
    reset: () => set(() => initialState),
  }))
);