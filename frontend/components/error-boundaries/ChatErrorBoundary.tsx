import { ErrorBoundary } from '@components/ErrorBoundary'
import { ReactNode } from 'react'
import { MessageSquareOff, RefreshCw } from 'lucide-react'

interface ChatErrorBoundaryProps {
  children: ReactNode
  onReset?: () => void
}

export function ChatErrorBoundary({ children, onReset }: ChatErrorBoundaryProps) {
  return (
    <ErrorBoundary
      name="Chat Interface"
      fallback={
        <div className="flex flex-col items-center justify-center p-8 bg-gray-900 rounded-lg border border-red-800">
          <div className="bg-red-900/20 p-3 rounded-full mb-4">
            <MessageSquareOff className="h-8 w-8 text-red-500" />
          </div>
          
          <h3 className="text-xl font-semibold text-red-100 mb-2">
            Chat Unavailable
          </h3>
          
          <p className="text-gray-400 text-center mb-4 max-w-sm">
            The chat interface encountered an error. Your conversation history is safe.
          </p>
          
          <button
            onClick={() => {
              if (onReset) {
                onReset()
              } else {
                window.location.reload()
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Restart Chat
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}