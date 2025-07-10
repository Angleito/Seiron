import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, Flame, Wind, Heart, Star, Volume2, VolumeX } from 'lucide-react'

type AnimationType = 'breathing' | 'flying' | 'fireBreathing' | 'tailSwish' | 'blinking'

interface AnimationFrame {
  frame: string
  duration: number
}

// Breathing animation frames
const breathingFrames: AnimationFrame[] = [
  {
    frame: `
                    __----__
                   /  \\  /  \\
                  /    \\/    \\
                 |  O      O  |
                 |      >     |
                  \\   ----   /
                   |________|
                  /|        |\\
                 / |  ____  | \\
                /  | |    | |  \\
               |   | |    | |   |
               |   |_|    |_|   |
               |                |
               \\______________/`,
    duration: 800
  },
  {
    frame: `
                    __----__
                   /  \\  /  \\
                  /    \\/    \\
                 |  O      O  |
                 |      >     |
                  \\   ----   /
                   |________|
                  /||      ||\\
                 / ||  __  || \\
                /  || |  | ||  \\
               |   || |  | ||   |
               |   ||_|  |_||   |
               |                |
               \\______________/`,
    duration: 800
  },
  {
    frame: `
                    __----__
                   /  \\  /  \\
                  /    \\/    \\
                 |  O      O  |
                 |      >     |
                  \\   ----   /
                   |________|
                  /|||    |||\\
                 / |||    ||| \\
                /  |||    |||  \\
               |   |||    |||   |
               |   |||    |||   |
               |                |
               \\______________/`,
    duration: 800
  }
]

// Flying animation frames
const flyingFrames: AnimationFrame[] = [
  {
    frame: `
         \\                           /
          \\                         /
           \\       __----__       /
            \\     /  \\  /  \\     /
             \\   /    \\/    \\   /
              \\ |  O      O  | /
               \\|      >     |/
                \\   ----   /
                 |________|
                /|        |\\
               / |        | \\`,
    duration: 400
  },
  {
    frame: `
                      |
         \\           |           /
          \\      __----__      /
           \\    /  \\  /  \\    /
            \\  /    \\/    \\  /
             \\|  O      O  |/
              |      >     |
              \\   ----   /
               |________|
              /|        |\\
             / |        | \\`,
    duration: 400
  },
  {
    frame: `
         /                           \\
        /                             \\
       /         __----__             \\
      /         /  \\  /  \\             \\
     /         /    \\/    \\             \\
    /         |  O      O  |             \\
   /          |      >     |              \\
              \\   ----   /
               |________|
              /|        |\\
             / |        | \\`,
    duration: 400
  }
]

// Fire breathing animation frames
const fireBreathingFrames: AnimationFrame[] = [
  {
    frame: `
                    __----__
                   /  \\  /  \\
                  /    \\/    \\
                 |  O      O  |
                 |      >     |
                  \\   <---   /
                   |________|
                  /|        |\\
                 / |        | \\
                ~  ~  ~  ~  ~  ~`,
    duration: 300
  },
  {
    frame: `
                    __----__
                   /  \\  /  \\
                  /    \\/    \\
                 |  O      O  |
                 |      >     |
                  \\   <===   /
                   |________|
                  /|        |\\
                 / |        | \\
              ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
               *  *  *  *  *  *`,
    duration: 300
  },
  {
    frame: `
                    __----__
                   /  \\  /  \\
                  /    \\/    \\
                 |  ◉      ◉  |
                 |      >     |
                  \\   <###   /
                   |________|
                  /|        |\\
                 / |        | \\
            ∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿
           🔥 🔥 🔥 🔥 🔥 🔥 🔥 🔥
            *  *  *  *  *  *  *`,
    duration: 500
  },
  {
    frame: `
                    __----__
                   /  \\  /  \\
                  /    \\/    \\
                 |  ◉      ◉  |
                 |      >     |
                  \\   <###   /
                   |________|
                  /|        |\\
                 / |        | \\
          ≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋
         🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
          ✧ ✧ ✧ ✧ ✧ ✧ ✧ ✧ ✧ ✧`,
    duration: 700
  }
]

// Tail swish animation frames
const tailSwishFrames: AnimationFrame[] = [
  {
    frame: `
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
               <~~~~~~~~~~~~~~~`,
    duration: 500
  },
  {
    frame: `
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
                   ~~~~~~~~~~~~>`,
    duration: 500
  },
  {
    frame: `
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
             <~~~~~~~~~~~~~~~~~`,
    duration: 500
  }
]

