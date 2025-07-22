import { WalletConnect } from '../components/wallet'
import Link from 'next/link'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-900/80 backdrop-blur-md">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                Seiron
              </Link>
              <div className="hidden md:flex space-x-6">
                <Link href="/chat" className="text-gray-300 hover:text-white transition-colors">
                  Chat
                </Link>
                <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors">
                  Dashboard
                </Link>
              </div>
            </div>
            
            {/* Wallet Connect */}
            <div className="flex items-center space-x-4">
              <WalletConnect />
            </div>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
          <p>© 2024 Seiron - AI Portfolio Manager for Sei Network</p>
        </div>
      </footer>
    </div>
  );
}