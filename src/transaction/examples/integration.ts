/**
 * Transaction Flow Integration Example
 * 
 * This example demonstrates how to integrate the transaction flow system
 * into a frontend application and connect it with the AI agents.
 */

import { ethers } from 'ethers';
import {
  TransactionFlowManager,
  TransactionBuilder,
  WalletFactory,
  defaultTransactionFlowConfig,
  InMemoryTransactionQueue,
  EthersTransactionBroadcaster,
  InMemoryTransactionStore,
  DefaultTransactionValidator,
  DefaultGasEstimationStrategy
} from '../index';
import { TransactionFlowAdapter } from '../../agents/adapters/TransactionFlowAdapter';
import { LendingAgent } from '../../agents/lending/LendingAgent';

/**
 * Example: Setting up the transaction flow system
 */
export async function setupTransactionFlow() {
  // 1. Create provider (Sei Network)
  const provider = new ethers.JsonRpcProvider('https://evm-rpc.sei-apis.com');
  
  // 2. Initialize gas strategy
  const gasStrategy = new DefaultGasEstimationStrategy(provider);
  
  // 3. Setup protocol configurations
  const protocolConfigs = new Map([
    ['takara', {
      abi: TAKARA_LENDING_POOL_ABI,
      address: '0x...' // Takara lending pool address
    }],
    ['dragonswap', {
      abi: DRAGONSWAP_ROUTER_ABI,
      address: '0x...' // DragonSwap router address
    }]
  ]);
  
  // 4. Create transaction builder
  const transactionBuilder = new TransactionBuilder(
    provider,
    gasStrategy,
    protocolConfigs
  );
  
  // 5. Create other components
  const queue = new InMemoryTransactionQueue(100);
  const broadcaster = new EthersTransactionBroadcaster(provider);
  const store = new InMemoryTransactionStore();
  const validator = new DefaultTransactionValidator();
  
  // 6. Create flow manager
  const flowManager = new TransactionFlowManager(
    defaultTransactionFlowConfig,
    transactionBuilder,
    broadcaster,
    queue,
    store,
    validator
  );
  
  // 7. Create transaction adapter
  const transactionAdapter = new TransactionFlowAdapter(flowManager);
  
  return { flowManager, transactionAdapter };
}

/**
 * Example: Connecting wallet and setting up event handlers
 */
export async function connectWalletAndSetupHandlers(
  flowManager: TransactionFlowManager,
  transactionAdapter: TransactionFlowAdapter
) {
  // 1. Create and connect wallet
  const wallet = WalletFactory.create('browser');
  await wallet.connect()();
  
  // 2. Set wallet in flow manager
  flowManager.setWallet(wallet);
  
  // 3. Setup confirmation handler for UI
  transactionAdapter.on('confirmation:required', async (confirmationRequest) => {
    console.log('Transaction confirmation required:', confirmationRequest);
    
    // In a real app, this would show a modal/dialog to the user
    // For example:
    const userApproved = await showConfirmationDialog({
      transaction: confirmationRequest.transaction,
      metadata: confirmationRequest.metadata,
      estimatedCost: confirmationRequest.estimatedCost
    });
    
    // Send user response back
    transactionAdapter.confirmTransaction(
      confirmationRequest.flowId,
      userApproved
    );
  });
  
  // 4. Setup completion handler
  transactionAdapter.on('transaction:completed', (event) => {
    console.log('Transaction completed:', event);
    // Update UI, show success message, etc.
  });
  
  // 5. Setup error handler
  transactionAdapter.on('transaction:failed', (event) => {
    console.error('Transaction failed:', event);
    // Show error message to user
  });
}

/**
 * Example: Using lending agent with transaction flow
 */
export async function useLendingAgentWithTransactionFlow() {
  // 1. Setup transaction flow
  const { flowManager, transactionAdapter } = await setupTransactionFlow();
  
  // 2. Connect wallet
  await connectWalletAndSetupHandlers(flowManager, transactionAdapter);
  
  // 3. Create lending agent (without private key!)
  const lendingAgent = new LendingAgent(
    {
      id: 'lending-agent-1',
      name: 'Lending Agent',
      version: '1.0.0',
      description: 'Manages lending positions',
      capabilities: ['supply', 'withdraw', 'borrow', 'repay'],
      settings: {}
    }
  );
  
  // 4. Execute lending action through agent
  const userAddress = await flowManager.wallet?.getAddress()();
  
  if (userAddress._tag === 'Right') {
    // Supply USDC to Takara
    const result = await transactionAdapter.supplyAsset({
      protocol: 'takara',
      asset: '0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1', // USDC on Sei
      amount: BigInt(1000 * 1e6), // 1000 USDC (6 decimals)
      from: userAddress.right,
      agent: 'lending-agent-1',
      userId: 'user123'
    })();
    
    if (result._tag === 'Right') {
      console.log('Transaction flow created:', result.right);
      // Transaction will go through confirmation flow
    }
  }
}

/**
 * Example: React hook for transaction management
 */
export function useTransactionFlow() {
  const [flowManager, setFlowManager] = useState<TransactionFlowManager | null>(null);
  const [transactionAdapter, setTransactionAdapter] = useState<TransactionFlowAdapter | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [pendingTransactions, setPendingTransactions] = useState<TransactionFlow[]>([]);
  
  useEffect(() => {
    setupTransactionFlow().then(({ flowManager, transactionAdapter }) => {
      setFlowManager(flowManager);
      setTransactionAdapter(transactionAdapter);
      
      // Setup event listeners
      transactionAdapter.on('confirmation:required', handleConfirmationRequired);
      transactionAdapter.on('transaction:completed', handleTransactionCompleted);
      transactionAdapter.on('transaction:failed', handleTransactionFailed);
    });
    
    return () => {
      // Cleanup
      if (flowManager) {
        flowManager.shutdown();
      }
    };
  }, []);
  
  const connectWallet = async () => {
    if (!flowManager) return;
    
    const wallet = WalletFactory.create('browser');
    const result = await wallet.connect()();
    
    if (result._tag === 'Right') {
      flowManager.setWallet(wallet);
      setIsConnected(true);
    }
  };
  
  const executeTransaction = async (request: TransactionRequest) => {
    if (!flowManager) return;
    
    const result = await flowManager.createFlow(request)();
    
    if (result._tag === 'Right') {
      setPendingTransactions(prev => [...prev, result.right]);
    }
  };
  
  return {
    isConnected,
    connectWallet,
    executeTransaction,
    pendingTransactions,
    transactionAdapter
  };
}

/**
 * Example: Confirmation dialog (simplified)
 */
async function showConfirmationDialog(params: {
  transaction: PreparedTransaction;
  metadata: TransactionMetadata;
  estimatedCost: string;
}): Promise<boolean> {
  // In a real app, this would be a proper modal/dialog
  return confirm(`
    Confirm Transaction:
    ${params.metadata.description}
    
    Estimated Cost: ${params.estimatedCost} SEI
    Risk Level: ${params.metadata.riskLevel}
    
    ${params.metadata.confirmationMessage || ''}
  `);
}

// Mock ABIs for example
const TAKARA_LENDING_POOL_ABI = [
  'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
  'function withdraw(address asset, uint256 amount, address to)',
  'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)',
  'function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf)'
];

const DRAGONSWAP_ROUTER_ABI = [
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)',
  'function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline)',
  'function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline)'
];

// Import React hooks (these would be actual imports in a real app)
declare const useState: any;
declare const useEffect: any;
declare const confirm: any;

// Type imports
import type { TransactionRequest, PreparedTransaction, TransactionMetadata, TransactionFlow } from '../types';