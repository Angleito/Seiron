import { useState, useEffect } from 'react'
import { MinimalChatInterface } from '@/components/chat/MinimalChatInterface'
import { VoiceEnabledChat } from '@/components/chat/VoiceEnabledChat'
import { useSearchParams } from 'react-router-dom'
import { usePrivy } from '@privy-io/react-auth'

export default function ChatPage() {
  const [searchParams] = useSearchParams()
  const [interfaceType, setInterfaceType] = useState<'minimal' | 'voice'>('voice')
  const { } = usePrivy()

  useEffect(() => {
    // Check URL params for interface type
    const type = searchParams.get('interface')
    if (type === 'minimal') {
      setInterfaceType('minimal')
    } else if (type === 'voice') {
      setInterfaceType('voice')
    }
  }, [searchParams])

  // Toggle interface type with keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault()
        setInterfaceType(prev => {
          return prev === 'voice' ? 'minimal' : 'voice'
        })
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-950 relative">
      {/* Game-style background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-950 to-black opacity-90" />
      
      {/* Energy grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" 
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 107, 53, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 107, 53, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} 
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
        >
          Minimal
        </button>
      </div>
      
      {/* Chat Interface */}
      {interfaceType === 'minimal' ? (
        <MinimalChatInterface className="h-full relative z-10" />
      ) : (
        <VoiceEnabledChat className="h-full relative z-10" />
      )}
    </div>
  )
}