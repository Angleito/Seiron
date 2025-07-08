import React, { useState, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import '../styles/globals.css'

// Import 3D dragon with lazy loading
const DragonHead3DOptimized = React.lazy(() => import('../components/effects/DragonHead3DOptimized'))

console.log('🚀 Main.tsx: Starting React app initialization')

function SimpleApp() {
  console.log('🚀 SimpleApp: Component rendering')
  const [show3D, setShow3D] = useState(false)
  
  return (
    <div style={{ minHeight: '100vh', background: 'black', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', color: '#facc15', marginBottom: '1rem' }}>
          🐉 Seiron Dragon Portal
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#d1d5db', marginBottom: '1rem' }}>
          Unleash the legendary dragon's power!
        </p>
        <button 
          style={{ 
            padding: '12px 24px', 
            background: '#facc15', 
            color: 'black', 
            border: 'none', 
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginBottom: '1rem'
          }}
          onClick={() => {
            console.log('🐉 Dragon Toggle clicked')
            setShow3D(!show3D)
          }}
        >
          {show3D ? '🌙 Hide Dragon' : '🔥 Summon Dragon'}
        </button>
        
        {/* 3D Dragon Container */}
        {show3D && (
          <div style={{ 
            position: 'fixed', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            width: '400px', 
            height: '400px', 
            border: '2px solid #facc15', 
            borderRadius: '12px',
            background: 'rgba(0, 0, 0, 0.8)',
            zIndex: 1000
          }}>
            <div style={{ color: '#facc15', fontSize: '14px', padding: '8px', textAlign: 'center' }}>
              🐉 Dragon Render Zone
            </div>
            <div style={{ width: '100%', height: 'calc(100% - 40px)' }}>
              <Suspense fallback={
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '100%',
                  color: '#facc15'
                }}>
                  🌀 Loading Dragon...
                </div>
              }>
                <DragonHead3DOptimized />
              </Suspense>
            </div>
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