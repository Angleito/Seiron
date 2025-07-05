import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for Dragon component testing
 * Covers cross-browser and mobile device testing
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/playwright-report.json' }],
    ['junit', { outputFile: 'test-results/playwright-junit.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile devices
    {
      name: 'mobile-iPhone-12',
      use: { ...devices['iPhone 12'] },
      testMatch: '**/mobile/*.spec.ts',
    },
    {
      name: 'mobile-iPad',
      use: { ...devices['iPad Pro'] },
      testMatch: '**/mobile/*.spec.ts',
    },
    {
      name: 'mobile-Samsung-Galaxy-S21',
      use: { ...devices['Galaxy S21'] },
      testMatch: '**/mobile/*.spec.ts',
    },

    // High DPI displays
    {
      name: 'high-dpi',
      use: {
        ...devices['Desktop Chrome'],
        deviceScaleFactor: 2,
      },
      testMatch: '**/visual/*.spec.ts',
    },

    // Accessibility testing with specific settings
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        // reducedMotion: 'reduce',
        // Use valid Playwright context options
        colorScheme: 'dark',
      },
      testMatch: '**/accessibility/*.spec.ts',
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})