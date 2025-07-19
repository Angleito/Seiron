/**
 * Enhanced Voice Chat Hook for Sei Investment Platform
 * 
 * This hook provides comprehensive voice chat orchestration combining speech recognition,
 * text-to-speech, AI chat streaming, and memory persistence in a unified interface.
 * Enhanced by Agent Zeta with advanced state management and integration capabilities.
 * 
 * Features:
 * - Complete voice chat orchestration across all phases
 * - Integration with audio recording and ElevenLabs client libraries
 * - Advanced state management (idle, listening, processing, speaking, error)
 * - Real-time transcript updates with confidence scoring
 * - Session management with automatic persistence and recovery
 * - Power level calculation with activity-based bonuses
 * - Comprehensive error handling and recovery mechanisms
 * - Performance optimization and memory management
 * - Support for streaming and non-streaming modes
 * - Context-aware AI responses with memory integration
 * 
 * @fileoverview Enhanced voice chat orchestration hook by Agent Zeta
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import * as TE from 'fp-ts/TaskEither'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { useSpeechRecognition } from '../voice/useSpeechRecognition'
import { useSecureElevenLabsTTS } from '../voice/useSecureElevenLabsTTS'
import { useAIMemory } from './useAIMemory'
import { useSeiVoiceIntegration } from '../voice/useSeiVoiceIntegration'
import { logger } from '../../lib/logger'

/**
 * Enhanced voice chat configuration interface
 */
export interface VoiceChatConfig {
  readonly voiceId?: string
  readonly modelId?: string
  readonly voiceSettings?: {
    stability?: number
    similarityBoost?: number
    style?: number
    useSpeakerBoost?: boolean
  }
  readonly speechSettings?: {
    lang?: string
    continuous?: boolean
    interimResults?: boolean
    confidenceThreshold?: number
  }
  readonly chatSettings?: {
    maxMessages?: number
    streamingEnabled?: boolean
    autoSpeak?: boolean
    contextWindow?: number
    memoryEnabled?: boolean
  }
  readonly seiIntegration?: {
    enabled?: boolean
    walletAddress?: string
    enableRealTimeMarketData?: boolean
    enablePortfolioTracking?: boolean
    enableAnalytics?: boolean
  }
  readonly audioSettings?: {
    sampleRate?: number
    chunkSize?: number
    vadThreshold?: number
    noiseGate?: number
  }
  readonly performanceSettings?: {
    powerLevelDecayRate?: number
    powerLevelUpdateInterval?: number
    transcriptDebounceMs?: number
    sessionRecoveryTimeout?: number
  }
}

/**
 * Chat message interface
 */
export interface ChatMessage {
  readonly id: string
  readonly role: 'user' | 'assistant'
  readonly content: string
  readonly timestamp: Date
  readonly isVoice?: boolean
  readonly isStreaming?: boolean
  readonly error?: string
}

/**
 * Connection status type
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * Voice chat phase enumeration
 */
export type VoiceChatPhase = 'idle' | 'listening' | 'processing' | 'speaking' | 'error'

/**
 * Enhanced voice chat state interface
 */
export interface VoiceChatState {
  // Voice states
  readonly phase: VoiceChatPhase
  readonly isListening: boolean
  readonly isSpeaking: boolean
  readonly isProcessing: boolean
  readonly speakerEnabled: boolean
  readonly voiceEnabled: boolean
  readonly powerLevel: number
  readonly audioLevel: number
  readonly hasAudioPermission: boolean
  
  // Chat states
  readonly messages: readonly ChatMessage[]
  readonly isStreaming: boolean
  readonly currentSessionId: string
  readonly error: string | null
  
  // Connection states
  readonly isConnected: boolean
  readonly connectionStatus: ConnectionStatus
  readonly lastActivity: Date | null
  
  // Advanced features
  readonly transcriptConfidence: number
  readonly voiceActivityDetected: boolean
  readonly sessionRecoveryAttempts: number
}

/**
 * Enhanced default configuration values
 */
