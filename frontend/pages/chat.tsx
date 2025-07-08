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
        <button
          onClick={() => setInterfaceType('chatgpt')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            interfaceType === 'chatgpt' 
              ? 'bg-orange-600 text-white' 
              : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
          }`}
          title="Anime UI"
        >
          Anime
        </button>
      </div>
      
      {/* Chat Interface */}
      {interfaceType === 'voice' ? (
        <VoiceEnabledChat 
          userId={user?.id || 'anonymous'}
          enablePersistence={true}
          enableSessionManagement={true}
          autoLoadHistory={true}
          className="h-full relative z-10"
        />
      ) : interfaceType === 'minimal' ? (
        <MinimalChatInterface className="h-full relative z-10" />
      ) : (
        <ChatGPTInterface className="h-full relative z-10" />
      )}
    </div>
  )
}