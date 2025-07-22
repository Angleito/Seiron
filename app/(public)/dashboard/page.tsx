'use client';

import { PortfolioSidebar } from '../../components/portfolio';
import { ChatInterface } from '../../components/chat';

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
        Portfolio Dashboard
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
        {/* Portfolio Sidebar */}
        <div className="lg:col-span-1">
          <PortfolioSidebar />
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 grid grid-rows-2 gap-6">
          {/* Charts/Analytics Section */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4 text-gray-100">Performance Analytics</h2>
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>Performance charts and analytics coming soon...</p>
            </div>
          </div>

          {/* AI Chat Assistant */}
          <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
            <div className="border-b border-gray-800 p-4">
              <h2 className="text-xl font-semibold text-gray-100">AI Portfolio Assistant</h2>
            </div>
            <div className="h-[calc(100%-60px)]">
              <ChatInterface className="h-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}