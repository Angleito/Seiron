describe('Action Execution E2E Tests', () => {
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

  describe('Supply Action via Voice Command', () => {
    it('should execute "Supply 10 SEI" with backend sak-execute', () => {
      // Mock AI response for supply action
      cy.mockOpenAIAPI('I\'ll help you supply 10 SEI to Silo lending protocol. This will earn you approximately 4.8% APY. Let me prepare this transaction for you.');
      
      // Mock sak-execute endpoint
      cy.intercept('POST', '**/api/sak-execute', (req) => {
        expect(req.body).to.deep.include({
          action: 'supply',
          amount: '10',
          token: 'SEI',
          protocol: 'silo'
        });
        
        req.reply({
          statusCode: 200,
          body: {
            transactionHash: '0x123abc456def789',
            status: 'success',
            gasUsed: '125000',
            blockNumber: 12345678
          }
        });
      }).as('sakExecute');
      
      // Speak the command
      cy.speakCommand('Supply 10 SEI');
      
      // Verify AI response
      cy.get('[data-testid="ai-response"]').should('contain', 'supply 10 SEI');
      cy.get('[data-testid="ai-response"]').should('contain', '4.8% APY');
      
      // Verify transaction preview
      cy.get('[data-testid="transaction-preview"]').should('be.visible');
      cy.get('[data-testid="tx-action"]').should('contain', 'Supply');
      cy.get('[data-testid="tx-amount"]').should('contain', '10 SEI');
      cy.get('[data-testid="tx-protocol"]').should('contain', 'Silo');
      cy.get('[data-testid="tx-estimated-apy"]').should('contain', '4.8%');
      cy.get('[data-testid="tx-gas-estimate"]').should('contain', '0.125');
      
      // Confirm transaction
      cy.get('[data-testid="confirm-tx-button"]').click();
      
      // Verify loading state
      cy.get('[data-testid="tx-processing"]').should('be.visible');
      cy.get('[data-testid="tx-status"]').should('contain', 'Submitting transaction');
      
      // Wait for sak-execute call
      cy.wait('@sakExecute');
      
      // Verify success state
      cy.get('[data-testid="tx-success"]').should('be.visible');
      cy.get('[data-testid="tx-hash"]').should('contain', '0x123abc456def789');
      cy.get('[data-testid="tx-receipt-link"]').should('have.attr', 'href')
        .and('include', 'seitrace.com');
      
      // Verify portfolio update
      cy.get('[data-testid="sei-balance"]').should('contain', '490 SEI');
      cy.get('[data-testid="silo-sei-balance"]').should('contain', '10 SEI');
    });

    it('should handle complex supply scenarios', () => {
      // Test supplying with specific protocol preference
      cy.mockOpenAIAPI('I\'ll supply 50 USDC to YEI Finance as requested. YEI Finance currently offers 6.2% APY, which is higher than Silo\'s 5.2%.');
      
      cy.speakCommand('Supply 50 USDC to YEI Finance');
      
      // Verify correct protocol selection
      cy.get('[data-testid="tx-protocol"]').should('contain', 'YEI Finance');
      cy.get('[data-testid="tx-estimated-apy"]').should('contain', '6.2%');
      
      // Verify protocol comparison shown
      cy.get('[data-testid="protocol-comparison"]').should('be.visible');
      cy.get('[data-testid="yei-apy"]').should('contain', '6.2%');
      cy.get('[data-testid="silo-apy"]').should('contain', '5.2%');
    });

    it('should validate insufficient balance before execution', () => {
      cy.mockOpenAIAPI('You want to supply 1000 SEI, but you only have 500 SEI available. Would you like to supply a smaller amount instead?');
      
      cy.speakCommand('Supply 1000 SEI');
      
      // Verify validation error
      cy.get('[data-testid="validation-error"]').should('be.visible');
      cy.get('[data-testid="error-message"]').should('contain', 'Insufficient balance');
      cy.get('[data-testid="available-balance"]').should('contain', '500 SEI');
      
      // Verify suggested alternatives
      cy.get('[data-testid="suggested-amounts"]').should('be.visible');
      cy.get('[data-testid="suggestion-1"]').should('contain', 'Supply 400 SEI');
      cy.get('[data-testid="suggestion-2"]').should('contain', 'Supply 250 SEI');
    });
  });

  describe('Withdraw Action Execution', () => {
    it('should execute withdrawal from lending protocol', () => {
      // Mock existing lending position
      cy.intercept('GET', '**/api/portfolio/**', {
        statusCode: 200,
        body: {
          wallet: { SEI: '400', USDC: '400000' },
          defi: {
            silo: {
              supplied: { SEI: '100', USDC: '100000' },
              borrowed: {}
            }
          }
        }
      }).as('portfolioWithDefi');
      
      cy.mockOpenAIAPI('I\'ll withdraw 50 SEI from Silo for you. This will be returned to your wallet immediately.');
      
      // Execute withdraw command
      cy.speakCommand('Withdraw 50 SEI from lending');
      
      // Verify transaction details
      cy.get('[data-testid="tx-action"]').should('contain', 'Withdraw');
      cy.get('[data-testid="tx-amount"]').should('contain', '50 SEI');
      cy.get('[data-testid="tx-from-protocol"]').should('contain', 'Silo');
      
      // Mock sak-execute for withdrawal
      cy.intercept('POST', '**/api/sak-execute', {
        statusCode: 200,
        body: {
          transactionHash: '0xwithdraw123',
          status: 'success'
        }
      }).as('sakWithdraw');
      
      // Confirm and execute
      cy.confirmTransaction();
      cy.wait('@sakWithdraw');
      
      // Verify portfolio updates
      cy.get('[data-testid="sei-balance"]').should('contain', '450 SEI');
      cy.get('[data-testid="silo-sei-balance"]').should('contain', '50 SEI');
    });
  });

  describe('Swap Action Execution', () => {
    it('should execute token swap via DragonSwap', () => {
      cy.mockOpenAIAPI('I\'ll swap 100 USDC for SEI using DragonSwap. At current rates, you\'ll receive approximately 0.1 SEI.');
      
      // Mock price quote
      cy.intercept('GET', '**/api/quote**', {
        statusCode: 200,
        body: {
          fromAmount: '100',
          toAmount: '0.1',
          rate: '0.001',
          priceImpact: '0.1',
          route: ['USDC', 'SEI']
        }
      }).as('priceQuote');
      
      // Execute swap command
      cy.speakCommand('Swap 100 USDC for SEI');
      
      // Wait for quote
      cy.wait('@priceQuote');
      
      // Verify swap preview
      cy.get('[data-testid="swap-preview"]').should('be.visible');
      cy.get('[data-testid="swap-from"]').should('contain', '100 USDC');
      cy.get('[data-testid="swap-to"]').should('contain', '0.1 SEI');
      cy.get('[data-testid="swap-rate"]').should('contain', '1 USDC = 0.001 SEI');
      cy.get('[data-testid="price-impact"]').should('contain', '0.1%');
      
      // Mock sak-execute for swap
      cy.intercept('POST', '**/api/sak-execute', (req) => {
        expect(req.body).to.deep.include({
          action: 'swap',
          fromToken: 'USDC',
          fromAmount: '100',
          toToken: 'SEI',
          minAmountOut: '0.0995' // With 0.5% slippage
        });
        
        req.reply({
          statusCode: 200,
          body: {
            transactionHash: '0xswap123',
            actualAmountOut: '0.1002'
          }
        });
      }).as('sakSwap');
      
      // Confirm swap
      cy.confirmTransaction();
      cy.wait('@sakSwap');
      
      // Verify success with actual amounts
      cy.get('[data-testid="swap-success"]').should('be.visible');
      cy.get('[data-testid="received-amount"]').should('contain', '0.1002 SEI');
      cy.get('[data-testid="positive-slippage"]').should('be.visible');
    });

    it('should handle high slippage warning', () => {
      // Mock high price impact quote
      cy.intercept('GET', '**/api/quote**', {
        statusCode: 200,
        body: {
          fromAmount: '10000',
          toAmount: '9.5',
          priceImpact: '5.2'
        }
      }).as('highImpactQuote');
      
      cy.speakCommand('Swap 10000 USDC for SEI');
      cy.wait('@highImpactQuote');
      
      // Verify slippage warning
      cy.get('[data-testid="high-slippage-warning"]').should('be.visible');
      cy.get('[data-testid="price-impact-alert"]').should('contain', '5.2%');
      cy.get('[data-testid="suggested-smaller-amount"]').should('be.visible');
      
      // User can adjust or proceed
      cy.get('[data-testid="adjust-amount-button"]').should('be.visible');
      cy.get('[data-testid="proceed-anyway-button"]').should('be.visible');
    });
  });

  describe('Multi-step Transactions', () => {
    it('should handle approval before supply', () => {
      cy.mockOpenAIAPI('I need to approve USDC spending before supplying. This is a two-step process for your security.');
      
      cy.speakCommand('Supply 1000 USDC');
      
      // First step: Approval
      cy.get('[data-testid="approval-required"]').should('be.visible');
      cy.get('[data-testid="approval-step"]').should('contain', 'Step 1 of 2');
      
      // Mock approval transaction
      cy.intercept('POST', '**/api/sak-execute', (req) => {
        if (req.body.action === 'approve') {
          req.reply({
            statusCode: 200,
            body: { transactionHash: '0xapprove123' }
          });
        }
      }).as('sakApprove');
      
      cy.get('[data-testid="approve-button"]').click();
      cy.wait('@sakApprove');
      
      // Second step: Supply
      cy.get('[data-testid="supply-step"]').should('contain', 'Step 2 of 2');
      cy.get('[data-testid="approval-complete"]').should('be.visible');
      
      // Mock supply transaction
      cy.intercept('POST', '**/api/sak-execute', (req) => {
        if (req.body.action === 'supply') {
          req.reply({
            statusCode: 200,
            body: { transactionHash: '0xsupply123' }
          });
        }
      }).as('sakSupply');
      
      cy.get('[data-testid="supply-button"]').click();
      cy.wait('@sakSupply');
      
      // Verify both transactions completed
      cy.get('[data-testid="multi-tx-success"]').should('be.visible');
      cy.get('[data-testid="tx-1-hash"]').should('contain', '0xapprove123');
      cy.get('[data-testid="tx-2-hash"]').should('contain', '0xsupply123');
    });
  });

  describe('Transaction Status Tracking', () => {
    it('should show real-time transaction status', () => {
      // Mock pending transaction
      cy.intercept('POST', '**/api/sak-execute', {
        statusCode: 200,
        body: {
          transactionHash: '0xpending123',
          status: 'pending'
        }
      }).as('sakPending');
      
      // Mock transaction status polling
      let pollCount = 0;
      cy.intercept('GET', '**/api/transaction/*', (req) => {
        pollCount++;
        const statuses = ['pending', 'pending', 'confirmed'];
        req.reply({
          statusCode: 200,
          body: {
            status: statuses[Math.min(pollCount - 1, 2)],
            confirmations: pollCount - 1,
            blockNumber: pollCount > 2 ? 12345678 : null
          }
        });
      }).as('txStatus');
      
      cy.speakCommand('Supply 20 SEI');
      cy.confirmTransaction();
      
      // Verify pending state
      cy.get('[data-testid="tx-pending"]').should('be.visible');
      cy.get('[data-testid="tx-confirmations"]').should('contain', '0/12');
      
      // Wait for confirmations
      cy.get('[data-testid="tx-confirmations"]', { timeout: 10000 })
        .should('contain', '1/12');
      
      // Verify confirmed state
      cy.get('[data-testid="tx-confirmed"]', { timeout: 15000 }).should('be.visible');
      cy.get('[data-testid="view-on-explorer"]').should('be.visible');
    });

    it('should handle transaction failures gracefully', () => {
      // Mock transaction failure
      cy.intercept('POST', '**/api/sak-execute', {
        statusCode: 200,
        body: {
          transactionHash: '0xfailed123',
          status: 'failed',
          error: 'Transaction reverted: Insufficient liquidity'
        }
      }).as('sakFailed');
      
      cy.speakCommand('Swap 50000 USDC for SEI');
      cy.confirmTransaction();
      cy.wait('@sakFailed');
      
      // Verify failure handling
      cy.get('[data-testid="tx-failed"]').should('be.visible');
      cy.get('[data-testid="failure-reason"]').should('contain', 'Insufficient liquidity');
      cy.get('[data-testid="retry-transaction"]').should('be.visible');
      cy.get('[data-testid="contact-support"]').should('be.visible');
      
      // Verify AI provides helpful response
      cy.get('[data-testid="ai-failure-response"]')
        .should('contain', 'The transaction failed due to insufficient liquidity');
    });
  });

  describe('Gas Optimization', () => {
    it('should suggest gas optimization for transactions', () => {
      // Mock gas prices
      cy.intercept('GET', '**/api/gas-prices', {
        statusCode: 200,
        body: {
          slow: { price: '5', time: '5 min' },
          standard: { price: '10', time: '2 min' },
          fast: { price: '20', time: '30 sec' }
        }
      }).as('gasPrices');
      
      cy.speakCommand('Supply 100 SEI quickly');
      cy.wait('@gasPrices');
      
      // Verify gas options
      cy.get('[data-testid="gas-selector"]').should('be.visible');
      cy.get('[data-testid="gas-option-slow"]').should('contain', '5 Gwei');
      cy.get('[data-testid="gas-option-standard"]').should('be.selected');
      cy.get('[data-testid="gas-option-fast"]').should('contain', '20 Gwei');
      
      // Select fast option based on voice command
      cy.get('[data-testid="gas-option-fast"]').click();
      cy.get('[data-testid="estimated-time"]').should('contain', '30 sec');
    });
  });
});