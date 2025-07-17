/**
 * Voice-Enabled Chat Page for Sei Investment Platform
 * 
 * This is a Next.js-style page component adapted for the existing Vite setup.
 * Eventually this could replace the current pages/chat.tsx when migrating to Next.js.
 * 
 * @fileoverview Main chat page with voice integration, memory persistence, and MCP services
 */

import { Suspense } from 'react'
import { VoiceChat } from './components/voice-chat'
import { ChatErrorBoundary } from '@/components/error-boundaries/ChatErrorBoundary'
import { PerformanceMonitor } from '@/components/ui/PerformanceOverlay'

// TypeScript metadata interfaces (Next.js style)
interface PageMetadata {
  title: string
  description: string
  keywords: string[]
  viewport: string
}

// Page metadata for SEO and performance
export const metadata: PageMetadata = {
  title: 'Sei AI Voice Chat | Investment Advisory Platform',
  description: 'Voice-enabled AI investment advisor for Sei blockchain opportunities with real-time market data and portfolio analysis',
  keywords: ['sei', 'blockchain', 'investment', 'voice', 'ai', 'chat', 'crypto', 'portfolio'],
  viewport: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0'
}

// Loading component for Suspense boundary
function ChatPageLoading() {
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
        <p className="text-gray-300 text-lg">Initializing Sei AI Voice Chat...</p>
        <p className="text-gray-500 text-sm">Loading conversation memory and voice services</p>
      </div>
    </div>
  )
}

/**
 * Main Chat Page Component
 * 
 * Implements voice-enabled chat interface with:
 * - ElevenLabs voice integration  
 * - Vercel KV conversation memory
 * - MCP service connections
 * - Real-time streaming responses
 * 
 * This component serves as a server component wrapper for client-side chat functionality.
 */
export default function ChatPage() {
  // In a real Next.js app, this would be a Server Component
  // For now, we're creating the structure that could be migrated later
  
  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-950 relative">
      {/* SEO and accessibility metadata */}
      <div className="sr-only">
        <h1>{metadata.title}</h1>
        <p>{metadata.description}</p>
      </div>

      {/* Performance monitoring overlay */}
      <PerformanceMonitor />

      {/* Main chat interface with error boundary and suspense */}
      <ChatErrorBoundary>
        <Suspense fallback={<ChatPageLoading />}>
          <VoiceChat />
        </Suspense>
      </ChatErrorBoundary>

      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-950 to-black opacity-90 pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 107, 53, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 107, 53, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />
    </div>
  )
}

// Export metadata for use by build tools
export { metadata }