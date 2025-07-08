import React from 'react'
import ReactDOM from 'react-dom/client'
import '@/styles/globals.css'

// Simplified version for debugging
console.log('🚀 Main.tsx: Starting React app initialization')

function SimpleApp() {
  console.log('🚀 SimpleApp: Component rendering')
  
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-yellow-400 mb-4">
          Seiron Debug Mode
        </h1>
        <p className="text-lg text-gray-300">
          React is working! Now testing 3D components...
        </p>
        <div className="mt-8">
          <button 
            className="px-6 py-3 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400"
            onClick={() => console.log('🚀 Button clicked - React events working')}
          >
            Test Button
          </button>
        </div>
      </div>
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