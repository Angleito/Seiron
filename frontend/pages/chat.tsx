import React, { useState, useEffect } from 'react'
import { MinimalChatInterface } from '@/components/chat/MinimalChatInterface'
import { ChatGPTInterface } from '@/components/chat/ChatGPTInterface'
import { useSearchParams } from 'react-router-dom'
import '@/styles/chatgpt-anime.css'

export default function ChatPage() {
  const [searchParams] = useSearchParams()
  const [interfaceType, setInterfaceType] = useState<'minimal' | 'chatgpt'>('minimal')

  useEffect(() => {
    // Check URL params for interface type
    const type = searchParams.get('interface')
    if (type === 'chatgpt' || type === 'anime') {
      setInterfaceType('chatgpt')
    }
  }, [searchParams])

  // Toggle interface type with keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault()
        setInterfaceType(prev => prev === 'minimal' ? 'chatgpt' : 'minimal')
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
      
      {/* Interface Toggle Button */}
      <button
        onClick={() => setInterfaceType(prev => prev === 'minimal' ? 'chatgpt' : 'minimal')}
        className="absolute top-4 right-4 z-20 px-4 py-2 bg-gray-800 text-gray-200 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
        title="Toggle interface (Ctrl+T)"
      >
        {interfaceType === 'minimal' ? 'Switch to Anime UI' : 'Switch to Minimal UI'}
      </button>
      
      {/* Chat Interface */}
      {interfaceType === 'minimal' ? (
        <MinimalChatInterface className="h-full relative z-10" />
      ) : (
        <ChatGPTInterface className="h-full relative z-10" />
      )}
    </div>
  )
}