import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Menu,
  X,
  Play,
  Sparkles,
  Palette,
  Box,
  Home,
  Code,
  Zap,
  Eye
} from 'lucide-react'

interface DragonDemoRoute {
  path: string
  name: string
  description: string
  icon: React.ReactNode
  category: 'ascii' | 'sprite' | '3d'
  features: string[]
}

const dragonRoutes: DragonDemoRoute[] = [
  {
    path: '/dragons/ascii-complex',
    name: 'Complex ASCII Dragons',
    description: 'Various ASCII dragon styles with dynamic theming',
    icon: <Code className="w-5 h-5" />,
    category: 'ascii',
    features: ['Multiple variants', 'Color schemes', 'Character analysis']
  },
  {
    path: '/dragons/ascii-animated',
    name: 'Animated ASCII Dragons',
    description: 'Frame-based ASCII animations with voice reactivity',
    icon: <Play className="w-5 h-5" />,
    category: 'ascii',
    features: ['Frame animation', 'Voice reactive', 'Speed control']
  },
  {
    path: '/dragons/sprite-2d',
    name: '2D Sprite Dragons',
    description: 'CSS and Unicode-based sprite animations',
    icon: <Palette className="w-5 h-5" />,
    category: 'sprite',
    features: ['CSS animations', 'Unicode sprites', 'Transform controls']
  },
  {
    path: '/dragons/webgl-3d',
    name: '3D WebGL Dragons',
    description: 'Hardware-accelerated 3D dragon rendering',
    icon: <Box className="w-5 h-5" />,
    category: '3d',
    features: ['WebGL rendering', 'Custom shaders', 'Real-time lighting']
  }
]

const categoryColors = {
  ascii: { primary: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-400' },
  sprite: { primary: 'text-orange-400', bg: 'bg-orange-900/20', border: 'border-orange-400' },
  '3d': { primary: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-400' }
}

interface DragonDemoNavigationProps {
  variant?: 'drawer' | 'inline'
  showHome?: boolean
}

export function DragonDemoNavigation({ variant = 'inline', showHome = true }: DragonDemoNavigationProps) {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const currentRoute = dragonRoutes.find(route => route.path === location.pathname)

  const NavigationContent = () => (
    <div className={`${variant === 'drawer' ? 'w-80' : 'w-full'} h-full bg-gray-900 text-white flex flex-col`}>
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-gray-800 to-gray-900 border-b-2 border-orange-500">
        <h2 className="text-2xl font-bold text-orange-400 text-center mb-2">
          🐉 Dragon Demos
        </h2>
        <p className="text-sm text-gray-300 text-center opacity-80">
          Explore different dragon rendering techniques
        </p>
      </div>

      {/* Home Navigation */}
      {showHome && (
        <div className="p-4">
          <Link
            to="/"
            className="flex items-center gap-2 w-full px-4 py-2 bg-gray-800 hover:bg-orange-500/20 border border-gray-600 hover:border-orange-400 rounded-lg transition-all duration-200 text-white hover:text-orange-400"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      )}

      {/* Navigation Items */}
      <div className="flex-1 px-4 space-y-2">
        {dragonRoutes.map((route) => {
          const isActive = location.pathname === route.path
          const colors = categoryColors[route.category]
          
          return (
            <Link
              key={route.path}
              to={route.path}
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-start gap-3 p-4 rounded-lg transition-all duration-200
                ${isActive 
                  ? `${colors.bg} ${colors.border} border-2 ${colors.primary}` 
                  : 'hover:bg-gray-800 border-2 border-transparent hover:border-gray-600'
                }
              `}
            >
              <div className={`p-2 rounded-lg ${isActive ? colors.bg : 'bg-gray-800'} ${colors.primary}`}>
                {route.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-medium text-sm ${isActive ? colors.primary : 'text-white'}`}>
                  {route.name}
                </h3>
                <p className={`text-xs mt-1 ${isActive ? 'text-gray-300' : 'text-gray-400'}`}>
                  {route.description}
                </p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Current Route Info */}
      {currentRoute && (
        <div className="p-4 border-t border-gray-700">
          <div className={`p-4 rounded-lg ${categoryColors[currentRoute.category].bg} border ${categoryColors[currentRoute.category].border}`}>
            <div className={`flex items-center gap-2 mb-3 ${categoryColors[currentRoute.category].primary}`}>
              {currentRoute.icon}
              <span className="font-bold text-sm">Current Demo</span>
            </div>
            <h4 className="text-white font-medium text-sm mb-3">{currentRoute.name}</h4>
            <div className="space-y-2">
              <p className="text-xs text-gray-400 font-medium">Features:</p>
              {currentRoute.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Sparkles className={`w-3 h-3 ${categoryColors[currentRoute.category].primary}`} />
                  <span className="text-xs text-white">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="p-4 border-t border-gray-700">
        <div className="p-3 bg-gray-800 rounded-lg">
          <h4 className="text-orange-400 font-bold text-sm mb-3">Demo Statistics</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Demos:</span>
              <span className="text-white font-bold">{dragonRoutes.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Categories:</span>
              <span className="text-white font-bold">3</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Current:</span>
              <span className={`font-bold ${currentRoute ? categoryColors[currentRoute.category].primary : 'text-white'}`}>
                {currentRoute ? currentRoute.category.toUpperCase() : 'HOME'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (variant === 'drawer') {
    return (
      <>
        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="fixed top-4 left-4 z-50 p-2 bg-gray-900/80 hover:bg-orange-500/80 rounded-lg transition-colors duration-200 md:hidden"
        >
          <Menu className="w-6 h-6 text-white" />
        </button>

        {/* Desktop Drawer */}
        <div className="hidden md:block fixed left-0 top-0 w-80 h-full z-40">
          <NavigationContent />
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <div className="fixed left-0 top-0 w-80 h-full z-50 md:hidden">
              <div className="relative h-full">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="absolute top-4 right-4 p-2 text-white hover:text-orange-400 z-10"
                >
                  <X className="w-6 h-6" />
                </button>
                <NavigationContent />
              </div>
            </div>
          </>
        )}
      </>
    )
  }

  return (
    <div className="w-full bg-gray-900/80 rounded-lg border border-gray-700">
      <NavigationContent />
    </div>
  )
}

export default DragonDemoNavigation