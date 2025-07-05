
/**
 * Auto-generated feature preloader
 * This script optimizes the loading of lazy features based on user patterns
 */

export const FeaturePreloader = {
  // Feature definitions
  features: {
  "voice-features": {
    "priority": "medium",
    "components": [
      "components/voice/VoiceInterface",
      "hooks/voice/useSpeechRecognition",
      "hooks/voice/useElevenLabsTTS"
    ],
    "routes": [
      "/voice-test"
    ],
    "estimatedSize": "80KB"
  },
  "performance-monitoring": {
    "priority": "low",
    "components": [
      "hooks/useAnimationPerformance",
      "hooks/usePerformanceMonitor",
      "hooks/useOrbitalPerformance"
    ],
    "routes": [
      "/animation-demo"
    ],
    "estimatedSize": "45KB"
  },
  "chat-features": {
    "priority": "medium",
    "components": [
      "components/chat/ChatInterface",
      "components/chat/VoiceEnabledChat"
    ],
    "routes": [
      "/dashboard"
    ],
    "estimatedSize": "90KB"
  },
  "portfolio-features": {
    "priority": "medium",
    "components": [
      "components/portfolio/PortfolioOverview",
      "components/portfolio/PortfolioAnalytics"
    ],
    "routes": [
      "/dashboard"
    ],
    "estimatedSize": "70KB"
  }
},

  // Preload based on route
  preloadForRoute(route: string) {
    const preloadPromises: Promise<unknown>[] = []
    
    Object.entries(this.features).forEach(([featureName, feature]) => {
      if (feature.routes.includes(route)) {
        console.log(`Preloading ${featureName} for route ${route}`)
        preloadPromises.push(this.preloadFeature(featureName))
      }
    })
    
    return Promise.all(preloadPromises)
  },

  // Preload specific feature
  async preloadFeature(featureName: string) {
    const feature = this.features[featureName as keyof typeof this.features]
    if (!feature) {
      console.warn(`Feature ${featureName} not found`)
      return
    }

    const loadPromises = []

    switch (featureName) {
      case 'voice-features':
        loadPromises.push(
          import('../components/voice/lazy').then(m => m.preloadVoiceComponents()),
          import('../hooks/voice/lazy').then(m => m.preloadVoiceHooks())
        )
        break

      case 'performance-monitoring':
        loadPromises.push(
          import('../hooks/lazy-performance').then(m => m.preloadPerformanceHooks())
        )
        break

      case 'chat-features':
        loadPromises.push(
          import('../components/chat/ChatInterface'),
          import('../components/chat/VoiceEnabledChat')
        )
        break

      case 'portfolio-features':
        loadPromises.push(
          import('../components/portfolio/PortfolioOverview'),
          import('../components/portfolio/PortfolioAnalytics')
        )
        break
    }

    try {
      await Promise.all(loadPromises)
      console.log(`✅ Preloaded ${featureName}`)
    } catch (error) {
      console.error(`❌ Failed to preload ${featureName}:`, error)
    }
  },

  // Intelligent preloading based on user behavior
  smartPreload() {
    // Preload high-priority features immediately
    const highPriorityFeatures = Object.entries(this.features)
      .filter(([_, feature]) => feature.priority === 'high')
      .map(([name, _]) => name)

    return Promise.all(
      highPriorityFeatures.map(feature => this.preloadFeature(feature))
    )
  },

  // Get preload recommendations
  getRecommendations() {
    const recommendations: string[] = []
    
    Object.entries(this.features).forEach(([name, feature]) => {
      if (feature.priority === 'high') {
        recommendations.push(`Preload ${name} immediately`)
      } else if (feature.priority === 'medium') {
        recommendations.push(`Preload ${name} on user interaction`)
      } else {
        recommendations.push(`Lazy load ${name} on demand`)
      }
    })
    
    return recommendations
  }
}

// Auto-preload high priority features on app start
if (typeof window !== 'undefined') {
  // Wait for initial render
  setTimeout(() => {
    FeaturePreloader.smartPreload()
  }, 1000)
}
