import {
  sanitizeHtml,
  sanitizeText,
  sanitizeChatMessage,
  sanitizeVoiceTranscript,
  sanitizeTransactionDescription,
  sanitizeUserInput,
  validateSanitizedContent,
  sanitizeAndValidate,
  SANITIZE_CONFIGS
} from '../sanitize'

describe('Input Sanitization', () => {
  describe('Basic Text Sanitization', () => {
    it('should remove all HTML tags for text-only content', () => {
      const input = '<script>alert("xss")</script>Hello World<p>Test</p>'
      const result = sanitizeText(input)
      expect(result).toBe('Hello WorldTest')
    })

    it('should handle empty and null inputs', () => {
      expect(sanitizeText('')).toBe('')
      expect(sanitizeText(null as any)).toBe('')
      expect(sanitizeText(undefined as any)).toBe('')
    })

    it('should preserve plain text', () => {
      const input = 'Hello World 123'
      const result = sanitizeText(input)
      expect(result).toBe(input)
    })
  })

  describe('Chat Message Sanitization', () => {
    it('should allow basic formatting tags', () => {
      const input = '<b>Bold</b> and <i>italic</i> text'
      const result = sanitizeChatMessage(input)
      expect(result).toContain('<b>Bold</b>')
      expect(result).toContain('<i>italic</i>')
    })

    it('should remove dangerous tags', () => {
      const input = '<script>alert("xss")</script><b>Safe</b><iframe src="evil.com"></iframe>'
      const result = sanitizeChatMessage(input)
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('<iframe>')
      expect(result).toContain('<b>Safe</b>')
    })

    it('should remove dangerous attributes', () => {
      const input = '<span onclick="alert(\'xss\')">Click me</span>'
      const result = sanitizeChatMessage(input)
      expect(result).not.toContain('onclick')
      expect(result).toContain('<span>')
    })
  })

  describe('Voice Transcript Sanitization', () => {
    it('should strip all HTML from voice transcripts', () => {
      const input = 'Buy <script>alert("xss")</script>100 tokens'
      const result = sanitizeVoiceTranscript(input)
      expect(result).toBe('Buy 100 tokens')
    })

    it('should preserve voice commands', () => {
      const input = 'Execute swap from ETH to USDC'
      const result = sanitizeVoiceTranscript(input)
      expect(result).toBe(input)
    })
  })

  describe('Transaction Description Sanitization', () => {
    it('should allow basic paragraph tags', () => {
      const input = '<p>Swap 100 ETH for USDC</p>'
      const result = sanitizeTransactionDescription(input)
      expect(result).toContain('<p>')
    })

    it('should remove dangerous content', () => {
      const input = '<script>stealWallet()</script><p>Safe description</p>'
      const result = sanitizeTransactionDescription(input)
      expect(result).not.toContain('<script>')
      expect(result).toContain('<p>Safe description</p>')
    })

    it('should remove images and media', () => {
      const input = '<p>Transaction</p><img src="malicious.jpg" onerror="alert(\'xss\')">'
      const result = sanitizeTransactionDescription(input)
      expect(result).not.toContain('<img>')
      expect(result).toContain('<p>Transaction</p>')
    })
  })

  describe('XSS Attack Prevention', () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '"><script>alert("xss")</script>',
      "'><script>alert('xss')</script>",
      '<img src=x onerror=alert("xss")>',
      '<svg onload=alert("xss")>',
      'javascript:alert("xss")',
      'data:text/html,<script>alert("xss")</script>',
      '<iframe src="javascript:alert(\'xss\')"></iframe>',
      '<object data="javascript:alert(\'xss\')"></object>',
      '<embed src="javascript:alert(\'xss\')"></embed>',
      '<form><button formaction="javascript:alert(\'xss\')">Click</button></form>',
      '<input onfocus="alert(\'xss\')" autofocus>',
      '<select onfocus="alert(\'xss\')" autofocus><option>',
      '<textarea onfocus="alert(\'xss\')" autofocus>',
      '<keygen onfocus="alert(\'xss\')" autofocus>',
      '<video><source onerror="alert(\'xss\')">',
      '<audio src="x" onerror="alert(\'xss\')">',
      '<details open ontoggle="alert(\'xss\')">',
      '<marquee onstart="alert(\'xss\')">',
      '<style>@import"javascript:alert(\'xss\')"</style>',
      '<link rel="import" href="javascript:alert(\'xss\')">',
      '<base href="javascript:alert(\'xss\')//">',
      '<meta http-equiv="refresh" content="0;javascript:alert(\'xss\')">',
    ]

    xssPayloads.forEach((payload, index) => {
      it(`should neutralize XSS payload ${index + 1}: ${payload.substring(0, 30)}...`, () => {
        const result = sanitizeText(payload)
        expect(result).not.toContain('<script>')
        expect(result).not.toContain('javascript:')
        expect(result).not.toContain('onerror')
        expect(result).not.toContain('onload')
        expect(result).not.toContain('onclick')
        expect(result).not.toContain('onfocus')
        expect(result).not.toContain('onstart')
        expect(result).not.toContain('ontoggle')
      })
    })
  })

  describe('Content Validation', () => {
    it('should detect potential XSS in content', () => {
      const malicious = '<script>alert("xss")</script>Hello'
      const sanitized = sanitizeText(malicious)
      const isValid = validateSanitizedContent(malicious, sanitized)
      expect(isValid).toBe(false)
    })

    it('should validate safe content', () => {
      const safe = 'Hello World'
      const sanitized = sanitizeText(safe)
      const isValid = validateSanitizedContent(safe, sanitized)
      expect(isValid).toBe(true)
    })

    it('should warn about significantly altered content', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      const input = '<script>alert("xss")</script>Hello'
      const sanitized = sanitizeText(input)
      validateSanitizedContent(input, sanitized)
      
      expect(consoleWarnSpy).toHaveBeenCalled()
      consoleWarnSpy.mockRestore()
    })
  })

  describe('Sanitize and Validate', () => {
    it('should return comprehensive sanitization results', () => {
      const input = '<script>alert("xss")</script>Hello <b>World</b>'
      const result = sanitizeAndValidate(input, SANITIZE_CONFIGS.TEXT_ONLY)
      
      expect(result.sanitized).toBe('Hello World')
      expect(result.isValid).toBe(false)
      expect(result.warnings).toContain(expect.stringContaining('Content was modified'))
      expect(result.warnings).toContain(expect.stringContaining('potential security risks'))
    })

    it('should handle safe content', () => {
      const input = 'Hello World'
      const result = sanitizeAndValidate(input, SANITIZE_CONFIGS.TEXT_ONLY)
      
      expect(result.sanitized).toBe(input)
      expect(result.isValid).toBe(true)
      expect(result.warnings).toHaveLength(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle nested XSS attempts', () => {
      const input = '<div><script>alert("nested")</script><p>Safe</p></div>'
      const result = sanitizeChatMessage(input)
      expect(result).not.toContain('<script>')
      expect(result).toContain('<p>Safe</p>')
    })

    it('should handle encoded XSS attempts', () => {
      const input = '&lt;script&gt;alert("encoded")&lt;/script&gt;'
      const result = sanitizeText(input)
      expect(result).not.toContain('script')
    })

    it('should handle very long inputs', () => {
      const longInput = 'A'.repeat(10000) + '<script>alert("xss")</script>'
      const result = sanitizeText(longInput)
      expect(result).toBe('A'.repeat(10000))
    })

    it('should handle special characters', () => {
      const input = 'Hello 世界 🐉 <script>alert("xss")</script>'
      const result = sanitizeText(input)
      expect(result).toBe('Hello 世界 🐉 ')
    })

    it('should handle malformed HTML', () => {
      const input = '<div><span>Hello</div></span><script>alert("xss")</script>'
      const result = sanitizeChatMessage(input)
      expect(result).not.toContain('<script>')
      expect(result).toContain('Hello')
    })
  })

  describe('Configuration-specific Tests', () => {
    it('should respect TEXT_ONLY configuration', () => {
      const input = '<b>Bold</b> <script>alert("xss")</script> Text'
      const result = sanitizeHtml(input, SANITIZE_CONFIGS.TEXT_ONLY)
      expect(result).toBe('Bold  Text')
    })

    it('should respect CHAT_MESSAGE configuration', () => {
      const input = '<b>Bold</b> <script>alert("xss")</script> <i>Italic</i>'
      const result = sanitizeHtml(input, SANITIZE_CONFIGS.CHAT_MESSAGE)
      expect(result).toContain('<b>Bold</b>')
      expect(result).toContain('<i>Italic</i>')
      expect(result).not.toContain('<script>')
    })

    it('should respect TRANSACTION_DESCRIPTION configuration', () => {
      const input = '<p>Description</p> <script>alert("xss")</script> <img src="test.jpg">'
      const result = sanitizeHtml(input, SANITIZE_CONFIGS.TRANSACTION_DESCRIPTION)
      expect(result).toContain('<p>Description</p>')
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('<img>')
    })
  })

  describe('Performance Tests', () => {
    it('should handle large inputs efficiently', () => {
      const largeInput = '<script>alert("xss")</script>'.repeat(1000) + 'Safe content'
      const startTime = performance.now()
      const result = sanitizeText(largeInput)
      const endTime = performance.now()
      
      expect(result).toBe('Safe content')
      expect(endTime - startTime).toBeLessThan(1000) // Should complete in under 1 second
    })

    it('should handle repeated sanitization', () => {
      const input = '<script>alert("xss")</script>Hello'
      const startTime = performance.now()
      
      for (let i = 0; i < 100; i++) {
        sanitizeText(input)
      }
      
      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(1000) // Should complete 100 iterations in under 1 second
    })
  })

  describe('Error Handling', () => {
    it('should handle sanitization errors gracefully', () => {
      // Mock DOMPurify to throw an error
      const originalSanitize = require('dompurify').sanitize
      require('dompurify').sanitize = jest.fn().mockImplementation(() => {
        throw new Error('Sanitization failed')
      })

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      
      const input = '<script>alert("xss")</script>Hello'
      const result = sanitizeText(input)
      
      expect(result).toBe('Hello') // Should fallback to regex stripping
      expect(consoleErrorSpy).toHaveBeenCalledWith('Sanitization error:', expect.any(Error))
      
      // Restore original function
      require('dompurify').sanitize = originalSanitize
      consoleErrorSpy.mockRestore()
    })
  })
})