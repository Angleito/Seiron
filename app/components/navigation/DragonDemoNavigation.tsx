'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface DragonDemoNavigationProps {
  className?: string
  onNavigate?: (path: string) => void
}

export const DragonDemoNavigation: React.FC<DragonDemoNavigationProps> = ({
  className = '',
  onNavigate
}) => {
  const router = useRouter()

  const handleNavigation = useCallback((path: string) => {
    if (onNavigate) {
      onNavigate(path)
    } else {
      router.push(path)
    }
  }, [onNavigate, router])

  return (
    <nav className={`navigation-container ${className}`} role="navigation" aria-label="Main navigation">
      {/* Navigation logic can be extended here */}
      <div className="sr-only">
        Navigation handlers ready for voice commands and keyboard shortcuts
      </div>
    </nav>
  )
}

export default DragonDemoNavigation