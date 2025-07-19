import { useMemo } from 'react'
import { MinimalChatInterface } from '@/components/chat/MinimalChatInterface'
import { ChatErrorBoundary } from '@/components/error-boundaries/ChatErrorBoundary'

export default function ChatPage() {

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
      
      
      {/* Chat Interface */}
      <ChatErrorBoundary>
        <MinimalChatInterface className="h-full relative z-10" />
      </ChatErrorBoundary>
    </div>
  )
}