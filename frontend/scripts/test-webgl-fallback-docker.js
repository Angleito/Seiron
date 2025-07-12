#!/usr/bin/env node

/**
 * Docker WebGL Fallback Test Script
 * 
 * This script tests the WebGL fallback system in a headless Docker environment.
 * It simulates the conditions that occur when running in Docker containers
 * where WebGL is not available.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const TIMEOUT = 30000; // 30 seconds timeout
const TEST_URL = process.env.TEST_URL || 'http://localhost:3000/dragon-fallback-test';
const OUTPUT_DIR = path.join(__dirname, '..', 'docker-fallback-test-reports');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Test configuration for different scenarios
 */
const testScenarios = [
  {
    name: 'headless-chrome',
    description: 'Headless Chrome (standard)',
    launchOptions: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    }
  },
  {
    name: 'headless-no-gpu',
    description: 'Headless Chrome with disabled GPU',
    launchOptions: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-features=VizDisplayCompositor'
      ]
    }
  },
  {
    name: 'docker-simulation',
    description: 'Docker environment simulation',
    launchOptions: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-features=VizDisplayCompositor',
        '--virtual-time-budget=5000'
      ]
    }
  }
];

/**
 * Run a single test scenario
 */
async function runTestScenario(scenario) {
  console.log(`\n🧪 Running test: ${scenario.name} - ${scenario.description}`);
  
  let browser;
  let page;
  
  try {
    // Launch browser with scenario-specific options
    browser = await puppeteer.launch(scenario.launchOptions);
    page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    // Set user agent to indicate headless mode
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/91.0.4472.124 Safari/537.36');
    
    // Enable console logging
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push({
        type: msg.type(),
        text: text,
        timestamp: new Date().toISOString()
      });
      console.log(`[${msg.type().toUpperCase()}] ${text}`);
    });
    
    // Capture errors
    const pageErrors = [];
    page.on('pageerror', error => {
      pageErrors.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      console.error(`❌ Page Error: ${error.message}`);
    });
    
    // Navigate to test page
    console.log(`📍 Navigating to: ${TEST_URL}`);
    const startTime = Date.now();
    
    await page.goto(TEST_URL, {
      waitUntil: 'networkidle2',
      timeout: TIMEOUT
    });
    
    const loadTime = Date.now() - startTime;
    console.log(`✅ Page loaded in ${loadTime}ms`);
    
    // Wait for initial diagnostics to complete
    await page.waitForTimeout(2000);
    
    // Extract diagnostic information
    const diagnostics = await page.evaluate(async () => {
      // Check if webglFallbackManager is available
      if (typeof window.webglFallbackManager === 'undefined') {
        // Try to access it through the module system
        try {
          const { webglFallbackManager, isHeadlessEnvironment, detectWebGLCapabilities } = 
            await import('/utils/webglFallback');
          
          return {
            isHeadless: isHeadlessEnvironment(),
            capabilities: detectWebGLCapabilities(),
            diagnostics: webglFallbackManager.getDiagnostics(),
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          return {
            error: 'WebGL fallback manager not available',
            details: error.message,
            timestamp: new Date().toISOString()
          };
        }
      }
      
      return {
        isHeadless: window.webglFallbackManager ? window.webglFallbackManager.isHeadlessEnvironment() : true,
        capabilities: window.detectWebGLCapabilities ? window.detectWebGLCapabilities() : null,
        diagnostics: window.webglFallbackManager ? window.webglFallbackManager.getDiagnostics() : null,
        timestamp: new Date().toISOString()
      };
    });
    
    // Test dragon rendering
    console.log('🐉 Testing dragon renderer fallback...');
    
    // Wait for dragon components to initialize
    await page.waitForTimeout(3000);
    
    // Check if dragon renderers are present
    const dragonTests = await page.evaluate(() => {
      const results = {
        traditionalRenderer: {
          present: false,
          type: 'unknown',
          error: null
        },
        fallbackRenderer: {
          present: false,
          type: 'unknown',
          error: null
        }
      };
      
      try {
        // Check traditional renderer
        const traditionalDragon = document.querySelector('[data-testid="traditional-dragon"], .dragon-renderer');
        if (traditionalDragon) {
          results.traditionalRenderer.present = true;
          results.traditionalRenderer.type = traditionalDragon.getAttribute('data-dragon-type') || 'detected';
        }
        
        // Check fallback renderer
        const fallbackDragon = document.querySelector('[data-testid="fallback-dragon"], .dragon-fallback-renderer');
        if (fallbackDragon) {
          results.fallbackRenderer.present = true;
          results.fallbackRenderer.type = fallbackDragon.getAttribute('data-fallback-mode') || 'detected';
        }
        
        // If no specific test IDs, look for any dragon-related elements
        if (!results.traditionalRenderer.present && !results.fallbackRenderer.present) {
          const anyDragon = document.querySelector('[class*="dragon"], [id*="dragon"], canvas, pre');
          if (anyDragon) {
            results.fallbackRenderer.present = true;
            results.fallbackRenderer.type = anyDragon.tagName.toLowerCase();
          }
        }
      } catch (error) {
        results.traditionalRenderer.error = error.message;
        results.fallbackRenderer.error = error.message;
      }
      
      return results;
    });
    
    // Test voice state changes
    console.log('🎤 Testing voice state changes...');
    
    await page.evaluate(() => {
      // Simulate voice state changes if the function is available
      if (typeof window.simulateVoiceStates === 'function') {
        window.simulateVoiceStates();
      }
    });
    
    await page.waitForTimeout(5000);
    
    // Take screenshot
    const screenshotPath = path.join(OUTPUT_DIR, `${scenario.name}-screenshot.png`);
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    console.log(`📷 Screenshot saved: ${screenshotPath}`);
    
    // Generate test report
    const report = {
      scenario: scenario.name,
      description: scenario.description,
      timestamp: new Date().toISOString(),
      success: true,
      loadTime,
      diagnostics,
      dragonTests,
      consoleLogs: consoleLogs.slice(-20), // Last 20 log entries
      pageErrors,
      performance: {
        loadTime,
        evaluationTime: Date.now() - startTime
      }
    };
    
    // Determine overall success
    report.success = (
      pageErrors.length === 0 &&
      (dragonTests.traditionalRenderer.present || dragonTests.fallbackRenderer.present) &&
      (diagnostics.error === undefined)
    );
    
    console.log(`✅ Test ${scenario.name} completed successfully`);
    console.log(`📊 Dragons rendered: Traditional=${dragonTests.traditionalRenderer.present}, Fallback=${dragonTests.fallbackRenderer.present}`);
    console.log(`🚨 Errors: ${pageErrors.length}`);
    
    return report;
    
  } catch (error) {
    console.error(`❌ Test ${scenario.name} failed:`, error.message);
    
    return {
      scenario: scenario.name,
      description: scenario.description,
      timestamp: new Date().toISOString(),
      success: false,
      error: error.message,
      stack: error.stack
    };
    
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🚀 Starting WebGL Fallback System Tests');
  console.log(`📋 Test URL: ${TEST_URL}`);
  console.log(`📁 Output Directory: ${OUTPUT_DIR}`);
  console.log(`⏱️  Timeout: ${TIMEOUT}ms`);
  
  const allResults = [];
  
  for (const scenario of testScenarios) {
    const result = await runTestScenario(scenario);
    allResults.push(result);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Generate summary report
  const summaryReport = {
    testRun: {
      timestamp: new Date().toISOString(),
      testUrl: TEST_URL,
      totalTests: testScenarios.length,
      successfulTests: allResults.filter(r => r.success).length,
      failedTests: allResults.filter(r => !r.success).length
    },
    results: allResults,
    summary: {
      overallSuccess: allResults.every(r => r.success),
      hasWebGLFallback: allResults.some(r => 
        r.dragonTests && 
        (r.dragonTests.traditionalRenderer.present || r.dragonTests.fallbackRenderer.present)
      ),
      errorCount: allResults.reduce((sum, r) => sum + (r.pageErrors?.length || 0), 0)
    }
  };
  
  // Save detailed report
  const reportPath = path.join(OUTPUT_DIR, `webgl-fallback-test-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(summaryReport, null, 2));
  
  // Save human-readable summary
  const summaryPath = path.join(OUTPUT_DIR, `webgl-fallback-summary-${Date.now()}.txt`);
  const summaryText = `
WebGL Fallback System Test Results
=====================================

Test Run: ${summaryReport.testRun.timestamp}
Test URL: ${TEST_URL}

Overall Status: ${summaryReport.summary.overallSuccess ? '✅ PASSED' : '❌ FAILED'}
WebGL Fallback Working: ${summaryReport.summary.hasWebGLFallback ? '✅ YES' : '❌ NO'}

Test Results:
${allResults.map(r => `
  ${r.scenario}: ${r.success ? '✅ PASSED' : '❌ FAILED'}
  Description: ${r.description}
  Load Time: ${r.loadTime || 'N/A'}ms
  Dragons Rendered: ${r.dragonTests ? 
    `Traditional=${r.dragonTests.traditionalRenderer.present}, Fallback=${r.dragonTests.fallbackRenderer.present}` : 
    'Unknown'
  }
  Errors: ${r.pageErrors?.length || r.error ? (r.pageErrors?.length || 1) : 0}
`).join('')}

Summary:
- Total Tests: ${summaryReport.testRun.totalTests}
- Successful: ${summaryReport.testRun.successfulTests}
- Failed: ${summaryReport.testRun.failedTests}
- Total Errors: ${summaryReport.summary.errorCount}

Detailed report: ${reportPath}
  `.trim();
  
  fs.writeFileSync(summaryPath, summaryText);
  
  // Console output
  console.log('\n📋 TEST SUMMARY');
  console.log('================');
  console.log(summaryText);
  
  // Exit with appropriate code
  process.exit(summaryReport.summary.overallSuccess ? 0 : 1);
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  runTestScenario,
  testScenarios
};