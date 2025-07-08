import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import '@/styles/globals.css'

// Import the minimal 3D test component
import MinimalThreeTest from '../components/effects/MinimalThreeTest'

// Simplified version for debugging
console.log('🚀 Main.tsx: Starting React app initialization')

function SimpleApp() {
  console.log('🚀 SimpleApp: Component rendering')
  const [show3D, setShow3D] = useState(false)
  
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-yellow-400 mb-4">
            Seiron Debug Mode v2
          </h1>
          <p className="text-lg text-gray-300 mb-4">
            React is working! Now testing 3D components...
          </p>
          <div className="space-y-4">
            <button 
              className="px-6 py-3 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400 mr-4"
              onClick={() => {
                console.log('🚀 Button clicked - React events working')
                setShow3D(!show3D)
              }}
            >
              {show3D ? 'Hide 3D Test' : 'Show 3D Test'}
            </button>
          </div>
        </div>
      </div>
      
      {/* 3D Test Area */}
      {show3D && (
        <div className="fixed top-20 right-20 w-64 h-64 border-2 border-yellow-400 bg-gray-900">
          <div className="text-yellow-400 text-sm p-2">3D Test Area</div>
          <div className="w-full h-56">
            <MinimalThreeTest className="w-full h-full" />
          </div>
        </div>
      )}
    </div>
  )
}

const root = document.getElementById('root')
console.log('🚀 Main.tsx: Root element found:', !!root)

if (root) {
  console.log('🚀 Main.tsx: Creating React root')
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <SimpleApp />
    </React.StrictMode>
  )
  console.log('🚀 Main.tsx: React app rendered')
} else {
  console.error('🚀 Main.tsx: Root element not found!')
}