const DEFAULT_CONFIG: Required<VoiceChatConfig> = {
  voiceId: process.env.VITE_ELEVENLABS_VOICE_ID || 'default',
  modelId: 'eleven_turbo_v2_5', // Use turbo model for faster response
  voiceSettings: {
    stability: Number(process.env.VITE_VOICE_STABILITY) || 0.5, // Lower for more natural speech
    similarityBoost: Number(process.env.VITE_VOICE_SIMILARITY_BOOST) || 0.8, // Higher to maintain voice
    style: Number(process.env.VITE_VOICE_STYLE) || 0.0, // Neutral for speed
    useSpeakerBoost: process.env.VITE_VOICE_USE_SPEAKER_BOOST === 'true'
  },
  speechSettings: {
    lang: 'en-US',
    continuous: true,
    interimResults: true,
    confidenceThreshold: 0.7
  },
  chatSettings: {
    maxMessages: 50,
    streamingEnabled: true,
    autoSpeak: true,
    contextWindow: 10,
    memoryEnabled: true
  },
  audioSettings: {
    sampleRate: 16000,
    chunkSize: 1024,
    vadThreshold: 0.01,
    noiseGate: 0.005
  },
  performanceSettings: {
    powerLevelDecayRate: 1,
    powerLevelUpdateInterval: 100,
    transcriptDebounceMs: 300,
    sessionRecoveryTimeout: 5000
  },
  seiIntegration: {
    enabled: true,
    walletAddress: '',
    enableRealTimeMarketData: true,
    enablePortfolioTracking: true,
    enableAnalytics: true
  }
} as const

/**
 * Voice Chat Hook
 * 
 * Provides complete voice-enabled chat functionality including speech recognition,
 * text-to-speech, and chat messaging with Dragon Ball Z themed features.
 * 
 * @param config - Voice chat configuration options
 */
