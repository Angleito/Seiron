import { test, expect } from '@playwright/test'

test.describe('Chat Interface', () => {
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

      window.ethereum = {
        request: async () => ['0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9'],
        on: () => {},
        removeListener: () => {},
        selectedAddress: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9'
      }
    })

    await page.goto('/chat')
  })

  test('should display chat interface correctly', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Type your message"]')).toBeVisible()
    await expect(page.locator('button:has-text("Send")')).toBeVisible()
    await expect(page.locator('text=AI Portfolio Assistant')).toBeVisible()
  })

  test('should send and receive messages', async ({ page }) => {
    const messageInput = page.locator('input[placeholder*="Type your message"]')
    const sendButton = page.locator('button:has-text("Send")')

    // Send a message
    await messageInput.fill('Show me my portfolio')
    await sendButton.click()

    // Verify message appears in chat
    await expect(page.locator('text=Show me my portfolio')).toBeVisible()
    
    // Wait for AI response
    await expect(page.locator('text=I received your message')).toBeVisible({ timeout: 10000 })
    
    // Verify input is cleared
    await expect(messageInput).toHaveValue('')
  })

  test('should handle keyboard shortcuts for sending', async ({ page }) => {
    const messageInput = page.locator('input[placeholder*="Type your message"]')

    await messageInput.fill('Test message with keyboard shortcut')
    await messageInput.press('Control+Enter')

    await expect(page.locator('text=Test message with keyboard shortcut')).toBeVisible()
  })

  test('should prevent sending empty messages', async ({ page }) => {
    const sendButton = page.locator('button:has-text("Send")')
    
    // Try to send empty message
    await sendButton.click()
    
    // Message should not appear
    await expect(page.locator('.message')).not.toBeVisible()
  })

  test('should show loading state during message sending', async ({ page }) => {
    const messageInput = page.locator('input[placeholder*="Type your message"]')
    const sendButton = page.locator('button:has-text("Send")')

    await messageInput.fill('Test loading state')
    await sendButton.click()

    // Check for loading indicator
    await expect(page.locator('text=Sending...')).toBeVisible()
    await expect(sendButton).toBeDisabled()

    // Wait for completion
    await expect(page.locator('text=Sending...')).not.toBeVisible({ timeout: 10000 })
    await expect(sendButton).toBeEnabled()
  })

  test('should display message timestamps', async ({ page }) => {
    const messageInput = page.locator('input[placeholder*="Type your message"]')
    
    await messageInput.fill('Message with timestamp')
    await messageInput.press('Enter')

    // Check for timestamp (format may vary, so check for time-like pattern)
    await expect(page.locator('text=/\\d{1,2}:\\d{2}/')).toBeVisible()
  })

  test('should scroll to bottom when new message is added', async ({ page }) => {
    // Add multiple messages to create scroll
    const messageInput = page.locator('input[placeholder*="Type your message"]')
    
    for (let i = 0; i < 5; i++) {
      await messageInput.fill(`Message ${i + 1}`)
      await messageInput.press('Enter')
      await page.waitForTimeout(500) // Small delay between messages
    }

    // Check that the latest message is visible (indicating auto-scroll)
    await expect(page.locator('text=Message 5')).toBeVisible()
  })

  test('should handle chat session management', async ({ page }) => {
    // Send initial message to start session
    const messageInput = page.locator('input[placeholder*="Type your message"]')
    await messageInput.fill('Start new chat session')
    await messageInput.press('Enter')

    await expect(page.locator('text=Start new chat session')).toBeVisible()

    // Check for session indicator
    await expect(page.locator('text=/Session.*started/')).toBeVisible()
  })

  test('should display portfolio information in chat', async ({ page }) => {
    const messageInput = page.locator('input[placeholder*="Type your message"]')
    
    await messageInput.fill('What is my portfolio value?')
    await messageInput.press('Enter')

    // Wait for response with portfolio information
    await expect(page.locator('text=/portfolio/i')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=/\\$[0-9,]+/')).toBeVisible() // Currency format
  })

  test('should handle investment queries', async ({ page }) => {
    const messageInput = page.locator('input[placeholder*="Type your message"]')
    
    await messageInput.fill('Should I invest in SEI?')
    await messageInput.press('Enter')

    await expect(page.locator('text=Should I invest in SEI?')).toBeVisible()
    
    // Wait for AI investment response
    await expect(page.locator('text=/investment/i')).toBeVisible({ timeout: 15000 })
  })

  test('should show error message for failed requests', async ({ page }) => {
    // Mock API to return error
    await page.route('**/api/chat/send-message', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })

    const messageInput = page.locator('input[placeholder*="Type your message"]')
    
    await messageInput.fill('This should fail')
    await messageInput.press('Enter')

    await expect(page.locator('text=Failed to send message')).toBeVisible()
    await expect(page.locator('button:has-text("Retry")')).toBeVisible()
  })

  test('should retry failed messages', async ({ page }) => {
    let requestCount = 0
    
    // Mock API to fail first time, succeed second time
    await page.route('**/api/chat/send-message', route => {
      requestCount++
      if (requestCount === 1) {
        route.fulfill({ status: 500 })
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'msg-retry',
            content: 'Message sent successfully after retry',
            role: 'assistant',
            timestamp: new Date().toISOString()
          })
        })
      }
    })

    const messageInput = page.locator('input[placeholder*="Type your message"]')
    
    await messageInput.fill('Retry test message')
    await messageInput.press('Enter')

    // Wait for error and retry button
    await expect(page.locator('button:has-text("Retry")')).toBeVisible()
    
    // Click retry
    await page.click('button:has-text("Retry")')
    
    // Should succeed on retry
    await expect(page.locator('text=Message sent successfully after retry')).toBeVisible()
  })

  test('should handle chat history loading', async ({ page }) => {
    // Mock existing chat history
    await page.route('**/api/chat/sessions', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'session-1',
            title: 'Previous Chat',
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            messageCount: 3
          }
        ])
      })
    })

    await page.reload()

    // Check for chat history sidebar or dropdown
    await expect(page.locator('text=Previous Chat')).toBeVisible()
    await expect(page.locator('text=3 messages')).toBeVisible()
  })

  test('should support message formatting and markdown', async ({ page }) => {
    const messageInput = page.locator('input[placeholder*="Type your message"]')
    
    await messageInput.fill('Format this **bold** and *italic* text')
    await messageInput.press('Enter')

    // AI might respond with formatted text
    await expect(page.locator('strong:has-text("bold")')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('em:has-text("italic")')).toBeVisible({ timeout: 10000 })
  })

  test('should handle voice integration from chat', async ({ page }) => {
    // Mock voice interface
    await page.addInitScript(() => {
      navigator.mediaDevices = {
        getUserMedia: () => Promise.resolve({
          getTracks: () => [{ stop: () => {} }]
        })
      }
    })

    // Look for voice button in chat interface
    const voiceButton = page.locator('button[aria-label*="voice" i]')
    
    if (await voiceButton.isVisible()) {
      await voiceButton.click()
      await expect(page.locator('text=/recording/i')).toBeVisible()
    }
  })

  test('should maintain conversation context', async ({ page }) => {
    const messageInput = page.locator('input[placeholder*="Type your message"]')
    
    // Send first message
    await messageInput.fill('My name is John')
    await messageInput.press('Enter')
    
    await page.waitForTimeout(2000)
    
    // Send follow-up message
    await messageInput.fill('What is my name?')
    await messageInput.press('Enter')

    // AI should remember the context
    await expect(page.locator('text=/John/i')).toBeVisible({ timeout: 15000 })
  })
})