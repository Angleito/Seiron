#!/usr/bin/env node

const puppeteer = require('puppeteer');
const { execSync, spawn } = require('child_process');
const fs = require('fs');

// Configuration
const CONFIG = {
  CONTAINER_NAME: 'seiron-frontend-dev-test',
  APP_PORT: 3001, // Use different port to avoid conflicts
  TEST_TIMEOUT: 60000,
  PUPPETEER_TIMEOUT: 20000,
  LOG_FILE: 'docker-dev-model-test.log'
};

class DockerDevTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.logs = [];
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    console.log(logEntry);
    this.logs.push(logEntry);
  }

  async cleanup() {
    this.log('Starting cleanup...');
    
    try {
      if (this.page) await this.page.close();
      if (this.browser) await this.browser.close();
    } catch (error) {
      this.log(`Browser cleanup error: ${error.message}`, 'WARN');
    }

    try {
      execSync(`docker-compose -f docker-compose.dev.yml down`, { stdio: 'pipe' });
      this.log('Docker dev container stopped');
    } catch (error) {
      this.log(`Container cleanup error: ${error.message}`, 'WARN');
    }

    // Write logs
    try {
      fs.writeFileSync(CONFIG.LOG_FILE, this.logs.join('\n'));
      this.log(`Logs written to ${CONFIG.LOG_FILE}`);
    } catch (error) {
      this.log(`Log write error: ${error.message}`, 'ERROR');
    }
  }

  async startDevContainer() {
    this.log('Starting dev container with docker-compose...');
    
    try {
      // Stop any existing dev containers
      execSync(`docker-compose -f docker-compose.dev.yml down`, { stdio: 'pipe' });
    } catch (error) {
      // Ignore errors for non-existent containers
    }

    try {
      // Start dev container in background
      execSync(`docker-compose -f docker-compose.dev.yml up -d`, { 
        stdio: 'pipe',
        timeout: 120000 // 2 minutes timeout for startup
      });
      this.log('Dev container started');

      // Wait for it to be ready
      await this.waitForApp();
    } catch (error) {
      throw new Error(`Failed to start dev container: ${error.message}`);
    }
  }

  async waitForApp() {
    this.log('Waiting for app to be ready...');
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`http://localhost:3000`);
        if (response.ok) {
          this.log('App is ready and responding');
          return;
        }
      } catch (error) {
        // App not ready yet
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
      attempts++;
      this.log(`Waiting for app... (attempt ${attempts}/${maxAttempts})`);
    }

    throw new Error('App failed to become ready');
  }

  async setupPuppeteer() {
    this.log('Setting up Puppeteer...');
    
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 720 });

    // Monitor console and network
    this.page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('dragon') || text.includes('model') || text.includes('glb') || text.includes('GLB')) {
        this.log(`BROWSER: ${msg.type().toUpperCase()}: ${text}`);
      }
    });

    this.page.on('requestfailed', (request) => {
      const url = request.url();
      if (url.includes('model') || url.includes('.glb') || url.includes('.gltf')) {
        this.log(`NETWORK-FAILED: ${request.method()} ${url} - ${request.failure().errorText}`, 'ERROR');
      }
    });

    this.log('Puppeteer ready');
  }

  async testModelLoading() {
    this.log('Testing model loading...');
    
    try {
      // Navigate to app
      await this.page.goto('http://localhost:3000', {
        waitUntil: 'networkidle0',
        timeout: CONFIG.PUPPETEER_TIMEOUT
      });

      this.log('Navigated to app');

      // Wait a bit for any initial model loading
      await this.page.waitForTimeout(5000);

      // Check if dragon_head_optimized.glb is accessible
      const modelTests = [
        '/models/dragon_head_optimized.glb',
        '/models/seiron_head.glb',
        '/models/dragon_head.glb'
      ];

      for (const modelPath of modelTests) {
        try {
          const response = await this.page.goto(`http://localhost:3000${modelPath}`);
          if (response) {
            this.log(`MODEL ${modelPath}: ${response.status()} (${response.headers()['content-length'] || 'unknown'} bytes)`);
          }
        } catch (error) {
          this.log(`MODEL ${modelPath}: ERROR - ${error.message}`, 'ERROR');
        }
      }

      // Go back to main page and look for 3D content
      await this.page.goto('http://localhost:3000');
      await this.page.waitForTimeout(3000);

      // Look for any canvas elements (Three.js)
      const canvases = await this.page.$$('canvas');
      this.log(`Found ${canvases.length} canvas elements`);

      // Take screenshot
      await this.page.screenshot({ path: 'docker-dev-test.png' });
      this.log('Screenshot saved');

      // Check for any Three.js or GLB loading errors in console
      await this.page.evaluate(() => {
        console.log('=== MANUAL MODEL LOADING TEST ===');
        
        // Try to manually load the model if THREE is available
        if (window.THREE) {
          console.log('THREE.js is available');
          const loader = new window.THREE.GLTFLoader();
          loader.load(
            '/models/dragon_head_optimized.glb',
            (gltf) => console.log('✅ Manual model load SUCCESS:', gltf),
            (progress) => console.log('📊 Manual model load progress:', progress),
            (error) => console.log('❌ Manual model load ERROR:', error)
          );
        } else {
          console.log('THREE.js not available in window scope');
        }
      });

      // Wait for manual loading test
      await this.page.waitForTimeout(10000);

    } catch (error) {
      this.log(`Test error: ${error.message}`, 'ERROR');
      await this.page.screenshot({ path: 'docker-dev-error.png' });
    }
  }

  async run() {
    try {
      await this.startDevContainer();
      await this.setupPuppeteer();
      await this.testModelLoading();
      this.log('Test completed');
    } catch (error) {
      this.log(`Test failed: ${error.message}`, 'ERROR');
      process.exitCode = 1;
    } finally {
      await this.cleanup();
    }
  }
}

// Run test
const tester = new DockerDevTester();
tester.run().catch(console.error);