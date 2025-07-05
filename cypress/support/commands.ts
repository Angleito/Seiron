// ***********************************************
// Custom commands for Cypress tests
// ***********************************************

// Wallet connection commands
Cypress.Commands.add('connectWallet', (address?: string) => {
  const walletAddress = address || Cypress.env('testWalletAddress');
  
  // Mock Privy wallet connection
  cy.window().then((win) => {
    // Simulate wallet connection in Privy
    win.localStorage.setItem('privy:user', JSON.stringify({
      id: 'test-user-id',
      wallet: {
        address: walletAddress,
        chainId: 1329, // Sei testnet
        connectorType: 'injected'
      }
    }));
  });
  
  // Click connect wallet button
  cy.get('[data-testid="wallet-connect-button"]').click();
  
  // Wait for wallet to be connected
  cy.get('[data-testid="wallet-address"]').should('contain', walletAddress.slice(0, 6));
});

Cypress.Commands.add('disconnectWallet', () => {
  cy.window().then((win) => {
    win.localStorage.removeItem('privy:user');
  });
  cy.get('[data-testid="wallet-disconnect-button"]').click();
});

// Voice interaction commands
Cypress.Commands.add('speakCommand', (command: string) => {
  // Simulate voice input
  cy.get('[data-testid="voice-input-button"]').click();
  
  // Wait for recording to start
  cy.get('[data-testid="voice-recording-indicator"]').should('be.visible');
  
  // Simulate speech recognition result
  cy.window().then((win) => {
    const event = new CustomEvent('speechrecognitionresult', {
      detail: { transcript: command }
    });
    win.dispatchEvent(event);
  });
  
  // Stop recording
  cy.get('[data-testid="voice-input-button"]').click();
  
  // Wait for AI response
  cy.get('[data-testid="ai-response"]').should('be.visible');
});

// Transaction commands
Cypress.Commands.add('confirmTransaction', (expectedDetails?: Partial<TransactionDetails>) => {
  // Wait for transaction modal
  cy.get('[data-testid="transaction-modal"]').should('be.visible');
  
  // Verify transaction details if provided
  if (expectedDetails) {
    if (expectedDetails.action) {
      cy.get('[data-testid="transaction-action"]').should('contain', expectedDetails.action);
    }
    if (expectedDetails.amount) {
      cy.get('[data-testid="transaction-amount"]').should('contain', expectedDetails.amount);
    }
    if (expectedDetails.token) {
      cy.get('[data-testid="transaction-token"]').should('contain', expectedDetails.token);
    }
  }
  
  // Confirm transaction
  cy.get('[data-testid="confirm-transaction-button"]').click();
  
  // Wait for transaction to complete
  cy.get('[data-testid="transaction-status"]').should('contain', 'Success');
});

// API mocking commands
Cypress.Commands.add('mockElevenLabsAPI', () => {
  cy.intercept('POST', '**/v1/text-to-speech/**', {
    statusCode: 200,
    headers: { 'Content-Type': 'audio/mpeg' },
    body: 'mock-audio-data'
  }).as('elevenLabsTTS');
});

Cypress.Commands.add('mockOpenAIAPI', (response?: string) => {
  cy.intercept('POST', '**/v1/chat/completions', {
    statusCode: 200,
    body: {
      id: 'mock-completion',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: response || 'I\'ll help you with that transaction.'
        },
        finish_reason: 'stop'
      }]
    }
  }).as('openAIChat');
});

Cypress.Commands.add('mockBackendAPI', () => {
  // Mock portfolio endpoint
  cy.intercept('GET', '**/api/portfolio/**', {
    statusCode: 200,
    body: {
      totalValue: '1000000',
      positions: [
        { token: 'SEI', amount: '500', value: '500000' },
        { token: 'USDC', amount: '500000', value: '500000' }
      ]
    }
  }).as('getPortfolio');
  
  // Mock execute endpoint
  cy.intercept('POST', '**/api/execute', (req) => {
    req.reply({
      statusCode: 200,
      body: {
        transactionHash: '0x' + 'a'.repeat(64),
        status: 'success',
        gasUsed: '100000'
      }
    });
  }).as('executeTransaction');
});

// Portfolio commands
Cypress.Commands.add('waitForPortfolioLoad', () => {
  cy.get('[data-testid="portfolio-loading"]').should('not.exist');
  cy.get('[data-testid="portfolio-container"]').should('be.visible');
});

// Utility commands
Cypress.Commands.add('waitForAnimation', (duration = 1000) => {
  cy.wait(duration);
});

// Type declarations
declare global {
  namespace Cypress {
    interface Chainable {
      connectWallet(address?: string): Chainable<void>;
      disconnectWallet(): Chainable<void>;
      speakCommand(command: string): Chainable<void>;
      confirmTransaction(expectedDetails?: Partial<TransactionDetails>): Chainable<void>;
      mockElevenLabsAPI(): Chainable<void>;
      mockOpenAIAPI(response?: string): Chainable<void>;
      mockBackendAPI(): Chainable<void>;
      waitForPortfolioLoad(): Chainable<void>;
      waitForAnimation(duration?: number): Chainable<void>;
    }
  }
}

interface TransactionDetails {
  action: string;
  amount: string;
  token: string;
  protocol?: string;
}

export {};