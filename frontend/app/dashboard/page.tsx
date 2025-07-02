import { ChatInterface } from '@/components/chat/chat-interface'
import { PortfolioSidebar } from '@/components/portfolio/portfolio-sidebar'
import { WalletConnect } from '@/components/wallet/wallet-connect'

export default function DashboardPage() {
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Portfolio Manager</h1>
            <p className="text-sm text-gray-600">Intelligent crypto portfolio management powered by AI</p>
          </div>
          <WalletConnect />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <main className="flex-1 flex flex-col bg-white">
          <ChatInterface />
        </main>

        {/* Sidebar */}
        <aside className="w-80 border-l">
          <PortfolioSidebar />
        </aside>
      </div>
    </div>
  )
}