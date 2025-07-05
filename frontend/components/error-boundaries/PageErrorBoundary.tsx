import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ReactNode } from 'react'
import { FileQuestion, RefreshCw } from 'lucide-react'

interface PageErrorBoundaryProps {
  children: ReactNode
  pageName?: string
}

export function PageErrorBoundary({ children, pageName = 'Page' }: PageErrorBoundaryProps) {
  return (
    <ErrorBoundary
      name={pageName}
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-950 to-black p-4">
          <div className="max-w-lg w-full text-center">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="bg-red-900/20 p-4 rounded-full">
                <FileQuestion className="h-12 w-12 text-red-500" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-red-100 mb-2">
              Page Load Error
            </h1>
            
            <p className="text-lg text-gray-400 mb-6">
              We couldn't load the {pageName} page. This might be a temporary issue.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="h-5 w-5" />
                Reload Page
              </button>
              
              <button
                onClick={() => window.history.back()}
                className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-700 hover:bg-gray-800 text-gray-300 rounded-lg transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}