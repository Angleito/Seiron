import React, { useState } from 'react'
import { Palette, Zap, Eye } from 'lucide-react'

type AnimationType = 'breathing' | 'flying' | 'fireBreathing' | 'tailSwish' | 'blinking'

// Complex ASCII Dragon Variations
const dragonVariants = {
  classic: {
    name: 'Classic Dragon',
    ascii: `
                    __----__
                   /  \\  /  \\
                  /    \\/    \\
                 |  O      O  |
                 |      >     |
                  \\   ----   /
                   |________|
                  /|        |\\
                 / |        | \\
                /  |        |  \\
               |   |        |   |
               |   |        |   |
               |                |
               \\______________/
                 \\          /
                  \\        /
                   \\______/`,
    description: 'Traditional dragon head with symmetric features'
  },
  detailed: {
    name: 'Detailed Dragon',
    ascii: `
                         ___====-_  _-====___
                   _--^^^#####//      \\\\#####^^^--_
                _-^##########// (    ) \\\\##########^-_
               -############//  |\\^^/|  \\\\############-
             _/############//   (@::@)   \\\\############\\_
            /#############((     \\\\//     ))#############\\
           -###############\\\\    (^^)    //###############-
          -#################\\\\  / ^ \\  //#################-
         -###################\\\\/\\_-_/\\/###################-
        _#/|##########/\\######(   /|\\   )######/\\##########|\\#_
        |/ |#/\\#/\\#/\\/  \\#/\\##\\  ||| /##/\\#/  \\/\\#/\\#/\\#| \\|
        \`  |/  V  V  \`   V  \\#\\| ||| |/#/  V   '  V  V  \\|  '
           \`   \`  \`      \`   / | ||| | \\   '      '  '   '
                            (  | ||| |  )
                           __\\ | ||| | /__
                          (vvv(VVV)(VVV)vvv)`,
    description: 'Highly detailed dragon with ASCII art shading and texture'
  },
  fierce: {
    name: 'Fierce Dragon',
    ascii: `
                   ,,~\`\`\`\`~,,
                  /           \\
                 /  /~\`\`\`\`~\\  \\
                |  |  ◉  ◉  |  |
                |  |    ^    |  |
                |   \\  ___  /   |
                 \\   \`~---~\`   /
                  \\     |     /
                   |    |    |
                   |  ___V___|
                   | /       |
                   |/  ^^  \\|
                   /  ≋≋≋≋  \\
                  |  ≋≋≋≋≋≋  |
                  |   ≋≋≋≋   |
                   \\  ≋≋≋≋  /
                    \\______/
                     \\    /
                      \\  /
                       \\/`,
    description: 'Aggressive dragon with fire effects and intense expression'
  },
  mystical: {
    name: 'Mystical Dragon',
    ascii: `
                    ✧･ﾟ: *✧･ﾟ:*
                   ･ﾟ✧*:･ﾟ✧*:･ﾟ✧
                  ✧･ﾟ: *✧･ﾟ:*✧･ﾟ: *
                     ◇◆◇◆◇◆◇
                    ◆  ◉    ◉  ◆
                   ◇     ◊     ◇
                  ◆   ✧ ∩ ✧   ◆
                 ◇  ✧ ∩ ∩ ∩ ✧  ◇
                ◆    ∩ ∩ ∩ ∩    ◆
               ◇      ∩ ∩ ∩      ◇
              ◆        ∩ ∩        ◆
             ◇          ∩          ◇
            ◆            ∩            ◆
           ◇              ∩              ◇
          ◆                ∩                ◆
         ◇                  ∩                  ◇
        ◆                    ∩                    ◆
       ◇                      ∩                      ◇
      ◆                        ∩                        ◆
     ◇                          ∩                          ◇
    ◆                            ∩                            ◆
   ◇                              ∩                              ◇
  ◆                                ∩                                ◆
 ◇                                  ∩                                  ◇
◆                                    ∩                                    ◆`,
    description: 'Ethereal dragon with magical symbols and sparkles'
  },
  minimal: {
    name: 'Minimal Dragon',
    ascii: `
            /\\/\\
           (o o)
        ooO-(_)-Ooo
           / \\
          /   \\
         /     \\
        /_______\\`,
    description: 'Clean, simple dragon design with minimal lines'
  },
  ancient: {
    name: 'Ancient Dragon',
    ascii: `
                  ▄██▄
                 ▐████▌
                ▐██████▌
               ▄████████▄
              ▐██████████▌
             ████████████
            ▐██████████▌
           ██████████████
          ▐████████████▌
         ████████████████
        ▐██████████████▌
       ██████████████████
      ▐████████████████▌
     ████████████████████
    ▐██████████████████▌
   ████████████████████
  ▐████████████████████▌
 ████████████████████████
▐██████████████████████▌
████████████████████████
▐████████████████████▌
 ████████████████████
  ▐████████████████▌
   ████████████████
    ▐██████████▌
     ████████████
      ▐████████▌
       ████████
        ▐████▌
         ████
          ▐▌`,
    description: 'Ancient runic dragon with block-style ASCII art'
  }
}

const colorSchemes = {
  fire: { primary: '#FF6B35', secondary: '#FF9F1C', accent: '#FFD23F' },
  ice: { primary: '#4A90E2', secondary: '#7BB3F0', accent: '#B3E5FC' },
  earth: { primary: '#8BC34A', secondary: '#CDDC39', accent: '#FFEB3B' },
  shadow: { primary: '#424242', secondary: '#757575', accent: '#9E9E9E' },
  mystical: { primary: '#9C27B0', secondary: '#E1BEE7', accent: '#F3E5F5' },
  gold: { primary: '#FFD700', secondary: '#FFA000', accent: '#FF8F00' }
}

