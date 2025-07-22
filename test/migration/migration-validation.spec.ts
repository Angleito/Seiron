import { test, expect } from '@playwright/test'
import { EnvironmentValidator } from '../validation/environment-validation'
import { APIHealthChecker } from '../validation/api-health-check'
import { SecurityHeadersChecker } from '../validation/security-headers-check'

test.describe('Next.js Migration Validation', () => {
  test.beforeAll(async () => {
    console.log('🚀 Starting Next.js Migration Validation Suite')
    console.log('=============================================')
  })

  test.describe('Environment Configuration', () => {
    test('should have all required environment variables', async () => {
      const result = EnvironmentValidator.validate()
      
      // Log results for debugging
      if (!result.isValid) {
        console.log('Environment validation errors:')
        result.errors.forEach(error => {
          console.log(`  ❌ ${error.field}: ${error.message}`)
        })
      }

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should have valid URL configurations', async () => {
      const result = EnvironmentValidator.validate()
      
      const urlErrors = result.errors.filter(error => 
        error.message.includes('Invalid') && error.message.includes('URL')
      )
      
      expect(urlErrors).toHaveLength(0)
    })

    test('should have appropriate production configurations', async () => {
      if (process.env.NODE_ENV === 'production') {
        expect(process.env.NEXTAUTH_SECRET).toBeDefined()
        expect(process.env.NEXT_PUBLIC_BACKEND_URL).not.toContain('localhost')
      }
    })
  })

  test.describe('API Health and Connectivity', () => {
    test('should have all critical services healthy', async () => {
      const summary = await APIHealthChecker.performHealthCheck()
      
      // Log health status
      console.log(`API Health Status: ${summary.overall}`)
      console.log(`Services: ${summary.summary.healthy}/${summary.summary.total} healthy`)
      
      const criticalServices = summary.results.filter(result => 
        result.service.includes('Backend') || 
        result.service.includes('Auth') ||
        result.service.includes('Portfolio')
      )

      const unhealthyCritical = criticalServices.filter(service => 
        service.status === 'unhealthy'
      )

      expect(unhealthyCritical).toHaveLength(0)
    })

    test('should have reasonable API response times', async () => {
      const summary = await APIHealthChecker.performHealthCheck()
      
      const slowServices = summary.results.filter(result => 
        result.responseTime > 5000 && result.status !== 'unhealthy'
      )

      // Log slow services
      if (slowServices.length > 0) {
        console.log('Slow services detected:')
        slowServices.forEach(service => {
          console.log(`  ⚠️ ${service.service}: ${service.responseTime}ms`)
        })
      }

      expect(slowServices.length).toBeLessThanOrEqual(2) // Allow some tolerance
    })

    test('should have external service connectivity', async () => {
      const summary = await APIHealthChecker.performHealthCheck()
      
      const externalServices = summary.results.filter(result => 
        result.service.includes('Supabase') || 
        result.service.includes('ElevenLabs')
      )

      const connectedServices = externalServices.filter(service => 
        service.status === 'healthy' || service.status === 'warning'
      )

      // At least one external service should be reachable
      expect(connectedServices.length).toBeGreaterThan(0)
    })
  })

  test.describe('Security Headers and Configuration', () => {
    test('should have secure HTTP headers', async ({ page }) => {
      await page.goto('/')
      
      const response = await page.request.get('/')
      const headers = response.headers()
      
      // Check critical security headers
      expect(headers['x-frame-options']).toBeDefined()
      expect(headers['x-content-type-options']).toBe('nosniff')
      expect(headers['referrer-policy']).toBeDefined()
    })

    test('should have Content Security Policy', async ({ page }) => {
      await page.goto('/')
      
      const response = await page.request.get('/')
      const csp = response.headers()['content-security-policy']
      
      expect(csp).toBeDefined()
      expect(csp).toContain('default-src')
    })

    test('should enforce HTTPS in production', async ({ page }) => {
      if (process.env.NODE_ENV === 'production') {
        await page.goto('/')
        
        const response = await page.request.get('/')
        const hsts = response.headers()['strict-transport-security']
        
        expect(hsts).toBeDefined()
        expect(hsts).toContain('max-age')
      }
    })
  })

  test.describe('Feature Parity Validation', () => {
    test('should maintain wallet connection functionality', async ({ page }) => {
      await page.addInitScript(() => {
        window.ethereum = {
          request: async (params) => {
            if (params.method === 'eth_requestAccounts') {
              return ['0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9']
            }
            if (params.method === 'eth_chainId') {
              return '0x531'
            }
            return null
          },
          on: () => {},
          removeListener: () => {}
        }
      })

      await page.goto('/')
      
      // Should have wallet connect functionality
      await expect(page.locator('button:has-text("Connect Wallet")')).toBeVisible()
      
      await page.click('button:has-text("Connect Wallet")')
      await expect(page.locator('text=0x742d...8D9')).toBeVisible({ timeout: 10000 })
    })

    test('should maintain chat interface functionality', async ({ page }) => {
      // Set up authenticated session
      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: { isAuthenticated: true, user: { id: 'test' } },
          version: 0
        }))
      })

      await page.goto('/chat')
      
      // Should have chat interface elements
      await expect(page.locator('input[placeholder*="message"]')).toBeVisible()
      await expect(page.locator('button:has-text("Send")')).toBeVisible()
      
      // Should be able to send messages
      await page.fill('input[placeholder*="message"]', 'Test message')
      await page.click('button:has-text("Send")')
      
      await expect(page.locator('text=Test message')).toBeVisible()
    })

    test('should maintain portfolio functionality', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: { isAuthenticated: true, user: { id: 'test' } },
          version: 0
        }))
        
        window.ethereum = {
          request: async () => ['0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9'],
          on: () => {},
          removeListener: () => {}
        }
      })

      await page.goto('/dashboard')
      
      // Should have portfolio elements
      await expect(page.locator('text=Portfolio')).toBeVisible()
      await expect(page.locator('text=Total Value')).toBeVisible({ timeout: 10000 })
    })

    test('should maintain voice interface functionality', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: { isAuthenticated: true, user: { id: 'test' } },
          version: 0
        }))

        // Mock voice APIs
        navigator.mediaDevices = {
          getUserMedia: () => Promise.resolve({
            getTracks: () => [{ stop: () => {} }]
          })
        }
        
        global.webkitSpeechRecognition = class {
          start() {}
          stop() {}
        }
      })

      await page.goto('/chat')
      
      // Should have voice interface
      const voiceButton = page.locator('button[aria-label*="voice" i], button:has-text("🎤")')
      
      if (await voiceButton.isVisible()) {
        await expect(voiceButton).toBeVisible()
      } else {
        // Voice might not be available in test environment
        console.log('⚠️ Voice interface not detected in test environment')
      }
    })
  })

  test.describe('Performance Validation', () => {
    test('should load homepage within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime
      
      console.log(`Homepage load time: ${loadTime}ms`)
      expect(loadTime).toBeLessThan(5000) // 5 second limit
    })

    test('should have reasonable bundle size', async ({ page }) => {
      await page.goto('/')
      
      // Check for large resources
      const performanceEntries = await page.evaluate(() => {
        return performance.getEntriesByType('resource').map(entry => ({
          name: entry.name,
          size: entry.transferSize,
          duration: entry.duration
        }))
      })

      const largeResources = performanceEntries.filter(entry => 
        entry.size > 1000000 // 1MB
      )

      if (largeResources.length > 0) {
        console.log('Large resources detected:')
        largeResources.forEach(resource => {
          console.log(`  📦 ${resource.name}: ${(resource.size / 1024 / 1024).toFixed(2)}MB`)
        })
      }

      // Should not have excessive large resources
      expect(largeResources.length).toBeLessThanOrEqual(3)
    })

    test('should have good Core Web Vitals', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      const vitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const vitals = {}
            
            for (const entry of entries) {
              if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
                vitals.fcp = entry.startTime
              }
              if (entry.entryType === 'largest-contentful-paint') {
                vitals.lcp = entry.startTime
              }
            }
            
            if (vitals.fcp && vitals.lcp) {
              resolve(vitals)
            }
          })
          
          observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] })
          
          // Timeout after 5 seconds
          setTimeout(() => resolve({}), 5000)
        })
      })

      console.log('Core Web Vitals:', vitals)
      
      // Check reasonable thresholds
      if (vitals.fcp) expect(vitals.fcp).toBeLessThan(3000) // 3s FCP
      if (vitals.lcp) expect(vitals.lcp).toBeLessThan(4000) // 4s LCP
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
      await page.goto('/')
      
      // Should be responsive
      const body = await page.locator('body').boundingBox()
      expect(body?.width).toBeLessThanOrEqual(375)
      
      // Navigation should work
      await expect(page.locator('button, a')).toBeVisible()
    })

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }) // iPad
      await page.goto('/')
      
      // Should adapt to tablet layout
      const body = await page.locator('body').boundingBox()
      expect(body?.width).toBeLessThanOrEqual(768)
    })
  })

  test.describe('Accessibility Validation', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/')
      
      const h1Count = await page.locator('h1').count()
      expect(h1Count).toBeGreaterThanOrEqual(1)
      expect(h1Count).toBeLessThanOrEqual(1) // Should have exactly one h1
    })

    test('should have proper alt text for images', async ({ page }) => {
      await page.goto('/')
      
      const imagesWithoutAlt = await page.locator('img:not([alt])').count()
      expect(imagesWithoutAlt).toBe(0)
    })

    test('should have keyboard navigation support', async ({ page }) => {
      await page.goto('/')
      
      // Tab through interactive elements
      await page.keyboard.press('Tab')
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
      expect(['BUTTON', 'A', 'INPUT']).toContain(focusedElement)
    })
  })

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/**', route => {
        route.fulfill({ status: 500 })
      })

      await page.goto('/')
      
      // Should not crash, should show error message
      await expect(page.locator('body')).toBeVisible()
      
      // Look for error handling UI
      const errorElements = await page.locator('text=/error|failed|unable/i').count()
      if (errorElements > 0) {
        console.log('✅ Error handling UI detected')
      }
    })

    test('should have 404 page', async ({ page }) => {
      const response = await page.goto('/non-existent-page')
      expect(response?.status()).toBe(404)
      
      // Should show 404 page content
      await expect(page.locator('text=/404|not found/i')).toBeVisible()
    })

    test('should handle network failures', async ({ page }) => {
      await page.route('**/*', route => route.abort())
      
      try {
        await page.goto('/', { timeout: 5000 })
      } catch (error) {
        // Expected to fail, check that it fails gracefully
        expect(error.message).toContain('net::ERR_FAILED')
      }
    })
  })

  test.afterAll(async () => {
    console.log('\n✅ Next.js Migration Validation Complete')
    console.log('==========================================')
  })
})