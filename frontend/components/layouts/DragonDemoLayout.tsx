import React from 'react'
import { DragonDemoNavigation } from '../navigation'

interface DragonDemoLayoutProps {
  children: React.ReactNode
}

export function DragonDemoLayout({ children }: DragonDemoLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col md:flex-row">
      {/* Navigation */}
      <DragonDemoNavigation variant="drawer" />
      
      {/* Main Content */}
      <div className="flex-1 md:ml-80 min-h-screen relative">
        {children}
      </div>
    </div>
  )
}

export default DragonDemoLayout