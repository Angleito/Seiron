import React, { useState, useEffect } from 'react'
import { MinimalChatInterface } from '@/components/chat/MinimalChatInterface'
import { ChatGPTInterface } from '@/components/chat/ChatGPTInterface'
import { VoiceEnabledChat } from '@/components/chat/VoiceEnabledChat'
import { useSearchParams } from 'react-router-dom'
import { usePrivy } from '@privy-io/react-auth'
import '@/styles/chatgpt-anime.css'

export default function ChatPage() {
  const [searchParams] = useSearchParams()
  const [interfaceType, setInterfaceType] = useState<'minimal' | 'chatgpt' | 'voice'>('voice')
  const { user } = usePrivy()

  useEffect(() => {
    // Check URL params for interface type
    const type = searchParams.get('interface')
    if (type === 'chatgpt' || type === 'anime') {
      setInterfaceType('chatgpt')
    } else if (type === 'minimal') {
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
          if (prev === 'voice') return 'minimal'
          if (prev === 'minimal') return 'chatgpt'
          return 'voice'
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
          onClick={() => setInterfaceType('chatgpt')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            interfaceType === 'chatgpt' 
              ? 'bg-orange-600 text-white' 
              : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
          }`}
          title="Minimal Anime UI"
        >
          Minimal Anime
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
      ) : interfaceType === 'chatgpt' ? (
        <ChatGPTInterface className="h-full relative z-10" />
      ) : (
        <div className="h-full relative z-10 flex items-center justify-center">
          <div className="text-center p-8 bg-gray-800/50 rounded-lg backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-orange-400 mb-4">🐉 Voice Chat Temporarily Disabled</h2>
            <p className="text-gray-300 mb-4">Voice interface is experiencing technical issues.</p>
            <p className="text-gray-400 text-sm">Please use Minimal or Anime interface for now.</p>
            <div className="mt-6 flex gap-4 justify-center">
              <button 
                onClick={() => setInterfaceType('minimal')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Try Minimal
              </button>
              <button 
                onClick={() => setInterfaceType('chatgpt')}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Try Minimal Anime
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}