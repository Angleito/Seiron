// Removed unused imports: lazy, Suspense from 'react' and createLazyComponent from '@utils/lazy-loaders'

/**
 * Lazy-loaded voice hooks
 * These hooks are loaded on demand to reduce initial bundle size
 */

// Dynamic import for speech recognition hook
export const useSpeechRecognitionLazy = () => {
  return import('./useSpeechRecognition').then(module => module.useSpeechRecognition)
}

// Dynamic import for ElevenLabs TTS hook
export const useElevenLabsTTSLazy = () => {
  return import('./useElevenLabsTTS').then(module => module.useElevenLabsTTS)
}

/**
 * Hook factory for lazy-loaded voice hooks
 */
export const createLazyVoiceHook = <T extends (...args: any[]) => any>(
  importFn: () => Promise<T>
) => {
  let cachedHook: T | null = null
  
  const useLazyHook = (...args: Parameters<T>) => {
    if (!cachedHook) {
      throw importFn().then(hook => {
        cachedHook = hook
        return hook(...args)
      })
    }
    
    return cachedHook(...args)
  }
  
  return useLazyHook
}

/**
 * Preloader for voice hooks
 */
export const preloadVoiceHooks = async () => {
  try {
    // Preload speech recognition
    await useSpeechRecognitionLazy()
    
    // Preload TTS
    await useElevenLabsTTSLazy()
    
    // Mark as loaded
    if (typeof window !== 'undefined') {
      window.__VOICE_HOOKS_LOADED__ = true
    }
  } catch (error) {
    console.warn('Failed to preload voice hooks:', error)
  }
}

/**
 * Check if voice hooks are available
 */
export const areVoiceHooksLoaded = () => {
  return typeof window !== 'undefined' && 
         window.__VOICE_HOOKS_LOADED__ === true
}

/**
 * Lazy voice hook manager
 */
export class LazyVoiceHookManager {
  private static instance: LazyVoiceHookManager
  private loadedHooks: Set<string> = new Set()
  private loadingHooks: Set<string> = new Set()
  
  static getInstance(): LazyVoiceHookManager {
    if (!LazyVoiceHookManager.instance) {
      LazyVoiceHookManager.instance = new LazyVoiceHookManager()
    }
    return LazyVoiceHookManager.instance
  }
  
  async loadHook(hookName: string): Promise<any> {
    if (this.loadedHooks.has(hookName)) {
      return Promise.resolve()
    }
    
    if (this.loadingHooks.has(hookName)) {
      // Wait for the hook to load
      return new Promise(resolve => {
        const checkLoaded = () => {
          if (this.loadedHooks.has(hookName)) {
            resolve(undefined)
          } else {
            setTimeout(checkLoaded, 100)
          }
        }
        checkLoaded()
      })
    }
    
    this.loadingHooks.add(hookName)
    
    try {
      switch (hookName) {
        case 'useSpeechRecognition':
          await useSpeechRecognitionLazy()
          break
        case 'useElevenLabsTTS':
          await useElevenLabsTTSLazy()
          break
        default:
          throw new Error(`Unknown hook: ${hookName}`)
      }
      
      this.loadedHooks.add(hookName)
      this.loadingHooks.delete(hookName)
    } catch (error) {
      this.loadingHooks.delete(hookName)
      throw error
    }
  }
  
  isLoaded(hookName: string): boolean {
    return this.loadedHooks.has(hookName)
  }
  
  isLoading(hookName: string): boolean {
    return this.loadingHooks.has(hookName)
  }
  
  getLoadingProgress(): { loaded: number; total: number; progress: number } {
    const total = 2 // useSpeechRecognition, useElevenLabsTTS
    const loaded = this.loadedHooks.size
    return {
      loaded,
      total,
      progress: Math.round((loaded / total) * 100)
    }
  }
}

// Type augmentation for window object
declare global {
  interface Window {
    __VOICE_HOOKS_LOADED__?: boolean
  }
}