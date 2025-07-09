#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Configuration
// Use deployed site by default, or override with BASE_URL env var
const BASE_URL = process.env.BASE_URL || 'https://seiron.vercel.app';
const CHAT_URL = `${BASE_URL}/chat`;
const TIMEOUT = 30000; // 30 seconds

// Diagnostic report
const report = {
  timestamp: new Date().toISOString(),
  url: CHAT_URL,
  tests: [],
  errors: [],
  warnings: [],
  networkRequests: [],
  consoleMessages: [],
  screenshots: [],
  summary: {
    totalTests: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  }
};

// Helper to add test results
function addTest(name, status, details = {}) {
  const test = {
    name,
    status,
    timestamp: new Date().toISOString(),
    ...details
  };
  report.tests.push(test);
  report.summary.totalTests++;
  if (status === 'passed') report.summary.passed++;
  else if (status === 'failed') report.summary.failed++;
  console.log(`[${status.toUpperCase()}] ${name}`);
  if (details.error) console.error(`  Error: ${details.error}`);
}

// Helper to capture screenshot
async function captureScreenshot(page, name) {
  try {
    const timestamp = Date.now();
    const filename = `screenshot-${name.replace(/[^a-z0-9]/gi, '-')}-${timestamp}.png`;
    const filepath = path.join(__dirname, '..', 'diagnostic-screenshots', filename);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    
    await page.screenshot({ 
      path: filepath, 
      fullPage: true 
    });
    
    report.screenshots.push({
      name,
      filename,
      filepath,
      timestamp: new Date().toISOString()
    });
    
    console.log(`  Screenshot saved: ${filename}`);
    return filepath;
  } catch (error) {
    console.error(`  Failed to capture screenshot: ${error.message}`);
    return null;
  }
}

