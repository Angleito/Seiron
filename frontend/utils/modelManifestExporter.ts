import { ModelPreloader } from '../components/dragon/DragonModelManager'

/**
 * Export the current model manifest to a downloadable file
 */
export function exportModelManifest(): void {
  const preloader = ModelPreloader.getInstance()
  const manifestJson = preloader.exportManifest()
  
  // Create a blob from the JSON string
  const blob = new Blob([manifestJson], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  // Create a temporary link and trigger download
  const link = document.createElement('a')
  link.href = url
  link.download = `model-manifest-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  
  // Clean up
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Get the current model manifest as an object
 */
export function getModelManifest() {
  const preloader = ModelPreloader.getInstance()
  return preloader.getManifest()
}

/**
 * Get preload statistics
 */
export function getModelPreloadStats() {
  const preloader = ModelPreloader.getInstance()
  return preloader.getPreloadStats()
}

/**
 * Trigger progressive loading for a model
 */
export async function loadModelProgressively(
  modelId: string,
  startQuality: 'low' | 'medium' | 'high' | 'ultra',
  targetQuality: 'low' | 'medium' | 'high' | 'ultra',
  onQualityChange?: (quality: string) => void
) {
  const preloader = ModelPreloader.getInstance()
  return preloader.preloadProgressive(modelId, {
    startQuality,
    targetQuality,
    onQualityChange
  })
}
