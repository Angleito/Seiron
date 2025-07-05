/**
 * Example: Confirmation Flow Integration
 * 
 * This example demonstrates how the confirmation flow works:
 * 1. User initiates a transaction (e.g., lending supply)
 * 2. Backend creates a pending transaction requiring confirmation
 * 3. Frontend receives confirmation request via WebSocket
 * 4. User confirms/rejects via UI
 * 5. Backend executes the transaction only after confirmation
 */

// Example 1: Frontend initiates a lending operation
async function exampleLendingWithConfirmation() {
  // Mock variables for example
  const socket = {} as any; // Mock socket
  const transactionId = 'uuid-example'; // Mock transaction ID
  
  // Step 1: Frontend sends request to create pending transaction
  const response = await fetch('/api/portfolio/lending/supply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletAddress: '0x123...',
      asset: '0xSEI...',
      amount: '1000',
      requireConfirmation: true // This triggers confirmation flow
    })
  });

  const result = await response.json();
  console.log('Pending transaction created:', result);
  // Response: { success: true, data: { transactionId: 'uuid-here' }, requiresConfirmation: true }

  // Step 2: Frontend receives WebSocket event with confirmation details
  // Event: 'portfolio_update' with type: 'confirmation_required'
  socket.on('portfolio_update', (update: any) => {
    if (update.type === 'confirmation_required') {
      const { transactionId, transaction } = update.data;
      
      // Display confirmation UI with transaction details
      // showConfirmationDialog({ // Commented out for build
      console.log('Show confirmation dialog:', {
        id: transactionId,
        summary: transaction.summary,
        risks: transaction.risks,
        expiresAt: transaction.expiresAt
      }); // })
    }
  });

  // Step 3: User confirms via UI (or WebSocket)
  
  // Option A: Via REST API
  const confirmResponse = await fetch(`/api/confirm/${transactionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletAddress: '0x123...'
    })
  });

  // Option B: Via WebSocket
  socket.emit('confirm_transaction', {
    transactionId: 'uuid-here',
    walletAddress: '0x123...'
  });

  // Step 4: Execute the confirmed transaction
  const executeResponse = await fetch('/api/portfolio/lending/supply/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transactionId: 'uuid-here',
      walletAddress: '0x123...'
    })
  });

  const executeResult = await executeResponse.json();
  console.log('Transaction executed:', executeResult);
  // Response: { success: true, data: { txHash: '0x...', newSnapshot: {...} } }
}

// Example 2: Rejecting a transaction
async function exampleRejectTransaction() {
  // Mock variables for example
  const socket = {} as any; // Mock socket
  const transactionId = 'uuid-example'; // Mock transaction ID
  
  // Via REST API
  const rejectResponse = await fetch(`/api/reject/${transactionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletAddress: '0x123...',
      reason: 'User changed their mind'
    })
  });

  // Or via WebSocket
  socket.emit('reject_transaction', {
    transactionId: 'uuid-here',
    walletAddress: '0x123...',
    reason: 'Too risky'
  });
}

// Example 3: WebSocket event flow
function setupWebSocketListeners() {
  // Mock variables for example
  const io = {} as any; // Mock io
  const walletAddress = '0x123...'; // Mock wallet address
  
  const socket = io('http://localhost:8000');

  // Join portfolio room
  socket.emit('join_portfolio', walletAddress);

  // Listen for confirmation requests
  socket.on('portfolio_update', (update) => {
    switch (update.type) {
      case 'confirmation_required':
        // Show confirmation UI
        const { transactionId, transaction } = update.data;
        console.log('Confirmation required for:', transaction.summary);
        break;

      case 'transaction_confirmed':
        // Update UI to show transaction was confirmed
        console.log('Transaction confirmed:', update.data);
        break;

      case 'transaction_rejected':
        // Update UI to show transaction was rejected
        console.log('Transaction rejected:', update.data);
        break;

      case 'transaction_expired':
        // Update UI to show transaction expired
        console.log('Transaction expired:', update.data);
        break;
    }
  });

  // Get pending transactions on connect
  socket.emit('get_pending_transactions', walletAddress);
  
  socket.on('pending_transactions', (result) => {
    if (result.success) {
      console.log('Pending transactions:', result.data);
      // Display any pending confirmations
    }
  });
}

// Example 4: Risk-based confirmation
async function exampleHighRiskTransaction() {
  // Mock variables for example
  const socket = {} as any; // Mock socket
  
  // High-value transaction will have critical risks
  const response = await fetch('/api/portfolio/lending/supply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletAddress: '0x123...',
      asset: '0xSEI...',
      amount: '1000000', // Very large amount
      requireConfirmation: true
    })
  });

  // The pending transaction will include risk warnings
  socket.on('portfolio_update', (update: any) => {
    if (update.type === 'confirmation_required') {
      const { transaction } = update.data;
      
      // Display risks prominently
      transaction.risks.forEach(risk => {
        if (risk.severity === 'critical' || risk.severity === 'high') {
          console.warn(`⚠️ ${risk.message}`);
          if (risk.mitigation) {
            console.info(`💡 Suggestion: ${risk.mitigation}`);
          }
        }
      });
    }
  });
}

// Example 5: Transaction expiration handling
async function exampleExpirationHandling() {
  // Mock variables for example
  const socket = {} as any; // Mock socket
  
  // Transactions expire after 5 minutes by default
  let transactionId: string;

  socket.on('portfolio_update', (update: any) => {
    if (update.type === 'confirmation_required') {
      transactionId = update.data.transactionId;
      const expiresAt = update.data.transaction.expiresAt;
      
      // Calculate time remaining
      const timeRemaining = expiresAt - Date.now();
      
      // Set up countdown timer in UI
      const countdown = setInterval(() => {
        const remaining = expiresAt - Date.now();
        if (remaining <= 0) {
          clearInterval(countdown);
          console.log('Transaction expired');
        } else {
          console.log(`Time remaining: ${Math.floor(remaining / 1000)}s`);
        }
      }, 1000);
    }

    if (update.type === 'transaction_expired') {
      // Clean up UI, hide confirmation dialog
      console.log('Transaction expired:', update.data.transactionId);
    }
  });
}

export {
  exampleLendingWithConfirmation,
  exampleRejectTransaction,
  setupWebSocketListeners,
  exampleHighRiskTransaction,
  exampleExpirationHandling
};