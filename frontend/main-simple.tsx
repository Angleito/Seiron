import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/globals.css'

// Simple test component to verify React mounting
function SimpleApp() {
  console.log('🎉 SimpleApp component rendering!')
  
  return (
    <div style={{ 
      padding: '20px', 
      color: '#fbbf24', 
      background: '#000', 
      fontFamily: 'monospace',
      minHeight: '100vh'
    }}>
      <h1>🐉 Seiron - Simple Test</h1>
      <p>React is mounting successfully!</p>
      <div style={{ marginTop: '20px' }}>
        <h2>Debug Info:</h2>
        <ul>
          <li>Environment: {import.meta.env.MODE}</li>
          <li>React version: {React.version}</li>
          <li>Time: {new Date().toLocaleTimeString()}</li>
        </ul>
      </div>
      
      {/* Simple dragon placeholder */}
      <div style={{ 
        marginTop: '40px', 
        textAlign: 'center',
        fontSize: '80px'
      }}>
        🐉
      </div>
      <p style={{ textAlign: 'center', marginTop: '20px' }}>
        Gigantic Dragon Placeholder
      </p>
    </div>
  )
}

console.log('🚀 Simple Seiron App Starting...')
console.log('Root element:', document.getElementById('root'))

try {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Root element not found')
  }

  console.log('🏗️ Creating React root (simple)...')
  const root = ReactDOM.createRoot(rootElement)
  
  console.log('🎨 Rendering simple app...')
  root.render(<SimpleApp />)
  
  console.log('✅ Simple app render complete')
} catch (error) {
  console.error('❌ Failed to render simple app:', error)
  
  // Last resort fallback
  const rootElement = document.getElementById('root')
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; color: #fff; background: #000; font-family: monospace;">
        <h1>🐉 Seiron Critical Error</h1>
        <p>React failed to mount. Error: ${error}</p>
        <div style="margin-top: 40px; text-align: center; font-size: 80px;">🐉</div>
        <p style="text-align: center;">Emergency Dragon Mode</p>
      </div>
    `
  }
}