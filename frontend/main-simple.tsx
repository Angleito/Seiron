import './polyfills'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'

console.log('🚀 Simple Seiron App Starting...')

const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('❌ Root element not found')
} else {
  console.log('✅ Root element found, creating React root...')
  
  try {
    const root = ReactDOM.createRoot(rootElement)
    console.log('✅ React root created')
    
    console.log('🎨 Rendering app with router...')
    root.render(
      <React.StrictMode>
        <div style={{ 
          background: 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)',
          minHeight: '100vh',
          color: 'white'
        }}>
          <RouterProvider router={router} />
        </div>
      </React.StrictMode>
    )
    
    console.log('✅ App rendered successfully with router')
  } catch (error) {
    console.error('❌ Error rendering app:', error)
    
    // Fallback rendering
    rootElement.innerHTML = `
      <div style="
        padding: 2rem; 
        color: white; 
        background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);
        min-height: 100vh;
        font-family: Arial, sans-serif;
      ">
        <h1>❌ Router Test Failed</h1>
        <p>Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
        <pre style="background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 4px; overflow-x: auto;">
          ${error instanceof Error ? error.stack : JSON.stringify(error)}
        </pre>
      </div>
    `
  }
}