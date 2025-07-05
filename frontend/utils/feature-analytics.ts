
/**
 * Feature usage analytics
 * Tracks which features are used and when to optimize preloading
 */

interface FeatureUsageData {
  count: number;
  lastUsed: string | null;
}

interface FeatureInfo {
  feature: string;
  count: number;
}

interface UsageReport {
  totalFeatures: number;
  mostUsed: FeatureInfo | null;
  leastUsed: FeatureInfo | null;
  recommendations: string[];
}

export const FeatureAnalytics = {
  usage: new Map<string, FeatureUsageData>(),
  
  trackFeatureUsage(featureName: string, route: string): void {
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
  
  getUsageReport(): UsageReport {
    const report: UsageReport = {
      totalFeatures: this.usage.size,
      mostUsed: null,
      leastUsed: null,
      recommendations: []
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
      const parts = key.split(':')
      const feature = parts[0] || ''
      const route = parts[1] || ''
      
      if (data.count > 5) {
        report.recommendations.push(`Consider preloading ${feature} for ${route}`)
      } else if (data.count === 1) {
        report.recommendations.push(`${feature} on ${route} might be over-optimized`)
      }
    }
    
    return report
  },
  
  loadUsageData(): void {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('feature-usage')
      if (stored) {
        try {
          const data: [string, FeatureUsageData][] = JSON.parse(stored)
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
