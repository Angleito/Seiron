#!/usr/bin/env node

/**
 * Feature preloading script
 * Helps optimize the loading of lazy-loaded features based on usage patterns
 */

const fs = require('fs')
const path = require('path')

class FeaturePreloader {
  constructor() {
    this.features = {
      'voice-features': {
        priority: 'medium',
        components: [
          'components/voice/VoiceInterface',
          'hooks/voice/useSpeechRecognition',
          'hooks/voice/useElevenLabsTTS'
        ],
        routes: ['/voice-test'],
        estimatedSize: '80KB'
      },
      'performance-monitoring': {
        priority: 'low',
        components: [
          'hooks/useAnimationPerformance',
          'hooks/usePerformanceMonitor',
          'hooks/useOrbitalPerformance'
        ],
        routes: ['/animation-demo'],
        estimatedSize: '45KB'
      },
      'chat-features': {
        priority: 'medium',
        components: [
          'components/chat/ChatInterface',
          'components/chat/VoiceEnabledChat'
        ],
        routes: ['/dashboard'],
        estimatedSize: '90KB'
      },
      'portfolio-features': {
        priority: 'medium',
        components: [
          'components/portfolio/PortfolioOverview',
          'components/portfolio/PortfolioAnalytics'
        ],
        routes: ['/dashboard'],
        estimatedSize: '70KB'
      }
    }
  }

  generatePreloadScript() {
    console.log('🚀 Generating feature preload script...')

    const preloadScript = `
/**
 * Auto-generated feature preloader
 * This script optimizes the loading of lazy features based on user patterns
 */

export const FeaturePreloader = {
  // Feature definitions
  features: ${JSON.stringify(this.features, null, 2)},

  // Preload based on route
  preloadForRoute(route) {
    const preloadPromises = []
    
    Object.entries(this.features).forEach(([featureName, feature]) => {
      if (feature.routes.includes(route)) {
        console.log(\`Preloading \${featureName} for route \${route}\`)
        preloadPromises.push(this.preloadFeature(featureName))
      }
    })
    
    return Promise.all(preloadPromises)
  },

  // Preload specific feature
  async preloadFeature(featureName) {
    const feature = this.features[featureName]
    if (!feature) {
      console.warn(\`Feature \${featureName} not found\`)
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
      console.log(\`✅ Preloaded \${featureName}\`)
    } catch (error) {
      console.error(\`❌ Failed to preload \${featureName}:\`, error)
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
    const recommendations = []
    
    Object.entries(this.features).forEach(([name, feature]) => {
      if (feature.priority === 'high') {
        recommendations.push(\`Preload \${name} immediately\`)
      } else if (feature.priority === 'medium') {
        recommendations.push(\`Preload \${name} on user interaction\`)
      } else {
        recommendations.push(\`Lazy load \${name} on demand\`)
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
`

    const outputPath = path.join(process.cwd(), 'utils', 'feature-preloader.ts')
    fs.writeFileSync(outputPath, preloadScript)
    console.log(`✅ Preload script generated at: ${outputPath}`)
  }

  generateUsageAnalytics() {
    console.log('📊 Generating usage analytics...')

    const analyticsScript = `
/**
 * Feature usage analytics
 * Tracks which features are used and when to optimize preloading
 */

export const FeatureAnalytics = {
  usage: new Map(),
  
  trackFeatureUsage(featureName, route) {
    const key = \`\${featureName}:\${route}\`
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
      const [feature, route] = key.split(':')
      
      if (data.count > 5) {
        report.recommendations.push(\`Consider preloading \${feature} for \${route}\`)
      } else if (data.count === 1) {
        report.recommendations.push(\`\${feature} on \${route} might be over-optimized\`)
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
`

    const analyticsPath = path.join(process.cwd(), 'utils', 'feature-analytics.ts')
    fs.writeFileSync(analyticsPath, analyticsScript)
    console.log(`✅ Analytics script generated at: ${analyticsPath}`)
  }

  printOptimizationReport() {
    console.log('\n' + '='.repeat(60))
    console.log('📋 FEATURE PRELOADING OPTIMIZATION REPORT')
    console.log('='.repeat(60))

    Object.entries(this.features).forEach(([name, feature]) => {
      console.log(`\n🎯 ${name.toUpperCase()}`)
      console.log(`   Priority: ${feature.priority}`)
      console.log(`   Size: ${feature.estimatedSize}`)
      console.log(`   Routes: ${feature.routes.join(', ')}`)
      console.log(`   Components: ${feature.components.length}`)
    })

    const totalSize = Object.values(this.features)
      .map(f => parseInt(f.estimatedSize))
      .reduce((sum, size) => sum + size, 0)

    console.log(`\n📊 SUMMARY`)
    console.log(`   Total Features: ${Object.keys(this.features).length}`)
    console.log(`   Estimated Bundle Size: ${totalSize}KB`)
    console.log(`   High Priority: ${Object.values(this.features).filter(f => f.priority === 'high').length}`)
    console.log(`   Medium Priority: ${Object.values(this.features).filter(f => f.priority === 'medium').length}`)
    console.log(`   Low Priority: ${Object.values(this.features).filter(f => f.priority === 'low').length}`)

    console.log('\n' + '='.repeat(60))
  }

  run() {
    console.log('🔧 Initializing Feature Preloader...\n')
    
    this.generatePreloadScript()
    this.generateUsageAnalytics()
    this.printOptimizationReport()
    
    console.log('\n✅ Feature preloading setup complete!')
  }
}

// Run the preloader
const preloader = new FeaturePreloader()
preloader.run()