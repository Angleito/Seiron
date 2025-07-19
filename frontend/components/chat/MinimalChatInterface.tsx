'use client'

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Send, Loader2, Sparkles, Wifi, WifiOff, AlertCircle, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SeironImage } from '@/components/SeironImage'
import { GameDialogueBox } from './GameDialogueBox'
import { VoiceTranscriptPreview } from './VoiceTranscriptPreview'
import { characterConfig } from '@/utils/character-config'
import { useChatStream } from './useChatStream'
import { useSecureElevenLabsTTS } from '@/hooks/voice/useSecureElevenLabsTTS'
import { useSpeechRecognition } from '@/hooks/voice/useSpeechRecognition'
import type { StreamMessage } from '@/lib/vercel-chat-service'
import '@/styles/game-dialogue.css'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isLoading?: boolean
  ttsStatus?: 'pending' | 'loading' | 'playing' | 'completed' | 'error'
}

interface MinimalChatInterfaceProps {
  onNewMessage?: (message: Message) => void
  onUserMessage?: (message: Message) => void
  className?: string
}

export interface MinimalChatInterfaceRef {
  sendMessage: (content: string) => void
}

export const MinimalChatInterface = forwardRef<MinimalChatInterfaceRef, MinimalChatInterfaceProps>(
  ({ onNewMessage, onUserMessage, className }, ref) => {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const spokenMessagesRef = useRef<Set<string>>(new Set())
  
  // Voice integration state
  const [voiceEnabled, setVoiceEnabled] = useState(true) // Enable voice by default
  const [isVoiceListening, setIsVoiceListening] = useState(false)
  const [ttsEnabled, setTTSEnabled] = useState(true) // Enable TTS by default
  const [showTranscriptPreview, setShowTranscriptPreview] = useState(false)
  const [ttsStatusMap, setTtsStatusMap] = useState<Record<string, Message['ttsStatus']>>({})
  
  // Generate or get session ID
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  
  // Initialize chat stream
  const {
    messages: streamMessages,
    isLoading,
    sendMessage: sendStreamMessage,
    connectionStatus
  } = useChatStream({
    sessionId,
    apiEndpoint: '', // Base URL, service will append /api/chat/orchestrate
    onMessage: (message: StreamMessage) => {
      // Convert StreamMessage to Message format for callbacks
      const convertedMessage: Message = {
        id: message.id,
        role: message.type === 'user' ? 'user' : 'assistant',
        content: message.content,
        timestamp: message.timestamp,
        isLoading: message.status === 'pending' || message.status === 'sending'
      }
      
      if (message.type === 'agent' || message.type === 'system') {
        onNewMessage?.(convertedMessage)
      }
    }
  })
  
  // Initialize voice hooks
  const speechRecognition = useSpeechRecognition()
  const tts = useSecureElevenLabsTTS({
    voiceId: import.meta.env.VITE_ELEVENLABS_VOICE_ID || 'default',
    modelId: 'eleven_monolingual_v1',
    voiceSettings: {
      stability: 0.75,
      similarityBoost: 0.75,
      style: 0.5,
      useSpeakerBoost: true
    }
  })
  
  // Track when TTS starts/stops speaking
  useEffect(() => {
    if (tts.isSpeaking) {
      // Find which message is being spoken and update its status
      const spokenIds = Array.from(spokenMessagesRef.current)
      const lastSpokenId = spokenIds[spokenIds.length - 1]
      if (lastSpokenId && ttsStatusMap[lastSpokenId] === 'loading') {
        setTtsStatusMap(prev => ({
          ...prev,
          [lastSpokenId]: 'playing'
        }))
      }
    }
  }, [tts.isSpeaking, ttsStatusMap])
  
  // Debug TTS initialization
  useEffect(() => {
    console.log('TTS Configuration:', {
      voiceId: import.meta.env.VITE_ELEVENLABS_VOICE_ID || 'default',
      hasVoiceId: !!import.meta.env.VITE_ELEVENLABS_VOICE_ID,
      ttsEnabled,
      voiceEnabled,
      ttsHook: {
        isSpeaking: tts.isSpeaking,
        isLoading: tts.isLoading,
        hasError: !!tts.error
      }
    })
  }, [ttsEnabled, voiceEnabled, tts.isSpeaking, tts.isLoading, tts.error])
  
  // Convert StreamMessage[] to Message[] for display
  const messages: Message[] = [
    {
      id: 'welcome',
      role: 'assistant',
      content: "Greetings, mortal! I am Seiron, the Dragon of Financial Wisdom. I possess legendary powers to grant your wildest investment wishes. What treasures do you seek today?",
      timestamp: new Date()
    },
    ...streamMessages.map(msg => ({
      id: msg.id,
      role: msg.type === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content,
      timestamp: msg.timestamp,
      isLoading: msg.status === 'pending' || msg.status === 'sending'
    }))
  ]

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [input])
  
  const handleSubmit = useCallback(async (e?: React.FormEvent, content?: string) => {
    e?.preventDefault()
    const messageContent = content || input.trim()
    if (!messageContent || isLoading) return

    // Create user message for callback
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: messageContent,
      timestamp: new Date()
    }
    
    // Clear input if not using external content
    if (!content) setInput('')
    
    // Notify parent of user message
    onUserMessage?.(userMessage)

    // Send message through stream
    sendStreamMessage(messageContent)
  }, [input, isLoading, onUserMessage, sendStreamMessage])

  // Speak assistant messages when TTS is enabled
  useEffect(() => {
    console.log('TTS Effect triggered:', {
      ttsEnabled,
      voiceEnabled,
      messagesLength: messages.length,
      lastMessage: messages[messages.length - 1]
    })
    
    if (!ttsEnabled || !voiceEnabled || messages.length === 0) {
      console.log('TTS Effect early return:', { ttsEnabled, voiceEnabled, messagesLength: messages.length })
      return
    }
    
    // Get the latest message
    const latestMessage = messages[messages.length - 1]
    
    // Only speak assistant messages that are not loading
    if (latestMessage.role === 'assistant' && !latestMessage.isLoading) {
      // Skip the welcome message (it has a specific ID)
      if (latestMessage.id === 'welcome') {
        console.log('Skipping welcome message')
        return
      }
      
      // Check if we've already spoken this message
      if (spokenMessagesRef.current.has(latestMessage.id)) {
        console.log('Message already spoken:', latestMessage.id)
        return
      }
      
      console.log('Speaking message:', {
        id: latestMessage.id,
        content: latestMessage.content.substring(0, 50) + '...',
        contentLength: latestMessage.content.length
      })
      
      // Mark message as being spoken
      spokenMessagesRef.current.add(latestMessage.id)
      
      // Update message TTS status to loading
      setTtsStatusMap(prev => ({
        ...prev,
        [latestMessage.id]: 'loading'
      }))
      
      // Speak the message
      console.log('TTS: Attempting to speak message')
      console.log('TTS state before speak:', {
        isSpeaking: tts.isSpeaking,
        isLoading: tts.isLoading,
        error: tts.error,
        voiceId: import.meta.env.VITE_ELEVENLABS_VOICE_ID
      })
      
      tts.speak(latestMessage.content)().then(result => {
        console.log('TTS speak result:', result)
        if (result._tag === 'Left') {
          console.error('TTS Error details:', {
            error: result.left,
            type: result.left.type,
            message: result.left.message,
            statusCode: result.left.statusCode
          })
          // Remove from spoken set on error so it can be retried
          spokenMessagesRef.current.delete(latestMessage.id)
          // Update status to error
          setTtsStatusMap(prev => ({
            ...prev,
            [latestMessage.id]: 'error'
          }))
          // Log error but don't show alert - just let chat continue working
          console.warn('TTS unavailable:', result.left.message)
        } else {
          console.log('TTS Success: Message spoken')
          // Update status to completed
          setTtsStatusMap(prev => ({
            ...prev,
            [latestMessage.id]: 'completed'
          }))
        }
      }).catch(err => {
        console.error('TTS speak promise error:', err)
        setTtsStatusMap(prev => ({
          ...prev,
          [latestMessage.id]: 'error'
        }))
      })
    }
  }, [messages, ttsEnabled, voiceEnabled, tts])
  
  // Handle speech recognition results
  useEffect(() => {
    // Show transcript preview when we have a transcript
    if (speechRecognition.transcript || speechRecognition.interimTranscript) {
      setShowTranscriptPreview(true)
    } else {
      setShowTranscriptPreview(false)
    }
  }, [speechRecognition.transcript, speechRecognition.interimTranscript])

  // Send the transcript when user confirms
  const handleSendTranscript = useCallback(() => {
    if (speechRecognition.transcript) {
      handleSubmit(undefined, speechRecognition.transcript)
      speechRecognition.clearTranscript()
      setShowTranscriptPreview(false)
    }
  }, [speechRecognition, handleSubmit])

  // Cancel the transcript
  const handleCancelTranscript = useCallback(() => {
    speechRecognition.clearTranscript()
    setShowTranscriptPreview(false)
  }, [speechRecognition])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Expose sendMessage method to parent
  useImperativeHandle(ref, () => ({
    sendMessage: (content: string) => {
      if (content.trim()) {
        handleSubmit(undefined, content)
      }
    }
  }), [handleSubmit])

  return (
    <div className={cn("h-full flex flex-col bg-gray-950", className)}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto game-chat-background">
        <div className="max-w-5xl mx-auto px-4 py-8">
          {messages.map((message) => {
            const streamMessage = streamMessages.find(m => m.id === message.id)
            const isError = streamMessage?.status === 'failed'
            
            return (
              <GameDialogueBox
                key={message.id}
                characterName={characterConfig[message.role].name}
                characterImage={characterConfig[message.role].image}
                message={
                  message.isLoading 
                    ? "Channeling dragon wisdom..." 
                    : isError 
                      ? "⚠️ The dragon's power failed to reach you. Try again, mortal!"
                      : message.content
                }
                position={characterConfig[message.role].position}
                showPortrait={true}
              />
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-4 py-4 relative">
          {/* Voice Transcript Preview */}
          {showTranscriptPreview && (
            <VoiceTranscriptPreview
              isListening={speechRecognition.isListening}
              transcript={speechRecognition.transcript}
              interimTranscript={speechRecognition.interimTranscript}
              confidence={speechRecognition.confidence}
              onSend={handleSendTranscript}
              onCancel={handleCancelTranscript}
            />
          )}
          
          <div className="relative flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Speak your wish to the eternal dragon..."
                className="w-full px-4 py-3 pr-12 bg-gray-800/50 border border-gray-700 rounded-xl 
                         text-gray-100 placeholder-gray-500 resize-none focus:outline-none 
                         focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 
                         transition-all duration-200 min-h-[52px] max-h-[200px]"
                rows={1}
                disabled={isLoading}
              />
              
              
              {/* Dragon Power Indicator */}
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                {speechRecognition.isListening && (
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                )}
                <Sparkles className={cn(
                  "w-4 h-4 animate-pulse",
                  speechRecognition.isListening ? "text-red-400" : "text-orange-400"
                )} />
                <span className={cn(
                  "text-size-4",
                  speechRecognition.isListening ? "text-red-400" : "text-orange-400"
                )}>
                  {speechRecognition.isListening ? "VOICE" : "9000"}
                </span>
              </div>
            </div>
            
            {/* Voice Controls - Only show when voice is enabled */}
            {voiceEnabled && (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={async () => {
                    if (speechRecognition.isListening) {
                      await speechRecognition.stopListening()()
                      setIsVoiceListening(false)
                    } else {
                      const result = await speechRecognition.startListening()()
                      if (result._tag === 'Right') {
                        setIsVoiceListening(true)
                      }
                    }
                  }}
                  className={cn(
                    "p-3 rounded-xl transition-all duration-200 text-sm",
                    speechRecognition.isListening
                      ? "bg-red-500/20 text-red-400 border border-red-500/50"
                      : "bg-gray-800/50 text-gray-400 hover:text-gray-300"
                  )}
                >
                  {speechRecognition.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setTTSEnabled(!ttsEnabled)
                    // Stop any current speech if disabling TTS
                    if (ttsEnabled && tts.isSpeaking) {
                      tts.stop()
                    }
                  }}
                  className={cn(
                    "p-3 rounded-xl transition-all duration-200 text-sm",
                    ttsEnabled
                      ? "bg-orange-500/20 text-orange-400 border border-orange-500/50"
                      : "bg-gray-800/50 text-gray-400 hover:text-gray-300"
                  )}
                  title={ttsEnabled ? "Text-to-Speech enabled (requires ElevenLabs API key)" : "Enable Text-to-Speech (requires ElevenLabs API key)"}
                >
                  {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>
            )}
            
            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={cn(
                "p-3 rounded-xl transition-all duration-200",
                input.trim() && !isLoading
                  ? "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl"
                  : "bg-gray-800 text-gray-500 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          
          {/* Connection Status & Helper Text */}
          <div className="mt-2 flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              {connectionStatus.isConnected ? (
                <Wifi className="w-3 h-3 text-green-500" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-500" />
              )}
              <span className={cn(
                "text-size-3 font-medium",
                connectionStatus.isConnected ? "text-green-500" : "text-red-500"
              )}>
                {connectionStatus.isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            
            {/* Voice toggle */}
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className="text-size-3 text-gray-500 hover:text-gray-400 transition-colors"
            >
              {voiceEnabled ? "🎤 Voice On" : "🎤 Voice Off"}
            </button>
            
            <div className="text-size-4 text-gray-500">
              The dragon listens to your every wish • Press Enter to send
            </div>
          </div>

          {/* Error Display */}
          {connectionStatus.error && (
            <div className="mt-2 flex items-center justify-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-size-3">Connection error: {connectionStatus.error}</span>
            </div>
          )}
        </form>
      </div>

      {/* Subtle Watermark */}
      <SeironImage 
        variant="watermark"
        className="fixed bottom-20 right-8 pointer-events-none opacity-[0.02]"
        enableMysticalEffects={false}
      />
    </div>
  )
})

MinimalChatInterface.displayName = 'MinimalChatInterface'