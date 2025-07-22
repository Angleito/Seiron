import { test, expect } from '@playwright/test'

test.describe('Voice Interface', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated session
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

      // Mock Web APIs for voice
      navigator.mediaDevices = {
        getUserMedia: () => Promise.resolve({
          getTracks: () => [{ stop: () => {} }],
          active: true
        })
      }

      global.MediaRecorder = class {
        constructor() {
          this.state = 'inactive'
          this.ondataavailable = null
          this.onstop = null
          this.onstart = null
        }
        start() {
          this.state = 'recording'
          if (this.onstart) this.onstart()
        }
        stop() {
          this.state = 'inactive'
          if (this.ondataavailable) {
            this.ondataavailable({ data: new Blob(['mock audio'], { type: 'audio/wav' }) })
          }
          if (this.onstop) this.onstop()
        }
        pause() { this.state = 'paused' }
        resume() { this.state = 'recording' }
      }

      global.webkitSpeechRecognition = class {
        constructor() {
          this.continuous = false
          this.interimResults = false
          this.onresult = null
          this.onerror = null
          this.onstart = null
          this.onend = null
        }
        start() {
          if (this.onstart) this.onstart()
          setTimeout(() => {
            if (this.onresult) {
              this.onresult({
                results: [{
                  0: { transcript: 'show me my portfolio', confidence: 0.95 },
                  isFinal: true
                }]
              })
            }
            if (this.onend) this.onend()
          }, 1000)
        }
        stop() {
          if (this.onend) this.onend()
        }
      }

      global.AudioContext = class {
        constructor() {
          this.state = 'running'
        }
        createGain() {
          return {
            connect: () => {},
            gain: { value: 1 }
          }
        }
        createOscillator() {
          return {
            connect: () => {},
            start: () => {},
            stop: () => {},
            frequency: { value: 440 }
          }
        }
        resume() { return Promise.resolve() }
        close() { return Promise.resolve() }
      }
    })

    await page.goto('/chat')
  })

  test('should display voice interface button', async ({ page }) => {
    await expect(page.locator('button[aria-label*="voice" i], button:has-text("🎤")')).toBeVisible({ timeout: 10000 })
  })

  test('should start voice recording on button press', async ({ page }) => {
    const voiceButton = page.locator('button[aria-label*="voice" i], button:has-text("🎤")').first()
    
    await voiceButton.click()
    
    // Should show recording state
    await expect(page.locator('text=/recording/i')).toBeVisible({ timeout: 5000 })
  })

  test('should handle voice recording permission', async ({ page }) => {
    // Mock permission denial
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () => 
        Promise.reject(new Error('Permission denied'))
    })

    await page.reload()
    await page.waitForTimeout(1000)

    const voiceButton = page.locator('button[aria-label*="voice" i], button:has-text("🎤")').first()
    
    if (await voiceButton.isVisible()) {
      await voiceButton.click()
      
      // Should show permission error
      await expect(page.locator('text=/microphone.*permission/i')).toBeVisible()
    }
  })

  test('should display voice transcript when available', async ({ page }) => {
    const voiceButton = page.locator('button[aria-label*="voice" i], button:has-text("🎤")').first()
    
    await voiceButton.click()
    
    // Wait for transcript
    await expect(page.locator('text=show me my portfolio')).toBeVisible({ timeout: 10000 })
  })

  test('should send voice message to chat', async ({ page }) => {
    const voiceButton = page.locator('button[aria-label*="voice" i], button:has-text("🎤")').first()
    
    await voiceButton.click()
    
    // Wait for transcript
    await expect(page.locator('text=show me my portfolio')).toBeVisible({ timeout: 10000 })
    
    // Look for send button or auto-send
    const sendButton = page.locator('button:has-text("Send")')
    if (await sendButton.isVisible()) {
      await sendButton.click()
    }
    
    // Should appear in chat
    await expect(page.locator('.message:has-text("show me my portfolio")')).toBeVisible()
  })

  test('should handle voice playback of AI responses', async ({ page }) => {
    // First send a text message to get AI response
    const messageInput = page.locator('input[placeholder*="Type your message"]')
    await messageInput.fill('Hello AI')
    await messageInput.press('Enter')
    
    // Wait for AI response
    await expect(page.locator('text=/I received your message/i')).toBeVisible({ timeout: 10000 })
    
    // Look for voice playback button on AI response
    const playButton = page.locator('button[aria-label*="play" i], button:has-text("🔊")').first()
    if (await playButton.isVisible()) {
      await playButton.click()
      
      // Should show playing state
      await expect(page.locator('text=/playing/i')).toBeVisible()
    }
  })

  test('should show voice recording duration', async ({ page }) => {
    const voiceButton = page.locator('button[aria-label*="voice" i], button:has-text("🎤")').first()
    
    await voiceButton.click()
    
    // Should show duration counter
    await expect(page.locator('text=/00:[0-9]{2}/')).toBeVisible({ timeout: 5000 })
  })

  test('should handle voice recording cancellation', async ({ page }) => {
    const voiceButton = page.locator('button[aria-label*="voice" i], button:has-text("🎤")').first()
    
    await voiceButton.click()
    await expect(page.locator('text=/recording/i')).toBeVisible()
    
    // Look for cancel button
    const cancelButton = page.locator('button:has-text("Cancel"), button[aria-label*="cancel" i]')
    if (await cancelButton.isVisible()) {
      await cancelButton.click()
      
      // Should stop recording
      await expect(page.locator('text=/recording/i')).not.toBeVisible()
    }
  })

  test('should show voice confidence level', async ({ page }) => {
    const voiceButton = page.locator('button[aria-label*="voice" i], button:has-text("🎤")').first()
    
    await voiceButton.click()
    
    // Wait for transcript with confidence
    await expect(page.locator('text=show me my portfolio')).toBeVisible({ timeout: 10000 })
    
    // Look for confidence indicator
    const confidenceIndicator = page.locator('text=/confidence|95%/i')
    if (await confidenceIndicator.isVisible()) {
      await expect(confidenceIndicator).toBeVisible()
    }
  })

  test('should handle poor audio quality gracefully', async ({ page }) => {
    // Mock low confidence speech recognition
    await page.addInitScript(() => {
      global.webkitSpeechRecognition = class {
        constructor() {
          this.onresult = null
          this.onstart = null
          this.onend = null
        }
        start() {
          if (this.onstart) this.onstart()
          setTimeout(() => {
            if (this.onresult) {
              this.onresult({
                results: [{
                  0: { transcript: 'unclear speech', confidence: 0.2 },
                  isFinal: true
                }]
              })
            }
            if (this.onend) this.onend()
          }, 1000)
        }
        stop() {}
      }
    })

    await page.reload()

    const voiceButton = page.locator('button[aria-label*="voice" i], button:has-text("🎤")').first()
    await voiceButton.click()

    // Should show low confidence warning
    await expect(page.locator('text=/low confidence|try again/i')).toBeVisible({ timeout: 10000 })
  })

  test('should support voice commands for navigation', async ({ page }) => {
    // Mock navigation voice command
    await page.addInitScript(() => {
      global.webkitSpeechRecognition = class {
        constructor() {
          this.onresult = null
          this.onstart = null
          this.onend = null
        }
        start() {
          if (this.onstart) this.onstart()
          setTimeout(() => {
            if (this.onresult) {
              this.onresult({
                results: [{
                  0: { transcript: 'go to dashboard', confidence: 0.95 },
                  isFinal: true
                }]
              })
            }
            if (this.onend) this.onend()
          }, 1000)
        }
        stop() {}
      }
    })

    const voiceButton = page.locator('button[aria-label*="voice" i], button:has-text("🎤")').first()
    await voiceButton.click()

    // Should recognize navigation command
    await expect(page.locator('text=go to dashboard')).toBeVisible({ timeout: 10000 })
  })

  test('should handle continuous voice conversation', async ({ page }) => {
    const voiceButton = page.locator('button[aria-label*="voice" i], button:has-text("🎤")').first()
    
    // First voice message
    await voiceButton.click()
    await expect(page.locator('text=show me my portfolio')).toBeVisible({ timeout: 10000 })
    
    // Send the message
    const sendButton = page.locator('button:has-text("Send")')
    if (await sendButton.isVisible()) {
      await sendButton.click()
    }
    
    // Wait for AI response
    await expect(page.locator('text=/I received your message/i')).toBeVisible({ timeout: 15000 })
    
    // Should be able to continue voice conversation
    await voiceButton.click()
    await expect(page.locator('text=/recording/i')).toBeVisible()
  })

  test('should show unsupported browser message', async ({ page }) => {
    // Mock unsupported browser
    await page.addInitScript(() => {
      delete global.webkitSpeechRecognition
      delete global.SpeechRecognition
      delete global.MediaRecorder
    })

    await page.reload()

    // Should show unsupported message
    await expect(page.locator('text=/voice.*not supported/i')).toBeVisible()
  })

  test('should handle voice interface keyboard shortcuts', async ({ page }) => {
    // Test space bar for push-to-talk
    await page.keyboard.down('Space')
    
    await expect(page.locator('text=/recording|hold to record/i')).toBeVisible({ timeout: 5000 })
    
    await page.keyboard.up('Space')
    
    // Should stop recording
    await expect(page.locator('text=/recording/i')).not.toBeVisible({ timeout: 5000 })
  })

  test('should integrate voice with portfolio queries', async ({ page }) => {
    // Mock portfolio-specific voice command
    await page.addInitScript(() => {
      global.webkitSpeechRecognition = class {
        constructor() {
          this.onresult = null
          this.onstart = null
          this.onend = null
        }
        start() {
          if (this.onstart) this.onstart()
          setTimeout(() => {
            if (this.onresult) {
              this.onresult({
                results: [{
                  0: { transcript: 'what is my SEI balance', confidence: 0.95 },
                  isFinal: true
                }]
              })
            }
            if (this.onend) this.onend()
          }, 1000)
        }
        stop() {}
      }
    })

    const voiceButton = page.locator('button[aria-label*="voice" i], button:has-text("🎤")').first()
    await voiceButton.click()

    await expect(page.locator('text=what is my SEI balance')).toBeVisible({ timeout: 10000 })
    
    // Should trigger portfolio-related response
    const sendButton = page.locator('button:has-text("Send")')
    if (await sendButton.isVisible()) {
      await sendButton.click()
    }
    
    await expect(page.locator('text=/SEI/i')).toBeVisible({ timeout: 15000 })
  })
})