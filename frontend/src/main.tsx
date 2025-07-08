import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '../styles/globals.css'
import HomePage from '../pages/HomePage'

console.log('🚀 Main.tsx: Starting Seiron application')

const root = document.getElementById('root')
console.log('🚀 Main.tsx: Root element found:', !!root)

if (root) {
  console.log('🚀 Main.tsx: Creating React root')
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    </React.StrictMode>
  )
  console.log('🚀 Main.tsx: Seiron app rendered')
} else {
  console.error('🚀 Main.tsx: Root element not found!')
}