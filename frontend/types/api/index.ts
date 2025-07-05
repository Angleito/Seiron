// API types - centralized exports

// ElevenLabs TTS API
export * from './elevenlabs'

// Web Speech API
export * from './speech'

// Blockchain and Sei Network API
export * from './blockchain'

// Orchestrator API
export * from './orchestrator'

// Re-export commonly used types for convenience
export type {
  TTSError,
  TTSState,
  ElevenLabsConfig,
  ElevenLabsVoice,
  ElevenLabsQuota
} from './elevenlabs'

export type {
  SpeechRecognitionState,
  SpeechRecognitionConfig,
  VoiceCommand,
  VoiceCommandResult,
  RecognitionLanguage
} from './speech'

export type {
  NetworkStatus,
  WalletBalance,
  TransactionResult,
  SeiTransaction,
  ProtocolPosition
} from './blockchain'

export type {
  OrchestratorResponse,
  ChatMessage,
  ChatRequest,
  ChatResponse,
  AgentTask,
  PortfolioAnalysisResponse,
  TradingResponse
} from './orchestrator'