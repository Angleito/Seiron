/**
 * DeFi Agents Framework
 * 
 * Comprehensive ElizaOS-integrated agent system for DeFi automation
 */

// Base Agent Framework
export * from './base';

// Specialized Agents
export * from './lending';
export * from './liquidity';
export * from './market';

// Agent Factory and Registry
export { AgentFactory } from './AgentFactory';
export { createDefaultAgents } from './DefaultAgents';

// Character Files
export { getLendingAgentCharacter } from './characters/lending-agent.json';
export { getLiquidityAgentCharacter } from './characters/liquidity-agent.json';
export { getMarketAgentCharacter } from './characters/market-agent.json';