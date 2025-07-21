import { z } from 'zod';
import { BaseMCPServer, MCPTool } from './base-server.js';
import { SigningStargateClient, StargateClient } from '@cosmjs/stargate';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { coins } from '@cosmjs/amino';
import axios from 'axios';

// Environment configuration
const SEI_RPC_URL = process.env.SEI_RPC_URL || 'https://rpc.sei-apis.com';
const SEI_REST_URL = process.env.SEI_REST_URL || 'https://rest.sei-apis.com';
const SEI_CHAIN_ID = process.env.SEI_CHAIN_ID || 'pacific-1';
const WALLET_MNEMONIC = process.env.SEI_WALLET_MNEMONIC || '';

class SeiBlockchainMCPServer extends BaseMCPServer {
  private client: StargateClient | null = null;
  private signingClient: SigningStargateClient | null = null;
  private wallet: DirectSecp256k1HdWallet | null = null;
  private address: string = '';

  constructor() {
    const tools: MCPTool[] = [
      {
        name: 'getWalletBalance',
        description: 'Query wallet balances on SEI blockchain',
        inputSchema: z.object({
          address: z.string().describe('Wallet address to query'),
          denom: z.string().optional().describe('Specific token denomination'),
        }),
        handler: async (args) => {
          try {
            const client = await this.getClient();
            
            if (args.denom) {
              const balance = await client.getBalance(args.address, args.denom);
              return { balances: [balance] };
            } else {
              const balances = await client.getAllBalances(args.address);
              return { balances };
            }
          } catch (error: any) {
            throw new Error(`Failed to query balance: ${error.message}`);
          }
        },
      },
      {
        name: 'getTransactionHistory',
        description: 'Get transaction history for an address',
        inputSchema: z.object({
          address: z.string().describe('Wallet address'),
          limit: z.number().optional().describe('Number of transactions'),
          offset: z.number().optional().describe('Pagination offset'),
        }),
        handler: async (args) => {
          try {
            const response = await axios.get(`${SEI_REST_URL}/cosmos/tx/v1beta1/txs`, {
              params: {
                'events': `transfer.recipient='${args.address}'`,
                'pagination.limit': args.limit || 20,
                'pagination.offset': args.offset || 0,
                'order_by': 'ORDER_BY_DESC',
              },
            });

            return {
              transactions: response.data.tx_responses,
              pagination: response.data.pagination,
            };
          } catch (error: any) {
            throw new Error(`Failed to fetch transaction history: ${error.message}`);
          }
        },
      },
      {
        name: 'getDeFiPositions',
        description: 'Get DeFi positions for an address',
        inputSchema: z.object({
          address: z.string().describe('Wallet address'),
          protocols: z.array(z.string()).optional().describe('Specific protocols to check'),
        }),
        handler: async (args) => {
          try {
            // Query various DeFi protocols on SEI
            const positions = [];
            
            // Query staking positions
            const stakingResponse = await axios.get(
              `${SEI_REST_URL}/cosmos/staking/v1beta1/delegations/${args.address}`
            );
            
            if (stakingResponse.data.delegation_responses?.length > 0) {
              positions.push({
                protocol: 'native-staking',
                type: 'staking',
                positions: stakingResponse.data.delegation_responses,
              });
            }

            // Add more DeFi protocol queries as needed
            // This would include AMMs, lending protocols, etc.
            
            return { positions };
          } catch (error: any) {
            throw new Error(`Failed to fetch DeFi positions: ${error.message}`);
          }
        },
      },
      {
        name: 'swapTokens',
        description: 'Execute a token swap on SEI DEX',
        inputSchema: z.object({
          fromToken: z.string().describe('Token to swap from'),
          toToken: z.string().describe('Token to swap to'),
          amount: z.string().describe('Amount to swap'),
          slippage: z.number().optional().describe('Maximum slippage percentage'),
        }),
        handler: async (args) => {
          if (!WALLET_MNEMONIC) {
            throw new Error('Wallet mnemonic not configured. Cannot execute swaps.');
          }

          try {
            const signingClient = await this.getSigningClient();
            
            // This would integrate with SEI's DEX module
            // For production, you'd need to construct the proper swap message
            const msg = {
              typeUrl: '/seiprotocol.seichain.dex.MsgPlaceOrders',
              value: {
                creator: this.address,
                orders: [{
                  id: Date.now().toString(),
                  account: this.address,
                  contractAddr: args.fromToken, // This would be the pair contract
                  price: '0', // Market order
                  quantity: args.amount,
                  priceDenom: args.toToken,
                  assetDenom: args.fromToken,
                  orderType: 'MARKET',
                  positionDirection: 'LONG',
                  data: '{}',
                }],
                funds: coins(args.amount, args.fromToken),
              },
            };

            const result = await signingClient.signAndBroadcast(
              this.address,
              [msg],
              'auto',
              'Token swap via MCP'
            );

            return {
              transactionHash: result.transactionHash,
              gasUsed: result.gasUsed,
              gasWanted: result.gasWanted,
            };
          } catch (error: any) {
            throw new Error(`Failed to execute swap: ${error.message}`);
          }
        },
      },
      {
        name: 'transferTokens',
        description: 'Transfer tokens to another address',
        inputSchema: z.object({
          toAddress: z.string().describe('Recipient address'),
          amount: z.string().describe('Amount to transfer'),
          denom: z.string().describe('Token denomination'),
          memo: z.string().optional().describe('Transaction memo'),
        }),
        handler: async (args) => {
          if (!WALLET_MNEMONIC) {
            throw new Error('Wallet mnemonic not configured. Cannot execute transfers.');
          }

          try {
            const signingClient = await this.getSigningClient();
            
            const result = await signingClient.sendTokens(
              this.address,
              args.toAddress,
              coins(args.amount, args.denom),
              'auto',
              args.memo || 'Transfer via MCP'
            );

            return {
              transactionHash: result.transactionHash,
              gasUsed: result.gasUsed,
              gasWanted: result.gasWanted,
            };
          } catch (error: any) {
            throw new Error(`Failed to transfer tokens: ${error.message}`);
          }
        },
      },
      {
        name: 'getLiquidityPools',
        description: 'Get liquidity pool information',
        inputSchema: z.object({
          denom1: z.string().optional().describe('First token in pair'),
          denom2: z.string().optional().describe('Second token in pair'),
          limit: z.number().optional().describe('Number of pools to return'),
        }),
        handler: async (args) => {
          try {
            // Query SEI DEX module for liquidity pools
            const response = await axios.get(`${SEI_REST_URL}/sei-protocol/seichain/dex/list_pools`);
            
            let pools = response.data.pools || [];
            
            // Filter by denoms if provided
            if (args.denom1 || args.denom2) {
              pools = pools.filter((pool: any) => {
                const hasDenom1 = !args.denom1 || pool.pair.token0 === args.denom1 || pool.pair.token1 === args.denom1;
                const hasDenom2 = !args.denom2 || pool.pair.token0 === args.denom2 || pool.pair.token1 === args.denom2;
                return hasDenom1 && hasDenom2;
              });
            }

            if (args.limit) {
              pools = pools.slice(0, args.limit);
            }

            return { pools };
          } catch (error: any) {
            throw new Error(`Failed to fetch liquidity pools: ${error.message}`);
          }
        },
      },
      {
        name: 'getStakingInfo',
        description: 'Get staking information for an address',
        inputSchema: z.object({
          address: z.string().describe('Delegator address'),
          validatorAddress: z.string().optional().describe('Specific validator'),
        }),
        handler: async (args) => {
          try {
            const endpoints = [
              `/cosmos/staking/v1beta1/delegations/${args.address}`,
              `/cosmos/staking/v1beta1/delegators/${args.address}/unbonding_delegations`,
              `/cosmos/distribution/v1beta1/delegators/${args.address}/rewards`,
            ];

            const [delegations, unbonding, rewards] = await Promise.all(
              endpoints.map(endpoint => 
                axios.get(`${SEI_REST_URL}${endpoint}`).then(r => r.data)
              )
            );

            return {
              delegations: delegations.delegation_responses || [],
              unbonding: unbonding.unbonding_responses || [],
              rewards: rewards.rewards || [],
              total_rewards: rewards.total || [],
            };
          } catch (error: any) {
            throw new Error(`Failed to fetch staking info: ${error.message}`);
          }
        },
      },
      {
        name: 'getValidatorInfo',
        description: 'Get information about validators',
        inputSchema: z.object({
          status: z.enum(['bonded', 'unbonded', 'unbonding']).optional(),
          limit: z.number().optional(),
        }),
        handler: async (args) => {
          try {
            const response = await axios.get(`${SEI_REST_URL}/cosmos/staking/v1beta1/validators`, {
              params: {
                status: args.status?.toUpperCase() || 'BOND_STATUS_BONDED',
                'pagination.limit': args.limit || 20,
              },
            });

            return {
              validators: response.data.validators,
              pagination: response.data.pagination,
            };
          } catch (error: any) {
            throw new Error(`Failed to fetch validator info: ${error.message}`);
          }
        },
      },
      {
        name: 'getProposals',
        description: 'Get governance proposals',
        inputSchema: z.object({
          status: z.enum(['voting', 'passed', 'rejected', 'failed']).optional(),
          limit: z.number().optional(),
        }),
        handler: async (args) => {
          try {
            const statusMap = {
              voting: 'PROPOSAL_STATUS_VOTING_PERIOD',
              passed: 'PROPOSAL_STATUS_PASSED',
              rejected: 'PROPOSAL_STATUS_REJECTED',
              failed: 'PROPOSAL_STATUS_FAILED',
            };

            const response = await axios.get(`${SEI_REST_URL}/cosmos/gov/v1beta1/proposals`, {
              params: {
                proposal_status: args.status ? statusMap[args.status] : undefined,
                'pagination.limit': args.limit || 20,
              },
            });

            return {
              proposals: response.data.proposals,
              pagination: response.data.pagination,
            };
          } catch (error: any) {
            throw new Error(`Failed to fetch proposals: ${error.message}`);
          }
        },
      },
      {
        name: 'getTokenInfo',
        description: 'Get token metadata and information',
        inputSchema: z.object({
          denom: z.string().describe('Token denomination'),
        }),
        handler: async (args) => {
          try {
            // Query token metadata from bank module
            const response = await axios.get(
              `${SEI_REST_URL}/cosmos/bank/v1beta1/denoms_metadata/${args.denom}`
            );

            return {
              metadata: response.data.metadata,
            };
          } catch (error: any) {
            throw new Error(`Failed to fetch token info: ${error.message}`);
          }
        },
      },
    ];

    super({
      name: 'sei-blockchain-mcp',
      version: '1.0.0',
      description: 'SEI Blockchain MCP Server - Production Blockchain Operations',
      tools,
    });

    this.initializeClients();
  }

