/**
 * useDragonModel - Centralized hook for loading dragon models
 * 
 * This hook uses the ModelCacheService to prevent duplicate requests
 * and provides a consistent interface for loading dragon models.
 */

import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useModelCache } from '@/services/ModelCacheService'
import { logger } from '@lib/logger'

export interface UseDragonModelOptions {
  enablePreload?: boolean
  retryAttempts?: number
  timeout?: number
  onLoad?: (model: THREE.Object3D | THREE.Group) => void
  onError?: (error: Error) => void
  onProgress?: (progress: ProgressEvent) => void
}

export interface UseDragonModelResult {
  model: THREE.Object3D | THREE.Group | null
  isLoading: boolean
  error: Error | null
  progress: number
  retry: () => void
  preload: () => void
}

export function useDragonModel(
  modelUrl: string | null,
  options: UseDragonModelOptions = {}
): UseDragonModelResult {
  const {
    enablePreload = false,
    retryAttempts = 3,
    timeout = 10000,
    onLoad,
    onError,
    onProgress
  } = options

  const [model, setModel] = useState<THREE.Object3D | THREE.Group | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [progress, setProgress] = useState(0)
  const retryCountRef = useRef(0)
  const mountedRef = useRef(true)
  
  const { loadModel, preloadModel, getModelState, isModelLoaded } = useModelCache()

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Load model function
  const loadModelInternal = async (url: string) => {
    if (!mountedRef.current) return

    setIsLoading(true)
    setError(null)
    setProgress(0)

    try {
      logger.debug(`Loading dragon model: ${url}`)
      
      // Check if already loaded in cache
      if (isModelLoaded(url)) {
        logger.debug(`Model cache hit: ${url}`)
        const cachedModel = await loadModel(url, { timeout })
        
        if (mountedRef.current) {
          setModel(cachedModel)
          setIsLoading(false)
          setProgress(100)
          if (onLoad) onLoad(cachedModel)
        }
        return
      }

      // Load with progress tracking
      const loadedModel = await loadModel(url, { 
        timeout,
        retryAttempts,
        priority: 'medium'
      })

      if (mountedRef.current) {
        setModel(loadedModel)
        setIsLoading(false)
        setProgress(100)
        retryCountRef.current = 0
        
        logger.debug(`Dragon model loaded successfully: ${url}`)
        if (onLoad) onLoad(loadedModel)
      }
    } catch (err) {
      if (!mountedRef.current) return

      const error = err instanceof Error ? err : new Error('Failed to load model')
      logger.error(`Failed to load dragon model: ${url}`, error)
      
      setError(error)
      setIsLoading(false)
      setProgress(0)
      
      if (onError) onError(error)
    }
  }

  // Retry function
  const retry = () => {
    if (!modelUrl || retryCountRef.current >= retryAttempts) return
    
    retryCountRef.current++
    logger.debug(`Retrying model load (attempt ${retryCountRef.current}/${retryAttempts}): ${modelUrl}`)
    loadModelInternal(modelUrl)
  }

  // Preload function
  const preload = () => {
    if (!modelUrl) return
    
    logger.debug(`Preloading dragon model: ${modelUrl}`)
    preloadModel(modelUrl, { 
      timeout: timeout * 2, // Longer timeout for preloads
      priority: 'low'
    })
  }

  // Main effect for loading models
  useEffect(() => {
    if (!modelUrl) {
      setModel(null)
      setIsLoading(false)
      setError(null)
      setProgress(0)
      return
    }

    // Reset state
    retryCountRef.current = 0
    
    // Check if we should preload or load immediately
    if (enablePreload) {
      preload()
    } else {
      loadModelInternal(modelUrl)
    }
  }, [modelUrl, enablePreload])

  return {
    model,
    isLoading,
    error,
    progress,
    retry,
    preload
  }
}

// Hook for preloading multiple models
export function useModelPreloader(modelUrls: string[]) {
  const [preloadedCount, setPreloadedCount] = useState(0)
  const [isPreloading, setIsPreloading] = useState(false)
  const { preloadModel, isModelLoaded } = useModelCache()

  const preloadAll = async () => {
    if (modelUrls.length === 0) return

    setIsPreloading(true)
    setPreloadedCount(0)

    let completed = 0
    
    for (const url of modelUrls) {
      if (!isModelLoaded(url)) {
        try {
          preloadModel(url, { priority: 'low' })
          completed++
          setPreloadedCount(completed)
        } catch (error) {
          logger.warn(`Failed to preload model: ${url}`, error)
        }
      } else {
        completed++
        setPreloadedCount(completed)
      }
    }

    setIsPreloading(false)
  }

  useEffect(() => {
    preloadAll()
  }, [modelUrls])

  return {
    preloadedCount,
    totalCount: modelUrls.length,
    isPreloading,
    progress: modelUrls.length > 0 ? (preloadedCount / modelUrls.length) * 100 : 0
  }
}

// Hook for dragon model with automatic fallback
export function useDragonModelWithFallback(
  primaryUrl: string | null,
  fallbackUrls: string[] = [],
  options: UseDragonModelOptions = {}
): UseDragonModelResult {
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0)
  const [hasTriedFallbacks, setHasTriedFallbacks] = useState(false)

  const urls = primaryUrl ? [primaryUrl, ...fallbackUrls] : fallbackUrls
  const currentUrl = urls[currentUrlIndex] || null

  const result = useDragonModel(currentUrl, {
    ...options,
    onError: (error) => {
      // Try next fallback on error
      if (currentUrlIndex < urls.length - 1) {
        logger.warn(`Model failed, trying fallback: ${urls[currentUrlIndex + 1]}`, error)
        setCurrentUrlIndex(prev => prev + 1)
      } else {
        setHasTriedFallbacks(true)
        if (options.onError) options.onError(error)
      }
    }
  })

  // Reset fallback state when primary URL changes
  useEffect(() => {
    setCurrentUrlIndex(0)
    setHasTriedFallbacks(false)
  }, [primaryUrl])

  return {
    ...result,
    error: hasTriedFallbacks ? result.error : null // Don't show error until all fallbacks tried
  }
}

export default useDragonModel