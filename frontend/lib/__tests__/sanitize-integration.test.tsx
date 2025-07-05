import React from 'react';
import { render, screen } from '@testing-library/react';
import { sanitizeText, sanitizeChatMessage, sanitizeVoiceTranscript, sanitizeTransactionDescription } from '../sanitize';

// Mock component to test safe rendering
function SafeComponent({ content, type }: { content: string; type: 'text' | 'chat' | 'voice' | 'transaction' }) {
  let sanitizedContent = '';
  
  switch (type) {
    case 'text':
      sanitizedContent = sanitizeText(content);
      break;
    case 'chat':
      sanitizedContent = sanitizeChatMessage(content);
      break;
    case 'voice':
      sanitizedContent = sanitizeVoiceTranscript(content);
      break;
    case 'transaction':
      sanitizedContent = sanitizeTransactionDescription(content);
      break;
  }
  
  return <div data-testid="safe-content">{sanitizedContent}</div>;
}

describe('Sanitization Integration Tests', () => {
  describe('XSS Protection in React Components', () => {
    it('should prevent script injection in text content', () => {
      const maliciousContent = '<script>alert("xss")</script>Hello World';
      
      render(<SafeComponent content={maliciousContent} type="text" />);
      
      const element = screen.getByTestId('safe-content');
      expect(element.textContent).toBe('Hello World');
      expect(element.innerHTML).not.toContain('<script>');
    });

    it('should allow safe formatting in chat messages', () => {
      const chatContent = '<b>Bold text</b> and <i>italic text</i>';
      
      render(<SafeComponent content={chatContent} type="chat" />);
      
      const element = screen.getByTestId('safe-content');
      expect(element.innerHTML).toContain('<b>Bold text</b>');
      expect(element.innerHTML).toContain('<i>italic text</i>');
    });

    it('should remove dangerous attributes from safe tags', () => {
      const maliciousContent = '<b onclick="alert(\'xss\')">Click me</b>';
      
      render(<SafeComponent content={maliciousContent} type="chat" />);
      
      const element = screen.getByTestId('safe-content');
      expect(element.innerHTML).toContain('<b>');
      expect(element.innerHTML).not.toContain('onclick');
    });

    it('should strip all HTML from voice transcripts', () => {
      const voiceContent = 'Buy <script>alert("xss")</script>100 <b>tokens</b>';
      
      render(<SafeComponent content={voiceContent} type="voice" />);
      
      const element = screen.getByTestId('safe-content');
      expect(element.textContent).toBe('Buy 100 tokens');
      expect(element.innerHTML).not.toContain('<script>');
      expect(element.innerHTML).not.toContain('<b>');
    });

    it('should sanitize transaction descriptions safely', () => {
      const transactionContent = '<p>Safe description</p><script>stealWallet()</script>';
      
      render(<SafeComponent content={transactionContent} type="transaction" />);
      
      const element = screen.getByTestId('safe-content');
      expect(element.innerHTML).toContain('<p>Safe description</p>');
      expect(element.innerHTML).not.toContain('<script>');
    });
  });

  describe('Common XSS Attack Vectors', () => {
    const xssVectors = [
      '<img src=x onerror=alert("xss")>',
      '<svg onload=alert("xss")>',
      '<iframe src="javascript:alert(\'xss\')"></iframe>',
      '<object data="javascript:alert(\'xss\')"></object>',
      '<embed src="javascript:alert(\'xss\')"></embed>',
      '<form><button formaction="javascript:alert(\'xss\')">Click</button></form>',
      '<input onfocus="alert(\'xss\')" autofocus>',
      '<details open ontoggle="alert(\'xss\')">',
      '<style>@import"javascript:alert(\'xss\')"</style>',
      '<link rel="import" href="javascript:alert(\'xss\')">',
    ];

    xssVectors.forEach((vector, index) => {
      it(`should neutralize XSS vector ${index + 1}: ${vector.substring(0, 30)}...`, () => {
        render(<SafeComponent content={vector} type="text" />);
        
        const element = screen.getByTestId('safe-content');
        
        // Should not contain dangerous elements or attributes
        expect(element.innerHTML).not.toContain('<script>');
        expect(element.innerHTML).not.toContain('<iframe>');
        expect(element.innerHTML).not.toContain('<object>');
        expect(element.innerHTML).not.toContain('<embed>');
        expect(element.innerHTML).not.toContain('javascript:');
        expect(element.innerHTML).not.toContain('onerror');
        expect(element.innerHTML).not.toContain('onload');
        expect(element.innerHTML).not.toContain('onfocus');
        expect(element.innerHTML).not.toContain('ontoggle');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      render(<SafeComponent content="" type="text" />);
      
      const element = screen.getByTestId('safe-content');
      expect(element.textContent).toBe('');
    });

    it('should handle null/undefined content gracefully', () => {
      render(<SafeComponent content={null as any} type="text" />);
      
      const element = screen.getByTestId('safe-content');
      expect(element.textContent).toBe('');
    });

    it('should handle nested malicious content', () => {
      const nestedContent = '<div><script>alert("nested")</script><p>Safe content</p></div>';
      
      render(<SafeComponent content={nestedContent} type="chat" />);
      
      const element = screen.getByTestId('safe-content');
      expect(element.innerHTML).not.toContain('<script>');
      expect(element.innerHTML).toContain('Safe content');
    });

    it('should handle very long malicious content', () => {
      const longContent = 'A'.repeat(1000) + '<script>alert("xss")</script>' + 'B'.repeat(1000);
      
      render(<SafeComponent content={longContent} type="text" />);
      
      const element = screen.getByTestId('safe-content');
      expect(element.textContent).toContain('A'.repeat(1000));
      expect(element.textContent).toContain('B'.repeat(1000));
      expect(element.innerHTML).not.toContain('<script>');
    });

    it('should preserve special characters and unicode', () => {
      const unicodeContent = 'Hello 世界 🐉 ✨ Special chars: &amp; &lt; &gt;';
      
      render(<SafeComponent content={unicodeContent} type="text" />);
      
      const element = screen.getByTestId('safe-content');
      expect(element.textContent).toContain('Hello 世界 🐉 ✨');
    });
  });

  describe('Performance Considerations', () => {
    it('should handle repeated sanitization efficiently', () => {
      const content = '<script>alert("xss")</script>Safe content';
      const startTime = performance.now();
      
      // Render multiple components with the same content
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<SafeComponent content={content} type="text" />);
        unmount();
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
    });
  });
});