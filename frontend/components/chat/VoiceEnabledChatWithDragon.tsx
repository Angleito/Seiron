'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import ASCIIDragon from '../dragon/ASCIIDragon'
import { MinimalChatInterface } from './MinimalChatInterface'
import { useSpeechRecognition } from '@/hooks/voice/useSpeechRecognition'
import { useElevenLabsTTS } from '@/hooks/voice/useElevenLabsTTS'
import { VoiceAnimationState } from '../dragon/DragonRenderer'
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'
import * as O from 'fp-ts/Option'

interface VoiceEnabledChatWithDragonProps {
  className?: string
}

export const VoiceEnabledChatWithDragon: React.FC<VoiceEnabledChatWithDragonProps> = ({ 
  className 
}) => {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [volume, setVolume] = useState(0)
  const [showTranscript, setShowTranscript] = useState(false)
  
  const chatRef = useRef<any>(null)
  const lastResponseRef = useRef<string>('')

  // Initialize voice hooks
  const {
    isListening: speechIsListening,
    transcript: speechTranscript,
    startListening,
    stopListening,
    error: speechError
  } = useSpeechRecognition()

  const {
    speak,
    stop: stopSpeaking,
    isSpeaking: ttsIsSpeaking,
    error: ttsError
  } = useElevenLabsTTS({
    apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '',
    voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || 'default',
    modelId: 'eleven_monolingual_v1',
    voiceSettings: {
      stability: 0.75,
      similarityBoost: 0.85,
      style: 0.65,
      useSpeakerBoost: true
    }
  })

  // Create voice animation state for dragon
  const voiceState: VoiceAnimationState = {
    isListening: isListening && speechIsListening,
    isSpeaking: isSpeaking && ttsIsSpeaking,
    isProcessing,
    isIdle: !isListening && !isSpeaking && !isProcessing,
    volume,
    emotion: isProcessing ? 'neutral' : isSpeaking ? 'excited' : 'neutral'
  }

  // Update states based on voice hooks
  useEffect(() => {
    setIsListening(speechIsListening)
  }, [speechIsListening])

  useEffect(() => {
    setIsSpeaking(ttsIsSpeaking)
  }, [ttsIsSpeaking])

  useEffect(() => {
    if (speechTranscript) {
      setTranscript(speechTranscript)
      setShowTranscript(true)
      // Hide transcript after 3 seconds
      const timer = setTimeout(() => setShowTranscript(false), 3000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [speechTranscript])

  // Handle voice control toggle
  const toggleVoice = useCallback(() => {
    if (isVoiceEnabled) {
      stopListening()
      stopSpeaking()
      setIsVoiceEnabled(false)
    } else {
      setIsVoiceEnabled(true)
    }
  }, [isVoiceEnabled, stopListening, stopSpeaking])

  // Handle microphone toggle
  const toggleMicrophone = useCallback(async () => {
    if (isListening) {
      stopListening()
    } else {
      try {
        await startListening()
      } catch (error) {
        console.error('Failed to start listening:', error)
      }
    }
  }, [isListening, startListening, stopListening])

  // Auto-send transcript to chat when speech ends
  useEffect(() => {
    if (transcript && !isListening && isVoiceEnabled && chatRef.current?.sendMessage) {
      // Small delay to ensure final transcript is captured
      const timer = setTimeout(() => {
        if (transcript.trim()) {
          chatRef.current.sendMessage(transcript)
          setTranscript('')
        }
      }, 500)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [transcript, isListening, isVoiceEnabled])

  // Monitor chat responses for TTS
  const handleNewMessage = useCallback((message: any) => {
    if (!isVoiceEnabled || !message || message.role !== 'assistant') return
    
    const responseText = message.content
    if (responseText && responseText !== lastResponseRef.current) {
      lastResponseRef.current = responseText
      setIsProcessing(false)
      speak(responseText)
    }
  }, [isVoiceEnabled, speak])

  // Monitor when user sends a message
  const handleUserMessage = useCallback(() => {
    if (isVoiceEnabled) {
      setIsProcessing(true)
    }
  }, [isVoiceEnabled])

  return (
    <div className={cn("flex flex-col h-full relative", className)}>
      {/* Dragon Header Section */}
      <div className="relative bg-gradient-to-b from-background to-background/50 border-b border-border/50">
        <div className="relative h-32 sm:h-40 md:h-48 overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
          
          {/* ASCII Dragon centered */}
          <div className="absolute inset-0 flex items-center justify-center">
            <ASCIIDragon
              size="md"
              voiceState={voiceState}
              enableBreathing={true}
              speed={isListening ? 'fast' : 'normal'}
              className="opacity-90"
            />
          </div>

          {/* Voice controls overlay */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={toggleVoice}
              className={cn(
                "p-2 rounded-lg transition-all",
                isVoiceEnabled 
                  ? "bg-primary/20 text-primary hover:bg-primary/30" 
                  : "bg-background/80 text-muted-foreground hover:bg-background"
              )}
              title={isVoiceEnabled ? "Disable voice" : "Enable voice"}
            >
              {isVoiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            
            {isVoiceEnabled && (
              <button
                onClick={toggleMicrophone}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  isListening 
                    ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 animate-pulse" 
                    : "bg-background/80 text-muted-foreground hover:bg-background"
                )}
                title={isListening ? "Stop listening" : "Start listening"}
              >
                {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
            )}
          </div>

          {/* Transcript overlay */}
          {showTranscript && transcript && (
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-background/90 backdrop-blur-sm rounded-lg px-4 py-2 text-size-3 text-muted-foreground border border-border/50">
                <span className="text-size-4 font-normal text-muted-foreground/70 block mb-1">Transcript:</span>
                {transcript}
              </div>
            </div>
          )}

          {/* Status indicators */}
          <div className="absolute bottom-2 left-4 flex items-center gap-2 text-size-4">
            {isProcessing && (
              <span className="text-purple-500 animate-pulse">Processing...</span>
            )}
            {isSpeaking && (
              <span className="text-orange-500">Speaking...</span>
            )}
            {isListening && !transcript && (
              <span className="text-blue-500 animate-pulse">Listening...</span>
            )}
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 relative">
        <MinimalChatInterface
          ref={chatRef}
          onNewMessage={handleNewMessage}
          onUserMessage={handleUserMessage}
          className="h-full"
        />
      </div>

      {/* Error notifications */}
      {(O.isSome(speechError) || ttsError) && (
        <div className="absolute top-4 left-4 right-4 z-50">
          <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-2 text-sm">
            {O.isSome(speechError) ? speechError.value.message : ttsError?.message}
          </div>
        </div>
      )}
    </div>
  )
}