export default function AsciiComplexPage() {
  const [selectedVariant, setSelectedVariant] = useState<keyof typeof dragonVariants>('classic')
  const [selectedColorScheme, setSelectedColorScheme] = useState<keyof typeof colorSchemes>('fire')
  const [showDetails, setShowDetails] = useState(false)

  const currentDragon = dragonVariants[selectedVariant]
  const currentColors = colorSchemes[selectedColorScheme]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 
            className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent"
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
          >
            COMPLEX ASCII DRAGONS
          </h1>
          <p className="text-gray-300 text-lg">
            Explore various ASCII dragon art styles with dynamic color theming
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Dragon Display */}
          <div className="xl:col-span-3">
            <div 
              className="bg-black/90 border-2 rounded-lg p-8 min-h-[600px] flex flex-col items-center justify-center"
              style={{ borderColor: currentColors.primary }}
            >
              <div className="text-center mb-6">
                <h2 
                  className="text-2xl font-bold mb-2"
                  style={{ color: currentColors.primary }}
                >
                  {currentDragon.name}
                </h2>
                <p 
                  className="text-base italic"
                  style={{ color: currentColors.secondary }}
                >
                  {currentDragon.description}
                </p>
              </div>

              <pre 
                className="text-sm md:text-base leading-tight font-mono text-center overflow-auto max-w-full transition-all duration-300"
                style={{ 
                  color: currentColors.primary,
                  textShadow: `0 0 10px ${currentColors.accent}`,
                  filter: `drop-shadow(0 0 5px ${currentColors.accent})`
                }}
              >
                {currentDragon.ascii}
              </pre>

              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                <span 
                  className="px-3 py-1 rounded-full text-sm border"
                  style={{ 
                    borderColor: currentColors.primary,
                    color: currentColors.primary,
                    backgroundColor: `${currentColors.primary}20`
                  }}
                >
                  Variant: {currentDragon.name}
                </span>
                <span 
                  className="px-3 py-1 rounded-full text-sm border"
                  style={{ 
                    borderColor: currentColors.secondary,
                    color: currentColors.secondary,
                    backgroundColor: `${currentColors.secondary}20`
                  }}
                >
                  Colors: {selectedColorScheme}
                </span>
                <span 
                  className="px-3 py-1 rounded-full text-sm border"
                  style={{ 
                    borderColor: currentColors.accent,
                    color: currentColors.accent,
                    backgroundColor: `${currentColors.accent}20`
                  }}
                >
                  Lines: {currentDragon.ascii.split('\\n').length}
                </span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="xl:col-span-1 space-y-6">
            {/* Dragon Variants */}
            <div className="bg-black/80 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Palette className="w-5 h-5 text-orange-400" />
                <h3 className="text-lg font-bold text-orange-400">Dragon Variants</h3>
              </div>
              <div className="space-y-2">
                {Object.entries(dragonVariants).map(([key, dragon]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedVariant(key as keyof typeof dragonVariants)}
                    className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                      selectedVariant === key
                        ? 'border-orange-400 bg-orange-400/20 text-orange-400'
                        : 'border-gray-600 hover:border-orange-400 hover:bg-orange-400/10 text-gray-300'
                    }`}
                  >
                    {dragon.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Schemes */}
            <div className="bg-black/80 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-yellow-400" />
                <h3 className="text-lg font-bold text-yellow-400">Color Schemes</h3>
              </div>
              <div className="space-y-2">
                {Object.entries(colorSchemes).map(([key, colors]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedColorScheme(key as keyof typeof colorSchemes)}
                    className={`w-full text-left p-3 rounded-lg border transition-all duration-200 flex items-center gap-3 ${
                      selectedColorScheme === key
                        ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400'
                        : 'border-gray-600 hover:border-yellow-400 hover:bg-yellow-400/10 text-gray-300'
                    }`}
                  >
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: colors.primary }}
                    />
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Dragon Details */}
            <div className="bg-black/80 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-blue-400">Dragon Details</h3>
              </div>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full p-2 border border-blue-400 text-blue-400 rounded-lg hover:bg-blue-400/10 transition-colors duration-200 mb-4"
              >
                {showDetails ? 'Hide' : 'Show'} Technical Details
              </button>
              
              {showDetails && (
                <div className="space-y-3 border-t border-gray-600 pt-4">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Character Count:</span>
                      <span className="text-white">{currentDragon.ascii.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Lines:</span>
                      <span className="text-white">{currentDragon.ascii.split('\\n').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Width:</span>
                      <span className="text-white">{Math.max(...currentDragon.ascii.split('\\n').map(line => line.length))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Unique Characters:</span>
                      <span className="text-white">{new Set(currentDragon.ascii.split('')).size}</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-600 pt-3 text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Primary Color:</span>
                      <span className="text-white">{currentColors.primary}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Secondary Color:</span>
                      <span className="text-white">{currentColors.secondary}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Accent Color:</span>
                      <span className="text-white">{currentColors.accent}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mt-8 bg-black/60 border border-gray-700 rounded-lg p-6">
          <h3 className="text-2xl font-bold text-orange-400 mb-4">About Complex ASCII Dragons</h3>
          <p className="text-gray-300 mb-4">
            This collection showcases various styles of ASCII dragon art, from simple geometric designs 
            to highly detailed creatures with complex shading and texture. Each variant demonstrates 
            different artistic approaches to ASCII art creation.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-400" />
              <span className="text-gray-300">Performance optimized rendering</span>
            </div>
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-blue-400" />
              <span className="text-gray-300">Dynamic color theming</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-400" />
              <span className="text-gray-300">Smooth style transitions</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}