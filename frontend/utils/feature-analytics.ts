
/**
 * Feature usage analytics
 * Tracks which features are used and when to optimize preloading
 */

export const FeatureAnalytics = {
  usage: new Map(),
  
  trackFeatureUsage(featureName: string, route: string) {
    const key = `${featureName}:${route}`
    const current = this.usage.get(key) || { count: 0, lastUsed: null }
    
    this.usage.set(key, {
      count: current.count + 1,
      lastUsed: new Date().toISOString()
    })
    
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('feature-usage', JSON.stringify(Array.from(this.usage.entries())))
    }
  },
  
  getUsageReport() {
    const report = {
      totalFeatures: this.usage.size,
      mostUsed: null as { feature: string; count: number } | null,
      leastUsed: null as { feature: string; count: number } | null,
      recommendations: [] as string[]
    }
    
    let maxCount = 0
    let minCount = Infinity
    
    for (const [key, data] of this.usage.entries()) {
      if (data.count > maxCount) {
        maxCount = data.count
        report.mostUsed = { feature: key, count: data.count }
      }
      
      if (data.count < minCount) {
        minCount = data.count
        report.leastUsed = { feature: key, count: data.count }
      }
    }
    
    // Generate recommendations
    for (const [key, data] of this.usage.entries()) {
      const [feature, route] = key.split(':')
      
      if (data.count > 5) {
        report.recommendations.push(`Consider preloading ${feature} for ${route}`)
      } else if (data.count === 1) {
        report.recommendations.push(`${feature} on ${route} might be over-optimized`)
      }
    }
    
    return report
  },
  
  loadUsageData() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('feature-usage')
      if (stored) {
        try {
          const data = JSON.parse(stored)
          this.usage = new Map(data)
        } catch (error) {
          console.error('Failed to load usage data:', error)
        }
      }
    }
  }
}

// Load usage data on initialization
FeatureAnalytics.loadUsageData()
