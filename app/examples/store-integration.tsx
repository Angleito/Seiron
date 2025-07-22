'use client';

import { useAuth, usePortfolio, useChat, useUI, useNotifications } from '../hooks';

// Example component showing store integration
export function StoreIntegrationExample() {
  const { user, isAuthenticated, connectWallet, logout } = useAuth();
  const { positions, stats, fetchPortfolio, isLoading: portfolioLoading } = usePortfolio();
  const { sendMessage, currentSession, startNewChat } = useChat();
  const { theme, setTheme, openModal, sidebarOpen, toggleSidebar } = useUI();
  const notify = useNotifications();
  
  // Example: Handle wallet connection with notifications
  const handleWalletConnect = async () => {
    try {
      // Mock wallet address - in real app, get from Privy or wallet provider
      const mockAddress = '0x1234567890123456789012345678901234567890';
      await connectWallet(mockAddress);
      
      // Fetch portfolio after wallet connection
      await fetchPortfolio();
    } catch (error) {
      notify.error('Failed to connect wallet', error.message);
    }
  };
  
  // Example: Send chat message with portfolio context
  const askAboutPortfolio = async () => {
    if (!isAuthenticated) {
      notify.warning('Please connect your wallet first');
      return;
    }
    
    if (!currentSession) {
      startNewChat();
    }
    
    await sendMessage(`What's my current portfolio performance?`);
  };
  
  // Example: Open transaction modal with data
  const handleTransaction = (type: 'buy' | 'sell', symbol: string) => {
    openModal('transaction-confirm', {
      type,
      symbol,
      onConfirm: async (amount: number) => {
        notify.info(`Processing ${type} order...`, `${amount} ${symbol}`);
        // Process transaction...
      },
    });
  };
  
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Store Integration Example</h1>
      
      {/* Auth Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Authentication</h2>
        {isAuthenticated ? (
          <div className="space-y-2">
            <p>Connected as: {user?.walletAddress || user?.email}</p>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={handleWalletConnect}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Connect Wallet
          </button>
        )}
      </section>
      
      {/* Portfolio Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Portfolio</h2>
        {portfolioLoading ? (
          <p>Loading portfolio...</p>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded">
              <p className="text-sm text-gray-500">Total Value</p>
              <p className="text-2xl font-bold">${stats.totalValue.toLocaleString()}</p>
            </div>
            <div className="p-4 border rounded">
              <p className="text-sm text-gray-500">Total P&L</p>
              <p className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${stats.totalPnL.toLocaleString()} ({stats.totalPnLPercentage.toFixed(2)}%)
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No portfolio data available</p>
        )}
        
        {/* Position Actions */}
        <div className="flex gap-2">
          {positions.slice(0, 3).map(position => (
            <div key={position.id} className="flex gap-2">
              <button
                onClick={() => handleTransaction('buy', position.symbol)}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm"
              >
                Buy {position.symbol}
              </button>
              <button
                onClick={() => handleTransaction('sell', position.symbol)}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm"
              >
                Sell {position.symbol}
              </button>
            </div>
          ))}
        </div>
      </section>
      
      {/* Chat Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">AI Assistant</h2>
        <button
          onClick={askAboutPortfolio}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Ask About Portfolio
        </button>
        <div className="p-4 border rounded max-h-64 overflow-y-auto">
          {currentSession?.messages.map(msg => (
            <div key={msg.id} className={`mb-2 ${msg.role === 'user' ? 'text-right' : ''}`}>
              <span className="text-sm text-gray-500">{msg.role}:</span>
              <p>{msg.content}</p>
            </div>
          ))}
        </div>
      </section>
      
      {/* UI Controls */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">UI Controls</h2>
        <div className="flex gap-4">
          <button
            onClick={toggleSidebar}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Toggle Sidebar ({sidebarOpen ? 'Open' : 'Closed'})
          </button>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as any)}
            className="px-4 py-2 border rounded"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </div>
        
        {/* Notification Examples */}
        <div className="flex gap-2">
          <button
            onClick={() => notify.success('Success!', 'Operation completed')}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm"
          >
            Success
          </button>
          <button
            onClick={() => notify.error('Error!', 'Something went wrong')}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm"
          >
            Error
          </button>
          <button
            onClick={() => notify.warning('Warning!', 'Please be careful')}
            className="px-3 py-1 bg-yellow-500 text-white rounded text-sm"
          >
            Warning
          </button>
          <button
            onClick={() => notify.info('Info', 'Just so you know')}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
          >
            Info
          </button>
        </div>
      </section>
    </div>
  );
}