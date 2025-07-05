import { ErrorBoundary } from '@components/ErrorBoundary'
import { ReactNode } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'

interface DragonErrorBoundaryProps {
  children: ReactNode
  onReset?: () => void
}

export function DragonErrorBoundary({ children, onReset }: DragonErrorBoundaryProps) {
  return (
    <ErrorBoundary
      name="Dragon Animation"
      fallback={
        <div className="flex flex-col items-center justify-center p-8 bg-gray-900/50 rounded-lg">
          <div className="bg-red-900/20 p-4 rounded-full mb-4 animate-pulse">
            <Sparkles className="h-10 w-10 text-red-500" />
          </div>
          
          <h3 className="text-lg font-semibold text-red-100 mb-2">
            Dragon is Resting
          </h3>
          
          <p className="text-sm text-gray-400 text-center mb-4">
            The dragon animation system needs a moment to recover.
          </p>
          
          <button
            onClick={() => {
              if (onReset) {
                onReset()
              } else {
                window.location.reload()
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600/80 hover:bg-red-700/80 text-white rounded transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Summon Dragon
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}