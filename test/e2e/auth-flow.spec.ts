import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display login page for unauthenticated users', async ({ page }) => {
    await expect(page.locator('text=Connect Wallet')).toBeVisible()
    await expect(page.locator('text=Please connect your wallet to continue')).toBeVisible()
  })

  test('should handle wallet connection flow', async ({ page }) => {
    // Mock MetaMask installation
    await page.addInitScript(() => {
      window.ethereum = {
        request: async (params) => {
          if (params.method === 'eth_requestAccounts') {
            return ['0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9']
          }
          if (params.method === 'eth_chainId') {
            return '0x531' // Sei Network chain ID
          }
          if (params.method === 'eth_getBalance') {
            return '0x21e19e0c9bab2400000' // 10000 SEI in hex
          }
          return null
        },
        on: () => {},
        removeListener: () => {},
        selectedAddress: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9'
      }
    })

    // Click connect wallet button
    await page.click('button:has-text("Connect Wallet")')
    
    // Wait for wallet connection
    await expect(page.locator('text=0x742d...8D9')).toBeVisible({ timeout: 10000 })
    
    // Verify user is redirected to dashboard
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('text=Portfolio Overview')).toBeVisible()
  })

  test('should handle wallet disconnection', async ({ page }) => {
    // First connect wallet
    await page.addInitScript(() => {
      window.ethereum = {
        request: async (params) => {
          if (params.method === 'eth_requestAccounts') {
            return ['0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9']
          }
          return null
        },
        on: () => {},
        removeListener: () => {},
        selectedAddress: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9'
      }
    })

    await page.click('button:has-text("Connect Wallet")')
    await expect(page.locator('text=0x742d...8D9')).toBeVisible()

    // Open wallet dropdown
    await page.click('button:has-text("0x742d...8D9")')
    
    // Click disconnect
    await page.click('button:has-text("Disconnect")')
    
    // Verify user is logged out
    await expect(page.locator('text=Connect Wallet')).toBeVisible()
    await expect(page).toHaveURL('/')
  })

  test('should handle unsupported network', async ({ page }) => {
    await page.addInitScript(() => {
      window.ethereum = {
        request: async (params) => {
          if (params.method === 'eth_requestAccounts') {
            return ['0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9']
          }
          if (params.method === 'eth_chainId') {
            return '0x1' // Ethereum mainnet
          }
          if (params.method === 'wallet_switchEthereumChain') {
            return null // Simulate successful network switch
          }
          return null
        },
        on: () => {},
        removeListener: () => {}
      }
    })

    await page.click('button:has-text("Connect Wallet")')
    
    // Should show network switch prompt
    await expect(page.locator('text=Unsupported Network')).toBeVisible()
    await expect(page.locator('button:has-text("Switch to Sei Network")')).toBeVisible()
    
    // Click switch network
    await page.click('button:has-text("Switch to Sei Network")')
    
    // Should proceed to dashboard after network switch
    await expect(page.locator('text=Portfolio Overview')).toBeVisible({ timeout: 10000 })
  })

  test('should handle wallet rejection', async ({ page }) => {
    await page.addInitScript(() => {
      window.ethereum = {
        request: async (params) => {
          if (params.method === 'eth_requestAccounts') {
            throw new Error('User rejected the request')
          }
          return null
        },
        on: () => {},
        removeListener: () => {}
      }
    })

    await page.click('button:has-text("Connect Wallet")')
    
    // Should show error message
    await expect(page.locator('text=User rejected the request')).toBeVisible()
    await expect(page.locator('text=Connect Wallet')).toBeVisible()
  })

  test('should show wallet installation prompt when no wallet detected', async ({ page }) => {
    // Remove ethereum provider
    await page.addInitScript(() => {
      delete window.ethereum
    })

    await page.goto('/')
    
    await expect(page.locator('text=No Wallet Detected')).toBeVisible()
    await expect(page.locator('a:has-text("Install MetaMask")')).toBeVisible()
  })

  test('should persist authentication on page reload', async ({ page }) => {
    // Set up authenticated session in localStorage
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
          return null
        },
        on: () => {},
        removeListener: () => {},
        selectedAddress: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9'
      }
    })

    await page.goto('/')
    
    // Should automatically redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('text=0x742d...8D9')).toBeVisible()
  })

  test('should handle account change in wallet', async ({ page }) => {
    // Initial connection
    await page.addInitScript(() => {
      window.ethereum = {
        request: async (params) => {
          if (params.method === 'eth_requestAccounts') {
            return ['0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9']
          }
          return null
        },
        on: (event, handler) => {
          if (event === 'accountsChanged') {
            window.accountChangeHandler = handler
          }
        },
        removeListener: () => {},
        selectedAddress: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9'
      }
    })

    await page.click('button:has-text("Connect Wallet")')
    await expect(page.locator('text=0x742d...8D9')).toBeVisible()

    // Simulate account change
    await page.evaluate(() => {
      if (window.accountChangeHandler) {
        window.accountChangeHandler(['0x123456789abcdef'])
      }
    })

    // Should update displayed address
    await expect(page.locator('text=0x123456...cdef')).toBeVisible()
  })
})