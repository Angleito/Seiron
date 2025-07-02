// Agent system types for frontend

export type UserIntentType = 
  | 'lending'
  | 'liquidity'
  | 'portfolio'
  | 'trading'
  | 'analysis'
  | 'info'
  | 'risk'

export interface UserIntent {
  type: UserIntentType
  action: string
  parameters: Record<string, unknown>
  context: IntentContext
  priority: 'low' | 'medium' | 'high' | 'urgent'
  timestamp: number
}

export interface IntentContext {
  walletAddress?: string
  sessionId: string
  previousIntents: UserIntent[]
  portfolioState?: unknown
  preferences?: UserPreferences
}

export interface UserPreferences {
  riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  preferredProtocols: string[]
  slippageTolerance: number
  gasPreference: 'low' | 'medium' | 'high'
  autoApproval?: boolean
}

export type AgentType = 
  | 'lending_agent'
  | 'liquidity_agent'
  | 'portfolio_agent'
  | 'risk_agent'
  | 'analysis_agent'

export interface AgentMessage {
  id: string
  type: 'user' | 'agent' | 'system'
  agentType?: AgentType
  content: string
  timestamp: Date
  metadata?: {
    intent?: UserIntentType
    action?: string
    confidence?: number
    taskId?: string
    executionTime?: number
  }
}

export interface TaskResult {
  taskId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: unknown
  error?: {
    code: string
    message: string
    recoverable: boolean
  }
  executionTime: number
  metadata?: Record<string, unknown>
}

export interface AgentStreamEvent {
  type: 'status' | 'progress' | 'result' | 'error'
  agentId: string
  agentType: AgentType
  data: unknown
  timestamp: number
}

// Either type for error handling
export type Either<L, R> = 
  | { _tag: 'Left'; left: L }
  | { _tag: 'Right'; right: R }