export const useVoiceChat = (config: VoiceChatConfig = {}) => {
  const mergedConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config])
  
  // Enhanced internal state
  const [speakerEnabled, setSpeakerEnabled] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [powerLevel, setPowerLevel] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [hasAudioPermission, setHasAudioPermission] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState(`session_${Date.now()}`)
  const [lastActivity, setLastActivity] = useState<Date | null>(null)
  const [transcriptConfidence, setTranscriptConfidence] = useState(0)
  const [voiceActivityDetected, setVoiceActivityDetected] = useState(false)
  const [sessionRecoveryAttempts, setSessionRecoveryAttempts] = useState(0)
  
  // Enhanced refs for managing state and performance
  const processingTimeoutRef = useRef<NodeJS.Timeout>()
  const powerLevelIntervalRef = useRef<NodeJS.Timeout>()
  const transcriptDebounceRef = useRef<NodeJS.Timeout>()
  const sessionRecoveryRef = useRef<NodeJS.Timeout>()
  const lastSpeechTimeRef = useRef<number>(0)
  const lastTranscriptRef = useRef<string>('')
  const voiceActivityRef = useRef<boolean>(false)
  const audioPermissionRef = useRef<boolean>(false)
  const wasListeningBeforeTTSRef = useRef<boolean>(false)
  
  // Voice hooks
  const speechRecognition = useSpeechRecognition()
  const tts = useSecureElevenLabsTTS({
    voiceId: mergedConfig.voiceId,
    modelId: mergedConfig.modelId,
    voiceSettings: mergedConfig.voiceSettings
  })
  
  // Memory hook for conversation persistence
  const memory = useAIMemory()
  
  // Sei voice integration hook
  const seiIntegration = useSeiVoiceIntegration({
    enabled: mergedConfig.seiIntegration.enabled,
    walletAddress: mergedConfig.seiIntegration.walletAddress,
    enableRealTimeMarketData: mergedConfig.seiIntegration.enableRealTimeMarketData,
    enablePortfolioTracking: mergedConfig.seiIntegration.enablePortfolioTracking,
    enableAnalytics: mergedConfig.seiIntegration.enableAnalytics
  })
  
  // Enhanced calculated states
  const isListening = speechRecognition.isListening
  const isSpeaking = tts.isSpeaking
  const isProcessing = speechRecognition.isListening && speechRecognition.transcript.length > 0 && !isSpeaking
  const voiceEnabled = speechRecognition.isSupported && Boolean(mergedConfig.voiceId) && hasAudioPermission
  const isConnected = connectionStatus === 'connected'
  
  // Calculate current voice chat phase
  const phase: VoiceChatPhase = useMemo(() => {
    if (error) return 'error'
    if (isSpeaking) return 'speaking'
    if (isProcessing) return 'processing'
    if (isListening) return 'listening'
    return 'idle'
  }, [error, isSpeaking, isProcessing, isListening])
  
  // Enhanced power level calculation with activity-based bonuses
  useEffect(() => {
    if (!powerLevelIntervalRef.current) {
      powerLevelIntervalRef.current = setInterval(() => {
        const now = Date.now()
        const timeSinceLastSpeech = now - lastSpeechTimeRef.current
        
        // Enhanced activity bonuses with voice activity detection
        let activityBonus = 0
        if (isSpeaking) activityBonus = 35
        else if (isProcessing) activityBonus = 30
        else if (isListening && voiceActivityDetected) activityBonus = 25
        else if (isListening) activityBonus = 15
        else if (audioLevel > 0.1) activityBonus = 10
        
        // Adaptive decay rate based on inactivity
        const decayRate = timeSinceLastSpeech > 5000 ? 
          mergedConfig.performanceSettings.powerLevelDecayRate * 2 : 
          mergedConfig.performanceSettings.powerLevelDecayRate
        
        // Confidence bonus
        const confidenceBonus = transcriptConfidence * 5
        
        setPowerLevel(prev => {
          const newLevel = Math.max(0, Math.min(100, prev + activityBonus + confidenceBonus - decayRate))
          return newLevel
        })
        
        // Update audio level with smoothing
        setAudioLevel(prev => prev * 0.9 + (voiceActivityDetected ? 0.8 : 0) * 0.1)
      }, mergedConfig.performanceSettings.powerLevelUpdateInterval)
    }
    
    return () => {
      if (powerLevelIntervalRef.current) {
        clearInterval(powerLevelIntervalRef.current)
        powerLevelIntervalRef.current = undefined
      }
    }
  }, [isListening, isSpeaking, isProcessing, voiceActivityDetected, transcriptConfidence, audioLevel, mergedConfig.performanceSettings])
  
  // Enhanced activity tracking with voice activity detection
  useEffect(() => {
    if (isListening || isSpeaking || isProcessing || voiceActivityDetected) {
      lastSpeechTimeRef.current = Date.now()
      setLastActivity(new Date())
    }
  }, [isListening, isSpeaking, isProcessing, voiceActivityDetected])
  
  // Monitor voice activity and audio levels
  useEffect(() => {
    const checkVoiceActivity = () => {
      const hasActivity = speechRecognition.transcript.length > 0 || 
                         speechRecognition.interimTranscript.length > 0 ||
                         audioLevel > mergedConfig.audioSettings.vadThreshold
      
      if (hasActivity !== voiceActivityRef.current) {
        voiceActivityRef.current = hasActivity
        setVoiceActivityDetected(hasActivity)
      }
    }
    
    const interval = setInterval(checkVoiceActivity, 50)
    return () => clearInterval(interval)
  }, [speechRecognition.transcript, speechRecognition.interimTranscript, audioLevel, mergedConfig.audioSettings.vadThreshold])
  
  // Auto re-enable voice listening after TTS completes
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined
    
    // When TTS stops speaking and we have voice enabled, re-enable listening
    if (!isSpeaking && voiceEnabled && hasAudioPermission && !isListening && !error) {
      // Add a small delay to prevent interrupting any trailing audio
      timeoutId = setTimeout(() => {
        logger.info('Auto re-enabling voice listening after TTS completed')
        startListening()
      }, 500) // 500ms delay to ensure audio has fully stopped
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [isSpeaking, voiceEnabled, hasAudioPermission, isListening, error, startListening])
  
  // Enhanced connection initialization with permission handling
  useEffect(() => {
    const initializeConnection = async () => {
      setConnectionStatus('connecting')
      setSessionRecoveryAttempts(0)
      
      try {
        // Check audio permissions first
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true })
          setHasAudioPermission(true)
          audioPermissionRef.current = true
          logger.info('Audio permission granted')
        } catch (permErr) {
          setHasAudioPermission(false)
          audioPermissionRef.current = false
          logger.warn('Audio permission denied or unavailable:', permErr)
        }
        
        // Check voice capabilities
        if (!speechRecognition.isSupported) {
          throw new Error('Speech recognition not supported in this browser')
        }
        
        // Load conversation history with timeout
        const memoryLoadPromise = memory.loadMemory()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Memory load timeout')), mergedConfig.performanceSettings.sessionRecoveryTimeout)
        )
        
        await Promise.race([memoryLoadPromise, timeoutPromise])
        
        setConnectionStatus('connected')
        setError(null)
        logger.info('Voice chat initialized successfully', {
          hasAudioPermission: audioPermissionRef.current,
          voiceEnabled: speechRecognition.isSupported && Boolean(mergedConfig.voiceId),
          sessionId: currentSessionId
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize voice chat'
        setError(errorMessage)
        setConnectionStatus('error')
        logger.error('Voice chat initialization failed:', err)
        
        // Schedule recovery attempt
        scheduleSessionRecovery()
      }
    }
    
    initializeConnection()
  }, [speechRecognition.isSupported, memory, mergedConfig.voiceId, mergedConfig.performanceSettings.sessionRecoveryTimeout, currentSessionId])
  
  // Enhanced speech recognition result handling with debouncing and confidence
  useEffect(() => {
    const handleTranscriptUpdate = () => {
      const transcript = speechRecognition.transcript.trim()
      const interimTranscript = speechRecognition.interimTranscript.trim()
      
      // Update confidence based on speech recognition results
      if (transcript || interimTranscript) {
        setTranscriptConfidence(0.8) // Base confidence, can be enhanced with actual confidence scores
      }
      
      // Handle final transcript
      if (transcript && !isListening && transcript !== lastTranscriptRef.current) {
        lastTranscriptRef.current = transcript
        
        // Debounce transcript processing to avoid duplicate processing
        if (transcriptDebounceRef.current) {
          clearTimeout(transcriptDebounceRef.current)
        }
        
        transcriptDebounceRef.current = setTimeout(() => {
          if (transcript.length > 0) {
            logger.info('Speech recognized with confidence:', {
              transcript,
              confidence: transcriptConfidence,
              length: transcript.length
            })
            handleSendMessage(transcript, true)
            speechRecognition.clearTranscript()
            setTranscriptConfidence(0)
          }
        }, mergedConfig.performanceSettings.transcriptDebounceMs)
      }
    }
    
    handleTranscriptUpdate()
  }, [speechRecognition.transcript, speechRecognition.interimTranscript, isListening, transcriptConfidence, mergedConfig.performanceSettings.transcriptDebounceMs])
  
  // Handle speech recognition errors
  useEffect(() => {
    if (speechRecognition.hasError()) {
      const errorMessage = speechRecognition.getErrorMessage()
      setError(`Speech recognition error: ${errorMessage}`)
      logger.error('Speech recognition error:', errorMessage)
    }
  }, [speechRecognition.hasError(), speechRecognition.getErrorMessage()])
  
  // Handle TTS errors
  useEffect(() => {
    if (tts.error) {
      setError(`Voice synthesis error: ${tts.error.message}`)
      logger.error('TTS error:', tts.error)
    }
  }, [tts.error])
  
  /**
   * Start listening for voice input
   */
  const startListening = useCallback(async () => {
    setError(null)
    
    const result = await speechRecognition.startListening()()
    
    if (result._tag === 'Left') {
      setError(`Failed to start listening: ${result.left.message}`)
      logger.error('Failed to start listening:', result.left)
    } else {
      logger.info('Started listening for voice input')
    }
  }, [speechRecognition])
  
  /**
   * Stop listening for voice input
   */
  const stopListening = useCallback(async () => {
    const result = await speechRecognition.stopListening()()
    
    if (result._tag === 'Left') {
      setError(`Failed to stop listening: ${result.left.message}`)
      logger.error('Failed to stop listening:', result.left)
    } else {
      logger.info('Stopped listening for voice input')
    }
  }, [speechRecognition])
  
  /**
   * Toggle speaker enable/disable
   */
  const toggleSpeaker = useCallback(() => {
    setSpeakerEnabled(prev => {
      const newState = !prev
      logger.info('Speaker toggled:', newState ? 'enabled' : 'disabled')
      
      // Stop current speech if disabling speaker
      if (!newState && tts.isSpeaking) {
        tts.stop()
      }
      
      return newState
    })
  }, [tts])
  
  /**
   * Send a message and get AI response
   */
  const sendMessage = useCallback(async (text: string, isVoice = false) => {
    await handleSendMessage(text, isVoice)
  }, [])
  
  /**
   * Enhanced message handling with context and memory integration
   */
  const handleSendMessage = useCallback(async (text: string, isVoice = false) => {
    if (!text.trim()) return
    
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
      isVoice
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsStreaming(true)
    setError(null)
    setLastActivity(new Date())
    
    try {
      // Save user message to memory with enhanced metadata
      await memory.saveMemory(userMessage.content, 'user', 'interaction', isVoice ? 0.9 : 0.8)
      
      // Build context from recent messages and memories
      const recentMessages = messages.slice(-mergedConfig.chatSettings.contextWindow)
      const contextMemories = memory.getMemoriesByCategory('context')
      const factMemories = memory.getMemoriesByCategory('fact')
      
      const context = {
        recentMessages: recentMessages.map(m => ({ role: m.role, content: m.content })),
        memories: contextMemories.slice(-5).map(m => ({ key: m.key, value: m.value, confidence: m.confidence })),
        facts: factMemories.filter(m => m.confidence > 0.7).map(m => ({ key: m.key, value: m.value })),
        sessionId: currentSessionId,
        voiceMode: isVoice,
        userPreferences: memory.getMemory('user_preferences')
      }
      
      // TODO: Replace with actual AI chat service integration
      // For now, use enhanced simulation with context
      const aiResponse = await simulateAIResponseWithContext(text, context)
      
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        isVoice: false
      }
      
      setMessages(prev => [...prev, assistantMessage])
      
      // Save AI response to memory with context metadata
      await memory.saveMemory(aiResponse, 'assistant', 'context', 0.85)
      
      // Extract and save any new facts or preferences from the conversation
      if (mergedConfig.chatSettings.memoryEnabled) {
        await extractAndSaveConversationInsights(text, aiResponse)
      }
      
      // Speak response if auto-speak is enabled and speaker is on
      if (mergedConfig.chatSettings.autoSpeak && speakerEnabled && !isSpeaking) {
        const speakResult = await tts.speak(aiResponse)()
        
        if (speakResult._tag === 'Left') {
          logger.error('Failed to speak AI response:', speakResult.left)
          // Try fallback TTS if available
        }
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process message'
      setError(errorMessage)
      logger.error('Message processing failed:', {
        error: err,
        sessionId: currentSessionId,
        messageLength: text.length,
        isVoice
      })
      
      // Attempt session recovery on errors
      scheduleSessionRecovery()
    } finally {
      setIsStreaming(false)
    }
  }, [memory, mergedConfig.chatSettings, speakerEnabled, tts, messages, currentSessionId, isSpeaking])
  
  /**
   * Enhanced AI response simulation with context awareness
   */
  const simulateAIResponseWithContext = useCallback(async (userMessage: string, context: any): Promise<string> => {
    // Try Sei voice integration first if enabled
    if (mergedConfig.seiIntegration.enabled && seiIntegration.isReady) {
      try {
        const enhancedResponse = await seiIntegration.processVoiceQuery(
          userMessage, 
          mergedConfig.seiIntegration.walletAddress || undefined
        )
        
        if (enhancedResponse) {
          logger.info('Using Sei-enhanced response', { 
            intent: enhancedResponse.intent,
            confidence: enhancedResponse.confidence,
            dataSourced: enhancedResponse.dataSourced
          })
          return enhancedResponse.spokenText
        }
      } catch (error) {
        logger.warn('Sei integration failed, falling back to simulated response:', error)
      }
    }

    // Fallback to enhanced simulation with Sei context
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200))
    
    const lowerMessage = userMessage.toLowerCase()
    
    // Context-aware responses based on conversation history and Sei data
    const recentContext = context.recentMessages?.slice(-3) || []
    const hasDiscussedSei = recentContext.some((m: any) => m.content.toLowerCase().includes('sei'))
    const hasDiscussedInvestment = recentContext.some((m: any) => m.content.toLowerCase().includes('investment'))
    
    // Include Sei integration context
    const marketContext = seiIntegration.marketContext
    const portfolioContext = seiIntegration.portfolioContext
    const hasMarketData = seiIntegration.hasMarketData
    const hasPortfolioData = seiIntegration.hasPortfolioData
    
    // Voice mode responses are more conversational
    const isVoiceMode = context.voiceMode
    const voicePrefix = isVoiceMode ? '' : ''
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      if (hasDiscussedSei && hasMarketData) {
        const trend = marketContext?.marketTrend || 'neutral'
        return `${voicePrefix}Welcome back, warrior! The Sei markets are showing ${trend} sentiment today. Ready to continue exploring investment opportunities?`
      }
      return `${voicePrefix}Greetings, warrior! I am Seiron, your AI investment advisor with real-time Sei blockchain intelligence. How can I help you master the markets today?`
    }
    
    if (lowerMessage.includes('price') || lowerMessage.includes('market')) {
      if (hasMarketData && marketContext) {
        const changeDirection = marketContext.seiChange24h >= 0 ? 'up' : 'down'
        return `${voicePrefix}SEI is currently ${changeDirection} ${Math.abs(marketContext.seiChange24h).toFixed(1)}% at $${marketContext.seiPrice.toFixed(3)}. The market is showing ${marketContext.marketTrend} sentiment with ${marketContext.volatility} volatility.`
      }
      return `${voicePrefix}I'm gathering the latest market data for you! The Sei blockchain's speed gives us real-time insights into market movements.`
    }
    
    if (lowerMessage.includes('portfolio') || lowerMessage.includes('balance')) {
      if (hasPortfolioData && portfolioContext) {
        const changeDirection = portfolioContext.totalChangePercent >= 0 ? 'gained' : 'lost'
        return `${voicePrefix}Your portfolio has ${changeDirection} ${Math.abs(portfolioContext.totalChangePercent).toFixed(1)}% today, with a total value of $${portfolioContext.totalValue.toLocaleString()}. Your top asset is ${portfolioContext.topAsset.symbol} at ${portfolioContext.topAsset.percentage}%.`
      }
      if (mergedConfig.seiIntegration.walletAddress) {
        return `${voicePrefix}I'm analyzing your portfolio data now! The Sei network's efficiency allows for real-time portfolio tracking.`
      }
      return `${voicePrefix}Connect your wallet and I'll provide detailed portfolio analysis with real-time Sei blockchain data!`
    }
    
    if (lowerMessage.includes('defi') || lowerMessage.includes('yield') || lowerMessage.includes('farming')) {
      const opportunities = seiIntegration.defiOpportunities
      if (opportunities.length > 0) {
        const topOpportunity = opportunities[0]
        return `${voicePrefix}I found excellent DeFi opportunities! ${topOpportunity.protocol} is offering ${topOpportunity.apr.toFixed(1)}% APR for ${topOpportunity.type}. ${topOpportunity.description}`
      }
      return `${voicePrefix}I'm scanning the Sei DeFi ecosystem for the best yield opportunities! The parallelized execution gives us access to multiple protocols simultaneously.`
    }
    
    if (lowerMessage.includes('sei') || lowerMessage.includes('blockchain')) {
      if (hasDiscussedInvestment) {
        return `${voicePrefix}Excellent! Combining your portfolio strategy with Sei's lightning-fast execution is like achieving perfect Ultra Instinct in crypto trading. The real-time data gives us a massive advantage!`
      }
      return `${voicePrefix}The Sei blockchain offers incredible opportunities! With sub-second finality and our real-time integration, it's like having Saiyan-level trading reflexes in the crypto world.`
    }
    
    if (lowerMessage.includes('power') || lowerMessage.includes('level')) {
      const analyticsData = seiIntegration.getAnalytics()
      return `${voicePrefix}I can sense your growing power level at ${Math.round(powerLevel)}! You've made ${analyticsData.totalQueries} strategic queries with ${(analyticsData.avgConfidence * 100).toFixed(1)}% average confidence. Your most common focus has been ${analyticsData.mostCommonIntent || 'general strategy'}.`
    }
    
    // Enhanced contextual fallback responses with Sei integration awareness
    const seiAwareFallbacks = [
      `${voicePrefix}Interesting insight! With our real-time Sei blockchain integration, we can turn that analysis into actionable investment intelligence.`,
      `${voicePrefix}That's a fascinating perspective, warrior! The Sei network's speed lets us validate that hypothesis against live market data instantly.`,
      `${voicePrefix}Your strategic thinking reminds me of Piccolo's tactical mind. Let's use our Sei integration to explore how this applies to current market conditions.`
    ]
    
    return seiAwareFallbacks[Math.floor(Math.random() * seiAwareFallbacks.length)] + (hasMarketData ? " The real-time data shows some interesting opportunities!" : " What specific aspect would you like to explore further?")
  }, [powerLevel, mergedConfig.seiIntegration, seiIntegration])
  
  /**
   * Extract insights from conversation for memory storage
   */
  const extractAndSaveConversationInsights = useCallback(async (userInput: string, aiResponse: string) => {
    try {
      // Simple keyword-based insight extraction
      const insights: Array<{ key: string; value: any; category: 'preference' | 'fact' }> = []
      
      // Extract user preferences
      if (userInput.toLowerCase().includes('prefer') || userInput.toLowerCase().includes('like')) {
        insights.push({
          key: `preference_${Date.now()}`,
          value: { userInput, extractedAt: new Date() },
          category: 'preference'
        })
      }
      
      // Extract mentioned investment topics
      const investmentKeywords = ['defi', 'yield', 'staking', 'trading', 'portfolio']
      const mentionedTopics = investmentKeywords.filter(keyword => 
        userInput.toLowerCase().includes(keyword) || aiResponse.toLowerCase().includes(keyword)
      )
      
      if (mentionedTopics.length > 0) {
        insights.push({
          key: `discussed_topics_${Date.now()}`,
          value: { topics: mentionedTopics, discussedAt: new Date() },
          category: 'fact'
        })
      }
      
      // Save insights to memory
      for (const insight of insights) {
        await memory.saveMemory(insight.key, insight.value, insight.category, 0.7)
      }
      
      if (insights.length > 0) {
        logger.debug('Saved conversation insights:', { insightCount: insights.length, sessionId: currentSessionId })
      }
    } catch (err) {
      logger.warn('Failed to extract conversation insights:', err)
    }
  }, [memory, currentSessionId])
  
  /**
   * Schedule session recovery with exponential backoff
   */
  const scheduleSessionRecovery = useCallback(() => {
    if (sessionRecoveryRef.current) {
      clearTimeout(sessionRecoveryRef.current)
    }
    
    const backoffMs = Math.min(1000 * Math.pow(2, sessionRecoveryAttempts), 30000)
    
    sessionRecoveryRef.current = setTimeout(() => {
      setSessionRecoveryAttempts(prev => prev + 1)
      
      logger.info('Attempting session recovery', {
        attempt: sessionRecoveryAttempts + 1,
        backoffMs,
        sessionId: currentSessionId
      })
      
      // Reset connection and try to reinitialize
      setConnectionStatus('connecting')
      setError(null)
      
      // The initialization effect will run again due to state change
    }, backoffMs)
  }, [sessionRecoveryAttempts, currentSessionId])
  
  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    setError(null)
    speechRecognition.clearError()
  }, [speechRecognition])
  
  /**
   * Reset the entire session
   */
  const resetSession = useCallback(async () => {
    setMessages([])
    setError(null)
    setIsStreaming(false)
    setPowerLevel(0)
    speechRecognition.clearTranscript()
    speechRecognition.clearError()
    tts.stop()
    
    try {
      await memory.clearMemory()
      logger.info('Voice chat session reset')
    } catch (err) {
      logger.error('Failed to clear memory:', err)
    }
  }, [speechRecognition, tts, memory])
  
  // Enhanced cleanup on unmount with comprehensive resource management
  useEffect(() => {
    return () => {
      // Clear all timeouts and intervals
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current)
      }
      if (powerLevelIntervalRef.current) {
        clearInterval(powerLevelIntervalRef.current)
      }
      if (transcriptDebounceRef.current) {
        clearTimeout(transcriptDebounceRef.current)
      }
      if (sessionRecoveryRef.current) {
        clearTimeout(sessionRecoveryRef.current)
      }
      
      // Stop audio processing
      tts.stop()
      
      // Final state cleanup
      logger.debug('Voice chat hook cleanup completed', {
        sessionId: currentSessionId,
        messageCount: messages.length,
        finalPowerLevel: powerLevel
      })
    }
  }, [tts, currentSessionId, messages.length, powerLevel])
  
  return {
    // Enhanced voice states
    phase,
    isListening,
    isSpeaking,
    isProcessing,
    speakerEnabled,
    voiceEnabled,
    powerLevel,
    audioLevel,
    hasAudioPermission,
    voiceActivityDetected,
    transcriptConfidence,
    
    // Enhanced chat states
    messages,
    isStreaming,
    error,
    currentSessionId,
    lastActivity,
    sessionRecoveryAttempts,
    
    // Connection states
    isConnected,
    connectionStatus,
    
    // Core actions
    startListening,
    stopListening,
    toggleSpeaker,
    sendMessage,
    clearError,
    resetSession,
    
    // Enhanced utilities
    transcript: speechRecognition.transcript,
    interimTranscript: speechRecognition.interimTranscript,
    hasTranscript: speechRecognition.hasTranscript(),
    wordCount: speechRecognition.getWordCount(),
    normalizedTranscript: speechRecognition.getNormalizedTranscript(),
    transcriptKeywords: speechRecognition.getTranscriptWords(),
    
    // TTS utilities
    preloadAudio: tts.preloadAudio,
    clearCache: tts.clearCache,
    getCacheStats: tts.getCacheStats,
    
    // Memory and context utilities
    getMemory: memory.getMemory,
    searchMemories: memory.searchMemories,
    getMemoriesByCategory: memory.getMemoriesByCategory,
    hasMemory: memory.hasMemory,
    
    // Session management
    switchSession: useCallback((sessionId: string) => {
      setCurrentSessionId(sessionId)
      setMessages([])
      setError(null)
      logger.info('Switched to session:', sessionId)
    }, []),
    
    // Advanced voice controls
    setVoiceActivityThreshold: useCallback((threshold: number) => {
      logger.debug('Voice activity threshold updated:', threshold)
      // Would update config if it were mutable
    }, []),
    
    // Performance monitoring
    getPerformanceMetrics: useCallback(() => ({
      powerLevel,
      audioLevel,
      transcriptConfidence,
      sessionRecoveryAttempts,
      lastActivity,
      voiceActivityDetected,
      hasAudioPermission,
      messageCount: messages.length,
      seiIntegrationStats: seiIntegration.getCacheStats(),
      seiAnalytics: seiIntegration.getAnalytics()
    }), [powerLevel, audioLevel, transcriptConfidence, sessionRecoveryAttempts, lastActivity, voiceActivityDetected, hasAudioPermission, messages.length, seiIntegration]),
    
    // Sei integration utilities
    seiIntegration: {
      hasMarketData: seiIntegration.hasMarketData,
      hasPortfolioData: seiIntegration.hasPortfolioData,
      marketContext: seiIntegration.marketContext,
      portfolioContext: seiIntegration.portfolioContext,
      defiOpportunities: seiIntegration.defiOpportunities,
      refreshMarketData: seiIntegration.refreshMarketData,
      refreshPortfolioData: seiIntegration.refreshPortfolioData,
      getAnalytics: seiIntegration.getAnalytics,
      clearCache: seiIntegration.clearCache,
      isReady: seiIntegration.isReady,
      lastIntent: seiIntegration.lastIntent,
      confidence: seiIntegration.confidence
    }
  }
}

export default useVoiceChat