  private async initializeClients() {
    try {
      // Initialize read-only client
      this.client = await StargateClient.connect(SEI_RPC_URL);
      
      // Initialize signing client if mnemonic is provided
      if (WALLET_MNEMONIC) {
        this.wallet = await DirectSecp256k1HdWallet.fromMnemonic(WALLET_MNEMONIC, {
          prefix: 'sei',
        });
        
        const [account] = await this.wallet.getAccounts();
        this.address = account.address;
        
        this.signingClient = await SigningStargateClient.connectWithSigner(
          SEI_RPC_URL,
          this.wallet
        );
        
        console.error(`Initialized with wallet address: ${this.address}`);
      } else {
        console.error('WARNING: No wallet mnemonic provided. Write operations will be disabled.');
      }
    } catch (error: any) {
      console.error(`Failed to initialize blockchain clients: ${error.message}`);
    }
  }

  private async getClient(): Promise<StargateClient> {
    if (!this.client) {
      this.client = await StargateClient.connect(SEI_RPC_URL);
    }
    return this.client;
  }

  private async getSigningClient(): Promise<SigningStargateClient> {
    if (!this.signingClient) {
      throw new Error('Signing client not initialized. Wallet mnemonic required.');
    }
    return this.signingClient;
  }
}

// Start the server
const server = new SeiBlockchainMCPServer();
server.start().catch(console.error);