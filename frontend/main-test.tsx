import './polyfills'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'

// Simple test to see if we can mount React
console.log('🚀 SIMPLE TEST: Starting React app...')

const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('❌ Root element not found')
} else {
  console.log('✅ Root element found, creating React root...')
  
  try {
    const root = ReactDOM.createRoot(rootElement)
    console.log('✅ React root created, rendering...')
    
    root.render(
      <React.StrictMode>
        <div style={{ 
          padding: '2rem', 
          color: 'white', 
          background: 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)',
          minHeight: '100vh'
        }}>
          <h1>🐉 Seiron Test Mode</h1>
          <p>React is working! Now testing router...</p>
          <RouterProvider router={router} />
        </div>
      </React.StrictMode>
    )
    
    console.log('✅ App rendered successfully')
  } catch (error) {
    console.error('❌ Error rendering app:', error)
  }
}