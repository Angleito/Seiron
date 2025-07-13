#!/usr/bin/env node

const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const fs = require('fs');

class LocalModelTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.devServer = null;
    this.logs = [];
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    console.log(logEntry);
    this.logs.push(logEntry);
  }

  async cleanup() {
    this.log('Cleaning up...');
    
    try {
      if (this.page) await this.page.close();
      if (this.browser) await this.browser.close();
    } catch (error) {
      this.log(`Browser cleanup error: ${error.message}`, 'WARN');
    }

    try {
      if (this.devServer) {
        this.devServer.kill('SIGTERM');
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (!this.devServer.killed) {
          this.devServer.kill('SIGKILL');
        }
        this.log('Dev server stopped');
      }
    } catch (error) {
      this.log(`Server cleanup error: ${error.message}`, 'WARN');
    }

    // Write logs
    try {
      fs.writeFileSync('local-model-test.log', this.logs.join('\n'));
      this.log('Logs written to local-model-test.log');
    } catch (error) {
      this.log(`Log write error: ${error.message}`, 'ERROR');
    }
  }

  async startDevServer() {
    this.log('Starting local dev server...');
    
    return new Promise((resolve, reject) => {
      this.devServer = spawn('npm', ['run', 'dev'], {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let serverReady = false;
      const timeout = setTimeout(() => {
        if (!serverReady) {
          reject(new Error('Dev server startup timeout'));
        }
      }, 60000);

      this.devServer.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Local:') || output.includes('localhost:5173')) {
          serverReady = true;
          clearTimeout(timeout);
          this.log('Dev server is ready');
          resolve();
        }
      });

      this.devServer.stderr.on('data', (data) => {
        const error = data.toString();
        this.log(`Server stderr: ${error}`, 'WARN');
      });

      this.devServer.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Dev server error: ${error.message}`));
      });
    });
  }

  async setupPuppeteer() {
    this.log('Setting up Puppeteer...');
    
    this.browser = await puppeteer.launch({
      headless: false, // Run in non-headless mode to see what's happening
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      devtools: true
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });

    // Enhanced logging for model-related activity
    this.page.on('console', (msg) => {
      const text = msg.text();
      const type = msg.type();
      
      // Log all console messages related to models, dragons, GLB, or errors
      if (text.includes('dragon') || text.includes('model') || text.includes('glb') || 
          text.includes('GLB') || text.includes('Failed') || text.includes('Error') ||
          text.includes('Loading') || type === 'error') {
        this.log(`BROWSER-${type.toUpperCase()}: ${text}`);
      }
    });

    // Monitor network requests for model files
    this.page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/models/') || url.includes('.glb') || url.includes('.gltf') || url.includes('.bin')) {
        this.log(`REQUEST: ${request.method()} ${url}`);
      }
    });

    this.page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/models/') || url.includes('.glb') || url.includes('.gltf') || url.includes('.bin')) {
        const status = response.status();
        const size = response.headers()['content-length'] || 'unknown';
        this.log(`RESPONSE: ${status} ${url} (${size} bytes)`);
        
        if (!response.ok()) {
          this.log(`RESPONSE-ERROR: ${status} ${response.statusText()} for ${url}`, 'ERROR');
        }
      }
    });

    this.page.on('requestfailed', (request) => {
      const url = request.url();
      if (url.includes('/models/') || url.includes('.glb') || url.includes('.gltf') || url.includes('.bin')) {
        this.log(`REQUEST-FAILED: ${url} - ${request.failure().errorText}`, 'ERROR');
      }
    });

    this.log('Puppeteer setup complete');
  }

  async testModelAccess() {
    this.log('Testing direct model file access...');
    
    const modelFiles = [
      'dragon_head_optimized.glb',
      'seiron_head.glb', 
      'dragon_head.glb',
      'seiron.glb'
    ];

    for (const filename of modelFiles) {
      try {
        const url = `http://localhost:5173/models/${filename}`;
        const response = await this.page.goto(url, { timeout: 10000 });
        
        if (response) {
          const status = response.status();
          const size = response.headers()['content-length'] || 'unknown';
          this.log(`DIRECT-ACCESS ${filename}: ${status} (${size} bytes)`);
        }
      } catch (error) {
        this.log(`DIRECT-ACCESS ${filename}: ERROR - ${error.message}`, 'ERROR');
      }
    }
  }

  async testHomePage() {
    this.log('Testing home page and model loading...');
    
    try {
      // Navigate to home page
      await this.page.goto('http://localhost:5173', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      this.log('Navigated to home page');

      // Wait for initial page load
      await this.page.waitForTimeout(5000);

      // Look for any buttons or elements that might trigger model loading
      const buttons = await this.page.$$('button');
      this.log(`Found ${buttons.length} buttons on page`);

      // Check for canvas elements (Three.js)
      const canvases = await this.page.$$('canvas');
      this.log(`Found ${canvases.length} canvas elements`);

      // Try to find and click summon button
      const summonSelectors = [
        'button:has-text("Summon")',
        'button:has-text("SUMMON")',
        '[class*="summon"]',
        'button[data-testid*="summon"]'
      ];

      for (const selector of summonSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            this.log(`Found summon element: ${selector}`);
            await element.click();
            this.log('Clicked summon element');
            await this.page.waitForTimeout(5000);
            break;
          }
        } catch (error) {
          // Try next selector
        }
      }

      // If no specific summon button, try clicking any buttons that might trigger dragon
      if (buttons.length > 0) {
        for (let i = 0; i < Math.min(buttons.length, 3); i++) {
          try {
            const button = buttons[i];
            const text = await button.evaluate(el => el.textContent || '');
            const className = await button.evaluate(el => el.className || '');
            
            this.log(`Button ${i}: "${text}" (class: ${className})`);
            
            if (text.toLowerCase().includes('summon') || 
                text.toLowerCase().includes('dragon') ||
                className.includes('summon')) {
              await button.click();
              this.log(`Clicked button: "${text}"`);
              await this.page.waitForTimeout(3000);
            }
          } catch (error) {
            this.log(`Error with button ${i}: ${error.message}`, 'WARN');
          }
        }
      }

      // Execute manual model loading test in browser
      await this.page.evaluate(() => {
        console.log('=== MANUAL MODEL LOADING TEST ===');
        
        // Check if THREE.js is available
        if (typeof window.THREE !== 'undefined') {
          console.log('✅ THREE.js is available');
          
          try {
            const loader = new window.THREE.GLTFLoader();
            console.log('✅ GLTFLoader created');
            
            // Test loading dragon_head_optimized.glb
            loader.load(
              '/models/dragon_head_optimized.glb',
              (gltf) => {
                console.log('✅ dragon_head_optimized.glb loaded successfully:', gltf);
                console.log('Model scene:', gltf.scene);
                console.log('Model animations:', gltf.animations);
              },
              (progress) => {
                console.log('📊 Loading progress:', Math.round((progress.loaded / progress.total) * 100) + '%');
              },
              (error) => {
                console.log('❌ Failed to load dragon_head_optimized.glb:', error);
              }
            );
          } catch (error) {
            console.log('❌ Error creating GLTFLoader:', error);
          }
        } else {
          console.log('❌ THREE.js is not available in window scope');
        }
      });

      // Wait for model loading attempts
      await this.page.waitForTimeout(15000);

      // Take final screenshot
      await this.page.screenshot({ 
        path: 'local-test-final.png',
        fullPage: true 
      });
      this.log('Final screenshot saved as local-test-final.png');

    } catch (error) {
      this.log(`Home page test error: ${error.message}`, 'ERROR');
      
      try {
        await this.page.screenshot({ 
          path: 'local-test-error.png',
          fullPage: true 
        });
        this.log('Error screenshot saved');
      } catch (screenshotError) {
        this.log(`Screenshot error: ${screenshotError.message}`, 'ERROR');
      }
    }
  }

  async run() {
    try {
      await this.startDevServer();
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for server to fully start
      await this.setupPuppeteer();
      await this.testModelAccess();
      await this.testHomePage();
      this.log('✅ Test completed successfully');
    } catch (error) {
      this.log(`❌ Test failed: ${error.message}`, 'ERROR');
      process.exitCode = 1;
    } finally {
      await this.cleanup();
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, shutting down...');
  process.exit(0);
});

// Run the test
const tester = new LocalModelTester();
tester.run().catch(console.error);