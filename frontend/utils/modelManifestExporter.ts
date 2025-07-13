// import { ModelPreloader } from '../components/dragon/DragonModelManager'

// Temporarily commented out due to DragonModelManager build errors
/*
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

export function getModelManifest() {
  const preloader = ModelPreloader.getInstance()
  return preloader.getManifest()
}

export function getModelPreloadStats() {
  const preloader = ModelPreloader.getInstance()
  return preloader.getPreloadStats()
}

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
*/

// Temporary stub exports to prevent import errors
export function exportModelManifest(): void {
  console.warn('ModelManifest functionality temporarily disabled')
}

export function getModelManifest() {
  return {}
}

export function getModelPreloadStats() {
  return { loaded: 0, total: 0, models: {} }
}

export async function loadModelProgressively(
  modelId: string,
  startQuality: 'low' | 'medium' | 'high' | 'ultra',
  targetQuality: 'low' | 'medium' | 'high' | 'ultra',
  onQualityChange?: (quality: string) => void
) {
  console.warn('Progressive loading temporarily disabled')
  return Promise.resolve()
}