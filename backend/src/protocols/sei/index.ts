/**
 * Sei Protocol Integration - Main Export Module
 * Complete integration for Silo (staking) and Citrex (perpetual trading) protocols
 */

// ===================== Core Types and Interfaces =====================
export * from './types';

// ===================== Protocol Adapters =====================
export * from './adapters';
export { SiloProtocolWrapper, createSiloProtocolWrapper } from './adapters/SiloProtocolWrapper';
export { CitrexProtocolWrapper, createCitrexProtocolWrapper } from './adapters/CitrexProtocolWrapper';

// ===================== Integration Layer =====================
export { SeiProtocolIntegration, createSeiProtocolIntegration } from './SeiProtocolIntegration';

// ===================== Error Handling =====================
export * from './errors/SeiProtocolErrorHandler';
export {
  SeiProtocolErrorHandler,
  createSafeOperation,
  createRetryableOperation,
  handleProtocolError
} from './errors/SeiProtocolErrorHandler';

// ===================== Risk Management =====================
export * from './risk/SeiRiskManager';
export { SeiRiskManager, createSeiRiskManager } from './risk/SeiRiskManager';

// ===================== Usage Examples (for documentation) =====================
export * from './examples/usage';

// ===================== Utility Functions =====================

import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import { createPublicClient, createWalletClient, http } from 'viem';
import { SeiProtocolConfig, SeiProtocolIntegration } from './types';
import { createSeiProtocolIntegration as createIntegration } from './SeiProtocolIntegration';
import { createSeiRiskManager } from './risk/SeiRiskManager';
import { SeiProtocolErrorHandler } from './errors/SeiProtocolErrorHandler';

/**
 * Quick setup function for Sei protocol integration
 */
export const setupSeiProtocols = (config: SeiProtocolConfig) => {
  const publicClient = createPublicClient({
    transport: http(config.rpcUrl)
  });

  const walletClient = createWalletClient({
    transport: http(config.rpcUrl)
  });

  const integration = new SeiProtocolIntegration(publicClient, walletClient, config);
  const riskManager = createSeiRiskManager();

  return {
    integration,
    riskManager,
    publicClient,
    walletClient,
    
    // Helper methods
    initialize: () => integration.initialize(),
    
    // Quick access to adapters
    silo: integration.silo,
    citrex: integration.citrex,
    
    // Error handling utilities
    wrapOperation: SeiProtocolErrorHandler.wrapOperation,
    retryOperation: SeiProtocolErrorHandler.retryOperation,
    
    // Risk management utilities
    analyzeRisk: riskManager.analyzeRisk,
    validateOperation: riskManager.validateOperation,
    startMonitoring: riskManager.startMonitoring,
    stopMonitoring: riskManager.stopMonitoring
  };
};

/**
 * Default configuration for Sei mainnet
 */
export const SEI_MAINNET_CONFIG: SeiProtocolConfig = {
  network: 'mainnet',
  rpcUrl: 'https://evm-rpc.sei-apis.com',
  contractAddresses: {
    silo: {
      stakingContract: 'sei1silo1staking2contract3address4here5for6main7network8deployment9',
      rewardDistributor: 'sei1silo1reward2distributor3address4here5for6main7network8deployment',
      timelock: 'sei1silo1timelock2contract3address4here5for6governance7and8security9only',
      governance: 'sei1silo1governance2contract3address4here5for6protocol7management8only'
    },
    citrex: {
      perpetualTrading: 'sei1citrex1perpetual2trading3contract4address5here6for7main8network9',
      vault: 'sei1citrex1vault2contract3address4here5for6collateral7management8only9',
      priceOracle: 'sei1citrex1price2oracle3contract4address5here6for7price8feeds9only',
      liquidationEngine: 'sei1citrex1liquidation2engine3contract4address5here6for7risk8mgmt9',
      fundingRateCalculator: 'sei1citrex1funding2rate3calculator4contract5address6here7for8rates9',
      riskManager: 'sei1citrex1risk2manager3contract4address5here6for7position8limits9'
    }
  },
  defaultSlippage: 0.005,
  gasLimits: {
    stake: 200000,
    unstake: 250000,
    claimRewards: 150000,
    openPosition: 300000,
    closePosition: 250000,
    adjustPosition: 200000
  }
};

/**
 * Default configuration for Sei testnet
 */
export const SEI_TESTNET_CONFIG: SeiProtocolConfig = {
  network: 'testnet',
  rpcUrl: 'https://evm-rpc-testnet.sei-apis.com',
  contractAddresses: {
    silo: {
      stakingContract: 'sei1test1silo1staking2contract3address4here5for6test7network8deployment9',
      rewardDistributor: 'sei1test1silo1reward2distributor3address4here5for6test7network8deployment',
      timelock: 'sei1test1silo1timelock2contract3address4here5for6governance7and8security9only',
      governance: 'sei1test1silo1governance2contract3address4here5for6protocol7management8only'
    },
    citrex: {
      perpetualTrading: 'sei1test1citrex1perpetual2trading3contract4address5here6for7test8network9',
      vault: 'sei1test1citrex1vault2contract3address4here5for6collateral7management8only9',
      priceOracle: 'sei1test1citrex1price2oracle3contract4address5here6for7price8feeds9only',
      liquidationEngine: 'sei1test1citrex1liquidation2engine3contract4address5here6for7risk8mgmt9',
      fundingRateCalculator: 'sei1test1citrex1funding2rate3calculator4contract5address6here7for8rates9',
      riskManager: 'sei1test1citrex1risk2manager3contract4address5here6for7position8limits9'
    }
  },
  defaultSlippage: 0.01,
  gasLimits: {
    stake: 300000,
    unstake: 350000,
    claimRewards: 200000,
    openPosition: 400000,
    closePosition: 350000,
    adjustPosition: 300000
  }
};

// ===================== Version Information =====================

export const SEI_PROTOCOL_VERSION = '1.0.0';
export const SUPPORTED_PROTOCOLS = ['silo', 'citrex'] as const;
export const SUPPORTED_NETWORKS = ['mainnet', 'testnet', 'devnet'] as const; // TODO: REMOVE_MOCK - Hard-coded array literals