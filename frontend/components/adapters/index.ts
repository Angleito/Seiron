// Enhanced Frontend Components for Adapter Integration
// This file exports all the new components created for integrating with the SeiAgentKitAdapter, HiveIntelligenceAdapter, and SeiMCPAdapter

// Core adapter integration components
export { SeiNetworkStatus } from '../SeiNetworkStatus'
export type { SeiNetworkStatusProps } from '../SeiNetworkStatus'

export { HiveInsights } from '../HiveInsights'
export type { HiveInsightsProps } from '../HiveInsights'

export { PowerLevelDisplay } from '../PowerLevelDisplay'
export type { PowerLevelDisplayProps } from '../PowerLevelDisplay'

export { ProtocolIntegration } from '../ProtocolIntegration'
export type { ProtocolIntegrationProps } from '../ProtocolIntegration'

// Enhanced existing components
export { ChatInterface } from '../chat/chat-interface'
export { PortfolioSidebar } from '../portfolio/portfolio-sidebar'

// Re-export orchestrator client with new adapter methods
export * from '../../lib/orchestrator-client'