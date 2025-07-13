#!/usr/bin/env node

const puppeteer = require('puppeteer');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  CONTAINER_NAME: 'seiron-frontend-test',
  IMAGE_NAME: 'seiron-frontend:test',
  APP_PORT: 3000,
  TEST_TIMEOUT: 120000, // 2 minutes
  PUPPETEER_TIMEOUT: 30000,
  LOG_FILE: 'docker-model-loading-test.log'
};

class DockerModelTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.containerProcess = null;
    this.logs = [];
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    console.log(logEntry);
    this.logs.push(logEntry);
  }

  async cleanup() {
    this.log('Starting cleanup process...');
    
    try {
      if (this.page) {
        await this.page.close();
        this.log('Browser page closed');
      }
    } catch (error) {
      this.log(`Error closing page: ${error.message}`, 'WARN');
    }

    try {
      if (this.browser) {
        await this.browser.close();
        this.log('Browser closed');
      }
    } catch (error) {
      this.log(`Error closing browser: ${error.message}`, 'WARN');
    }

    try {
      // Stop and remove container
      execSync(`docker stop ${CONFIG.CONTAINER_NAME} || true`, { stdio: 'pipe' });
      execSync(`docker rm ${CONFIG.CONTAINER_NAME} || true`, { stdio: 'pipe' });
      this.log('Docker container stopped and removed');
    } catch (error) {
      this.log(`Error stopping container: ${error.message}`, 'WARN');
    }

    // Write logs to file
    try {
      fs.writeFileSync(CONFIG.LOG_FILE, this.logs.join('\n'));
      this.log(`Logs written to ${CONFIG.LOG_FILE}`);
    } catch (error) {
      this.log(`Error writing logs: ${error.message}`, 'ERROR');
    }
  }

  async buildDockerImage() {
    this.log('Building Docker image...');
    try {
      execSync(`docker build -t ${CONFIG.IMAGE_NAME} .`, {
        stdio: 'pipe',
        cwd: process.cwd()
      });
      this.log('Docker image built successfully');
    } catch (error) {
      throw new Error(`Failed to build Docker image: ${error.message}`);
    }
  }

  async startContainer() {
    this.log('Starting Docker container...');
    
    // Stop existing container if running
    try {
      execSync(`docker stop ${CONFIG.CONTAINER_NAME} || true`, { stdio: 'pipe' });
      execSync(`docker rm ${CONFIG.CONTAINER_NAME} || true`, { stdio: 'pipe' });
    } catch (error) {
      // Ignore errors for non-existent containers
    }

    // Start new container
    try {
      const containerCmd = [
        'docker', 'run',
        '--name', CONFIG.CONTAINER_NAME,
        '-p', `${CONFIG.APP_PORT}:3000`,
        '-d',
        CONFIG.IMAGE_NAME
      ];

      execSync(containerCmd.join(' '), { stdio: 'pipe' });
      this.log(`Container started and mapped to port ${CONFIG.APP_PORT}`);

      // Wait for container to be ready
      await this.waitForContainer();
    } catch (error) {
      throw new Error(`Failed to start container: ${error.message}`);
    }
  }

  async waitForContainer() {
    this.log('Waiting for container to be ready...');
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`http://localhost:${CONFIG.APP_PORT}`);
        if (response.ok) {
          this.log('Container is ready and responding');
          return;
        }
      } catch (error) {
        // Container not ready yet
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
      this.log(`Waiting for container... (attempt ${attempts}/${maxAttempts})`);
    }

    throw new Error('Container failed to become ready within timeout period');
  }

  async setupPuppeteer() {
    this.log('Setting up Puppeteer...');
    
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Set viewport
    await this.page.setViewport({ width: 1920, height: 1080 });

    // Collect console logs
    this.page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      this.log(`BROWSER-${type.toUpperCase()}: ${text}`);
    });

    // Collect network failures
    this.page.on('requestfailed', (request) => {
      this.log(`NETWORK-FAILED: ${request.method()} ${request.url()} - ${request.failure().errorText}`, 'ERROR');
    });

    // Collect unhandled errors
    this.page.on('pageerror', (error) => {
      this.log(`PAGE-ERROR: ${error.message}`, 'ERROR');
    });

    this.log('Puppeteer setup complete');
  }

  async navigateAndTestModels() {
    this.log('Navigating to application...');
    
    try {
      // Navigate to the main page
      await this.page.goto(`http://localhost:${CONFIG.APP_PORT}`, {
        waitUntil: 'networkidle0',
        timeout: CONFIG.PUPPETEER_TIMEOUT
      });

      this.log('Successfully navigated to application');

      // Wait a bit for initial load
      await this.page.waitForTimeout(3000);

      // Check if there are any immediate model loading attempts
      await this.checkNetworkRequests();

      // Try to trigger the summon button if it exists
      await this.triggerSummonFlow();

      // Wait for model loading attempts
      await this.page.waitForTimeout(10000);

      // Check for model files in network
      await this.checkModelFiles();

      // Take a screenshot for debugging
      await this.page.screenshot({ 
        path: 'docker-test-screenshot.png',
        fullPage: true 
      });
      this.log('Screenshot saved as docker-test-screenshot.png');

    } catch (error) {
      this.log(`Error during navigation and testing: ${error.message}`, 'ERROR');
      
      // Take error screenshot
      try {
        await this.page.screenshot({ 
          path: 'docker-test-error-screenshot.png',
          fullPage: true 
        });
        this.log('Error screenshot saved as docker-test-error-screenshot.png');
      } catch (screenshotError) {
        this.log(`Failed to take error screenshot: ${screenshotError.message}`, 'ERROR');
      }
    }
  }

  async checkNetworkRequests() {
    this.log('Checking initial network requests...');
    
    // Enable request interception to monitor model requests
    await this.page.setRequestInterception(true);
    
    this.page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/models/') || url.includes('.glb') || url.includes('.gltf')) {
        this.log(`MODEL-REQUEST: ${request.method()} ${url}`);
      }
      request.continue();
    });

    this.page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/models/') || url.includes('.glb') || url.includes('.gltf')) {
        this.log(`MODEL-RESPONSE: ${response.status()} ${url}`);
        if (!response.ok()) {
          this.log(`MODEL-ERROR: ${response.status()} ${response.statusText()} for ${url}`, 'ERROR');
        }
      }
    });
  }

  async triggerSummonFlow() {
    this.log('Looking for summon button...');
    
    try {
      // Wait for any summon-related buttons
      const summonSelectors = [
        'button[data-testid="summon-button"]',
        'button:has-text("Summon")',
        '.summon-button',
        '[class*="summon"]',
        'button:has-text("SUMMON")',
        'button[aria-label*="summon"]'
      ];

      for (const selector of summonSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          this.log(`Found summon button with selector: ${selector}`);
          
          await this.page.click(selector);
          this.log('Clicked summon button');
          
          // Wait for any animations or loading
          await this.page.waitForTimeout(5000);
          return;
        } catch (error) {
          // Try next selector
        }
      }

      this.log('No summon button found, checking for any interactive elements...');

      // Try to find any clickable elements that might trigger the dragon
      const buttons = await this.page.$$('button');
      this.log(`Found ${buttons.length} buttons on page`);
      
      for (let i = 0; i < Math.min(buttons.length, 5); i++) {
        try {
          const button = buttons[i];
          const text = await button.evaluate(el => el.textContent?.toLowerCase() || '');
          const classes = await button.evaluate(el => el.className || '');
          
          this.log(`Button ${i}: "${text}" (classes: ${classes})`);
          
          if (text.includes('summon') || text.includes('dragon') || classes.includes('summon')) {
            await button.click();
            this.log(`Clicked button ${i}: "${text}"`);
            await this.page.waitForTimeout(3000);
            break;
          }
        } catch (error) {
          this.log(`Error clicking button ${i}: ${error.message}`, 'WARN');
        }
      }
    } catch (error) {
      this.log(`Error in summon flow: ${error.message}`, 'WARN');
    }
  }

  async checkModelFiles() {
    this.log('Checking model file accessibility...');
    
    const modelFiles = [
      '/models/dragon_head_optimized.glb',
      '/models/seiron_head.glb',
      '/models/dragon_head.glb',
      '/models/seiron.glb'
    ];

    for (const modelPath of modelFiles) {
      try {
        const response = await this.page.goto(`http://localhost:${CONFIG.APP_PORT}${modelPath}`, {
          timeout: 10000
        });
        
        if (response) {
          this.log(`MODEL-FILE ${modelPath}: ${response.status()} ${response.statusText()}`);
          if (response.ok()) {
            const contentLength = response.headers()['content-length'];
            this.log(`MODEL-FILE ${modelPath}: Size ${contentLength} bytes`);
          }
        } else {
          this.log(`MODEL-FILE ${modelPath}: No response received`, 'ERROR');
        }
      } catch (error) {
        this.log(`MODEL-FILE ${modelPath}: Error - ${error.message}`, 'ERROR');
      }
    }

    // Go back to main page
    await this.page.goto(`http://localhost:${CONFIG.APP_PORT}`, {
      waitUntil: 'networkidle0',
      timeout: CONFIG.PUPPETEER_TIMEOUT
    });
  }

  async run() {
    this.log('Starting Docker model loading test...');
    
    try {
      // Build and start container
      await this.buildDockerImage();
      await this.startContainer();
      
      // Setup browser
      await this.setupPuppeteer();
      
      // Test model loading
      await this.navigateAndTestModels();
      
      this.log('Test completed successfully');
      
    } catch (error) {
      this.log(`Test failed: ${error.message}`, 'ERROR');
      process.exitCode = 1;
    } finally {
      await this.cleanup();
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, cleaning up...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, cleaning up...');
  process.exit(0);
});

// Run the test
if (require.main === module) {
  const tester = new DockerModelTester();
  tester.run().catch(error => {
    console.error('Unhandled error:', error);
    process.exitCode = 1;
  });
}

module.exports = DockerModelTester;