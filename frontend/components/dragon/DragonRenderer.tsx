'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { SeironGLBDragonWithErrorBoundary } from './SeironGLBDragon'
import { DragonPerformanceMonitor } from './DragonPerformanceMonitor'
import { DragonMemoryManager } from '../../utils/dragonMemoryManager'

export interface VoiceAnimationState {
  isListening: boolean
  isSpeaking: boolean
  isProcessing: boolean
  isIdle: boolean
  volume: number
  emotion?: 'excited' | 'angry' | 'calm' | 'focused'
}

export interface DragonRendererProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'gigantic'
  voiceState?: VoiceAnimationState
  enableAnimations?: boolean
  className?: string
  dragonType?: 'glb' | '2d' | 'ascii'
  enableFallback?: boolean
  fallbackType?: '2d' | 'ascii'
  enableProgressiveLoading?: boolean
  lowQualityModel?: string
  highQualityModel?: string
  enablePerformanceMonitor?: boolean
  performanceMonitorPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  onError?: (error: Error, type: string) => void
  onFallback?: (fromType: string, toType: string) => void
  onProgressiveLoadComplete?: () => void
}

// ASCII Dragon Component
const ASCIIDragon: React.FC<{
  size?: string
  voiceState?: VoiceAnimationState
  className?: string
}> = ({ voiceState, className = '' }) => {
  const dragonArt = voiceState?.isSpeaking ? `
    🔥🔥🔥🔥🔥🔥🔥
    🐉 ROAAAAR! 🐉
    🔥🔥🔥🔥🔥🔥🔥
  ` : voiceState?.isListening ? `
    👂 Listening... 👂
         🐉
    ~~~~~~~~~~~~~~~~
  ` : `
       🐉
    ~~~~~~~~
  `

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <pre className="text-yellow-400 font-mono text-center animate-pulse">
        {dragonArt}
      </pre>
    </div>
  )
}

// 2D Dragon Component
const Dragon2D: React.FC<{
  size?: string
  voiceState?: VoiceAnimationState
  className?: string
}> = ({ voiceState, className = '' }) => {
  const scale = voiceState?.isSpeaking ? 'scale-110' : 'scale-100'
  const color = voiceState?.isListening ? 'text-blue-400' : 'text-yellow-400'
  
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`transition-all duration-300 ${scale} ${color}`}>
        <div className="text-8xl animate-bounce">🐲</div>
        {voiceState?.isSpeaking && (
          <div className="text-center text-sm mt-2 animate-pulse">Speaking...</div>
        )}
        {voiceState?.isListening && (
          <div className="text-center text-sm mt-2 animate-pulse">Listening...</div>
        )}
      </div>
    </div>
  )
}

