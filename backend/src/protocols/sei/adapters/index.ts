/**
 * Sei Protocol Adapters Index
 * Exports all protocol wrappers and integration utilities
 */

export { SiloProtocolWrapper, createSiloProtocolWrapper } from './SiloProtocolWrapper';
export { CitrexProtocolWrapper, createCitrexProtocolWrapper } from './CitrexProtocolWrapper';

export * from '../types';

// Factory function to create all Sei protocol adapters
import { PublicClient, WalletClient } from 'viem';
import { SeiProtocolConfig, SeiProtocolIntegration } from '../types';
import { createSiloProtocolWrapper } from './SiloProtocolWrapper';
import { createCitrexProtocolWrapper } from './CitrexProtocolWrapper';

/**
 * Create complete Sei protocol integration
 */
export const createSeiProtocolIntegration = (
  publicClient: PublicClient,
  walletClient: WalletClient,
  config: SeiProtocolConfig
): SeiProtocolIntegration => {
  const silo = createSiloProtocolWrapper(publicClient, walletClient, config);
  const citrex = createCitrexProtocolWrapper(publicClient, walletClient, config);

  return {
    silo,
    citrex,
    config,
    health: [
      {
        protocol: 'silo',
        isOperational: true,
        lastUpdate: new Date().toISOString(),
        metrics: {
          responseTime: 150,
          successRate: 0.99,
          errorRate: 0.01
        },
        issues: []
      },
      {
        protocol: 'citrex',
        isOperational: true,
        lastUpdate: new Date().toISOString(),
        metrics: {
          responseTime: 200,
          successRate: 0.98,
          errorRate: 0.02
        },
        issues: []
      }
    ]
  };
};