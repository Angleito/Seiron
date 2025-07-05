describe('Voice Input E2E Tests', () => {
  beforeEach(() => {
    // Set up API mocks
    cy.mockBackendAPI();
    cy.mockElevenLabsAPI();
    cy.mockOpenAIAPI();
    
    // Visit the application
    cy.visit('/');
    
    // Connect wallet
    cy.connectWallet();
    cy.waitForPortfolioLoad();
  });

  describe('Voice Command: "Show my portfolio"', () => {
    it('should process voice command and return AI response with audio', () => {
      // Mock specific AI response for portfolio
      const portfolioResponse = 'Your portfolio is worth $1,000,000. You have 500 SEI valued at $500,000 and 500,000 USDC valued at $500,000. You\'re currently earning 5.2% APY on 100,000 USDC supplied to Silo.';
      cy.mockOpenAIAPI(portfolioResponse);
      
      // Start voice recording
      cy.get('[data-testid="voice-input-button"]').click();
      cy.get('[data-testid="voice-recording-indicator"]').should('be.visible');
      cy.get('[data-testid="voice-status"]').should('contain', 'Listening');
      
      // Simulate speech recognition
      cy.speakCommand('Show my portfolio');
      
      // Verify processing states
      cy.get('[data-testid="voice-status"]').should('contain', 'Processing');
      cy.get('[data-testid="ai-thinking-indicator"]').should('be.visible');
      
      // Wait for AI response
      cy.get('[data-testid="ai-response"]', { timeout: 10000 }).should('be.visible');
      cy.get('[data-testid="ai-response"]').should('contain', '$1,000,000');
      cy.get('[data-testid="ai-response"]').should('contain', '500 SEI');
      cy.get('[data-testid="ai-response"]').should('contain', '5.2% APY');
      
      // Verify audio generation
      cy.get('@elevenLabsTTS').should('have.been.called');
      cy.get('[data-testid="audio-player"]').should('exist');
      cy.get('[data-testid="audio-play-button"]').should('be.visible');
    });

    it('should display portfolio breakdown visually', () => {
      cy.speakCommand('Show my portfolio');
      
      // Wait for response
      cy.get('[data-testid="ai-response"]').should('be.visible');
      
      // Verify visual portfolio display
      cy.get('[data-testid="portfolio-chart"]').should('be.visible');
      cy.get('[data-testid="sei-allocation"]').should('contain', '50%');
      cy.get('[data-testid="usdc-allocation"]').should('contain', '50%');
      
      // Verify position cards
      cy.get('[data-testid="position-card-SEI"]').should('be.visible');
      cy.get('[data-testid="position-card-SEI"]').within(() => {
        cy.get('[data-testid="token-amount"]').should('contain', '500');
        cy.get('[data-testid="token-value"]').should('contain', '$500,000');
      });
    });

    it('should handle portfolio with DeFi positions', () => {
      const defiResponse = 'Your total portfolio is worth $1,100,000. In addition to your wallet holdings, you have 100,000 USDC supplied to Silo earning 5.2% APY, generating approximately $14.25 daily.';
      cy.mockOpenAIAPI(defiResponse);
      
      cy.speakCommand('Show my complete portfolio including DeFi');
      
      // Verify DeFi positions are shown
      cy.get('[data-testid="defi-positions"]').should('be.visible');
      cy.get('[data-testid="silo-position"]').within(() => {
        cy.get('[data-testid="supplied-amount"]').should('contain', '100,000 USDC');
        cy.get('[data-testid="apy"]').should('contain', '5.2%');
        cy.get('[data-testid="daily-earnings"]').should('contain', '$14.25');
      });
    });
  });

  describe('Voice Input Features', () => {
    it('should show real-time voice visualization', () => {
      // Start recording
      cy.get('[data-testid="voice-input-button"]').click();
      
      // Verify voice visualization appears
      cy.get('[data-testid="voice-waveform"]').should('be.visible');
      cy.get('[data-testid="voice-amplitude-bars"]').should('have.length.greaterThan', 0);
      
      // Simulate speaking (amplitude changes)
      cy.window().then((win) => {
        const event = new CustomEvent('voiceamplitude', {
          detail: { amplitude: 0.7 }
        });
        win.dispatchEvent(event);
      });
      
      // Verify amplitude visualization updates
      cy.get('[data-testid="voice-amplitude-bars"]').first()
        .should('have.css', 'height')
        .and('match', /[0-9]+px/);
    });

    it('should handle noise cancellation', () => {
      cy.get('[data-testid="voice-settings"]').click();
      cy.get('[data-testid="noise-cancellation-toggle"]').click();
      
      // Start recording with noise cancellation
      cy.get('[data-testid="voice-input-button"]').click();
      cy.get('[data-testid="noise-cancellation-active"]').should('be.visible');
      
      // Speak command
      cy.speakCommand('Show my portfolio');
      
      // Verify clean transcription
      cy.get('[data-testid="transcription-text"]').should('contain', 'Show my portfolio');
      cy.get('[data-testid="transcription-confidence"]').should('contain', 'High');
    });

    it('should support continuous conversation mode', () => {
      // Enable continuous mode
      cy.get('[data-testid="voice-settings"]').click();
      cy.get('[data-testid="continuous-mode-toggle"]').click();
      cy.get('[data-testid="voice-settings-close"]').click();
      
      // First command
      cy.speakCommand('What is my SEI balance?');
      cy.get('[data-testid="ai-response"]').should('contain', '500 SEI');
      
      // Verify mic stays active
      cy.get('[data-testid="voice-recording-indicator"]').should('be.visible');
      
      // Second command without clicking button
      cy.speakCommand('And my USDC?');
      cy.get('[data-testid="ai-response"]').last().should('contain', '500,000 USDC');
      
      // Stop continuous mode
      cy.get('[data-testid="stop-continuous-mode"]').click();
    });
  });

  describe('Audio Output Features', () => {
    it('should stream audio response in real-time', () => {
      // Intercept streaming endpoint
      cy.intercept('POST', '**/v1/text-to-speech/*/stream', (req) => {
        req.reply((res) => {
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Transfer-Encoding', 'chunked');
          res.send('chunk1');
          setTimeout(() => res.send('chunk2'), 100);
          setTimeout(() => res.send('chunk3'), 200);
          setTimeout(() => res.end(), 300);
        });
      }).as('elevenLabsStream');
      
      cy.speakCommand('Show my portfolio');
      
      // Verify streaming indicators
      cy.get('[data-testid="audio-streaming-indicator"]').should('be.visible');
      cy.get('[data-testid="audio-buffer-progress"]').should('be.visible');
      
      // Wait for streaming to complete
      cy.get('[data-testid="audio-streaming-complete"]', { timeout: 5000 }).should('be.visible');
    });

    it('should allow audio playback control', () => {
      cy.speakCommand('Explain DeFi yields');
      
      // Wait for audio to be ready
      cy.get('[data-testid="audio-ready"]').should('be.visible');
      
      // Play audio
      cy.get('[data-testid="audio-play-button"]').click();
      cy.get('[data-testid="audio-playing"]').should('be.visible');
      
      // Pause audio
      cy.get('[data-testid="audio-pause-button"]').click();
      cy.get('[data-testid="audio-paused"]').should('be.visible');
      
      // Skip forward
      cy.get('[data-testid="audio-skip-forward"]').click();
      cy.get('[data-testid="audio-time"]').should('not.contain', '0:00');
      
      // Adjust volume
      cy.get('[data-testid="audio-volume-slider"]').invoke('val', 50).trigger('input');
      cy.get('[data-testid="audio-volume-level"]').should('contain', '50%');
    });

    it('should support different voice profiles', () => {
      // Open voice settings
      cy.get('[data-testid="voice-settings"]').click();
      
      // Select different voice
      cy.get('[data-testid="voice-selector"]').select('Professional');
      cy.get('[data-testid="voice-preview-button"]').click();
      
      // Verify preview plays
      cy.get('@elevenLabsTTS').should('have.been.called');
      
      // Save settings
      cy.get('[data-testid="save-voice-settings"]').click();
      
      // Test with new voice
      cy.speakCommand('Hello');
      cy.get('@elevenLabsTTS').should('have.been.calledWith', 
        Cypress.sinon.match({ voice_id: 'professional-voice-id' })
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle microphone permission denied', () => {
      // Simulate permission denied
      cy.window().then((win) => {
        win.navigator.mediaDevices.getUserMedia = () => 
          Promise.reject(new Error('Permission denied'));
      });
      
      cy.get('[data-testid="voice-input-button"]').click();
      
      // Verify error message
      cy.get('[data-testid="permission-error"]').should('be.visible');
      cy.get('[data-testid="permission-error"]').should('contain', 'Microphone access required');
      cy.get('[data-testid="permission-help-link"]').should('be.visible');
    });

    it('should handle network interruptions gracefully', () => {
      cy.speakCommand('Show my portfolio');
      
      // Simulate network error during AI processing
      cy.intercept('POST', '**/v1/chat/completions', { forceNetworkError: true }).as('networkError');
      
      // Verify error handling
      cy.get('[data-testid="network-error"]').should('be.visible');
      cy.get('[data-testid="retry-button"]').should('be.visible');
      
      // Retry with success
      cy.mockOpenAIAPI();
      cy.get('[data-testid="retry-button"]').click();
      cy.get('[data-testid="ai-response"]').should('be.visible');
    });

    it('should handle audio playback failures', () => {
      // Mock audio failure
      cy.intercept('POST', '**/v1/text-to-speech/**', {
        statusCode: 500,
        body: { error: 'Audio generation failed' }
      }).as('audioError');
      
      cy.speakCommand('Show my portfolio');
      
      // Verify text response still shows
      cy.get('[data-testid="ai-response"]').should('be.visible');
      
      // Verify audio error message
      cy.get('[data-testid="audio-error"]').should('contain', 'Audio unavailable');
      cy.get('[data-testid="text-only-mode"]').should('be.visible');
    });

    it('should handle very long responses', () => {
      const longResponse = 'Your portfolio analysis: ' + 'Lorem ipsum '.repeat(500);
      cy.mockOpenAIAPI(longResponse);
      
      cy.speakCommand('Give me a detailed portfolio analysis');
      
      // Verify response is truncated in UI
      cy.get('[data-testid="ai-response"]').should('be.visible');
      cy.get('[data-testid="show-more-button"]').should('be.visible');
      
      // Expand full response
      cy.get('[data-testid="show-more-button"]').click();
      cy.get('[data-testid="ai-response-full"]').should('be.visible');
    });
  });

  describe('Multi-language Support', () => {
    it('should support voice commands in different languages', () => {
      // Switch to Spanish
      cy.get('[data-testid="language-selector"]').select('es');
      
      // Speak in Spanish
      cy.speakCommand('Muestra mi cartera');
      
      // Verify language detection
      cy.get('[data-testid="detected-language"]').should('contain', 'Spanish');
      
      // Verify response in Spanish
      cy.get('[data-testid="ai-response"]').should('contain', 'cartera vale');
    });
  });
});