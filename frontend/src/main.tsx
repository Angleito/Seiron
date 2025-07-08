import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import '../styles/globals.css'

// Simplified version for debugging
console.log('🚀 Main.tsx: Starting React app initialization')

function SimpleApp() {
  console.log('🚀 SimpleApp: Component rendering')
  const [test, setTest] = useState(false)
  
  return (
    <div style={{ minHeight: '100vh', background: 'black', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', color: '#facc15', marginBottom: '1rem' }}>
          Seiron Debug Mode v3
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#d1d5db', marginBottom: '1rem' }}>
          React is working! Build system fixed!
        </p>
        <button 
          style={{ 
            padding: '12px 24px', 
            background: '#facc15', 
            color: 'black', 
            border: 'none', 
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
          onClick={() => {
            console.log('🚀 Button clicked - React events working')
            setTest(!test)
          }}
        >
          {test ? 'Hide Test' : 'Show Test'}
        </button>
        {test && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#1f2937', borderRadius: '8px' }}>
            <p>✅ React is working correctly!</p>
            <p>✅ State management functional!</p>
            <p>✅ Event handlers working!</p>
          </div>
        )}
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