#!/usr/bin/env node

const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

async function testModelLoading() {
  let browser, page, devServer;
  
  try {
    console.log('🚀 Starting Vite dev server...');
    
    // Start dev server
    devServer = spawn('npm', ['run', 'dev'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Wait for server to be ready
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Server timeout')), 30000);
      
      devServer.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('Server output:', output);
        if (output.includes('Local:')) {
          clearTimeout(timeout);
          resolve();
        }
      });
      
      devServer.stderr.on('data', (data) => {
        console.error('Server error:', data.toString());
      });
    });

    console.log('✅ Dev server ready');
    
    // Start browser
    console.log('🌐 Starting browser...');
    browser = await puppeteer.launch({ 
      headless: false,
      devtools: true 
    });
    
    page = await browser.newPage();
    
    // Monitor all console messages
    page.on('console', msg => {
      console.log(`🖥️  BROWSER ${msg.type()}: ${msg.text()}`);
    });
    
    // Monitor network requests for models
    page.on('request', req => {
      const url = req.url();
      if (url.includes('.glb') || url.includes('/models/')) {
        console.log(`📤 REQUEST: ${req.method()} ${url}`);
      }
    });
    
    page.on('response', res => {
      const url = res.url();
      if (url.includes('.glb') || url.includes('/models/')) {
        console.log(`📥 RESPONSE: ${res.status()} ${url}`);
      }
    });
    
    page.on('requestfailed', req => {
      const url = req.url();
      if (url.includes('.glb') || url.includes('/models/')) {
        console.log(`❌ FAILED: ${url} - ${req.failure().errorText}`);
      }
    });

    // Navigate to app
    console.log('🏠 Navigating to app...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    console.log('✅ Page loaded');
    
    // Test direct model access
    console.log('🧪 Testing direct model access...');
    const models = [
      '/models/dragon_head_optimized.glb',
      '/models/seiron_head.glb'
    ];
    
    for (const model of models) {
      try {
        const response = await page.goto(`http://localhost:3000${model}`);
        console.log(`📦 ${model}: ${response.status()} (${response.headers()['content-length'] || '?'} bytes)`);
      } catch (error) {
        console.log(`❌ ${model}: ${error.message}`);
      }
    }
    
    // Go back to main page
    await page.goto('http://localhost:3000');
    
    // Wait and observe for 30 seconds
    console.log('👀 Observing for 30 seconds...');
    await page.waitForTimeout(30000);
    
    console.log('✅ Test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
    if (devServer) {
      devServer.kill('SIGTERM');
      setTimeout(() => devServer.kill('SIGKILL'), 5000);
    }
  }
}

testModelLoading().catch(console.error);