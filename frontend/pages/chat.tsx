import { useState, useEffect, useMemo } from 'react'
import { MinimalChatInterface } from '@/components/chat/MinimalChatInterface'
import { VoiceEnabledChat } from '@/components/chat/VoiceEnabledChat'
import { useSearchParams } from 'react-router-dom'
import { ChatErrorBoundary } from '@/components/error-boundaries/ChatErrorBoundary'

export default function ChatPage() {
  const [searchParams] = useSearchParams()
  const [interfaceType, setInterfaceType] = useState<'minimal' | 'voice'>('voice')

  useEffect(() => {
    // Check URL params for interface type
    const type = searchParams.get('interface')
    if (type) {
      if (type === 'minimal') {
        setInterfaceType('minimal')
      } else if (type === 'voice') {
        setInterfaceType('voice')
      } else {
        console.warn(`Invalid interface type: ${type}. Valid options are 'minimal' or 'voice'.`)
      }
    }
  }, [searchParams])

  // Toggle interface type with keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault()
        setInterfaceType(prev => {
          return prev === 'voice' ? 'minimal' : 'voice'
        })
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  const backgroundStyle = useMemo(() => ({
    backgroundImage: `
      linear-gradient(rgba(255, 107, 53, 0.3) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 107, 53, 0.3) 1px, transparent 1px)
    `,
    backgroundSize: '50px 50px'
  }), [])

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-950 relative">
      {/* Game-style background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-950 to-black opacity-90" />
      
      {/* Energy grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" 
        style={backgroundStyle} 
      />
      
      {/* Interface Toggle Buttons */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <button
          onClick={() => setInterfaceType('voice')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            interfaceType === 'voice' 
              ? 'bg-orange-600 text-white' 
              : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
          }`}
          title="AI Voice Chat (Default)"
          aria-label={interfaceType === 'voice' ? 'Voice interface active' : 'Switch to voice interface'}
          aria-pressed={interfaceType === 'voice'}
        >
          🐉 AI Voice
        </button>
        <button
          onClick={() => setInterfaceType('minimal')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            interfaceType === 'minimal' 
              ? 'bg-orange-600 text-white' 
              : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
          }`}
          title="Minimal UI"
          aria-label={interfaceType === 'minimal' ? 'Minimal interface active' : 'Switch to minimal interface'}
          aria-pressed={interfaceType === 'minimal'}
        >
          Minimal
        </button>
        <span className="sr-only">Press Ctrl+Shift+T to toggle interface</span>
      </div>
      
      {/* Chat Interface */}
      {interfaceType === 'minimal' ? (
        <ChatErrorBoundary>
          <MinimalChatInterface className="h-full relative z-10" />
        </ChatErrorBoundary>
      ) : (
        <VoiceEnabledChat className="h-full relative z-10" />
      )}
    </div>
  )
}