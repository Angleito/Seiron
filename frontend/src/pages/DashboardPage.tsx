import { ChatInterface } from '@/components/chat/chat-interface'
import { PortfolioSidebar } from '@/components/portfolio/portfolio-sidebar'
import { WalletConnect } from '@/components/wallet/wallet-connect'
import { SeironImage } from '@/components/dragon/SeironImage'
import { SeironImage as SeironWatermark } from '@/components/SeironImage'

export default function DashboardPage() {
  return (
    <div className="h-screen flex flex-col bg-black">
      {/* Dragon-themed Header */}
      <header className="border-b border-red-900/20 bg-gradient-to-r from-black via-red-950/10 to-black px-6 py-6 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="relative">
            {/* Dragon accent element */}
            <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-full opacity-60 animate-pulse"></div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-400 rounded-full opacity-40 animate-pulse delay-300"></div>
            
            <h1 className="text-3xl font-bold text-red-400 drop-shadow-lg">
              Seiron - Granting your wildest Sei Investing Wishes
            </h1>
            <p className="text-sm text-orange-300 mt-1 font-medium">
              Unleash the dragon's power to fulfill your wildest investment dreams
            </p>
          </div>
          <div className="relative">
            {/* Mystical glow effect around wallet connect */}
            <div className="absolute inset-0 bg-red-500/10 rounded-lg blur-sm"></div>
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Main Content with mystical background */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Subtle mystical background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-red-900 rounded-full blur-3xl opacity-5 animate-pulse"></div>
          <div className="absolute bottom-1/3 right-1/3 w-24 h-24 bg-orange-900 rounded-full blur-2xl opacity-5 animate-pulse delay-1000"></div>
          <div className="absolute top-2/3 right-1/4 w-20 h-20 bg-red-800 rounded-full blur-xl opacity-5 animate-pulse delay-500"></div>
        </div>

        {/* Background watermark */}
        <div className="absolute inset-0 flex items-center justify-center">
          <SeironWatermark 
            variant="watermark"
            className="transform translate-x-16 translate-y-8"
          />
        </div>

        {/* Floating Dragon in bottom right */}
        <div className="absolute bottom-4 right-4 z-10">
          <SeironImage 
            variant="corner"
            className="opacity-90 hover:opacity-100 transition-opacity"
          />
        </div>

        {/* Chat Area */}
        <main className="flex-1 flex flex-col bg-gradient-to-b from-black/80 to-red-950/10 backdrop-blur-sm">
          <ChatInterface />
        </main>

        {/* Sidebar */}
        <aside className="w-80 border-l border-red-900/20 bg-gradient-to-b from-black/90 to-red-950/20 backdrop-blur-sm">
          <PortfolioSidebar />
        </aside>
      </div>
    </div>
  )
}