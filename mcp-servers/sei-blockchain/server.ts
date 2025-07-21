import { z } from 'zod';
import { BaseMCPServer, MCPTool } from './base-server.js';
import axios from 'axios';

// Environment configuration
const SEI_RPC_URL = process.env.SEI_RPC_URL || 'https://rpc.sei-apis.com';
const SEI_REST_URL = process.env.SEI_REST_URL || 'https://rest.sei-apis.com';
const SEI_CHAIN_ID = process.env.SEI_CHAIN_ID || 'pacific-1';

class SeiBlockchainMCPServer extends BaseMCPServer {
  constructor() {
    super({
      name: 'sei-blockchain-mcp',
      version: '1.0.0',
      description: 'SEI Blockchain MCP Server - Simplified HTTP version',
      tools: [
        {
          name: 'getWalletBalance',
          description: 'Get wallet balance for a SEI address',
          inputSchema: z.object({
            address: z.string().describe('SEI wallet address'),
            denom: z.string().optional().describe('Token denomination (default: usei)')
          }),
          handler: this.getWalletBalance.bind(this)
        },
        {
          name: 'getTransactionHistory',
          description: 'Get transaction history for a SEI address',
          inputSchema: z.object({
            address: z.string().describe('SEI wallet address'),
            limit: z.number().optional().describe('Number of transactions to retrieve (default: 10)')
          }),
          handler: this.getTransactionHistory.bind(this)
        },
        {
          name: 'getChainInfo',
          description: 'Get SEI chain information',
          inputSchema: z.object({}),
          handler: this.getChainInfo.bind(this)
        },
        {
          name: 'getBlockInfo',
          description: 'Get block information by height',
          inputSchema: z.object({
            height: z.number().optional().describe('Block height (default: latest)')
          }),
          handler: this.getBlockInfo.bind(this)
        },
        {
          name: 'getValidators',
          description: 'Get list of SEI validators',
          inputSchema: z.object({
            status: z.string().optional().describe('Validator status filter')
          }),
          handler: this.getValidators.bind(this)
        }
      ]
    });
  }

  private async getWalletBalance(args: { address: string; denom?: string }) {
    try {
      const { address, denom = 'usei' } = args;
      
      const response = await axios.get(
        `${SEI_REST_URL}/cosmos/bank/v1beta1/balances/${address}`
      );
      
      const balances = response.data.balances || [];
      const balance = balances.find((b: any) => b.denom === denom);
      
      if (balance) {
        const amount = parseInt(balance.amount) / 1_000_000; // Convert from usei to SEI
        return `Address ${address} has ${amount} SEI tokens`;
      } else {
        return `Address ${address} has 0 SEI tokens`;
      }
    } catch (error) {
      console.error('Balance query error:', error);
      return `Error retrieving balance for ${args.address}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async getTransactionHistory(args: { address: string; limit?: number }) {
    try {
      const { address, limit = 10 } = args;
      
      // Note: This is a simplified implementation
      // In practice, you'd need to query transaction events
      return `Transaction history for ${address} (last ${limit} transactions): Feature coming soon - requires transaction indexer`;
    } catch (error) {
      console.error('Transaction history error:', error);
      return `Error retrieving transaction history: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async getChainInfo() {
    try {
      const response = await axios.get(`${SEI_REST_URL}/cosmos/base/tendermint/v1beta1/node_info`);
      const nodeInfo = response.data.default_node_info;
      
      return `SEI Chain Info:
- Chain ID: ${SEI_CHAIN_ID}
- Network: ${nodeInfo?.network || 'Unknown'}
- Version: ${nodeInfo?.version || 'Unknown'}
- Moniker: ${nodeInfo?.moniker || 'Unknown'}`;
    } catch (error) {
      console.error('Chain info error:', error);
      return `Error retrieving chain info: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async getBlockInfo(args: { height?: number }) {
    try {
      const { height } = args;
      const url = height 
        ? `${SEI_REST_URL}/cosmos/base/tendermint/v1beta1/blocks/${height}`
        : `${SEI_REST_URL}/cosmos/base/tendermint/v1beta1/blocks/latest`;
      
      const response = await axios.get(url);
      const block = response.data.block;
      
      return `Block Info:
- Height: ${block?.header?.height || 'Unknown'}
- Time: ${block?.header?.time || 'Unknown'}
- Proposer: ${block?.header?.proposer_address || 'Unknown'}
- Transaction Count: ${block?.data?.txs?.length || 0}`;
    } catch (error) {
      console.error('Block info error:', error);
      return `Error retrieving block info: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async getValidators(args: { status?: string }) {
    try {
      const response = await axios.get(
        `${SEI_REST_URL}/cosmos/staking/v1beta1/validators`
      );
      
      const validators = response.data.validators || [];
      const count = validators.length;
      
      return `SEI Network has ${count} validators. Use specific validator queries for detailed information.`;
    } catch (error) {
      console.error('Validators query error:', error);
      return `Error retrieving validators: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
}

// Start the server
const server = new SeiBlockchainMCPServer();
server.start().catch(console.error);