// Dragon renderer with fallback system and progressive loading
export const DragonRenderer: React.FC<DragonRendererProps> = ({
  size = 'md',
  voiceState,
  enableAnimations = true,
  className = '',
  dragonType = 'glb',
  enableFallback = true,
  fallbackType = '2d',
  enableProgressiveLoading = false,
  lowQualityModel = '/models/seiron_optimized.glb',
  highQualityModel = '/models/seiron_animated_optimized.gltf',
  enablePerformanceMonitor = false,
  performanceMonitorPosition = 'top-left',
  onError,
  onFallback,
  onProgressiveLoadComplete
}) => {
  const [currentType, setCurrentType] = useState(dragonType)
  const [hasError, setHasError] = useState(false)
  const [isLoadingHighQuality, setIsLoadingHighQuality] = useState(false)
  const [useHighQuality, setUseHighQuality] = useState(!enableProgressiveLoading)
  const errorCountRef = useRef(0)
  const mountedRef = useRef(true)
  const lastErrorTimeRef = useRef(0)
  const memoryManager = useRef(DragonMemoryManager.getInstance())

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      
      // Clean up memory when component unmounts
      if (memoryManager.current) {
        const activeModels = enableProgressiveLoading 
          ? [lowQualityModel, highQualityModel]
          : [highQualityModel]
        
        // Clean up unused models periodically
        memoryManager.current.cleanupUnusedModels(activeModels)
      }
    }
  }, [enableProgressiveLoading, lowQualityModel, highQualityModel])

  // Progressive loading effect
  useEffect(() => {
    if (enableProgressiveLoading && currentType === 'glb' && !useHighQuality && !isLoadingHighQuality) {
      setIsLoadingHighQuality(true)
      
      // Simulate loading delay and then enable high quality
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          setUseHighQuality(true)
          setIsLoadingHighQuality(false)
          if (onProgressiveLoadComplete) {
            onProgressiveLoadComplete()
          }
        }
      }, 1000) // Give 1 second for low quality to render first
      
      return () => clearTimeout(timer)
    }
    
    // Return cleanup function for other cases
    return () => {}
  }, [enableProgressiveLoading, currentType, useHighQuality, isLoadingHighQuality, onProgressiveLoadComplete])

  const handleError = useCallback((error: Error) => {
    if (!mountedRef.current) return
    
    // Debounce rapid errors
    const now = Date.now()
    if (now - lastErrorTimeRef.current < 1000) {
      console.log(`Dragon ${currentType} error debounced`)
      return
    }
    lastErrorTimeRef.current = now
    
    console.error(`Dragon ${currentType} error:`, error)
    errorCountRef.current++
    setHasError(true)
    
    if (onError) {
      onError(error, currentType)
    }

    // Fallback logic
    if (enableFallback && errorCountRef.current <= 2) {
      let nextType: '2d' | 'ascii' | null = null
      
      if (currentType === 'glb') {
        nextType = fallbackType || '2d'
      } else if (currentType === '2d') {
        nextType = 'ascii'
      }
      
      if (nextType) {
        console.log(`Falling back from ${currentType} to ${nextType}`)
        if (onFallback) {
          onFallback(currentType, nextType)
        }
        
        // Delay to prevent rapid fallback loops
        setTimeout(() => {
          if (mountedRef.current) {
            setCurrentType(nextType as '2d' | 'ascii')
            setHasError(false)
          }
        }, 500)
      }
    }
  }, [currentType, enableFallback, fallbackType, onError, onFallback])

  // Reset error state when type changes
  useEffect(() => {
    setHasError(false)
  }, [currentType])

  // Render based on current type
  const renderDragon = () => {
    if (hasError && !enableFallback) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-red-400 text-center">
            <div className="text-4xl mb-2">⚠️</div>
            <div>Dragon failed to load</div>
          </div>
        </div>
      )
    }

    switch (currentType) {
      case 'ascii':
        return (
          <ASCIIDragon
            size={size}
            voiceState={voiceState}
            className="w-full h-full"
          />
        )
      
      case '2d':
        return (
          <Dragon2D
            size={size}
            voiceState={voiceState}
            className="w-full h-full"
          />
        )
      
      case 'glb':
      default:
        // LOD selection based on size
        const getLODModel = () => {
          if (enableProgressiveLoading) {
            return useHighQuality ? highQualityModel : lowQualityModel
          }
          
          // LOD based on size
          switch (size) {
            case 'sm':
            case 'md':
              return lowQualityModel // Use low-quality for small sizes
            case 'lg':
              return '/models/seiron_animated_lod_high.gltf' // Use high-quality LOD if available
            case 'xl':
            case 'gigantic':
            default:
              return highQualityModel // Use full-quality for large sizes
          }
        }
        
        const modelPath = getLODModel()
        
        return (
          <SeironGLBDragonWithErrorBoundary
            voiceState={voiceState}
            size={size}
            enableAnimations={enableAnimations}
            className="w-full h-full"
            modelPath={modelPath}
            isProgressiveLoading={enableProgressiveLoading}
            isLoadingHighQuality={isLoadingHighQuality}
            onError={handleError}
          />
        )
    }
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <div key={currentType}>
        {renderDragon()}
      </div>
      
      {/* Performance Monitor */}
      <DragonPerformanceMonitor
        enabled={enablePerformanceMonitor}
        position={performanceMonitorPosition}
      />
    </div>
  )
}

export default DragonRenderer