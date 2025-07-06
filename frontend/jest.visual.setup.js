// Visual regression testing setup
const fs = require('fs')
const path = require('path')
const { PNG } = require('pngjs')
const pixelmatch = require('pixelmatch')

// Create directories for visual test artifacts
const visualTestDir = path.join(__dirname, '__visual_tests__')
const baselinesDir = path.join(visualTestDir, 'baselines')
const actualDir = path.join(visualTestDir, 'actual')
const diffDir = path.join(visualTestDir, 'diff')

// Ensure directories exist
[visualTestDir, baselinesDir, actualDir, diffDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
})

// Visual testing utilities
global.visualTesting = {
  // Capture a screenshot of an element
  captureElement: async (element, name) => {
    // In a real implementation, this would use puppeteer or playwright
    // For Jest environment, we'll simulate the screenshot
    const rect = element.getBoundingClientRect()
    
    // Create a mock PNG buffer representing the element
    const width = Math.max(rect.width, 100)
    const height = Math.max(rect.height, 100)
    
    // Generate deterministic pixel data based on element properties
    const pixelData = generateMockPixelData(element, width, height)
    
    const png = new PNG({ width, height })
    png.data = Buffer.from(pixelData)
    
    const actualPath = path.join(actualDir, `${name}.png`)
    
    return new Promise((resolve, reject) => {
      png.pack().pipe(fs.createWriteStream(actualPath))
        .on('finish', () => resolve(actualPath))
        .on('error', reject)
    })
  },

  // Compare captured screenshot with baseline
  compareWithBaseline: async (actualPath, name, options = {}) => {
    const baselinePath = path.join(baselinesDir, `${name}.png`)
    const diffPath = path.join(diffDir, `${name}.png`)
    
    // If no baseline exists, create one
    if (!fs.existsSync(baselinePath)) {
      fs.copyFileSync(actualPath, baselinePath)
      return {
        passed: true,
        isNewBaseline: true,
        pixelDifference: 0,
        percentage: 0
      }
    }
    
    // Load images
    const actual = PNG.sync.read(fs.readFileSync(actualPath))
    const baseline = PNG.sync.read(fs.readFileSync(baselinePath))
    
    // Create diff image
    const diff = new PNG({ width: actual.width, height: actual.height })
    
    // Compare images
    const pixelDifference = pixelmatch(
      baseline.data,
      actual.data,
      diff.data,
      actual.width,
      actual.height,
      {
        threshold: options.threshold || 0.1,
        includeAA: options.includeAA || false
      }
    )
    
    const totalPixels = actual.width * actual.height
    const percentage = (pixelDifference / totalPixels) * 100
    
    // Save diff if there are differences
    if (pixelDifference > 0) {
      fs.writeFileSync(diffPath, PNG.sync.write(diff))
    }
    
    const maxDifference = options.maxDifference || 0.5 // 0.5% difference allowed
    const passed = percentage <= maxDifference
    
    return {
      passed,
      isNewBaseline: false,
      pixelDifference,
      percentage: Math.round(percentage * 100) / 100,
      diffPath: pixelDifference > 0 ? diffPath : null
    }
  },


  // Test responsive breakpoints
  testResponsiveBreakpoints: async (element, breakpoints) => {
    const results = {}
    
    for (const [name, width] of Object.entries(breakpoints)) {
      // Simulate viewport change
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
      })
      
      // Trigger resize event
      window.dispatchEvent(new Event('resize'))
      
      // Wait for responsive changes
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const screenshotPath = await visualTesting.captureElement(
        element,
        `responsive-${name}-${width}px`
      )
      
      const comparison = await visualTesting.compareWithBaseline(
        screenshotPath,
        `responsive-${name}-${width}px`
      )
      
      results[name] = comparison
    }
    
    return results
  }
}

// Generate mock pixel data for testing
function generateMockPixelData(element, width, height) {
  const data = new Uint8Array(width * height * 4) // RGBA
  
  // Create deterministic patterns based on element characteristics
  const elementHash = hashElement(element)
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      
      // Generate colors based on position and element hash
      const r = (elementHash + x + y) % 256
      const g = (elementHash + x * 2 + y) % 256
      const b = (elementHash + x + y * 2) % 256
      const a = 255 // Fully opaque
      
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = a
    }
  }
  
  return data
}

function hashElement(element) {
  // Create a simple hash based on element properties
  const str = [
    element.tagName,
    element.className,
    element.id,
    element.textContent || ''
  ].join('')
  
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash) % 256
}

// Visual testing assertion helpers
global.expectVisualMatch = async (element, name, options = {}) => {
  const screenshotPath = await visualTesting.captureElement(element, name)
  const comparison = await visualTesting.compareWithBaseline(screenshotPath, name, options)
  
  if (!comparison.passed && !comparison.isNewBaseline) {
    const message = `Visual regression detected for "${name}": ${comparison.percentage}% different (${comparison.pixelDifference} pixels)`
    if (comparison.diffPath) {
      console.log(`Diff image saved to: ${comparison.diffPath}`)
    }
    throw new Error(message)
  }
  
  return comparison
}


global.expectResponsiveVisuals = async (element, breakpoints, options = {}) => {
  const results = await visualTesting.testResponsiveBreakpoints(element, breakpoints)
  
  const failures = Object.entries(results)
    .filter(([breakpoint, result]) => !result.passed && !result.isNewBaseline)
    .map(([breakpoint, result]) => `${breakpoint}: ${result.percentage}% different`)
  
  if (failures.length > 0) {
    throw new Error(`Visual regressions detected in responsive breakpoints:\n${failures.join('\n')}`)
  }
  
  return results
}

// Cleanup function
afterAll(() => {
  // Clean up temporary files older than 7 days
  const cleanupOlderThan = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  const now = Date.now()
  
  [actualDir, diffDir].forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir)
      files.forEach(file => {
        const filePath = path.join(dir, file)
        const stat = fs.statSync(filePath)
        if (now - stat.mtime.getTime() > cleanupOlderThan) {
          fs.unlinkSync(filePath)
        }
      })
    }
  })
})