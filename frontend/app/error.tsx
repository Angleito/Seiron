'use client'

import { useEffect } from 'react'

export const dynamic = 'force-dynamic'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 flex items-center justify-center p-4 text-white">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-6">
          <div className="text-6xl mb-4">🐉</div>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
            Dragon&apos;s Power Overload
          </h1>
          <p className="text-gray-300 mb-6">
            The mystical energies have caused an unexpected disruption in the dragon&apos;s realm.
          </p>
        </div>
        
        <button
          onClick={reset}
          className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
        >
          Recharge Dragon&apos;s Power
        </button>
        
        {error.digest && (
          <p className="text-sm text-gray-400 mt-4">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}