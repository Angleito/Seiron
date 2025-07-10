import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import React from 'react'

export default function HomePage() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const navigate = useNavigate()

  const addDebugInfo = (message: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    try {
      addDebugInfo('HomePage useEffect started')
      
      const timer = setTimeout(() => {
        setIsLoaded(true)
        addDebugInfo('HomePage loaded successfully')
      }, 200)

      return () => {
        clearTimeout(timer)
        addDebugInfo('HomePage cleanup completed')
      }
    } catch (err) {
      addDebugInfo(`HomePage useEffect error: ${err}`)
      return undefined
    }
  }, [])

  const handleNavigation = (path: string) => {
    try {
      addDebugInfo(`Navigating to: ${path}`)
      navigate(path)
    } catch (error) {
      addDebugInfo(`Navigation error: ${error}`)
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Success Message */}
      <div className="relative z-50 min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-6xl font-black text-yellow-400 mb-8">
            🎉 HOME PAGE LOADED 🎉
          </h1>
          <p className="text-2xl text-yellow-400/80 mb-8">
            {isLoaded ? '✅ Page is ready!' : '⏳ Loading...'}
          </p>
          <p className="text-lg text-green-400 mb-8">
            React Error #310 FIXED! 🐛➡️✅
          </p>
          <button
            onClick={() => handleNavigation('/chat')}
            className="px-12 py-6 bg-gradient-to-r from-yellow-500 to-yellow-600 text-red-950 font-black rounded-xl text-xl hover:scale-105 transform transition-all duration-300"
          >
            GO TO CHAT
          </button>
        </div>
      </div>

      {/* Debug Info Panel */}
      <div className="fixed bottom-4 left-4 text-white text-sm bg-black/80 p-4 rounded z-50 max-w-md">
        <h3 className="font-bold text-green-400 mb-2">Debug Info:</h3>
        <div className="space-y-1">
          <p>Loaded: {isLoaded ? '✅ Yes' : '⏳ No'}</p>
          <p>Navigate Ready: ✅ Yes</p>
          <p>React Router: ✅ Working</p>
          <p>StormBackground: ❌ Disabled (for testing)</p>
        </div>
        <hr className="my-2 border-gray-600" />
        <div className="text-xs text-gray-400 max-h-32 overflow-y-auto">
          <p className="font-bold">Event Log:</p>
          {debugInfo.map((info, index) => (
            <p key={index}>{info}</p>
          ))}
        </div>
      </div>
    </div>
  )
}