// Blinking animation frames
const blinkingFrames: AnimationFrame[] = [
  {
    frame: `
                    __----__
                   /  \\  /  \\
                  /    \\/    \\
                 |  O      O  |
                 |      >     |
                  \\   ----   /
                   |________|`,
    duration: 2000
  },
  {
    frame: `
                    __----__
                   /  \\  /  \\
                  /    \\/    \\
                 |  -      -  |
                 |      >     |
                  \\   ----   /
                   |________|`,
    duration: 150
  },
  {
    frame: `
                    __----__
                   /  \\  /  \\
                  /    \\/    \\
                 |  O      O  |
                 |      >     |
                  \\   ----   /
                   |________|`,
    duration: 1500
  },
  {
    frame: `
                    __----__
                   /  \\  /  \\
                  /    \\/    \\
                 |  -      O  |
                 |      >     |
                  \\   ----   /
                   |________|`,
    duration: 150
  }
]

const animationData: Record<AnimationType, { frames: AnimationFrame[], name: string, icon: React.ReactNode }> = {
  breathing: { frames: breathingFrames, name: 'Breathing', icon: <Wind className="w-4 h-4" /> },
  flying: { frames: flyingFrames, name: 'Wing Flapping', icon: <Star className="w-4 h-4" /> },
  fireBreathing: { frames: fireBreathingFrames, name: 'Fire Breathing', icon: <Flame className="w-4 h-4" /> },
  tailSwish: { frames: tailSwishFrames, name: 'Tail Swish', icon: <Star className="w-4 h-4" /> },
  blinking: { frames: blinkingFrames, name: 'Blinking', icon: <Heart className="w-4 h-4" /> }
}

