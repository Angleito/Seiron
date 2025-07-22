import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  // Start the development server if needed
  console.log('Starting global setup for E2E tests...')
  
  // Wait for the app to be ready
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  try {
    // Wait for the app to be ready
    await page.goto(config.projects[0].use?.baseURL || 'http://localhost:3000', {
      waitUntil: 'networkidle',
      timeout: 60000,
    })
    
    // Optional: Set up test data or authentication state
    // await setupTestData(page)
    
    console.log('Global setup completed successfully')
  } catch (error) {
    console.error('Global setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }
}

// Optional: Function to set up test data
async function setupTestData(page) {
  // Mock API responses or set up test data
  await page.route('**/api/**', route => {
    const url = route.request().url()
    
    if (url.includes('/api/auth/session')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            walletAddress: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9'
          }
        })
      })
    } else if (url.includes('/api/portfolio')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalValue: 10000,
          positions: [
            { token: 'SEI', amount: 1000, value: 5000 },
            { token: 'USDC', amount: 5000, value: 5000 }
          ]
        })
      })
    } else {
      route.continue()
    }
  })
}

export default globalSetup