// Main diagnostic function
async function runDiagnostics() {
  console.log('🐉 Seiron Chat Diagnostics Starting...\n');
  console.log(`Target URL: ${CHAT_URL}`);
  console.log(`Timestamp: ${report.timestamp}`);
  console.log('\nNote: To test locally, run:');
  console.log('  1. cd frontend && npm run dev');
  console.log('  2. BASE_URL=http://localhost:5173 node scripts/diagnose-chat.js\n');
  
  let browser;
  
  try {
    // Launch browser
    console.log('Launching Puppeteer...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    // Set up console logging
    page.on('console', msg => {
      const logEntry = {
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      };
      report.consoleMessages.push(logEntry);
      
      if (msg.type() === 'error') {
        report.errors.push(logEntry);
        console.error(`  Console Error: ${msg.text()}`);
      } else if (msg.type() === 'warning') {
        report.warnings.push(logEntry);
        report.summary.warnings++;
      }
    });
    
    // Set up request interception
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/') || url.includes('chat')) {
        report.networkRequests.push({
          url,
          method: request.method(),
          timestamp: new Date().toISOString(),
          type: 'request'
        });
      }
    });
    
    // Set up response logging
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/') || url.includes('chat')) {
        report.networkRequests.push({
          url,
          method: response.request().method(),
          status: response.status(),
          statusText: response.statusText(),
          timestamp: new Date().toISOString(),
          type: 'response'
        });
        
        // Log API errors
        if (response.status() >= 400) {
          const error = `API Error: ${response.status()} ${response.statusText()} - ${url}`;
          report.errors.push({
            type: 'api_error',
            text: error,
            timestamp: new Date().toISOString()
          });
          console.error(`  ${error}`);
        }
      }
    });
    
    // Test 1: Navigate to chat page
    console.log('\n📍 Test 1: Navigating to chat page...');
    try {
      await page.goto(CHAT_URL, { 
        waitUntil: 'networkidle2',
        timeout: TIMEOUT 
      });
      addTest('Navigate to chat page', 'passed');
      await captureScreenshot(page, 'initial-load');
    } catch (error) {
      addTest('Navigate to chat page', 'failed', { error: error.message });
      await captureScreenshot(page, 'navigation-error');
      throw error;
    }
    
    // Test 2: Check for interface toggle buttons
    console.log('\n🔘 Test 2: Checking interface toggle buttons...');
    try {
      const voiceButton = await page.$x('//button[contains(text(), "AI Voice")]');
      const minimalButton = await page.$x('//button[contains(text(), "Minimal")]');
      
      if (voiceButton.length > 0 && minimalButton.length > 0) {
        addTest('Interface toggle buttons', 'passed', {
          found: ['Voice', 'Minimal']
        });
      } else {
        addTest('Interface toggle buttons', 'failed', {
          error: 'Some buttons missing',
          voiceButton: voiceButton.length > 0,
          minimalButton: minimalButton.length > 0
        });
      }
    } catch (error) {
      addTest('Interface toggle buttons', 'failed', { error: error.message });
    }
    
    // Test 3: Test each interface mode
    const modes = [
      { name: 'Minimal', buttonText: 'Minimal' },
      { name: 'Voice', buttonText: 'AI Voice' }
    ];
    
    for (const mode of modes) {
      console.log(`\n🎮 Test 3.${modes.indexOf(mode) + 1}: Testing ${mode.name} interface...`);
      
      try {
        // Click mode button
        const [button] = await page.$x(`//button[contains(text(), "${mode.buttonText}")]`);
        if (button) {
          await button.click();
          await page.waitForTimeout(2000); // Wait for interface to load
          
          // Check if interface loaded
          let interfaceLoaded = false;
          
          if (mode.name === 'Voice') {
            // Check for voice disabled message
            const [voiceDisabled] = await page.$x('//text()[contains(translate(., "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "voice chat temporarily disabled")]');
            if (voiceDisabled) {
              addTest(`${mode.name} interface load`, 'passed', {
                note: 'Voice interface shows disabled message'
              });
              interfaceLoaded = true;
            }
          } else {
            // Check for chat input
            const chatInput = await page.$('textarea[placeholder*="Seiron"], input[placeholder*="message"]');
            if (chatInput) {
              addTest(`${mode.name} interface load`, 'passed');
              interfaceLoaded = true;
            }
          }
          
          if (!interfaceLoaded) {
            addTest(`${mode.name} interface load`, 'failed', {
              error: 'Interface elements not found'
            });
          }
          
          await captureScreenshot(page, `${mode.name.toLowerCase()}-interface`);
        } else {
          addTest(`${mode.name} interface load`, 'failed', {
            error: 'Mode button not found'
          });
        }
      } catch (error) {
        addTest(`${mode.name} interface load`, 'failed', { error: error.message });
      }
    }
    
    // Test 4: Test sending a message (on Minimal interface)
    console.log('\n💬 Test 4: Testing message sending...');
    try {
      // Switch to Minimal interface
      const [minimalButton] = await page.$x('//button[contains(text(), "Minimal")]');
      if (minimalButton) {
        await minimalButton.click();
        await page.waitForTimeout(2000);
        
        // Find chat input
        const chatInput = await page.$('textarea[placeholder*="Seiron"], textarea[placeholder*="message"]');
        // Find send button - look for button containing SVG with data-lucide="send" or similar send icon
        const sendButton = await page.$('button[type="submit"]') || 
                          await page.$('button[aria-label*="send" i]') ||
                          await page.$('button[aria-label*="submit" i]');
        
        if (chatInput && sendButton) {
          // Type test message
          const testMessage = 'Hello Seiron, this is a diagnostic test message.';
          await chatInput.type(testMessage);
          
          // Capture before sending
          await captureScreenshot(page, 'before-send-message');
          
          // Set up response promise before clicking
          const responsePromise = page.waitForResponse(
            response => response.url().includes('/api/chat/') && response.status() < 400,
            { timeout: 15000 }
          ).catch(() => null);
          
          // Click send
          await sendButton.click();
          
          // Wait for response
          const response = await responsePromise;
          
          if (response) {
            addTest('Send message', 'passed', {
              endpoint: response.url(),
              status: response.status()
            });
            
            // Wait for AI response to appear
            await page.waitForTimeout(3000);
            await captureScreenshot(page, 'after-response');
          } else {
            addTest('Send message', 'failed', {
              error: 'No API response received within timeout'
            });
            await captureScreenshot(page, 'no-response');
          }
        } else {
          addTest('Send message', 'failed', {
            error: 'Chat input or send button not found'
          });
        }
      }
    } catch (error) {
      addTest('Send message', 'failed', { error: error.message });
      await captureScreenshot(page, 'send-error');
    }
    
    // Test 5: Check for errors and warnings
    console.log('\n⚠️  Test 5: Checking for errors and warnings...');
    if (report.errors.length === 0) {
      addTest('No JavaScript errors', 'passed');
    } else {
      addTest('No JavaScript errors', 'failed', {
        errorCount: report.errors.length,
        errors: report.errors.slice(0, 5) // First 5 errors
      });
    }
    
    // Test 6: Check network requests
    console.log('\n🌐 Test 6: Analyzing network requests...');
    const apiRequests = report.networkRequests.filter(req => req.type === 'response' && req.url.includes('/api/'));
    const failedRequests = apiRequests.filter(req => req.status >= 400);
    
    if (failedRequests.length === 0) {
      addTest('API requests', 'passed', {
        totalRequests: apiRequests.length
      });
    } else {
      addTest('API requests', 'failed', {
        totalRequests: apiRequests.length,
        failedRequests: failedRequests.length,
        failures: failedRequests
      });
    }
    
    // Test 7: Check for rate limiting
    console.log('\n🚦 Test 7: Checking for rate limiting...');
    const rateLimitedRequests = apiRequests.filter(req => req.status === 429);
    if (rateLimitedRequests.length > 0) {
      addTest('Rate limiting', 'warning', {
        rateLimitedCount: rateLimitedRequests.length,
        requests: rateLimitedRequests
      });
      report.summary.warnings++;
    } else {
      addTest('Rate limiting', 'passed', {
        note: 'No rate limit errors detected'
      });
    }
    
    // Test 8: Check CORS
    console.log('\n🔒 Test 8: Checking CORS configuration...');
    const corsErrors = report.consoleMessages.filter(msg => 
      msg.text.toLowerCase().includes('cors') || 
      msg.text.toLowerCase().includes('cross-origin')
    );
    
    if (corsErrors.length === 0) {
      addTest('CORS configuration', 'passed');
    } else {
      addTest('CORS configuration', 'failed', {
        corsErrorCount: corsErrors.length,
        errors: corsErrors
      });
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error during diagnostics:', error);
    report.errors.push({
      type: 'fatal',
      text: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // Generate report
  console.log('\n📊 Generating diagnostic report...\n');
  
  // Summary
  console.log('=== SUMMARY ===');
  console.log(`Total Tests: ${report.summary.totalTests}`);
  console.log(`Passed: ${report.summary.passed} (${Math.round(report.summary.passed / report.summary.totalTests * 100)}%)`);
  console.log(`Failed: ${report.summary.failed} (${Math.round(report.summary.failed / report.summary.totalTests * 100)}%)`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Console Errors: ${report.errors.filter(e => e.type !== 'fatal').length}`);
  console.log(`Screenshots Captured: ${report.screenshots.length}`);
  
  // Key findings
  console.log('\n=== KEY FINDINGS ===');
  
  if (report.summary.failed > 0) {
    console.log('\n❌ Failed Tests:');
    report.tests.filter(t => t.status === 'failed').forEach(test => {
      console.log(`  - ${test.name}: ${test.error || 'Unknown error'}`);
    });
  }
  
  if (report.errors.length > 0) {
    console.log('\n⚠️  Console Errors:');
    report.errors.slice(0, 5).forEach(error => {
      console.log(`  - ${error.text}`);
    });
    if (report.errors.length > 5) {
      console.log(`  ... and ${report.errors.length - 5} more`);
    }
  }
  
  // API analysis
  const apiResponses = report.networkRequests.filter(r => r.type === 'response' && r.url.includes('/api/'));
  if (apiResponses.length > 0) {
    console.log('\n🌐 API Endpoints Called:');
    const endpoints = [...new Set(apiResponses.map(r => {
      const url = new URL(r.url);
      return url.pathname;
    }))];
    endpoints.forEach(endpoint => {
      const requests = apiResponses.filter(r => r.url.includes(endpoint));
      const failed = requests.filter(r => r.status >= 400);
      console.log(`  - ${endpoint}: ${requests.length} requests (${failed.length} failed)`);
    });
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (report.summary.failed > 0) {
    console.log('  1. Fix failing tests before deployment');
  }
  
  if (report.errors.length > 0) {
    console.log('  2. Resolve JavaScript console errors');
  }
  
  const voiceTest = report.tests.find(t => t.name.includes('Voice interface'));
  if (voiceTest && voiceTest.note && voiceTest.note.includes('disabled')) {
    console.log('  3. Voice interface is currently disabled - investigate and re-enable');
  }
  
  if (apiResponses.filter(r => r.status >= 500).length > 0) {
    console.log('  4. Server errors detected - check backend logs');
  }
  
  if (report.networkRequests.filter(r => r.status === 429).length > 0) {
    console.log('  5. Rate limiting triggered - consider adjusting limits or implementing better client-side throttling');
  }
  
  // Save full report
  const reportPath = path.join(__dirname, '..', `chat-diagnostic-report-${Date.now()}.json`);
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Full report saved to: ${reportPath}`);
  
  // Exit with appropriate code
  const exitCode = report.summary.failed > 0 ? 1 : 0;
  console.log(`\n🏁 Diagnostics complete. Exit code: ${exitCode}`);
  process.exit(exitCode);
}

// Run diagnostics
runDiagnostics().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});