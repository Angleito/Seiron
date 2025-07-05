import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    // Base URL for the application
    baseUrl: 'http://localhost:3000',
    
    // Viewport settings
    viewportWidth: 1280,
    viewportHeight: 720,
    
    // Video recording settings
    video: true,
    videoCompression: 32,
    videosFolder: 'cypress/videos',
    
    // Screenshot settings
    screenshotOnRunFailure: true,
    screenshotsFolder: 'cypress/screenshots',
    
    // Test file patterns
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    
    // Timeouts
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,
    
    // Retry settings
    retries: {
      runMode: 2,
      openMode: 0
    },
    
    // Environment variables
    env: {
      apiUrl: 'http://localhost:3001',
      mswUrl: 'http://localhost:8080',
      testWalletAddress: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9',
      testPrivateKey: 'test-private-key'
    },
    
    // Setup node events
    setupNodeEvents(on, config) {
      // Task to clear test data
      on('task', {
        clearTestData() {
          console.log('Clearing test data...');
          return null;
        },
        
        // Task to seed test data
        seedTestData(data) {
          console.log('Seeding test data:', data);
          return null;
        },
        
        // Task to log to console
        log(message) {
          console.log(message);
          return null;
        }
      });
      
      // Code coverage
      require('@cypress/code-coverage/task')(on, config);
      
      return config;
    }
  },
  
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.ts'
  }
});