export default function AsciiAnimatedPage() {
  const [currentAnimation, setCurrentAnimation] = useState<AnimationType>('breathing')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [animationSpeed, setAnimationSpeed] = useState(1)
  const [voiceReactive, setVoiceReactive] = useState(false)
  const [voiceIntensity, setVoiceIntensity] = useState(0)
  const animationRef = useRef<NodeJS.Timeout | null>(null)

  const currentAnimationData = animationData[currentAnimation]

  useEffect(() => {
    if (isPlaying && currentAnimationData.frames.length > 0) {
      const playAnimation = () => {
        const frames = currentAnimationData.frames
        const frame = frames[currentFrame]
        if (!frame) return
        
        const adjustedDuration = frame.duration / animationSpeed

        animationRef.current = setTimeout(() => {
          setCurrentFrame((prev) => (prev + 1) % frames.length)
          playAnimation()
        }, adjustedDuration)
      }

      playAnimation()

      return () => {
        if (animationRef.current) {
          clearTimeout(animationRef.current)
        }
      }
    }
    return undefined
  }, [isPlaying, currentFrame, currentAnimation, animationSpeed, currentAnimationData.frames])

  useEffect(() => {
    // Reset frame when changing animation
    setCurrentFrame(0)
  }, [currentAnimation])

  useEffect(() => {
    // Simulate voice reactivity
    if (voiceReactive && isPlaying) {
      const interval = setInterval(() => {
        setVoiceIntensity(Math.random())
      }, 200)
      return () => clearInterval(interval)
    } else {
      setVoiceIntensity(0)
    }
    return undefined
  }, [voiceReactive, isPlaying])

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleAnimationChange = (animationType: AnimationType) => {
    setCurrentAnimation(animationType)
    setIsPlaying(false)
    setCurrentFrame(0)
  }

  const getVoiceReactiveStyle = () => {
    if (!voiceReactive || voiceIntensity === 0) return {}
    
    const scale = 1 + (voiceIntensity * 0.1)
    const intensity = Math.floor(voiceIntensity * 100)
    
    return {
      transform: `scale(${scale})`,
      transition: 'all 0.2s ease-out',
      filter: `brightness(${100 + intensity}%) contrast(${100 + intensity / 2}%)`,
    }
  }

  const getVoiceReactiveClasses = () => {
    if (!voiceReactive || voiceIntensity === 0) return 'text-orange-400'
    
    if (voiceIntensity > 0.7) return 'text-red-400'
    if (voiceIntensity > 0.4) return 'text-yellow-400'
    return 'text-orange-400'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            🐉 Animated ASCII Dragons
          </h1>
          <p className="text-xl text-gray-300">
            Experience the power of frame-based ASCII dragon animations
          </p>
        </div>

        {/* Animation Display */}
        <div className="flex justify-center mb-8">
          <div
            className={`
              p-8 rounded-xl border-2 bg-black/80 backdrop-blur-sm 
              ${voiceReactive && voiceIntensity > 0.5 ? 'border-yellow-400 shadow-yellow-400/30' : 'border-orange-500 shadow-orange-500/20'}
              shadow-2xl transition-all duration-300
            `}
            style={{
              minWidth: '600px',
              minHeight: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: voiceReactive && voiceIntensity > 0.5 
                ? `0 0 ${30 * voiceIntensity}px rgba(255, 193, 7, 0.5)` 
                : undefined,
            }}
          >
            <pre
              className={`
                font-mono text-base leading-tight select-none
                ${getVoiceReactiveClasses()}
                drop-shadow-lg
              `}
              style={getVoiceReactiveStyle()}
            >
              {currentAnimationData.frames[currentFrame]?.frame || ''}
            </pre>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 mb-8">
          {/* Animation Type Selection */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3 text-orange-400">Animation Type</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(animationData).map(([key, data]) => (
                <button
                  key={key}
                  onClick={() => handleAnimationChange(key as AnimationType)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium
                    ${currentAnimation === key
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    }
                  `}
                >
                  {data.icon}
                  <span>{data.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Play/Pause Button */}
          <div className="flex justify-center mb-6">
            <button
              onClick={handlePlayPause}
              className={`
                flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200
                ${isPlaying 
                  ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/30'
                  : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/30'
                }
                transform hover:scale-105
              `}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              {isPlaying ? 'Pause' : 'Play'} Animation
            </button>
          </div>

          {/* Speed Control */}
          <div className="mb-6">
            <label className="block text-lg font-semibold mb-3 text-orange-400">
              Animation Speed: {animationSpeed.toFixed(1)}x
            </label>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">0.1x</span>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={animationSpeed}
                onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-sm text-gray-400">3x</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Slow</span>
              <span>Normal</span>
              <span>Fast</span>
            </div>
          </div>

          {/* Voice Reactive Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-orange-400">Voice Reactive Mode</h3>
              <p className="text-sm text-gray-400">Simulates voice-reactive animations</p>
            </div>
            <button
              onClick={() => setVoiceReactive(!voiceReactive)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium
                ${voiceReactive 
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 shadow-lg shadow-yellow-500/30'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }
              `}
            >
              {voiceReactive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              {voiceReactive ? 'Active' : 'Inactive'}
            </button>
          </div>

          {voiceReactive && (
            <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Voice Intensity</span>
                <span className="text-sm text-yellow-400 font-mono">
                  {(voiceIntensity * 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-600 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-yellow-400 to-red-500 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${voiceIntensity * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Animation Info */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 mb-8">
          <h3 className="text-xl font-semibold mb-4 text-orange-400">Animation Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Current Animation</div>
              <div className="text-lg font-semibold">{currentAnimationData.name}</div>
            </div>
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Frame</div>
              <div className="text-lg font-semibold">
                {currentFrame + 1} / {currentAnimationData.frames.length}
              </div>
            </div>
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Frame Duration</div>
              <div className="text-lg font-semibold">
                {currentAnimationData.frames[currentFrame] ? 
                  (currentAnimationData.frames[currentFrame].duration / animationSpeed).toFixed(0) : 0}ms
              </div>
            </div>
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Status</div>
              <div className={`text-lg font-semibold ${isPlaying ? 'text-green-400' : 'text-gray-400'}`}>
                {isPlaying ? 'Playing' : 'Paused'}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
          <h3 className="text-2xl font-bold mb-4 text-orange-400">About ASCII Dragon Animations</h3>
          <p className="text-gray-300 mb-4">
            This demonstration showcases frame-based ASCII dragon animations with multiple animation types and interactive controls.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-semibold mb-3 text-orange-400">Animation Types</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <Wind className="w-4 h-4 text-blue-400" />
                  <strong>Breathing:</strong> Chest expansion and contraction
                </li>
                <li className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-purple-400" />
                  <strong>Wing Flapping:</strong> Dynamic wing movement for flight
                </li>
                <li className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-400" />
                  <strong>Fire Breathing:</strong> Powerful fire attack with effects
                </li>
                <li className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <strong>Tail Swish:</strong> Smooth tail movement animation
                </li>
                <li className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-400" />
                  <strong>Blinking:</strong> Natural eye movement and expressions
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-3 text-orange-400">Features</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Adjustable animation speed (0.1x to 3x)</li>
                <li>• Voice-reactive mode with intensity simulation</li>
                <li>• Smooth frame transitions</li>
                <li>• Real-time animation controls</li>
                <li>• Dragon Ball Z inspired theming</li>
                <li>• Performance optimized animations</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS for the slider */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .slider::-webkit-slider-thumb {
            appearance: none;
            width: 20px;
            height: 20px;
            background: linear-gradient(45deg, #f97316, #ea580c);
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 0 10px rgba(249, 115, 22, 0.5);
          }
          
          .slider::-moz-range-thumb {
            width: 20px;
            height: 20px;
            background: linear-gradient(45deg, #f97316, #ea580c);
            border-radius: 50%;
            cursor: pointer;
            border: none;
            box-shadow: 0 0 10px rgba(249, 115, 22, 0.5);
          }
        `
      }} />
    </div>
  )
}