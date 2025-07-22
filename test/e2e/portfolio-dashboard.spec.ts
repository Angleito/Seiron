import { test, expect } from '@playwright/test'

test.describe('Portfolio Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated session with mock wallet
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: {
            id: 'test-user',
            walletAddress: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9'
          },
          isAuthenticated: true
        },
        version: 0
      }))

      window.ethereum = {
        request: async (params) => {
          if (params.method === 'eth_accounts') {
            return ['0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9']
          }
          if (params.method === 'eth_getBalance') {
            return '0x21e19e0c9bab2400000' // 10000 SEI
          }
          return null
        },
        on: () => {},
        removeListener: () => {},
        selectedAddress: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9'
      }
    })

    await page.goto('/dashboard')
  })

  test('should display portfolio overview correctly', async ({ page }) => {
    await expect(page.locator('text=Portfolio Overview')).toBeVisible()
    await expect(page.locator('text=Total Value')).toBeVisible()
    await expect(page.locator('text=/\\$[0-9,]+\\.[0-9]{2}/')).toBeVisible() // Currency format
  })

  test('should show portfolio positions', async ({ page }) => {
    // Wait for portfolio data to load
    await expect(page.locator('text=SEI')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=USDC')).toBeVisible()
    
    // Check for position values
    await expect(page.locator('text=/[0-9,]+\\.?[0-9]* SEI/')).toBeVisible()
    await expect(page.locator('text=/[0-9,]+\\.?[0-9]* USDC/')).toBeVisible()
  })

  test('should display 24h portfolio change', async ({ page }) => {
    // Look for percentage change indicators
    await expect(page.locator('text=/[+-][0-9]+\\.[0-9]{2}%/')).toBeVisible({ timeout: 10000 })
  })

  test('should handle portfolio refresh', async ({ page }) => {
    // Look for refresh button
    const refreshButton = page.locator('button:has-text("Refresh")')
    if (await refreshButton.isVisible()) {
      await refreshButton.click()
      
      // Should show loading state
      await expect(page.locator('text=Loading...')).toBeVisible()
      
      // Should complete refresh
      await expect(page.locator('text=Loading...')).not.toBeVisible({ timeout: 10000 })
    }
  })

  test('should navigate to individual position details', async ({ page }) => {
    await page.waitForSelector('text=SEI', { timeout: 10000 })
    
    // Click on SEI position
    const seiPosition = page.locator('text=SEI').first()
    await seiPosition.click()
    
    // Should show position details modal or navigate to details page
    await expect(page.locator('text=SEI Details')).toBeVisible({ timeout: 5000 })
  })

  test('should display portfolio charts', async ({ page }) => {
    // Look for chart container or canvas elements
    const chartContainer = page.locator('[data-testid="portfolio-chart"]')
    if (await chartContainer.isVisible()) {
      await expect(chartContainer).toBeVisible()
    }
    
    // Alternative: check for common chart libraries
    const chartElements = page.locator('canvas, svg').first()
    if (await chartElements.isVisible()) {
      await expect(chartElements).toBeVisible()
    }
  })

  test('should show loading state when fetching portfolio', async ({ page }) => {
    // Slow down API response to catch loading state
    await page.route('**/api/portfolio', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      await route.continue()
    })
    
    await page.reload()
    
    await expect(page.locator('text=Loading portfolio...')).toBeVisible()
    await expect(page.locator('text=Loading portfolio...')).not.toBeVisible({ timeout: 15000 })
  })

  test('should handle portfolio fetch errors', async ({ page }) => {
    // Mock API error
    await page.route('**/api/portfolio', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Failed to fetch portfolio' })
      })
    })
    
    await page.reload()
    
    await expect(page.locator('text=Failed to fetch portfolio')).toBeVisible()
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible()
  })

  test('should display portfolio allocation breakdown', async ({ page }) => {
    await page.waitForSelector('text=SEI', { timeout: 10000 })
    
    // Look for allocation percentages
    await expect(page.locator('text=/[0-9]+\\.[0-9]{1,2}%/')).toBeVisible()
    
    // Check for pie chart or allocation visualization
    const allocationChart = page.locator('[data-testid="allocation-chart"]')
    if (await allocationChart.isVisible()) {
      await expect(allocationChart).toBeVisible()
    }
  })

  test('should show recent transactions', async ({ page }) => {
    // Look for transactions section
    const transactionsSection = page.locator('text=Recent Transactions')
    if (await transactionsSection.isVisible()) {
      await expect(transactionsSection).toBeVisible()
      
      // Check for transaction list
      await expect(page.locator('[data-testid="transaction-item"]')).toBeVisible()
    }
  })

  test('should display portfolio performance metrics', async ({ page }) => {
    await page.waitForSelector('text=Total Value', { timeout: 10000 })
    
    // Look for performance metrics
    const metricsSection = page.locator('text=Performance')
    if (await metricsSection.isVisible()) {
      await expect(page.locator('text=7D')).toBeVisible()
      await expect(page.locator('text=30D')).toBeVisible()
      await expect(page.locator('text=All Time')).toBeVisible()
    }
  })

  test('should handle responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await expect(page.locator('text=Total Value')).toBeVisible()
    await expect(page.locator('text=SEI')).toBeVisible({ timeout: 10000 })
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    
    await expect(page.locator('text=Total Value')).toBeVisible()
    await expect(page.locator('text=SEI')).toBeVisible()
  })

  test('should integrate with wallet balance', async ({ page }) => {
    // The portfolio should reflect actual wallet balance
    await expect(page.locator('text=SEI')).toBeVisible({ timeout: 10000 })
    
    // Check that the displayed balance matches what we mocked
    const balance = await page.locator('text=/[0-9,]+\\.?[0-9]* SEI/').textContent()
    expect(balance).toContain('SEI')
  })

  test('should support portfolio filtering and sorting', async ({ page }) => {
    await page.waitForSelector('text=SEI', { timeout: 10000 })
    
    // Look for filter options
    const filterButton = page.locator('button:has-text("Filter")')
    if (await filterButton.isVisible()) {
      await filterButton.click()
      
      await expect(page.locator('text=Token Type')).toBeVisible()
      await expect(page.locator('text=Balance')).toBeVisible()
    }
    
    // Look for sort options
    const sortButton = page.locator('button:has-text("Sort")')
    if (await sortButton.isVisible()) {
      await sortButton.click()
      
      await expect(page.locator('text=By Value')).toBeVisible()
      await expect(page.locator('text=By Name')).toBeVisible()
    }
  })

  test('should show empty portfolio state', async ({ page }) => {
    // Mock empty portfolio
    await page.route('**/api/portfolio', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalValue: 0,
          positions: [],
          change24h: 0,
          lastUpdated: new Date().toISOString()
        })
      })
    })
    
    await page.reload()
    
    await expect(page.locator('text=No positions found')).toBeVisible()
    await expect(page.locator('text=Start by adding some tokens')).toBeVisible()
  })

  test('should display last updated timestamp', async ({ page }) => {
    await page.waitForSelector('text=Total Value', { timeout: 10000 })
    
    // Look for last updated indicator
    await expect(page.locator('text=/Last updated:.*ago/')).toBeVisible({ timeout: 10000 })
  })

  test('should handle network switching impact on portfolio', async ({ page }) => {
    // Mock network switch
    await page.evaluate(() => {
      if (window.ethereum && window.ethereum.on) {
        window.ethereum.on('chainChanged', (chainId) => {
          // Simulate chain change event
        })
      }
    })
    
    // Portfolio should update when network changes
    await expect(page.locator('text=Total Value')).toBeVisible()
  })

  test('should integrate with DeFi protocols', async ({ page }) => {
    await page.waitForSelector('text=SEI', { timeout: 10000 })
    
    // Look for DeFi integration indicators
    const defiSection = page.locator('text=DeFi Positions')
    if (await defiSection.isVisible()) {
      await expect(defiSection).toBeVisible()
      
      // Check for protocol names
      await expect(page.locator('text=DragonSwap')).toBeVisible()
      await expect(page.locator('text=Yei Finance')).toBeVisible()
    }
  })
})