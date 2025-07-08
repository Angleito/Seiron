import React, { useState, useEffect } from 'react'
import { SimpleDragonFallback } from '../components/dragon/SimpleDragonFallback'

export default function SimpleHomePage() {
  const [dragonState, setDragonState] = useState({
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    isIdle: true,
    volume: 0.5
  })

  // Demo voice states cycling
  useEffect(() => {
    const interval = setInterval(() => {
      setDragonState(prev => {
        if (prev.isIdle) return { ...prev, isListening: true, isIdle: false }
        if (prev.isListening) return { ...prev, isListening: false, isSpeaking: true }
        if (prev.isSpeaking) return { ...prev, isSpeaking: false, isProcessing: true }
        return { ...prev, isProcessing: false, isIdle: true }
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [])
  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(to bottom, #000000, #1a1a1a)',
      color: '#fbbf24',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
    }}>
      {/* Background Dragon */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1,
        opacity: 0.8
      }}>
        <SimpleDragonFallback 
          size="gigantic"
          voiceState={dragonState}
        />
      </div>

      {/* Content */}
      <div style={{ 
        zIndex: 10, 
        textAlign: 'center',
        position: 'relative',
        padding: '2rem',
        background: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '1rem',
        backdropFilter: 'blur(10px)'
      }}>
        <h1 style={{ 
          fontSize: '4rem', 
          fontWeight: 'bold', 
          marginBottom: '1rem',
          textShadow: '0 0 20px rgba(251, 191, 36, 0.5)'
        }}>
          SEIRON
        </h1>
        <p style={{ 
          fontSize: '1.5rem', 
          marginBottom: '2rem',
          opacity: 0.9
        }}>
          Grant your wildest Sei investing wishes
        </p>
        
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button style={{
            padding: '1rem 2rem',
            background: 'linear-gradient(to right, #f59e0b, #d97706)',
            color: '#000',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)'
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(251, 191, 36, 0.5)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(251, 191, 36, 0.3)'
          }}>
            ✨ SUMMON
          </button>
          
          <button style={{
            padding: '1rem 2rem',
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#fbbf24',
            border: '2px solid #fbbf24',
            borderRadius: '0.5rem',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(251, 191, 36, 0.2)'
            e.currentTarget.style.transform = 'scale(1.05)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
            e.currentTarget.style.transform = 'scale(1)'
          }}>
            📖 ABOUT
          </button>
        </div>
      </div>

      {/* Debug Info */}
      <div style={{
        position: 'absolute',
        bottom: '1rem',
        right: '1rem',
        fontSize: '0.8rem',
        opacity: 0.6,
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '0.5rem',
        borderRadius: '0.25rem'
      }}>
        Dragon: Fallback Mode Active
      </div>
    </div>
  )
}