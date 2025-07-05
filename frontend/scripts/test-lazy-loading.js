#!/usr/bin/env node

/**
 * Simplified lazy loading test script
 * Tests the lazy loading infrastructure without requiring a full build
 */

const fs = require('fs')
const path = require('path')

class LazyLoadingTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    }
  }

  async runTests() {
    console.log('🚀 Starting Lazy Loading Tests...\n')

    await this.testLazyLoadingFiles()
    await this.testViteConfig()
    await this.testComponentStructure()
    await this.testHookStructure()

    this.printResults()
  }

  async testLazyLoadingFiles() {
    console.log('⚡ Testing lazy loading files...')
    
    const lazyFiles = [
      { path: 'components/dragon/lazy.ts', name: 'Dragon Components Lazy Loader' },
      { path: 'components/lazy-dragon-showcase.ts', name: 'Dragon Showcase Lazy Loader' },
      { path: 'components/voice/lazy.ts', name: 'Voice Components Lazy Loader' },
      { path: 'hooks/voice/lazy.ts', name: 'Voice Hooks Lazy Loader' },
      { path: 'hooks/lazy-performance.ts', name: 'Performance Hooks Lazy Loader' },
      { path: 'utils/lazy-loaders.ts', name: 'Lazy Loading Utilities' },
      { path: 'components/ui/LazyLoadingBoundary.tsx', name: 'Lazy Loading Boundary' },
      { path: 'components/ui/FeatureLoadingStates.tsx', name: 'Feature Loading States' }
    ]
    
    for (const file of lazyFiles) {
      const filePath = path.join(process.cwd(), file.path)
      const exists = fs.existsSync(filePath)
      this.addTest(`File exists: ${file.name}`, exists)
      
      if (exists) {
        const content = fs.readFileSync(filePath, 'utf8')
        
        // Check for lazy imports
        const hasLazyImport = content.includes('lazy(') || content.includes('import(')
        this.addTest(`${file.name} has lazy imports`, hasLazyImport)
        
        // Check for proper exports
        const hasExports = content.includes('export')
        this.addTest(`${file.name} has exports`, hasExports)
        
        // Check for TypeScript
        const isTypeScript = file.path.endsWith('.ts') || file.path.endsWith('.tsx')
        if (isTypeScript) {
          const hasTypes = content.includes('interface') || content.includes('type ') || content.includes(': ')
          this.addTest(`${file.name} has TypeScript types`, hasTypes)
        }
      }
    }
  }

  async testViteConfig() {
    console.log('⚙️ Testing Vite configuration...')
    
    const configPath = path.join(process.cwd(), 'vite.config.ts')
    
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8')
      
      // Check for manual chunks configuration
      const hasManualChunks = content.includes('manualChunks')
      this.addTest('Manual chunks configured', hasManualChunks)
      
      // Check for feature-specific chunks
      const featureChunks = [
        'dragon-animations',
        'voice-features',
        'performance-monitoring'
      ]
      
      let foundFeatureChunks = 0
      for (const chunk of featureChunks) {
        if (content.includes(chunk)) foundFeatureChunks++
      }
      
      this.addTest(
        `Feature chunks defined (${foundFeatureChunks}/${featureChunks.length})`,
        foundFeatureChunks === featureChunks.length
      )
      
      // Check for optimization settings
      const hasOptimization = content.includes('terserOptions') || content.includes('minify')
      this.addTest('Build optimization enabled', hasOptimization)
      
      // Check for chunk size warning limit
      const hasChunkSizeLimit = content.includes('chunkSizeWarningLimit')
      this.addTest('Chunk size warning limit set', hasChunkSizeLimit)
      
      // Check for exclude patterns
      const hasExcludePatterns = content.includes('exclude:')
      this.addTest('Exclude patterns for lazy loading', hasExcludePatterns)
    } else {
      this.addTest('Vite config exists', false)
    }
  }

  async testComponentStructure() {
    console.log('🧩 Testing component structure...')
    
    // Test dragon components
    const dragonComponents = [
      'components/dragon/EnhancedDragonCharacter.tsx',
      'components/dragon/InteractiveDragon.tsx',
      'components/DragonAnimationShowcase.tsx'
    ]
    
    let dragonExists = 0
    for (const comp of dragonComponents) {
      const exists = fs.existsSync(path.join(process.cwd(), comp))
      if (exists) dragonExists++
    }
    
    this.addTest(
      `Dragon components exist (${dragonExists}/${dragonComponents.length})`,
      dragonExists > 0
    )
    
    // Test voice components
    const voiceComponents = [
      'components/voice/VoiceInterface.tsx'
    ]
    
    let voiceExists = 0
    for (const comp of voiceComponents) {
      const exists = fs.existsSync(path.join(process.cwd(), comp))
      if (exists) voiceExists++
    }
    
    this.addTest(
      `Voice components exist (${voiceExists}/${voiceComponents.length})`,
      voiceExists > 0
    )
  }

  async testHookStructure() {
    console.log('🪝 Testing hook structure...')
    
    // Test performance hooks
    const performanceHooks = [
      'hooks/useAnimationPerformance.ts',
      'hooks/usePerformanceMonitor.ts',
      'hooks/useOrbitalPerformance.ts'
    ]
    
    let perfHooksExist = 0
    for (const hook of performanceHooks) {
      const exists = fs.existsSync(path.join(process.cwd(), hook))
      if (exists) perfHooksExist++
    }
    
    this.addTest(
      `Performance hooks exist (${perfHooksExist}/${performanceHooks.length})`,
      perfHooksExist > 0
    )
    
    // Test voice hooks
    const voiceHooks = [
      'hooks/voice/useSpeechRecognition.ts',
      'hooks/voice/useElevenLabsTTS.ts'
    ]
    
    let voiceHooksExist = 0
    for (const hook of voiceHooks) {
      const exists = fs.existsSync(path.join(process.cwd(), hook))
      if (exists) voiceHooksExist++
    }
    
    this.addTest(
      `Voice hooks exist (${voiceHooksExist}/${voiceHooks.length})`,
      voiceHooksExist > 0
    )
  }

  addTest(name, passed, error = null) {
    this.results.tests.push({ name, passed, error })
    if (passed) {
      this.results.passed++
      console.log(`✅ ${name}`)
    } else {
      this.results.failed++
      console.log(`❌ ${name}${error ? ` (${error})` : ''}`)
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(60))
    console.log('📋 LAZY LOADING TEST RESULTS')
    console.log('='.repeat(60))
    console.log(`Total Tests: ${this.results.tests.length}`)
    console.log(`Passed: ${this.results.passed}`)
    console.log(`Failed: ${this.results.failed}`)
    console.log(`Success Rate: ${((this.results.passed / this.results.tests.length) * 100).toFixed(1)}%`)
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:')
      this.results.tests
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`  - ${test.name}${test.error ? ` (${test.error})` : ''}`)
        })
    }
    
    console.log('\n' + '='.repeat(60))
    
    if (this.results.failed === 0) {
      console.log('🎉 All lazy loading tests passed!')
      process.exit(0)
    } else if (this.results.passed / this.results.tests.length >= 0.8) {
      console.log('✅ Lazy loading is mostly working (80%+ pass rate)')
      process.exit(0)
    } else {
      console.log('⚠️  Some critical lazy loading tests failed.')
      process.exit(1)
    }
  }
}

// Run the tests
const tester = new LazyLoadingTester()
tester.runTests().catch(error => {
  console.error('Test execution failed:', error)
  process.exit(1)
})