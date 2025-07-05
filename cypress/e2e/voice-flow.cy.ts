describe('Voice Flow E2E Tests', () => {
  beforeEach(() => {
    // Set up API mocks
    cy.mockBackendAPI();
    cy.mockElevenLabsAPI();
    cy.mockOpenAIAPI();
    
    // Visit the application
    cy.visit('/');
    
    // Wait for initial load
    cy.get('[data-testid="app-container"]').should('be.visible');
  });

  describe('Wallet Connection Flow', () => {
    it('should display prices when wallet is not connected', () => {
      // Verify wallet is not connected
      cy.get('[data-testid="wallet-connect-button"]').should('be.visible');
      
      // Check that price display is shown
      cy.get('[data-testid="price-display"]').should('be.visible');
      cy.get('[data-testid="sei-price"]').should('contain', '$');
      cy.get('[data-testid="usdc-price"]').should('contain', '$1.00');
    });

    it('should switch from prices to balances when wallet connects', () => {
      // Initially show prices
      cy.get('[data-testid="price-display"]').should('be.visible');
      
      // Connect wallet
      cy.connectWallet();
      
      // Wait for portfolio to load
      cy.waitForPortfolioLoad();
      
      // Verify prices are replaced with balances
      cy.get('[data-testid="price-display"]').should('not.exist');
      cy.get('[data-testid="portfolio-display"]').should('be.visible');
      
      // Check balance display
      cy.get('[data-testid="sei-balance"]').should('contain', '500 SEI');
      cy.get('[data-testid="usdc-balance"]').should('contain', '500,000 USDC');
      cy.get('[data-testid="total-value"]').should('contain', '$1,000,000');
    });

    it('should maintain balance display after page refresh', () => {
      // Connect wallet
      cy.connectWallet();
      cy.waitForPortfolioLoad();
      
      // Refresh the page
      cy.reload();
      
      // Verify wallet stays connected and balances are shown
      cy.get('[data-testid="wallet-address"]').should('be.visible');
      cy.get('[data-testid="portfolio-display"]').should('be.visible');
      cy.get('[data-testid="price-display"]').should('not.exist');
    });
  });

  describe('Voice Assistant Integration', () => {
    beforeEach(() => {
      // Connect wallet first
      cy.connectWallet();
      cy.waitForPortfolioLoad();
    });

    it('should respond to "Show my portfolio" voice command', () => {
      // Mock specific AI response for portfolio query
      cy.mockOpenAIAPI('Here\'s your portfolio summary: You have 500 SEI worth $500,000 and 500,000 USDC. Your total portfolio value is $1,000,000.');
      
      // Speak the command
      cy.speakCommand('Show my portfolio');
      
      // Verify AI response
      cy.get('[data-testid="ai-response"]').should('contain', 'portfolio summary');
      cy.get('[data-testid="ai-response"]').should('contain', '$1,000,000');
      
      // Verify audio playback started
      cy.get('[data-testid="audio-player"]').should('exist');
      cy.get('@elevenLabsTTS').should('have.been.called');
    });

    it('should handle voice command with audio streaming', () => {
      // Enable audio
      cy.get('[data-testid="audio-toggle"]').click();
      cy.get('[data-testid="audio-enabled-indicator"]').should('be.visible');
      
      // Speak command
      cy.speakCommand('What are the current APYs?');
      
      // Wait for AI response
      cy.get('[data-testid="ai-response"]').should('be.visible');
      
      // Verify audio streaming started
      cy.get('[data-testid="audio-streaming-indicator"]').should('be.visible');
      cy.get('@elevenLabsTTS').should('have.been.called');
      
      // Wait for audio to complete
      cy.get('[data-testid="audio-streaming-indicator"]', { timeout: 10000 }).should('not.exist');
    });

    it('should maintain conversation context', () => {
      // First command
      cy.speakCommand('Show my SEI balance');
      cy.get('[data-testid="ai-response"]').should('contain', '500 SEI');
      
      // Follow-up command using context
      cy.mockOpenAIAPI('I\'ll help you supply 100 SEI. This will leave you with 400 SEI in your wallet.');
      cy.speakCommand('Supply 100 of it');
      
      // Verify context was maintained
      cy.get('[data-testid="ai-response"]').should('contain', '100 SEI');
      cy.get('[data-testid="transaction-preview"]').should('be.visible');
    });
  });

  describe('Action Execution Flow', () => {
    beforeEach(() => {
      cy.connectWallet();
      cy.waitForPortfolioLoad();
    });

    it('should execute "Supply 10 SEI" voice command', () => {
      // Mock AI response for supply action
      cy.mockOpenAIAPI('I\'ll help you supply 10 SEI to the lending protocol. This transaction will earn you approximately 5% APY.');
      
      // Speak the command
      cy.speakCommand('Supply 10 SEI');
      
      // Verify AI response and transaction preview
      cy.get('[data-testid="ai-response"]').should('contain', 'supply 10 SEI');
      cy.get('[data-testid="transaction-preview"]').should('be.visible');
      
      // Verify transaction details
      cy.get('[data-testid="transaction-action"]').should('contain', 'Supply');
      cy.get('[data-testid="transaction-amount"]').should('contain', '10');
      cy.get('[data-testid="transaction-token"]').should('contain', 'SEI');
      cy.get('[data-testid="transaction-protocol"]').should('contain', 'Lending');
      
      // Confirm transaction
      cy.confirmTransaction({
        action: 'Supply',
        amount: '10',
        token: 'SEI'
      });
      
      // Verify backend execute was called
      cy.get('@executeTransaction').should('have.been.called');
      
      // Verify success message
      cy.get('[data-testid="transaction-success"]').should('be.visible');
      cy.get('[data-testid="transaction-hash"]').should('contain', '0x');
    });

    it('should handle transaction with risk warning', () => {
      // Mock high-risk response
      cy.mockOpenAIAPI('Warning: Supplying 400 SEI represents 80% of your SEI holdings. This is a high-risk allocation. Are you sure you want to proceed?');
      
      // Speak high-amount command
      cy.speakCommand('Supply 400 SEI');
      
      // Verify risk warning appears
      cy.get('[data-testid="risk-warning"]').should('be.visible');
      cy.get('[data-testid="risk-warning-message"]').should('contain', '80%');
      
      // User can cancel
      cy.get('[data-testid="cancel-button"]').click();
      cy.get('[data-testid="transaction-preview"]').should('not.exist');
    });

    it('should execute complex swap command', () => {
      cy.mockOpenAIAPI('I\'ll swap 100 USDC for SEI at the current rate. You\'ll receive approximately 0.1 SEI.');
      
      // Speak swap command
      cy.speakCommand('Swap 100 USDC for SEI');
      
      // Verify swap preview
      cy.get('[data-testid="transaction-preview"]').should('be.visible');
      cy.get('[data-testid="swap-from-amount"]').should('contain', '100');
      cy.get('[data-testid="swap-from-token"]').should('contain', 'USDC');
      cy.get('[data-testid="swap-to-amount"]').should('contain', '0.1');
      cy.get('[data-testid="swap-to-token"]').should('contain', 'SEI');
      
      // Confirm and execute
      cy.confirmTransaction();
      cy.get('@executeTransaction').should('have.been.called');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      cy.connectWallet();
      cy.waitForPortfolioLoad();
    });

    it('should handle voice recognition errors gracefully', () => {
      // Simulate voice recognition error
      cy.get('[data-testid="voice-input-button"]').click();
      
      cy.window().then((win) => {
        const event = new CustomEvent('speechrecognitionerror', {
          detail: { error: 'no-speech' }
        });
        win.dispatchEvent(event);
      });
      
      // Verify error message
      cy.get('[data-testid="voice-error"]').should('contain', 'Could not detect speech');
    });

    it('should handle API errors gracefully', () => {
      // Mock API error
      cy.intercept('POST', '**/v1/chat/completions', {
        statusCode: 500,
        body: { error: 'Internal server error' }
      }).as('openAIError');
      
      // Try voice command
      cy.speakCommand('Show my portfolio');
      
      // Verify error handling
      cy.get('[data-testid="error-message"]').should('contain', 'Something went wrong');
      cy.get('[data-testid="retry-button"]').should('be.visible');
    });

    it('should handle transaction failures', () => {
      // Mock transaction failure
      cy.intercept('POST', '**/api/execute', {
        statusCode: 400,
        body: { error: 'Insufficient balance' }
      }).as('executeError');
      
      cy.speakCommand('Supply 1000 SEI');
      cy.confirmTransaction();
      
      // Verify error display
      cy.get('[data-testid="transaction-error"]').should('contain', 'Insufficient balance');
      cy.get('[data-testid="transaction-status"]').should('contain', 'Failed');
    });
  });

  describe('Accessibility', () => {
    it('should support keyboard navigation for voice controls', () => {
      // Tab to voice button
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-testid', 'voice-input-button');
      
      // Activate with Enter key
      cy.focused().type('{enter}');
      cy.get('[data-testid="voice-recording-indicator"]').should('be.visible');
      
      // Escape to cancel
      cy.get('body').type('{esc}');
      cy.get('[data-testid="voice-recording-indicator"]').should('not.exist');
    });

    it('should announce voice responses to screen readers', () => {
      cy.speakCommand('Show my portfolio');
      
      // Verify ARIA live region is updated
      cy.get('[aria-live="polite"]').should('contain', 'AI response received');
      cy.get('[role="status"]').should('contain', 'portfolio summary');
    });
  });
});