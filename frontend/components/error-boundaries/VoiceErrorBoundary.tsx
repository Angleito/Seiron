import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ReactNode } from 'react'
import { MicOff, RefreshCw } from 'lucide-react'

interface VoiceErrorBoundaryProps {
  children: ReactNode
  onReset?: () => void
}

export function VoiceErrorBoundary({ children, onReset }: VoiceErrorBoundaryProps) {
  return (
    <ErrorBoundary
      name="Voice Interface"
      fallback={
        <div className="flex flex-col items-center justify-center p-6 bg-gray-900 rounded-lg border border-red-800">
          <div className="bg-red-900/20 p-3 rounded-full mb-4">
            <MicOff className="h-8 w-8 text-red-500" />
          </div>
          
          <h3 className="text-lg font-semibold text-red-100 mb-2">
            Voice Interface Error
          </h3>
          
          <p className="text-sm text-gray-400 text-center mb-4 max-w-xs">
            The voice system encountered an error. You can continue using text input.
          </p>
          
          <button
            onClick={() => {
              if (onReset) {
                onReset()
              } else {
                window.location.reload()
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Reset Voice
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}