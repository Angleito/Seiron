import { lazy } from 'react'

/**
 * Lazy-loaded dragon showcase component
 * This component demonstrates all dragon types and their capabilities
 */

export const LazyDragonShowcase = lazy(() =>
  import('./dragon/DragonRendererExample').then(module => ({
    default: module.default
  }))
)

export const LazyDragonDemo = lazy(() => 
  import('./voice/VoiceDragonDemo').then(module => ({
    default: module.default
  }))
)

export const LazyDragonIntegrationExample = lazy(() =>
  import('./voice/VoiceDragonIntegrationExample').then(module => ({
    default: module.default
  }))
)

/**
 * Preload all dragon showcase components
 */
export const preloadDragonShowcase = () => {
  // Preload the main showcase components
  import('./dragon/DragonRendererExample')
  import('./voice/VoiceDragonDemo')
  import('./voice/VoiceDragonIntegrationExample')
}

export default LazyDragonShowcase