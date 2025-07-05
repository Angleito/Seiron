#!/usr/bin/env node

/**
 * Bundle optimization test script
 * Verifies that code splitting and lazy loading are working correctly
 */

const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const { promisify } = require('util')

const execAsync = promisify(exec)

class BundleOptimizationTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    }
  }

  async runTests() {
    console.log('🚀 Starting Bundle Optimization Tests...\n')

    await this.testBuildOutput()
    await this.testChunkSplitting()
    await this.testLazyLoadingFiles()
    await this.testViteConfig()
    await this.testBundleSize()

    this.printResults()
  }

  async testBuildOutput() {
    console.log('📦 Testing build output...')
    
    try {
      // Build the project
      await execAsync('npm run build', { cwd: process.cwd() })
      
      const distPath = path.join(process.cwd(), 'dist')
      if (fs.existsSync(distPath)) {
        this.addTest('Build output exists', true)
        
        const jsFiles = this.findJSFiles(distPath)
        const expectedChunks = [
          'react-vendor',
          'router',
          'web3-vendor',
          'animation-vendor',
          'utils-vendor',
          'dragon-animations',
          'voice-features',
          'performance-monitoring'
        ]
        
        let foundChunks = 0
        for (const chunk of expectedChunks) {
          const hasChunk = jsFiles.some(file => file.includes(chunk))
          if (hasChunk) foundChunks++
        }
        
        this.addTest(
          `Expected chunks created (${foundChunks}/${expectedChunks.length})`,
          foundChunks >= expectedChunks.length * 0.8 // 80% threshold
        )
      } else {
        this.addTest('Build output exists', false, 'dist directory not found')
      }
    } catch (error) {
      this.addTest('Build process', false, error.message)
    }
  }

  async testChunkSplitting() {
    console.log('🧩 Testing chunk splitting...')
    
    const viteConfigPath = path.join(process.cwd(), 'vite.config.ts')
    
    if (fs.existsSync(viteConfigPath)) {
      const content = fs.readFileSync(viteConfigPath, 'utf8')
      
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
    } else {
      this.addTest('Vite config exists', false)
    }
  }

  async testLazyLoadingFiles() {
    console.log('⚡ Testing lazy loading files...')
    
    const lazyFiles = [
      'components/dragon/lazy.ts',
      'components/lazy-dragon-showcase.ts',
      'components/voice/lazy.ts',
      'hooks/voice/lazy.ts',
      'hooks/lazy-performance.ts',
      'utils/lazy-loaders.ts'
    ]
    
    for (const file of lazyFiles) {
      const filePath = path.join(process.cwd(), file)
      const exists = fs.existsSync(filePath)
      this.addTest(`Lazy loading file: ${file}`, exists)
      
      if (exists) {
        const content = fs.readFileSync(filePath, 'utf8')
        const hasLazyImport = content.includes('lazy(') || content.includes('import(')
        this.addTest(`${file} has lazy imports`, hasLazyImport)
      }
    }
  }

  async testViteConfig() {
    console.log('⚙️ Testing Vite configuration...')
    
    const configPath = path.join(process.cwd(), 'vite.config.ts')
    
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8')
      
      // Check for chunk size warning limit
      const hasChunkSizeLimit = content.includes('chunkSizeWarningLimit')
      this.addTest('Chunk size warning limit set', hasChunkSizeLimit)
      
      // Check for optimized file names
      const hasOptimizedNames = content.includes('chunkFileNames') && content.includes('assetFileNames')
      this.addTest('Optimized file names configured', hasOptimizedNames)
      
      // Check for exclude patterns
      const hasExcludePatterns = content.includes('exclude:')
      this.addTest('Exclude patterns for lazy loading', hasExcludePatterns)
    }
  }

  async testBundleSize() {
    console.log('📊 Testing bundle size...')
    
    const distPath = path.join(process.cwd(), 'dist')
    if (fs.existsSync(distPath)) {
      const jsFiles = this.findJSFiles(distPath)
      const totalSize = this.calculateTotalSize(jsFiles)
      
      // Check if total size is reasonable (under 5MB)
      const sizeLimit = 5 * 1024 * 1024 // 5MB
      this.addTest(`Total bundle size (${this.formatBytes(totalSize)})`, totalSize < sizeLimit)
      
      // Check if main bundle is not too large
      const mainBundleSize = this.getMainBundleSize(jsFiles)
      const mainSizeLimit = 1 * 1024 * 1024 // 1MB
      this.addTest(`Main bundle size (${this.formatBytes(mainBundleSize)})`, mainBundleSize < mainSizeLimit)
      
      // Check if lazy chunks exist
      const lazyChunks = jsFiles.filter(file => 
        file.includes('dragon-animations') || 
        file.includes('voice-features') || 
        file.includes('performance-monitoring')
      )
      this.addTest(`Lazy chunks created (${lazyChunks.length})`, lazyChunks.length > 0)
    }
  }

  findJSFiles(dir) {
    const files = []
    
    const walk = (currentPath) => {
      const items = fs.readdirSync(currentPath)
      
      for (const item of items) {
        const itemPath = path.join(currentPath, item)
        const stat = fs.statSync(itemPath)
        
        if (stat.isDirectory()) {
          walk(itemPath)
        } else if (item.endsWith('.js')) {
          files.push(itemPath)
        }
      }
    }
    
    walk(dir)
    return files
  }

  calculateTotalSize(files) {
    return files.reduce((total, file) => {
      const stat = fs.statSync(file)
      return total + stat.size
    }, 0)
  }

  getMainBundleSize(files) {
    const mainFile = files.find(file => file.includes('index') || file.includes('main'))
    if (mainFile) {
      const stat = fs.statSync(mainFile)
      return stat.size
    }
    return 0
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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
    console.log('📋 BUNDLE OPTIMIZATION TEST RESULTS')
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
      console.log('🎉 All tests passed! Bundle optimization is working correctly.')
      process.exit(0)
    } else {
      console.log('⚠️  Some tests failed. Please check the configuration.')
      process.exit(1)
    }
  }
}

// Run the tests
const tester = new BundleOptimizationTester()
tester.runTests().catch(error => {
  console.error('Test execution failed:', error)
  process.exit(1)
})