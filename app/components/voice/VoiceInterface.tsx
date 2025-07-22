'use client'

import { useState, useRef } from 'react'
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react'

interface VoiceInterfaceProps {
  onTranscript?: (transcript: string) => void
  onVoiceStateChange?: (isListening: boolean) => void
  className?: string
}

export function VoiceInterface({ 
  onTranscript, 
  onVoiceStateChange,
  className = '' 
}: VoiceInterfaceProps) {
  const [isListening, setIsListening] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<any>(null)

  const toggleListening = () => {
    if (!isListening) {
      startListening()
    } else {
      stopListening()
    }
  }

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser')
      return
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    recognitionRef.current.continuous = true
    recognitionRef.current.interimResults = true

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript)
        onTranscript?.(finalTranscript)
      }
    }

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      stopListening()
    }

    recognitionRef.current.onend = () => {
      setIsListening(false)
      onVoiceStateChange?.(false)
    }

    recognitionRef.current.start()
    setIsListening(true)
    onVoiceStateChange?.(true)
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
    onVoiceStateChange?.(false)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {/* Microphone Toggle */}
      <button
        onClick={toggleListening}
        className={`p-3 rounded-full transition-all ${
          isListening 
            ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
            : 'bg-gray-700 hover:bg-gray-600'
        }`}
        title={isListening ? 'Stop listening' : 'Start listening'}
      >
        {isListening ? (
          <Mic className="w-5 h-5 text-white" />
        ) : (
          <MicOff className="w-5 h-5 text-gray-300" />
        )}
      </button>

      {/* Mute Toggle */}
      <button
        onClick={toggleMute}
        className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition-all"
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-gray-300" />
        ) : (
          <Volume2 className="w-5 h-5 text-gray-300" />
        )}
      </button>

      {/* Status Indicator */}
      {isListening && (
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm text-gray-400">Listening...</span>
        </div>
      )}

      {/* Transcript Preview */}
      {transcript && (
        <div className="flex-1 max-w-xs">
          <p className="text-sm text-gray-400 truncate">{transcript}</p>
        </div>
      )}
    </div>
  )
}