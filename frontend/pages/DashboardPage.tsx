import { ChatInterface } from '@components/chat/chat-interface'
import { PortfolioSidebar } from '@components/portfolio/portfolio-sidebar'
import { WalletConnect } from '@components/wallet/wallet-connect'

export default function DashboardPage() {
  return (
    <div className="h-screen flex flex-col bg-black overflow-hidden">
      {/* Compact Dragon-themed Header */}
      <header className="border-b border-red-900/20 bg-gradient-to-r from-black via-red-950/10 to-black px-3 py-1 shadow-md backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-red-400">
              Seiron
            </h1>
            <p className="text-xs text-orange-300 hidden sm:block">
              Dragon of Financial Wisdom
            </p>
          </div>
          <div className="relative">
            {/* Mystical glow effect around wallet connect */}
            <div className="absolute inset-0 bg-red-500/10 rounded-lg blur-sm"></div>
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <main className="flex-1 flex flex-col bg-black">
          <ChatInterface />
        </main>

        {/* Sidebar */}
        <aside className="w-64 border-l border-red-900/20 bg-black overflow-y-auto">
          <PortfolioSidebar />
        </aside>
      </div>
    </div>
  )
}