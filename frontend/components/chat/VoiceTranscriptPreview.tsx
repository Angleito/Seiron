import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff } from 'lucide-react'

interface VoiceTranscriptPreviewProps {
  isListening: boolean
  transcript: string
  interimTranscript: string
  confidence?: number
  onSend?: () => void
  onCancel?: () => void
}

export function VoiceTranscriptPreview({
  isListening,
  transcript,
  interimTranscript,
  confidence,
  onSend,
  onCancel
}: VoiceTranscriptPreviewProps) {
  const displayText = interimTranscript || transcript
  
  if (!isListening && !displayText) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="absolute bottom-full left-0 right-0 mb-2 mx-4"
      >
        <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl p-4 shadow-xl">
          <div className="flex items-start gap-3">
            {/* Mic indicator */}
            <div className={`p-2 rounded-lg ${isListening ? 'bg-red-500/20 animate-pulse' : 'bg-gray-800'}`}>
              {isListening ? (
                <Mic className="w-4 h-4 text-red-400" />
              ) : (
                <MicOff className="w-4 h-4 text-gray-400" />
              )}
            </div>
            
            {/* Transcript */}
            <div className="flex-1">
              <div className="text-sm text-gray-400 mb-1">
                {isListening ? 'Listening...' : 'Speech captured'}
              </div>
              <div className="text-white">
                {displayText || (
                  <span className="text-gray-500 italic">
                    Start speaking...
                  </span>
                )}
              </div>
              
              {/* Confidence score */}
              {confidence !== undefined && (
                <div className="text-xs text-gray-500 mt-1">
                  Confidence: {Math.round(confidence * 100)}%
                </div>
              )}
            </div>
          </div>
          
          {/* Action buttons */}
          {!isListening && displayText && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={onSend}
                className="flex-1 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 transition-colors"
              >
                Send Message
              </button>
              <button
                onClick={onCancel}
                className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}