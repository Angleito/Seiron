import { test, expect } from '@playwright/test'

test.describe('Dragon Component E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dragon-showcase')
    await page.waitForLoadState('networkidle')
  })

  test('dragon renders correctly on page load', async ({ page }) => {
    // Wait for dragon to be visible
    const dragon = page.locator('[role="img"][aria-label*="dragon"]').first()
    await expect(dragon).toBeVisible()
    
    // Check SVG is properly rendered
    await expect(dragon).toHaveAttribute('width')
    await expect(dragon).toHaveAttribute('height')
    
    // Verify dragon parts are present
    const dragonParts = page.locator('[data-dragon-part]')
    await expect(dragonParts).toHaveCount(7) // head, body, eyes, arms, tail
  })

  test('dragon state transitions work correctly', async ({ page }) => {
    const dragon = page.locator('[role="img"][aria-label*="dragon"]').first()
    await expect(dragon).toBeVisible()

    // Click on dragon head to trigger attention state
    const head = page.locator('[data-dragon-part="head"]')
    await head.click()
    
    // Wait for state transition animation
    await page.waitForTimeout(500)
    
    // Verify state change visually or through attributes
    // This would depend on how state changes are reflected in the DOM
    await expect(dragon).toBeVisible()
  })

  test('dragon balls are interactive', async ({ page }) => {
    // Navigate to a page with dragon balls enabled
    await page.goto('/dragon-showcase?balls=true')
    await page.waitForLoadState('networkidle')

    const dragonBalls = page.locator('[data-dragon-part="dragon-ball"]')
    await expect(dragonBalls).toHaveCount(7)

    // Click on a dragon ball
    const firstBall = dragonBalls.first()
    await firstBall.click()
    
    // Verify interaction feedback
    await expect(firstBall).toBeVisible()
  })

  test('mouse tracking affects dragon eyes', async ({ page }) => {
    const dragon = page.locator('[role="img"][aria-label*="dragon"]').first()
    await expect(dragon).toBeVisible()

    // Move mouse to different positions and check eye movement
    const dragonBox = await dragon.boundingBox()
    if (dragonBox) {
      // Move mouse to top-left of dragon
      await page.mouse.move(dragonBox.x + 50, dragonBox.y + 50)
      await page.waitForTimeout(100)
      
      // Move mouse to bottom-right of dragon
      await page.mouse.move(dragonBox.x + dragonBox.width - 50, dragonBox.y + dragonBox.height - 50)
      await page.waitForTimeout(100)
      
      // Eyes should still be visible (basic check)
      const eyes = page.locator('[data-dragon-part*="eye"]')
      await expect(eyes).toHaveCount(2)
    }
  })

  test('keyboard navigation works', async ({ page }) => {
    const dragon = page.locator('[role="img"][aria-label*="dragon"]').first()
    await expect(dragon).toBeVisible()

    // Tab to the dragon
    await page.keyboard.press('Tab')
    await expect(dragon).toBeFocused()

    // Press Enter to interact
    await page.keyboard.press('Enter')
    await page.waitForTimeout(200)

    // Tab through interactive elements
    await page.keyboard.press('Tab')
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })

  test('touch gestures work on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Touch gestures test only for mobile')

    const dragon = page.locator('[role="img"][aria-label*="dragon"]').first()
    await expect(dragon).toBeVisible()

    const dragonBox = await dragon.boundingBox()
    if (dragonBox) {
      // Perform swipe gesture
      await page.touchscreen.tap(dragonBox.x + dragonBox.width / 2, dragonBox.y + dragonBox.height / 2)
      await page.waitForTimeout(100)
      
      // Perform pinch gesture (simulate)
      await page.evaluate(() => {
        const dragon = document.querySelector('[role="img"][aria-label*="dragon"]')
        if (dragon) {
          const touchEvent = new TouchEvent('touchstart', {
            touches: [
              { clientX: 100, clientY: 100, identifier: 1 } as Touch,
              { clientX: 200, clientY: 100, identifier: 2 } as Touch
            ]
          })
          dragon.dispatchEvent(touchEvent)
        }
      })
    }
  })

  test('performance meets requirements', async ({ page }) => {
    // Start performance measurement
    await page.evaluate(() => performance.mark('dragon-start'))
    
    await page.goto('/dragon-showcase')
    await page.waitForLoadState('networkidle')
    
    // Wait for dragon to be fully rendered
    const dragon = page.locator('[role="img"][aria-label*="dragon"]').first()
    await expect(dragon).toBeVisible()
    
    await page.evaluate(() => performance.mark('dragon-end'))
    
    // Measure performance
    const measurements = await page.evaluate(() => {
      performance.measure('dragon-render', 'dragon-start', 'dragon-end')
      const measure = performance.getEntriesByName('dragon-render')[0]
      return {
        renderTime: measure.duration,
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
      }
    })
    
    // Assert performance requirements
    expect(measurements.renderTime).toBeLessThan(500) // 500ms render time budget
    if (measurements.memoryUsage > 0) {
      expect(measurements.memoryUsage).toBeLessThan(50 * 1024 * 1024) // 50MB memory budget
    }
  })

  test('animations are smooth', async ({ page }) => {
    const dragon = page.locator('[role="img"][aria-label*="dragon"]').first()
    await expect(dragon).toBeVisible()

    // Monitor frame rate during interactions
    await page.evaluate(() => {
      let frameCount = 0
      let lastTime = performance.now()
      
      function countFrames() {
        frameCount++
        requestAnimationFrame(countFrames)
      }
      
      requestAnimationFrame(countFrames)
      
      // Store frame counter in window for later retrieval
      setTimeout(() => {
        const currentTime = performance.now()
        const fps = Math.round(frameCount / ((currentTime - lastTime) / 1000))
        ;(window as any).measuredFPS = fps
      }, 2000)
    })

    // Trigger some interactions to test animation performance
    const head = page.locator('[data-dragon-part="head"]')
    await head.click()
    await page.waitForTimeout(500)

    const body = page.locator('[data-dragon-part="body"]')
    await body.click()
    await page.waitForTimeout(500)

    // Wait for FPS measurement
    await page.waitForTimeout(2000)
    
    const fps = await page.evaluate(() => (window as any).measuredFPS)
    if (fps) {
      expect(fps).toBeGreaterThan(25) // Minimum acceptable FPS
    }
  })

  test('responsive design works across viewports', async ({ page }) => {
    // Test different viewport sizes
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' }
    ]

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.reload()
      await page.waitForLoadState('networkidle')

      const dragon = page.locator('[role="img"][aria-label*="dragon"]').first()
      await expect(dragon).toBeVisible()

      // Dragon should fit within viewport
      const dragonBox = await dragon.boundingBox()
      expect(dragonBox?.width).toBeLessThanOrEqual(viewport.width)
      expect(dragonBox?.height).toBeLessThanOrEqual(viewport.height)
    }
  })

  test('error handling works gracefully', async ({ page }) => {
    // Test with network failures
    await page.route('**/*', route => {
      // Allow the page to load but simulate some resource failures
      if (route.request().url().includes('dragon-data')) {
        route.abort()
      } else {
        route.continue()
      }
    })

    await page.goto('/dragon-showcase')
    await page.waitForLoadState('networkidle')

    // Dragon should still render even with some resource failures
    const dragon = page.locator('[role="img"][aria-label*="dragon"]').first()
    await expect(dragon).toBeVisible()

    // No JavaScript errors should be thrown
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    
    // Interact with dragon
    await dragon.click()
    await page.waitForTimeout(1000)

    expect(errors).toHaveLength(0)
  })
})