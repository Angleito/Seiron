import { ChatInterface } from '@components/chat/chat-interface'
import { PortfolioSidebar } from '@components/portfolio/portfolio-sidebar'
import { WalletConnect } from '@components/wallet/wallet-connect'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export default function DashboardPage() {
  const [showSidebar, setShowSidebar] = useState(false)

  return (
    <div className="h-screen flex bg-gray-950 overflow-hidden">
      {/* Sleek Sidebar - Hidden on mobile, toggleable */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 transform transition-transform duration-300 ease-in-out
        ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
        bg-gray-900/50 backdrop-blur-xl border-r border-gray-800
      `}>
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              Dragon's Vault
            </h2>
          </div>
          
          {/* Portfolio Content */}
          <div className="flex-1 overflow-y-auto">
            <PortfolioSidebar />
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Minimal Header */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="lg:hidden p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              {showSidebar ? <X className="w-5 h-5 text-gray-400" /> : <Menu className="w-5 h-5 text-gray-400" />}
            </button>
            
            {/* Logo */}
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐉</span>
              <h1 className="text-lg font-medium text-gray-200">Seiron</h1>
            </div>
          </div>

          {/* Wallet Connect */}
          <WalletConnect />
        </header>

        {/* Chat Interface */}
        <main className="flex-1 overflow-hidden">
          <ChatInterface />
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}
    </div>
  )
}