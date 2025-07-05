'use client'

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'

interface SeironSpriteProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  quality?: 'low' | 'medium' | 'high'
  interactive?: boolean
  className?: string
  onInteraction?: (type: 'hover' | 'click' | 'touch') => void
  onWishGrant?: (wishType: 'power' | 'wisdom' | 'fortune') => void
  readyToGrant?: boolean
  enableAutoQuality?: boolean
  batteryOptimized?: boolean
}

interface AnimationState {
  frame: number
  timestamp: number
  isRunning: boolean
  mode: 'idle' | 'hover' | 'wishGranting' | 'powerUp'
  wishGrantStartTime?: number
  wishGrantDuration: number
}

interface CoinConfig {
  id: string
  type: 'bitcoin' | 'sei'
  radius: number
  speed: number
  offset: number
  size: number
  angle: number
  verticalOffset: number
  depthPhase: number
}

interface ParticleConfig {
  id: string
  type: 'sparkle' | 'ember' | 'energy'
  x: number
  y: number
  vx: number
  vy: number
  size: number
  life: number
  maxLife: number
  color: string
  opacity: number
  rotation: number
  rotationSpeed: number
  glowSize: number
  pulsePhase: number
  driftPhase: number
  active: boolean
}

interface CanvasConfig {
  width: number
  height: number
  scale: number
}

interface MousePosition {
  x: number
  y: number
  isOverDragon: boolean
  isTracking: boolean
}

interface PerformanceMetrics {
  fps: number
  frameTime: number
  droppedFrames: number
  lastFrameTime: number
  frameCount: number
  lastMetricsUpdate: number
  targetFPS: number
  adaptiveQuality: 'low' | 'medium' | 'high'
}

interface QualitySettings {
  particleCount: number
  particleLifetime: number
  coinCount: number
  animationComplexity: number
  glowEffects: boolean
  advancedShaders: boolean
  targetFPS: number
  enableGPUAcceleration: boolean
  useRequestAnimationFrame: boolean
  enableDirtyRectangles: boolean
  particlePoolSize: number
  updateFrequency: number
}

const sizeConfig = {
  sm: { width: 120, height: 120, containerSize: 'w-32 h-32' },
  md: { width: 200, height: 200, containerSize: 'w-52 h-52' },
  lg: { width: 300, height: 300, containerSize: 'w-80 h-80' },
  xl: { width: 400, height: 400, containerSize: 'w-96 h-96' }
}

const qualityConfigs: Record<'low' | 'medium' | 'high', QualitySettings> = {
  low: {
    particleCount: 5,
    particleLifetime: 60,
    coinCount: 6,
    animationComplexity: 0.5,
    glowEffects: false,
    advancedShaders: false,
    targetFPS: 30,
    enableGPUAcceleration: false,
    useRequestAnimationFrame: true,
    enableDirtyRectangles: true,
    particlePoolSize: 20,
    updateFrequency: 2
  },
  medium: {
    particleCount: 10,
    particleLifetime: 120,
    coinCount: 10,
    animationComplexity: 0.8,
    glowEffects: true,
    advancedShaders: false,
    targetFPS: 45,
    enableGPUAcceleration: true,
    useRequestAnimationFrame: true,
    enableDirtyRectangles: true,
    particlePoolSize: 35,
    updateFrequency: 1
  },
  high: {
    particleCount: 20,
    particleLifetime: 180,
    coinCount: 14,
    animationComplexity: 1.0,
    glowEffects: true,
    advancedShaders: true,
    targetFPS: 60,
    enableGPUAcceleration: true,
    useRequestAnimationFrame: true,
    enableDirtyRectangles: false,
    particlePoolSize: 50,
    updateFrequency: 1
  }
}

export function SeironSprite({ 
  size = 'lg', 
  quality = 'medium',
  interactive = false, 
  className = '',
  onInteraction,
  onWishGrant,
  readyToGrant = false,
  enableAutoQuality = true,
  batteryOptimized = false
}: SeironSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const offscreenCanvasRef = useRef<HTMLCanvasElement>()
  const animationFrameRef = useRef<number>()
  const lastFrameTimeRef = useRef<number>(0)
  const frameTimesRef = useRef<number[]>([])
  const dirtyRectRef = useRef<{ x: number, y: number, width: number, height: number } | null>(null)
  
  const [animationState, setAnimationState] = useState<AnimationState>({
    frame: 0,
    timestamp: 0,
    isRunning: false,
    mode: 'idle',
    wishGrantDuration: 180
  })
  
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    droppedFrames: 0,
    lastFrameTime: 0,
    frameCount: 0,
    lastMetricsUpdate: 0,
    targetFPS: 60,
    adaptiveQuality: quality
  })
  
  const [isHovered, setIsHovered] = useState(false)
  const [mousePosition, setMousePosition] = useState<MousePosition>({
    x: 0,
    y: 0,
    isOverDragon: false,
    isTracking: false
  })
  
  const [canvasConfig, setCanvasConfig] = useState<CanvasConfig>({
    width: 0,
    height: 0,
    scale: 1
  })
  
  const [coins, setCoins] = useState<CoinConfig[]>([])
  const [particles, setParticles] = useState<ParticleConfig[]>([])
  const particlePoolRef = useRef<ParticleConfig[]>([])
  const lastParticleSpawn = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Battery and performance detection
  const [isBatteryLow, setIsBatteryLow] = useState(false)
  const [isLowEndDevice, setIsLowEndDevice] = useState(false)
  
  const config = sizeConfig[size]
  
  // Dynamic quality settings based on current quality level and conditions
  const currentQualitySettings = useMemo(() => {
    const baseSettings = qualityConfigs[performanceMetrics.adaptiveQuality]
    
    // Apply battery optimization
    if (batteryOptimized || isBatteryLow) {
      return {
        ...baseSettings,
        particleCount: Math.max(1, Math.floor(baseSettings.particleCount * 0.5)),
        particleLifetime: Math.floor(baseSettings.particleLifetime * 0.7),
        coinCount: Math.max(4, Math.floor(baseSettings.coinCount * 0.7)),
        animationComplexity: baseSettings.animationComplexity * 0.6,
        glowEffects: false,
        advancedShaders: false,
        targetFPS: Math.min(baseSettings.targetFPS, 30),
        updateFrequency: Math.max(2, baseSettings.updateFrequency * 2)
      }
    }
    
    // Apply low-end device optimization
    if (isLowEndDevice) {
      return {
        ...baseSettings,
        particleCount: Math.max(2, Math.floor(baseSettings.particleCount * 0.7)),
        glowEffects: false,
        advancedShaders: false,
        targetFPS: Math.min(baseSettings.targetFPS, 45),
        enableGPUAcceleration: false
      }
    }
    
    return baseSettings
  }, [performanceMetrics.adaptiveQuality, batteryOptimized, isBatteryLow, isLowEndDevice])

  // Detect device capabilities and battery status
  useEffect(() => {
    const detectDeviceCapabilities = async () => {
      // Check for low-end device indicators
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      
      if (!gl) {
        setIsLowEndDevice(true)
        return
      }
      
      // Check GPU capabilities
      const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info')
      if (debugInfo) {
        const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        const vendor = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
        
        // Simple heuristic for low-end devices
        const isLowEnd = /intel|software|mesa|llvm/i.test(renderer) || 
                         /qualcomm|adreno [0-5]/i.test(renderer) ||
                         navigator.hardwareConcurrency <= 2
        
        setIsLowEndDevice(isLowEnd)
      }
      
      // Check battery status
      try {
        // @ts-ignore - Battery API might not be available in all browsers
        const battery = await navigator.getBattery?.()
        if (battery) {
          const updateBatteryInfo = () => {
            setIsBatteryLow(battery.level < 0.2 && !battery.charging)
          }
          
          updateBatteryInfo()
          battery.addEventListener('levelchange', updateBatteryInfo)
          battery.addEventListener('chargingchange', updateBatteryInfo)
          
          return () => {
            battery.removeEventListener('levelchange', updateBatteryInfo)
            battery.removeEventListener('chargingchange', updateBatteryInfo)
          }
        }
      } catch (e) {
        // Battery API not supported, continue without battery optimization
      }
    }
    
    detectDeviceCapabilities()
  }, [])

  // Performance monitoring and adaptive quality adjustment
  const updatePerformanceMetrics = useCallback((currentTime: number) => {
    const deltaTime = currentTime - lastFrameTimeRef.current
    lastFrameTimeRef.current = currentTime
    
    // Track frame times for FPS calculation
    frameTimesRef.current.push(deltaTime)
    if (frameTimesRef.current.length > 60) {
      frameTimesRef.current.shift()
    }
    
    // Calculate FPS every second
    if (currentTime - performanceMetrics.lastMetricsUpdate > 1000) {
      const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length
      const fps = 1000 / avgFrameTime
      const droppedFrames = frameTimesRef.current.filter(t => t > 20).length // Frames taking more than 20ms
      
      setPerformanceMetrics(prev => {
        const newMetrics = {
          ...prev,
          fps,
          frameTime: avgFrameTime,
          droppedFrames,
          frameCount: prev.frameCount + 1,
          lastMetricsUpdate: currentTime
        }
        
        // Adaptive quality adjustment
        if (enableAutoQuality && !batteryOptimized && !isBatteryLow) {
          if (fps < prev.targetFPS * 0.8 && droppedFrames > 5) {
            // Performance is poor, reduce quality
            if (prev.adaptiveQuality === 'high') {
              newMetrics.adaptiveQuality = 'medium'
            } else if (prev.adaptiveQuality === 'medium') {
              newMetrics.adaptiveQuality = 'low'
            }
          } else if (fps > prev.targetFPS * 0.95 && droppedFrames < 2) {
            // Performance is good, try to increase quality
            if (prev.adaptiveQuality === 'low') {
              newMetrics.adaptiveQuality = 'medium'
            } else if (prev.adaptiveQuality === 'medium' && quality === 'high') {
              newMetrics.adaptiveQuality = 'high'
            }
          }
        }
        
        return newMetrics
      })
    }
  }, [enableAutoQuality, batteryOptimized, isBatteryLow, quality, performanceMetrics.lastMetricsUpdate])

  // Mouse position tracking with throttling
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!interactive || !canvasRef.current || !containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    // Check if mouse is over dragon body area
    const centerX = canvasConfig.width / 2
    const centerY = canvasConfig.height / 2
    const dragonRadius = Math.min(canvasConfig.width, canvasConfig.height) * 0.3
    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
    const isOverDragon = distance <= dragonRadius * 1.2
    
    setMousePosition({
      x,
      y,
      isOverDragon,
      isTracking: true
    })
  }, [interactive, canvasConfig.width, canvasConfig.height])

  // Throttled mouse move handler
  const throttledMouseMove = useCallback(
    (() => {
      let lastCall = 0
      return (event: MouseEvent) => {
        const now = performance.now()
        if (now - lastCall >= 16) { // ~60fps throttling
          handleMouseMove(event)
          lastCall = now
        }
      }
    })(),
    [handleMouseMove]
  )

  // Handle mouse leave
  const handleMouseLeaveTracking = useCallback(() => {
    setMousePosition(prev => ({
      ...prev,
      isTracking: false,
      isOverDragon: false
    }))
  }, [])

  // Sound effect triggers (console logs for now)
  const playSound = useCallback((soundType: 'hover' | 'click' | 'wishGrant' | 'powerUp') => {
    console.log(`🎵 Playing sound: ${soundType}`)
    // TODO: Implement actual sound effects
  }, [])

  // Trigger wish granting animation
  const triggerWishGrant = useCallback(() => {
    if (!readyToGrant) return
    
    const wishTypes = ['power', 'wisdom', 'fortune'] as const
    const wishType = wishTypes[Math.floor(Math.random() * wishTypes.length)]
    
    setAnimationState(prev => ({
      ...prev,
      mode: 'wishGranting',
      wishGrantStartTime: prev.frame
    }))
    
    playSound('wishGrant')
    onWishGrant?.(wishType)
    
    // Schedule power-up effect after wish granting
    setTimeout(() => {
      setAnimationState(prev => ({
        ...prev,
        mode: 'powerUp'
      }))
      playSound('powerUp')
    }, 2000)
    
    // Return to idle after power-up
    setTimeout(() => {
      setAnimationState(prev => ({
        ...prev,
        mode: 'idle'
      }))
    }, 5000)
  }, [readyToGrant, onWishGrant, playSound])

  // Optimized coin generation with quality settings
  const generateCoins = useCallback(() => {
    const newCoins: CoinConfig[] = []
    const baseRadius = Math.min(canvasConfig.width, canvasConfig.height) * 0.3
    const totalCoins = currentQualitySettings.coinCount
    const bitcoinCount = Math.floor(totalCoins / 2)
    const seiCount = totalCoins - bitcoinCount
    
    // Create Bitcoin coins
    for (let i = 0; i < bitcoinCount; i++) {
      newCoins.push({
        id: `bitcoin-${i}`,
        type: 'bitcoin',
        radius: baseRadius + (i * 15) + Math.random() * 20,
        speed: (0.5 + Math.random() * 0.8) * currentQualitySettings.animationComplexity,
        offset: (i / bitcoinCount) * Math.PI * 2,
        size: 12 + Math.random() * 8,
        angle: 0,
        verticalOffset: (Math.random() - 0.5) * 30,
        depthPhase: Math.random() * Math.PI * 2
      })
    }
    
    // Create Sei coins
    for (let i = 0; i < seiCount; i++) {
      newCoins.push({
        id: `sei-${i}`,
        type: 'sei',
        radius: baseRadius + (i * 18) + Math.random() * 25,
        speed: (0.3 + Math.random() * 0.6) * currentQualitySettings.animationComplexity,
        offset: (i / seiCount) * Math.PI * 2 + Math.PI,
        size: 10 + Math.random() * 6,
        angle: 0,
        verticalOffset: (Math.random() - 0.5) * 40,
        depthPhase: Math.random() * Math.PI * 2
      })
    }
    
    setCoins(newCoins)
  }, [canvasConfig.width, canvasConfig.height, currentQualitySettings.coinCount, currentQualitySettings.animationComplexity])

  // Initialize optimized particle pool
  const initializeParticlePool = useCallback(() => {
    const pool: ParticleConfig[] = []
    const poolSize = currentQualitySettings.particlePoolSize
    
    for (let i = 0; i < poolSize; i++) {
      pool.push({
        id: `particle-${i}`,
        type: 'sparkle',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 0,
        life: 0,
        maxLife: 0,
        color: '',
        opacity: 0,
        rotation: 0,
        rotationSpeed: 0,
        glowSize: 0,
        pulsePhase: 0,
        driftPhase: 0,
        active: false
      })
    }
    particlePoolRef.current = pool
  }, [currentQualitySettings.particlePoolSize])

  // Optimized particle creation with object pooling
  const createParticle = useCallback((
    type: 'sparkle' | 'ember' | 'energy',
    x: number,
    y: number,
    centerX: number,
    centerY: number,
    animationMode: 'idle' | 'hover' | 'wishGranting' | 'powerUp' = 'idle'
  ): ParticleConfig | null => {
    const pool = particlePoolRef.current
    const availableParticle = pool.find(p => !p.active)
    
    if (!availableParticle) return null

    const colors = {
      sparkle: animationMode === 'wishGranting' ? ['#FFD700', '#FFFFFF', '#FFE4B5', '#F0E68C'] :
               animationMode === 'powerUp' ? ['#FF1493', '#FF69B4', '#FFB6C1', '#FFC0CB'] :
               ['#FFD700', '#FFA500', '#FF6347', '#DC143C'],
      ember: animationMode === 'wishGranting' ? ['#FF4500', '#FF8C00', '#FFA500', '#FFD700'] :
             animationMode === 'powerUp' ? ['#9400D3', '#8A2BE2', '#9932CC', '#BA55D3'] :
             ['#FF4500', '#FF6347', '#DC143C', '#B22222'],
      energy: animationMode === 'wishGranting' ? ['#FFFFFF', '#FFD700', '#F0E68C', '#FFFACD'] :
              animationMode === 'powerUp' ? ['#00FFFF', '#00CED1', '#48D1CC', '#AFEEEE'] :
              ['#FFD700', '#FFA500', '#FF8C00', '#FF4500']
    }

    const particleColors = colors[type]
    const color = particleColors[Math.floor(Math.random() * particleColors.length)]
    
    // Calculate initial velocity
    const dx = x - centerX
    const dy = y - centerY
    const angle = Math.atan2(dy, dx)
    
    let vx, vy, size, maxLife
    
    const speedMultiplier = animationMode === 'wishGranting' ? 1.5 : 
                           animationMode === 'powerUp' ? 2.0 : 1.0
    const sizeMultiplier = animationMode === 'wishGranting' ? 1.3 : 
                          animationMode === 'powerUp' ? 1.6 : 1.0
    const lifeMultiplier = animationMode === 'wishGranting' ? 1.5 : 
                          animationMode === 'powerUp' ? 2.0 : 1.0
    
    // Apply quality settings
    const qualityMultiplier = currentQualitySettings.animationComplexity
    
    switch (type) {
      case 'sparkle':
        vx = (Math.random() - 0.5) * 0.5 * speedMultiplier * qualityMultiplier
        vy = (-Math.random() * 0.8 - 0.2) * speedMultiplier * qualityMultiplier
        size = (Math.random() * 3 + 1) * sizeMultiplier
        maxLife = (currentQualitySettings.particleLifetime * 0.5 + Math.random() * currentQualitySettings.particleLifetime * 0.5) * lifeMultiplier
        break
      case 'ember':
        vx = (Math.cos(angle) * 0.3 + (Math.random() - 0.5) * 0.2) * speedMultiplier * qualityMultiplier
        vy = (Math.sin(angle) * 0.3 - Math.random() * 0.5) * speedMultiplier * qualityMultiplier
        size = (Math.random() * 4 + 2) * sizeMultiplier
        maxLife = (currentQualitySettings.particleLifetime * 0.8 + Math.random() * currentQualitySettings.particleLifetime * 0.4) * lifeMultiplier
        break
      case 'energy':
        if (animationMode === 'wishGranting') {
          const spiralAngle = angle + Math.sin(x * 0.1) * 0.5
          vx = Math.cos(spiralAngle) * 0.4 * speedMultiplier * qualityMultiplier
          vy = Math.sin(spiralAngle) * 0.4 * speedMultiplier * qualityMultiplier
        } else if (animationMode === 'powerUp') {
          vx = Math.cos(angle) * 1.2 * speedMultiplier * qualityMultiplier
          vy = Math.sin(angle) * 1.2 * speedMultiplier * qualityMultiplier
        } else {
          vx = (Math.random() - 0.5) * 0.3 * speedMultiplier * qualityMultiplier
          vy = (Math.random() - 0.5) * 0.3 * speedMultiplier * qualityMultiplier
        }
        size = (Math.random() * 6 + 3) * sizeMultiplier
        maxLife = (currentQualitySettings.particleLifetime + Math.random() * currentQualitySettings.particleLifetime * 0.5) * lifeMultiplier
        break
    }

    // Reuse particle object
    availableParticle.active = true
    availableParticle.type = type
    availableParticle.x = x
    availableParticle.y = y
    availableParticle.vx = vx
    availableParticle.vy = vy
    availableParticle.size = size
    availableParticle.life = maxLife
    availableParticle.maxLife = maxLife
    availableParticle.color = color
    availableParticle.opacity = 1
    availableParticle.rotation = Math.random() * Math.PI * 2
    availableParticle.rotationSpeed = (Math.random() - 0.5) * 0.1 * qualityMultiplier
    availableParticle.glowSize = currentQualitySettings.glowEffects ? size * (1.5 + Math.random()) : 0
    availableParticle.pulsePhase = Math.random() * Math.PI * 2
    availableParticle.driftPhase = Math.random() * Math.PI * 2

    return availableParticle
  }, [currentQualitySettings])

  // Optimized particle spawning with quality control
  const spawnParticles = useCallback((
    centerX: number,
    centerY: number,
    radius: number,
    intensity: number,
    frame: number,
    animationMode: 'idle' | 'hover' | 'wishGranting' | 'powerUp'
  ) => {
    const now = frame
    const updateFreq = currentQualitySettings.updateFrequency
    
    let spawnRate = intensity > 0.8 ? updateFreq : intensity > 0.5 ? updateFreq * 2 : updateFreq * 3
    let particleCount = Math.floor(intensity * currentQualitySettings.particleCount / 2) + 1
    
    // Adjust spawn rate based on animation mode
    if (animationMode === 'wishGranting') {
      spawnRate = updateFreq
      particleCount = Math.floor(currentQualitySettings.particleCount * 0.8)
    } else if (animationMode === 'powerUp') {
      spawnRate = updateFreq
      particleCount = currentQualitySettings.particleCount
    }
    
    if (now - lastParticleSpawn.current > spawnRate) {
      const activeParticles = particlePoolRef.current.filter(p => p.active).length
      const maxActiveParticles = currentQualitySettings.particlePoolSize * 0.8
      
      if (activeParticles < maxActiveParticles) {
        for (let i = 0; i < particleCount && activeParticles + i < maxActiveParticles; i++) {
          // Spawn around the dragon body
          let angle = Math.random() * Math.PI * 2
          let distance = radius * (0.8 + Math.random() * 0.4)
          let x = centerX + Math.cos(angle) * distance
          let y = centerY + Math.sin(angle) * distance
          
          // Special positioning for animation modes
          if (animationMode === 'wishGranting') {
            const spiralOffset = (now * 0.1) % (Math.PI * 2)
            angle = spiralOffset + (i / particleCount) * Math.PI * 2
            distance = radius * (0.5 + Math.sin(now * 0.05) * 0.3)
            x = centerX + Math.cos(angle) * distance
            y = centerY + Math.sin(angle) * distance
          } else if (animationMode === 'powerUp') {
            const ringRadius = radius * (1 + Math.sin(now * 0.08) * 0.5)
            angle = (i / particleCount) * Math.PI * 2
            x = centerX + Math.cos(angle) * ringRadius
            y = centerY + Math.sin(angle) * ringRadius
          }
          
          // Choose particle type based on animation mode
          let type: 'sparkle' | 'ember' | 'energy'
          const rand = Math.random()
          
          if (animationMode === 'wishGranting') {
            type = rand < 0.6 ? 'energy' : rand < 0.8 ? 'sparkle' : 'ember'
          } else if (animationMode === 'powerUp') {
            type = rand < 0.7 ? 'sparkle' : rand < 0.9 ? 'energy' : 'ember'
          } else {
            type = rand < 0.5 ? 'sparkle' : rand < 0.8 ? 'ember' : 'energy'
          }
          
          createParticle(type, x, y, centerX, centerY, animationMode)
        }
      }
      
      lastParticleSpawn.current = now
    }
  }, [createParticle, currentQualitySettings])

  // Optimized particle physics update
  const updateParticles = useCallback((frame: number) => {
    const time = frame * 0.016
    const pool = particlePoolRef.current
    
    for (let i = 0; i < pool.length; i++) {
      const particle = pool[i]
      if (!particle.active) continue
      
      // Update position
      particle.x += particle.vx
      particle.y += particle.vy
      
      // Apply forces based on quality settings
      if (currentQualitySettings.animationComplexity > 0.7) {
        // Full physics only on higher quality
        particle.vy += 0.005 // Gravity
        particle.vx *= 0.998 // Air resistance
        particle.vy *= 0.998
        
        // Add drift motion
        const driftX = Math.sin(time * 0.5 + particle.driftPhase) * 0.1
        const driftY = Math.cos(time * 0.3 + particle.driftPhase) * 0.05
        particle.x += driftX
        particle.y += driftY
      } else {
        // Simplified physics
        particle.vy += 0.01
        particle.vx *= 0.99
        particle.vy *= 0.99
      }
      
      // Update rotation
      particle.rotation += particle.rotationSpeed
      
      // Update life and opacity
      particle.life -= 1
      if (particle.life <= 0) {
        particle.active = false
        continue
      }
      
      particle.opacity = particle.life / particle.maxLife
      
      // Add pulsing effect only on higher quality
      if (currentQualitySettings.animationComplexity > 0.5) {
        const pulse = Math.sin(time * 2 + particle.pulsePhase) * 0.2 + 0.8
        particle.opacity *= pulse
      }
    }
  }, [currentQualitySettings])

  // Optimized particle rendering with batching
  const drawParticles = useCallback((ctx: CanvasRenderingContext2D) => {
    const pool = particlePoolRef.current
    const enableGlow = currentQualitySettings.glowEffects
    
    // Group particles by type for batched rendering
    const sparkles: ParticleConfig[] = []
    const embers: ParticleConfig[] = []
    const energies: ParticleConfig[] = []
    
    for (let i = 0; i < pool.length; i++) {
      const particle = pool[i]
      if (!particle.active) continue
      
      switch (particle.type) {
        case 'sparkle':
          sparkles.push(particle)
          break
        case 'ember':
          embers.push(particle)
          break
        case 'energy':
          energies.push(particle)
          break
      }
    }
    
    // Render particles by type
    const drawParticleType = (particles: ParticleConfig[], type: 'sparkle' | 'ember' | 'energy') => {
      particles.forEach(particle => {
        ctx.save()
        ctx.translate(particle.x, particle.y)
        ctx.rotate(particle.rotation)
        ctx.globalAlpha = particle.opacity
        
        // Draw glow only if enabled
        if (enableGlow && particle.glowSize > 0) {
          const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, particle.glowSize)
          glowGradient.addColorStop(0, particle.color + '80')
          glowGradient.addColorStop(0.5, particle.color + '40')
          glowGradient.addColorStop(1, particle.color + '00')
          
          ctx.fillStyle = glowGradient
          ctx.beginPath()
          ctx.arc(0, 0, particle.glowSize, 0, Math.PI * 2)
          ctx.fill()
        }
        
        // Draw particle based on type
        switch (type) {
          case 'sparkle':
            // Optimized sparkle rendering
            ctx.fillStyle = particle.color
            ctx.beginPath()
            const spikes = 4
            const outerRadius = particle.size
            const innerRadius = particle.size * 0.4
            
            for (let i = 0; i < spikes * 2; i++) {
              const angle = (i / (spikes * 2)) * Math.PI * 2
              const radius = i % 2 === 0 ? outerRadius : innerRadius
              const x = Math.cos(angle) * radius
              const y = Math.sin(angle) * radius
              
              if (i === 0) {
                ctx.moveTo(x, y)
              } else {
                ctx.lineTo(x, y)
              }
            }
            ctx.closePath()
            ctx.fill()
            break
            
          case 'ember':
            // Optimized ember rendering
            ctx.fillStyle = particle.color
            ctx.beginPath()
            ctx.ellipse(0, 0, particle.size, particle.size * 1.5, 0, 0, Math.PI * 2)
            ctx.fill()
            
            // Add bright core only on higher quality
            if (currentQualitySettings.animationComplexity > 0.6) {
              ctx.fillStyle = particle.color + 'CC'
              ctx.beginPath()
              ctx.ellipse(0, 0, particle.size * 0.6, particle.size * 0.9, 0, 0, Math.PI * 2)
              ctx.fill()
            }
            break
            
          case 'energy':
            // Optimized energy orb rendering
            if (currentQualitySettings.advancedShaders) {
              const energyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, particle.size)
              energyGradient.addColorStop(0, '#FFFFFF')
              energyGradient.addColorStop(0.3, particle.color)
              energyGradient.addColorStop(1, particle.color + '00')
              
              ctx.fillStyle = energyGradient
            } else {
              ctx.fillStyle = particle.color
            }
            
            ctx.beginPath()
            ctx.arc(0, 0, particle.size, 0, Math.PI * 2)
            ctx.fill()
            break
        }
        
        ctx.restore()
      })
    }
    
    // Draw all particle types
    drawParticleType(sparkles, 'sparkle')
    drawParticleType(embers, 'ember')
    drawParticleType(energies, 'energy')
  }, [currentQualitySettings])

  // Optimized canvas setup with GPU acceleration hints
  const setupCanvas = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const rect = canvas.getBoundingClientRect()
    const devicePixelRatio = window.devicePixelRatio || 1
    
    const width = rect.width > 0 ? rect.width : config.width
    const height = rect.height > 0 ? rect.height : config.height
    
    // Set canvas size
    canvas.width = width * devicePixelRatio
    canvas.height = height * devicePixelRatio
    
    // Scale canvas back down
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'
    
    // Apply GPU acceleration hints
    if (currentQualitySettings.enableGPUAcceleration) {
      canvas.style.willChange = 'transform'
      canvas.style.transform = 'translateZ(0)'
    } else {
      canvas.style.willChange = 'auto'
      canvas.style.transform = 'none'
    }
    
    // Scale drawing context
    ctx.scale(devicePixelRatio, devicePixelRatio)
    
    // Optimize rendering settings
    ctx.imageSmoothingEnabled = currentQualitySettings.animationComplexity > 0.5
    ctx.imageSmoothingQuality = currentQualitySettings.animationComplexity > 0.8 ? 'high' : 'medium'
    
    // Setup offscreen canvas for complex rendering
    if (currentQualitySettings.advancedShaders && !offscreenCanvasRef.current) {
      const offscreenCanvas = document.createElement('canvas')
      offscreenCanvas.width = canvas.width
      offscreenCanvas.height = canvas.height
      offscreenCanvasRef.current = offscreenCanvas
    }
    
    setCanvasConfig({
      width,
      height,
      scale: devicePixelRatio
    })
  }, [config.width, config.height, currentQualitySettings])

  // Generate coins when configuration changes
  useEffect(() => {
    if (canvasConfig.width > 0 && canvasConfig.height > 0) {
      generateCoins()
    }
  }, [canvasConfig.width, canvasConfig.height, generateCoins])

  // Initialize particle pool when quality changes
  useEffect(() => {
    initializeParticlePool()
  }, [initializeParticlePool])

  // Optimized coin rendering with quality settings
  const drawBitcoinCoin = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    depth: number,
    glow: number
  ) => {
    ctx.save()
    
    const depthScale = 0.7 + depth * 0.3
    const actualSize = size * depthScale
    
    // Draw shadow only on higher quality
    if (currentQualitySettings.animationComplexity > 0.6) {
      ctx.fillStyle = `rgba(0, 0, 0, ${0.2 * depth})`
      ctx.beginPath()
      ctx.arc(x + 2, y + 2, actualSize, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // Draw glow only if enabled
    if (currentQualitySettings.glowEffects && glow > 0) {
      const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, actualSize * 2)
      glowGradient.addColorStop(0, `rgba(255, 193, 7, ${glow * 0.3})`)
      glowGradient.addColorStop(0.5, `rgba(255, 152, 0, ${glow * 0.2})`)
      glowGradient.addColorStop(1, 'rgba(255, 152, 0, 0)')
      
      ctx.fillStyle = glowGradient
      ctx.beginPath()
      ctx.arc(x, y, actualSize * 2, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // Draw coin base
    if (currentQualitySettings.advancedShaders) {
      const coinGradient = ctx.createRadialGradient(x, y, 0, x, y, actualSize)
      coinGradient.addColorStop(0, `rgba(255, 235, 59, ${0.9 * depth})`)
      coinGradient.addColorStop(0.3, `rgba(255, 193, 7, ${0.9 * depth})`)
      coinGradient.addColorStop(0.7, `rgba(255, 152, 0, ${0.8 * depth})`)
      coinGradient.addColorStop(1, `rgba(230, 126, 34, ${0.7 * depth})`)
      ctx.fillStyle = coinGradient
    } else {
      ctx.fillStyle = `rgba(255, 193, 7, ${0.8 * depth})`
    }
    
    ctx.beginPath()
    ctx.arc(x, y, actualSize, 0, Math.PI * 2)
    ctx.fill()
    
    // Draw coin edge
    ctx.strokeStyle = `rgba(183, 98, 0, ${0.8 * depth})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, actualSize, 0, Math.PI * 2)
    ctx.stroke()
    
    // Draw Bitcoin symbol
    ctx.fillStyle = `rgba(183, 98, 0, ${0.9 * depth})`
    ctx.font = `bold ${actualSize * 0.6}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('₿', x, y)
    
    // Add highlight only on higher quality
    if (currentQualitySettings.animationComplexity > 0.7) {
      const highlightGradient = ctx.createRadialGradient(
        x - actualSize * 0.3, y - actualSize * 0.3, 0,
        x - actualSize * 0.3, y - actualSize * 0.3, actualSize * 0.5
      )
      highlightGradient.addColorStop(0, `rgba(255, 255, 255, ${0.4 * depth})`)
      highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      
      ctx.fillStyle = highlightGradient
      ctx.beginPath()
      ctx.arc(x, y, actualSize, 0, Math.PI * 2)
      ctx.fill()
    }
    
    ctx.restore()
  }, [currentQualitySettings])

  // Optimized SEI coin rendering
  const drawSeiCoin = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    depth: number,
    glow: number
  ) => {
    ctx.save()
    
    const depthScale = 0.7 + depth * 0.3
    const actualSize = size * depthScale
    
    // Draw shadow only on higher quality
    if (currentQualitySettings.animationComplexity > 0.6) {
      ctx.fillStyle = `rgba(0, 0, 0, ${0.2 * depth})`
      ctx.beginPath()
      ctx.arc(x + 2, y + 2, actualSize, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // Draw glow only if enabled
    if (currentQualitySettings.glowEffects && glow > 0) {
      const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, actualSize * 2)
      glowGradient.addColorStop(0, `rgba(220, 38, 127, ${glow * 0.3})`)
      glowGradient.addColorStop(0.5, `rgba(156, 39, 176, ${glow * 0.2})`)
      glowGradient.addColorStop(1, 'rgba(156, 39, 176, 0)')
      
      ctx.fillStyle = glowGradient
      ctx.beginPath()
      ctx.arc(x, y, actualSize * 2, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // Draw coin base
    if (currentQualitySettings.advancedShaders) {
      const coinGradient = ctx.createRadialGradient(x, y, 0, x, y, actualSize)
      coinGradient.addColorStop(0, `rgba(220, 38, 127, ${0.9 * depth})`)
      coinGradient.addColorStop(0.3, `rgba(156, 39, 176, ${0.9 * depth})`)
      coinGradient.addColorStop(0.7, `rgba(103, 58, 183, ${0.8 * depth})`)
      coinGradient.addColorStop(1, `rgba(63, 81, 181, ${0.7 * depth})`)
      ctx.fillStyle = coinGradient
    } else {
      ctx.fillStyle = `rgba(156, 39, 176, ${0.8 * depth})`
    }
    
    ctx.beginPath()
    ctx.arc(x, y, actualSize, 0, Math.PI * 2)
    ctx.fill()
    
    // Draw coin edge
    ctx.strokeStyle = `rgba(74, 20, 140, ${0.8 * depth})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, actualSize, 0, Math.PI * 2)
    ctx.stroke()
    
    // Draw SEI text
    ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * depth})`
    ctx.font = `bold ${actualSize * 0.4}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('SEI', x, y)
    
    // Add highlight only on higher quality
    if (currentQualitySettings.animationComplexity > 0.7) {
      const highlightGradient = ctx.createRadialGradient(
        x - actualSize * 0.3, y - actualSize * 0.3, 0,
        x - actualSize * 0.3, y - actualSize * 0.3, actualSize * 0.5
      )
      highlightGradient.addColorStop(0, `rgba(255, 255, 255, ${0.4 * depth})`)
      highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      
      ctx.fillStyle = highlightGradient
      ctx.beginPath()
      ctx.arc(x, y, actualSize, 0, Math.PI * 2)
      ctx.fill()
    }
    
    ctx.restore()
  }, [currentQualitySettings])

  // Optimized orbital coins rendering
  const drawOrbitalCoins = useCallback((
    ctx: CanvasRenderingContext2D,
    frame: number,
    width: number,
    height: number,
    hovered: boolean
  ) => {
    if (coins.length === 0) return
    
    const time = frame * 0.016
    const centerX = width / 2
    const centerY = height / 2
    const glowIntensity = hovered ? 1.0 : 0.6
    
    // Sort coins by depth for proper rendering order
    const sortedCoins = [...coins].sort((a, b) => {
      const aDepth = Math.sin(time * a.speed + a.offset + a.depthPhase) * 0.5 + 0.5
      const bDepth = Math.sin(time * b.speed + b.offset + b.depthPhase) * 0.5 + 0.5
      return aDepth - bDepth
    })
    
    sortedCoins.forEach(coin => {
      const angle = time * coin.speed + coin.offset
      const x = centerX + Math.cos(angle) * coin.radius
      const y = centerY + Math.sin(angle) * coin.radius * 0.6 + coin.verticalOffset
      
      const depth = Math.sin(time * coin.speed + coin.offset + coin.depthPhase) * 0.5 + 0.5
      
      const distanceFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
      const proximityGlow = Math.max(0, 1 - distanceFromCenter / (coin.radius * 2))
      const finalGlow = (proximityGlow + glowIntensity) * depth
      
      if (coin.type === 'bitcoin') {
        drawBitcoinCoin(ctx, x, y, coin.size, depth, finalGlow)
      } else {
        drawSeiCoin(ctx, x, y, coin.size, depth, finalGlow)
      }
    })
  }, [coins, drawBitcoinCoin, drawSeiCoin])

  // Optimized dragon drawing with dirty rectangle support
  const drawDragon = useCallback((
    ctx: CanvasRenderingContext2D, 
    frame: number, 
    width: number, 
    height: number,
    hovered: boolean,
    animationMode: 'idle' | 'hover' | 'wishGranting' | 'powerUp'
  ) => {
    // Performance optimization: use dirty rectangles for partial updates
    if (currentQualitySettings.enableDirtyRectangles && dirtyRectRef.current) {
      const dirty = dirtyRectRef.current
      ctx.clearRect(dirty.x, dirty.y, dirty.width, dirty.height)
    } else {
      ctx.clearRect(0, 0, width, height)
    }
    
    ctx.save()
    
    const centerX = width / 2
    const centerY = height / 2
    
    // Animation values with quality-based complexity
    const time = frame * 0.016
    const complexity = currentQualitySettings.animationComplexity
    
    let breathingScale = 1 + Math.sin(time * 2) * 0.03 * complexity
    let floatOffset = Math.sin(time * 1.5) * 3 * complexity
    let glowIntensity = hovered ? 0.8 : 0.4
    const undulationOffset = time * 0.5 * complexity
    
    // Enhanced animations based on mode
    if (animationMode === 'wishGranting') {
      breathingScale = 1 + Math.sin(time * 3) * 0.08 * complexity
      floatOffset = Math.sin(time * 2) * 8 * complexity
      glowIntensity = 1.2 + Math.sin(time * 4) * 0.3 * complexity
    } else if (animationMode === 'powerUp') {
      breathingScale = 1 + Math.sin(time * 5) * 0.15 * complexity
      floatOffset = Math.sin(time * 3) * 12 * complexity
      glowIntensity = 1.5 + Math.sin(time * 6) * 0.5 * complexity
    }
    
    // Particle system with quality control
    let particleIntensity = hovered ? 1.0 : 0.6
    if (animationMode === 'wishGranting') {
      particleIntensity = 1.4 * complexity
    } else if (animationMode === 'powerUp') {
      particleIntensity = 2.0 * complexity
    }
    
    const dragonRadius = Math.min(width, height) * 0.3
    
    // Spawn particles
    spawnParticles(centerX, centerY + floatOffset, dragonRadius, particleIntensity, frame, animationMode)
    
    // Update particle physics
    updateParticles(frame)
    
    // Draw particles behind dragon
    ctx.save()
    drawParticles(ctx)
    ctx.restore()
    
    // Apply transformations
    ctx.translate(centerX, centerY + floatOffset)
    ctx.scale(breathingScale, breathingScale)
    
    // Draw enhanced mystical aura with quality control
    if ((hovered || animationMode !== 'idle') && currentQualitySettings.glowEffects) {
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.min(width, height) * 0.6)
      
      if (animationMode === 'wishGranting') {
        gradient.addColorStop(0, `rgba(255, 255, 255, ${glowIntensity * 0.4})`)
        gradient.addColorStop(0.3, `rgba(255, 215, 0, ${glowIntensity * 0.3})`)
        gradient.addColorStop(0.6, `rgba(255, 140, 0, ${glowIntensity * 0.2})`)
        gradient.addColorStop(1, `rgba(220, 20, 60, ${glowIntensity * 0.1})`)
      } else if (animationMode === 'powerUp') {
        gradient.addColorStop(0, `rgba(255, 20, 147, ${glowIntensity * 0.5})`)
        gradient.addColorStop(0.3, `rgba(138, 43, 226, ${glowIntensity * 0.4})`)
        gradient.addColorStop(0.6, `rgba(75, 0, 130, ${glowIntensity * 0.3})`)
        gradient.addColorStop(1, `rgba(25, 25, 112, ${glowIntensity * 0.2})`)
      } else {
        gradient.addColorStop(0, `rgba(255, 215, 0, ${glowIntensity * 0.3})`)
        gradient.addColorStop(0.5, `rgba(255, 69, 0, ${glowIntensity * 0.2})`)
        gradient.addColorStop(1, `rgba(220, 20, 60, ${glowIntensity * 0.1})`)
      }
      
      ctx.fillStyle = gradient
      ctx.fillRect(-width/2, -height/2, width, height)
    }
    
    // Draw ready indicator
    if (readyToGrant && animationMode === 'idle' && currentQualitySettings.glowEffects) {
      const readyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.min(width, height) * 0.4)
      const readyPulse = Math.sin(time * 3) * 0.2 + 0.3
      readyGradient.addColorStop(0, `rgba(0, 255, 0, ${readyPulse})`)
      readyGradient.addColorStop(0.5, `rgba(50, 205, 50, ${readyPulse * 0.7})`)
      readyGradient.addColorStop(1, `rgba(0, 255, 0, 0)`)
      
      ctx.fillStyle = readyGradient
      ctx.fillRect(-width/2, -height/2, width, height)
    }
    
    // Draw orbital coins
    ctx.save()
    drawOrbitalCoins(ctx, frame, width, height, hovered || animationMode !== 'idle')
    ctx.restore()
    
    // Draw serpentine dragon body
    drawSerpentineDragon(ctx, width, height, undulationOffset, hovered || animationMode !== 'idle', animationMode)
    
    // Calculate dirty rectangle for next frame
    if (currentQualitySettings.enableDirtyRectangles) {
      const margin = 50
      dirtyRectRef.current = {
        x: centerX - dragonRadius - margin,
        y: centerY - dragonRadius - margin + floatOffset,
        width: dragonRadius * 2 + margin * 2,
        height: dragonRadius * 2 + margin * 2
      }
    }
    
    ctx.restore()
  }, [drawOrbitalCoins, spawnParticles, updateParticles, drawParticles, readyToGrant, currentQualitySettings])

  // Optimized serpentine dragon drawing
  const drawSerpentineDragon = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    undulationOffset: number,
    hovered: boolean,
    animationMode: 'idle' | 'hover' | 'wishGranting' | 'powerUp' = 'idle'
  ) => {
    const scale = Math.min(width, height) / 400
    const baseRadius = 15 * scale
    const segments = Math.floor(12 * currentQualitySettings.animationComplexity)
    
    // Create serpentine path points
    const bodyPoints: Array<{x: number, y: number, radius: number, angle: number}> = []
    
    for (let i = 0; i < segments; i++) {
      const t = i / (segments - 1)
      const angle = t * Math.PI * 2.5 + undulationOffset
      const radiusFromCenter = (60 + Math.sin(t * Math.PI * 3) * 40) * scale
      
      const undulationX = Math.sin(angle) * radiusFromCenter
      const undulationY = Math.cos(angle * 0.7) * radiusFromCenter * 0.6
      
      const x = undulationX
      const y = undulationY
      
      const segmentRadius = baseRadius * (0.6 + 0.4 * Math.sin(t * Math.PI))
      
      bodyPoints.push({
        x,
        y,
        radius: segmentRadius,
        angle: Math.atan2(
          i < segments - 1 ? bodyPoints[i - 1]?.y - y || 0 : 0,
          i < segments - 1 ? bodyPoints[i - 1]?.x - x || 0 : 0
        )
      })
    }
    
    // Draw body segments
    for (let i = 0; i < bodyPoints.length; i++) {
      const point = bodyPoints[i]
      const t = i / (bodyPoints.length - 1)
      
      // Create gradient for each segment
      let gradient
      if (currentQualitySettings.advancedShaders) {
        gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, point.radius)
      }
      
      const redIntensity = 0.8 + t * 0.2
      const goldIntensity = 0.3 + (1 - t) * 0.7
      
      if (currentQualitySettings.advancedShaders && gradient) {
        if (animationMode === 'wishGranting') {
          gradient.addColorStop(0, `rgba(255, 255, 255, ${goldIntensity * 0.9})`)
          gradient.addColorStop(0.3, `rgba(255, 215, 0, ${goldIntensity})`)
          gradient.addColorStop(0.7, `rgba(255, 140, 0, ${redIntensity})`)
          gradient.addColorStop(1, `rgba(255, 69, 0, 0.8)`)
        } else if (animationMode === 'powerUp') {
          gradient.addColorStop(0, `rgba(255, 20, 147, ${goldIntensity})`)
          gradient.addColorStop(0.3, `rgba(138, 43, 226, ${goldIntensity * 0.9})`)
          gradient.addColorStop(0.7, `rgba(75, 0, 130, ${redIntensity})`)
          gradient.addColorStop(1, `rgba(25, 25, 112, 0.8)`)
        } else if (hovered) {
          gradient.addColorStop(0, `rgba(255, 215, 0, ${goldIntensity})`)
          gradient.addColorStop(0.3, `rgba(255, 140, 0, 0.9)`)
          gradient.addColorStop(0.7, `rgba(220, 20, 60, ${redIntensity})`)
          gradient.addColorStop(1, `rgba(139, 0, 0, 0.8)`)
        } else {
          gradient.addColorStop(0, `rgba(255, 215, 0, ${goldIntensity * 0.7})`)
          gradient.addColorStop(0.3, `rgba(255, 140, 0, 0.7)`)
          gradient.addColorStop(0.7, `rgba(220, 20, 60, ${redIntensity * 0.7})`)
          gradient.addColorStop(1, `rgba(139, 0, 0, 0.6)`)
        }
        ctx.fillStyle = gradient
      } else {
        // Simple fill for low quality
        if (animationMode === 'wishGranting') {
          ctx.fillStyle = `rgba(255, 215, 0, ${goldIntensity * 0.8})`
        } else if (animationMode === 'powerUp') {
          ctx.fillStyle = `rgba(138, 43, 226, ${goldIntensity * 0.8})`
        } else {
          ctx.fillStyle = `rgba(255, 140, 0, ${goldIntensity * 0.6})`
        }
      }
      
      ctx.beginPath()
      ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2)
      ctx.fill()
      
      // Add scales/texture only on higher quality
      if (currentQualitySettings.animationComplexity > 0.7 && i < bodyPoints.length - 1) {
        drawScales(ctx, point.x, point.y, point.radius, point.angle, scale)
      }
    }
    
    // Connect segments with smooth curves
    if (currentQualitySettings.animationComplexity > 0.5) {
      drawBodyConnections(ctx, bodyPoints, hovered)
    }
    
    // Draw dragon head
    if (bodyPoints.length > 0) {
      const headPoint = bodyPoints[bodyPoints.length - 1]
      drawDragonHead(ctx, headPoint.x, headPoint.y, headPoint.radius * 1.5, headPoint.angle, hovered, scale, animationMode)
    }
  }, [currentQualitySettings])

  // Optimized scale drawing
  const drawScales = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    angle: number,
    scale: number
  ) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    
    const scaleSize = radius * 0.3
    const scaleCount = Math.floor(radius / 3)
    
    for (let i = 0; i < scaleCount; i++) {
      const scaleAngle = (i / scaleCount) * Math.PI * 2
      const scaleX = Math.cos(scaleAngle) * radius * 0.7
      const scaleY = Math.sin(scaleAngle) * radius * 0.7
      
      ctx.strokeStyle = 'rgba(139, 0, 0, 0.4)'
      ctx.lineWidth = 1 * scale
      ctx.beginPath()
      ctx.arc(scaleX, scaleY, scaleSize, 0, Math.PI * 2)
      ctx.stroke()
    }
    
    ctx.restore()
  }, [])

  // Optimized body connections
  const drawBodyConnections = useCallback((
    ctx: CanvasRenderingContext2D,
    bodyPoints: Array<{x: number, y: number, radius: number, angle: number}>,
    hovered: boolean
  ) => {
    ctx.save()
    ctx.strokeStyle = hovered ? 'rgba(255, 69, 0, 0.8)' : 'rgba(220, 20, 60, 0.6)'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    if (bodyPoints.length > 1) {
      ctx.beginPath()
      ctx.moveTo(bodyPoints[0].x, bodyPoints[0].y)
      
      for (let i = 1; i < bodyPoints.length - 1; i++) {
        const current = bodyPoints[i]
        const next = bodyPoints[i + 1]
        const controlX = (current.x + next.x) / 2
        const controlY = (current.y + next.y) / 2
        
        ctx.quadraticCurveTo(current.x, current.y, controlX, controlY)
      }
      
      ctx.stroke()
    }
    
    ctx.restore()
  }, [])

  // Optimized glowing eyes
  const drawGlowingEyes = useCallback((
    ctx: CanvasRenderingContext2D,
    headRadius: number,
    hovered: boolean,
    frame: number
  ) => {
    const eyeSize = headRadius * 0.15
    const glowRadius = eyeSize * 2.5
    const time = frame * 0.016
    
    const leftEyeX = -headRadius * 0.2
    const leftEyeY = -headRadius * 0.3
    const rightEyeX = -headRadius * 0.2
    const rightEyeY = headRadius * 0.3
    
    const blinkCycle = Math.sin(time * 0.3) * 0.5 + 0.5
    const intensityPulse = Math.sin(time * 2) * 0.2 + 0.8
    const glowPulse = Math.sin(time * 1.5) * 0.3 + 0.7
    const isBlinking = blinkCycle < 0.1
    
    const baseIntensity = hovered ? 1.0 : 0.7
    const currentIntensity = baseIntensity * intensityPulse
    const currentGlow = (hovered ? 1.2 : 0.8) * glowPulse
    
    if (!isBlinking) {
      [{ x: leftEyeX, y: leftEyeY }, { x: rightEyeX, y: rightEyeY }].forEach(eye => {
        // Draw glow only if enabled
        if (currentQualitySettings.glowEffects) {
          const outerGlow = ctx.createRadialGradient(eye.x, eye.y, 0, eye.x, eye.y, glowRadius * currentGlow)
          outerGlow.addColorStop(0, `rgba(255, 0, 0, ${currentIntensity * 0.8})`)
          outerGlow.addColorStop(0.2, `rgba(255, 50, 0, ${currentIntensity * 0.6})`)
          outerGlow.addColorStop(0.4, `rgba(255, 100, 0, ${currentIntensity * 0.4})`)
          outerGlow.addColorStop(0.7, `rgba(255, 150, 0, ${currentIntensity * 0.2})`)
          outerGlow.addColorStop(1, `rgba(255, 200, 0, 0)`)
          
          ctx.fillStyle = outerGlow
          ctx.beginPath()
          ctx.arc(eye.x, eye.y, glowRadius * currentGlow, 0, Math.PI * 2)
          ctx.fill()
        }
        
        // Draw eye with quality-based detail
        if (currentQualitySettings.advancedShaders) {
          const eyeGradient = ctx.createRadialGradient(eye.x, eye.y, 0, eye.x, eye.y, eyeSize)
          eyeGradient.addColorStop(0, `rgba(255, 255, 255, ${currentIntensity * 0.3})`)
          eyeGradient.addColorStop(0.1, `rgba(255, 200, 0, ${currentIntensity * 0.8})`)
          eyeGradient.addColorStop(0.3, `rgba(255, 100, 0, ${currentIntensity * 0.9})`)
          eyeGradient.addColorStop(0.6, `rgba(255, 50, 0, ${currentIntensity * 0.95})`)
          eyeGradient.addColorStop(0.8, `rgba(255, 0, 0, ${currentIntensity})`)
          eyeGradient.addColorStop(1, `rgba(200, 0, 0, ${currentIntensity * 0.8})`)
          ctx.fillStyle = eyeGradient
        } else {
          ctx.fillStyle = `rgba(255, 0, 0, ${currentIntensity})`
        }
        
        ctx.beginPath()
        ctx.arc(eye.x, eye.y, eyeSize, 0, Math.PI * 2)
        ctx.fill()
        
        // Add bright core only on higher quality
        if (currentQualitySettings.animationComplexity > 0.6) {
          const coreGradient = ctx.createRadialGradient(eye.x, eye.y, 0, eye.x, eye.y, eyeSize * 0.4)
          coreGradient.addColorStop(0, `rgba(255, 255, 255, ${currentIntensity * 0.6})`)
          coreGradient.addColorStop(0.5, `rgba(255, 200, 0, ${currentIntensity * 0.8})`)
          coreGradient.addColorStop(1, `rgba(255, 100, 0, ${currentIntensity * 0.4})`)
          
          ctx.fillStyle = coreGradient
          ctx.beginPath()
          ctx.arc(eye.x, eye.y, eyeSize * 0.4, 0, Math.PI * 2)
          ctx.fill()
        }
      })
    } else {
      // Draw closed eyes
      ctx.strokeStyle = `rgba(255, 0, 0, ${currentIntensity * 0.8})`
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      
      ctx.beginPath()
      ctx.moveTo(leftEyeX - eyeSize, leftEyeY)
      ctx.lineTo(leftEyeX + eyeSize, leftEyeY)
      ctx.stroke()
      
      ctx.beginPath()
      ctx.moveTo(rightEyeX - eyeSize, rightEyeY)
      ctx.lineTo(rightEyeX + eyeSize, rightEyeY)
      ctx.stroke()
    }
  }, [currentQualitySettings])

  // Optimized dragon head
  const drawDragonHead = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    angle: number,
    hovered: boolean,
    scale: number,
    animationMode: 'idle' | 'hover' | 'wishGranting' | 'powerUp' = 'idle'
  ) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    
    // Head gradient based on quality
    let headGradient
    if (currentQualitySettings.advancedShaders) {
      headGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
      
      if (animationMode === 'wishGranting') {
        headGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
        headGradient.addColorStop(0.4, 'rgba(255, 215, 0, 0.9)')
        headGradient.addColorStop(0.8, 'rgba(255, 140, 0, 0.9)')
        headGradient.addColorStop(1, 'rgba(255, 69, 0, 0.8)')
      } else if (animationMode === 'powerUp') {
        headGradient.addColorStop(0, 'rgba(255, 20, 147, 0.9)')
        headGradient.addColorStop(0.4, 'rgba(138, 43, 226, 0.9)')
        headGradient.addColorStop(0.8, 'rgba(75, 0, 130, 0.9)')
        headGradient.addColorStop(1, 'rgba(25, 25, 112, 0.8)')
      } else if (hovered) {
        headGradient.addColorStop(0, 'rgba(255, 215, 0, 0.9)')
        headGradient.addColorStop(0.4, 'rgba(255, 140, 0, 0.8)')
        headGradient.addColorStop(0.8, 'rgba(220, 20, 60, 0.9)')
        headGradient.addColorStop(1, 'rgba(139, 0, 0, 0.8)')
      } else {
        headGradient.addColorStop(0, 'rgba(255, 215, 0, 0.7)')
        headGradient.addColorStop(0.4, 'rgba(255, 140, 0, 0.6)')
        headGradient.addColorStop(0.8, 'rgba(220, 20, 60, 0.7)')
        headGradient.addColorStop(1, 'rgba(139, 0, 0, 0.6)')
      }
      ctx.fillStyle = headGradient
    } else {
      // Simple fill for low quality
      if (animationMode === 'wishGranting') {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.8)'
      } else if (animationMode === 'powerUp') {
        ctx.fillStyle = 'rgba(138, 43, 226, 0.8)'
      } else {
        ctx.fillStyle = 'rgba(255, 140, 0, 0.7)'
      }
    }
    
    // Draw head base
    ctx.beginPath()
    ctx.ellipse(0, 0, radius, radius * 0.8, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // Draw snout
    ctx.beginPath()
    ctx.ellipse(radius * 0.6, 0, radius * 0.4, radius * 0.3, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // Draw enhanced glowing eyes
    drawGlowingEyes(ctx, radius, hovered, animationState.frame)
    
    // Draw pupils
    const eyeSize = radius * 0.15
    const pupilSize = eyeSize * 0.3
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'
    ctx.beginPath()
    ctx.arc(-radius * 0.2, -radius * 0.3, pupilSize, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(-radius * 0.2, radius * 0.3, pupilSize, 0, Math.PI * 2)
    ctx.fill()
    
    // Add reflections only on higher quality
    if (currentQualitySettings.animationComplexity > 0.6) {
      const reflectionSize = pupilSize * 0.4
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.beginPath()
      ctx.arc(-radius * 0.2 - pupilSize * 0.3, -radius * 0.3 - pupilSize * 0.3, reflectionSize, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(-radius * 0.2 - pupilSize * 0.3, radius * 0.3 - pupilSize * 0.3, reflectionSize, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // Draw horns with quality-based detail
    let hornColor = 'rgba(220, 20, 60, 0.6)'
    if (animationMode === 'wishGranting') {
      hornColor = 'rgba(255, 215, 0, 0.9)'
    } else if (animationMode === 'powerUp') {
      hornColor = 'rgba(138, 43, 226, 0.9)'
    } else if (hovered) {
      hornColor = 'rgba(255, 140, 0, 0.8)'
    }
    
    ctx.strokeStyle = hornColor
    ctx.lineWidth = 3 * scale
    ctx.lineCap = 'round'
    
    // Draw horns
    ctx.beginPath()
    ctx.moveTo(-radius * 0.6, -radius * 0.6)
    ctx.lineTo(-radius * 0.8, -radius * 1.2)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.moveTo(-radius * 0.2, -radius * 0.7)
    ctx.lineTo(-radius * 0.3, -radius * 1.3)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.moveTo(-radius * 0.2, radius * 0.7)
    ctx.lineTo(-radius * 0.3, radius * 1.3)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.moveTo(-radius * 0.6, radius * 0.6)
    ctx.lineTo(-radius * 0.8, radius * 1.2)
    ctx.stroke()
    
    // Draw whiskers only on higher quality
    if (currentQualitySettings.animationComplexity > 0.5) {
      let whiskerColor = 'rgba(255, 140, 0, 0.4)'
      if (animationMode === 'wishGranting') {
        whiskerColor = 'rgba(255, 255, 255, 0.8)'
      } else if (animationMode === 'powerUp') {
        whiskerColor = 'rgba(255, 20, 147, 0.8)'
      } else if (hovered) {
        whiskerColor = 'rgba(255, 215, 0, 0.6)'
      }
      
      ctx.strokeStyle = whiskerColor
      ctx.lineWidth = 2 * scale
      
      ctx.beginPath()
      ctx.moveTo(radius * 0.8, -radius * 0.2)
      ctx.lineTo(radius * 1.4, -radius * 0.3)
      ctx.stroke()
      
      ctx.beginPath()
      ctx.moveTo(radius * 0.8, radius * 0.2)
      ctx.lineTo(radius * 1.4, radius * 0.3)
      ctx.stroke()
    }
    
    ctx.restore()
  }, [drawGlowingEyes, animationState.frame, currentQualitySettings])

  // Optimized animation loop with frame timing
  const animate = useCallback((timestamp: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Calculate frame timing
    const deltaTime = timestamp - lastFrameTimeRef.current
    const targetFrameTime = 1000 / currentQualitySettings.targetFPS
    
    // Skip frame if we're running too fast (respect target FPS)
    if (deltaTime < targetFrameTime * 0.9) {
      animationFrameRef.current = requestAnimationFrame(animate)
      return
    }
    
    // Update performance metrics
    updatePerformanceMetrics(timestamp)
    
    setAnimationState(prev => {
      const newFrame = prev.frame + 1
      
      // Check if wish granting animation should end
      let currentMode = prev.mode
      if (prev.mode === 'wishGranting' && prev.wishGrantStartTime && 
          newFrame - prev.wishGrantStartTime > prev.wishGrantDuration) {
        currentMode = 'powerUp'
      }
      
      // Update animation mode based on interaction
      if (currentMode === 'idle' && mousePosition.isOverDragon && isHovered) {
        currentMode = 'hover'
      } else if (currentMode === 'hover' && (!mousePosition.isOverDragon || !isHovered)) {
        currentMode = 'idle'
      }
      
      drawDragon(ctx, newFrame, canvasConfig.width, canvasConfig.height, isHovered, currentMode)
      
      return {
        ...prev,
        frame: newFrame,
        timestamp,
        isRunning: true,
        mode: currentMode
      }
    })
    
    animationFrameRef.current = requestAnimationFrame(animate)
  }, [drawDragon, canvasConfig.width, canvasConfig.height, isHovered, mousePosition.isOverDragon, updatePerformanceMetrics, currentQualitySettings.targetFPS])

  // Initialize canvas and animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Initialize particle pool
    initializeParticlePool()
    
    // Setup canvas
    setupCanvas(canvas, ctx)
    
    // Start animation
    const startAnimation = () => {
      setAnimationState(prev => ({ ...prev, isRunning: true }))
      if (!animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate)
      }
    }
    
    if (canvas.width > 0 && canvas.height > 0) {
      startAnimation()
    } else {
      setTimeout(startAnimation, 100)
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [setupCanvas, animate, initializeParticlePool])

  // Handle resize with debouncing
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout
    
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        
        setupCanvas(canvas, ctx)
      }, 100)
    }
    
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimeout)
    }
  }, [setupCanvas])

  // Setup mouse tracking with throttling
  useEffect(() => {
    if (!interactive || !containerRef.current) return
    
    const container = containerRef.current
    
    container.addEventListener('mousemove', throttledMouseMove as any)
    container.addEventListener('mouseleave', handleMouseLeaveTracking)
    
    return () => {
      container.removeEventListener('mousemove', throttledMouseMove as any)
      container.removeEventListener('mouseleave', handleMouseLeaveTracking)
    }
  }, [interactive, throttledMouseMove, handleMouseLeaveTracking])

  // Memory management and cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      setAnimationState(prev => ({ ...prev, isRunning: false }))
      
      // Clear particle pool
      particlePoolRef.current.forEach(particle => {
        particle.active = false
      })
      setParticles([])
      
      // Clear frame times
      frameTimesRef.current = []
    }
  }, [])

  // Interaction handlers
  const handleMouseEnter = useCallback(() => {
    if (interactive) {
      setIsHovered(true)
      playSound('hover')
      onInteraction?.('hover')
    }
  }, [interactive, onInteraction, playSound])

  const handleMouseLeave = useCallback(() => {
    if (interactive) {
      setIsHovered(false)
    }
  }, [interactive])

  const handleClick = useCallback(() => {
    if (interactive) {
      playSound('click')
      onInteraction?.('click')
      
      if (readyToGrant && mousePosition.isOverDragon) {
        triggerWishGrant()
      }
    }
  }, [interactive, onInteraction, playSound, readyToGrant, mousePosition.isOverDragon, triggerWishGrant])

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (interactive) {
      const touch = event.touches[0]
      if (touch && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const x = touch.clientX - rect.left
        const y = touch.clientY - rect.top
        
        const centerX = canvasConfig.width / 2
        const centerY = canvasConfig.height / 2
        const dragonRadius = Math.min(canvasConfig.width, canvasConfig.height) * 0.3
        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
        const isOverDragon = distance <= dragonRadius * 1.2
        
        setMousePosition({
          x,
          y,
          isOverDragon,
          isTracking: true
        })
        
        setIsHovered(true)
        playSound('click')
        onInteraction?.('touch')
        
        if (readyToGrant && isOverDragon) {
          triggerWishGrant()
        }
      }
    }
  }, [interactive, onInteraction, playSound, readyToGrant, triggerWishGrant, canvasConfig.width, canvasConfig.height])

  const handleTouchEnd = useCallback(() => {
    if (interactive) {
      setIsHovered(false)
      setMousePosition(prev => ({
        ...prev,
        isTracking: false,
        isOverDragon: false
      }))
    }
  }, [interactive])

  return (
    <div 
      ref={containerRef}
      className={`relative ${config.containerSize} ${className} ${
        interactive && readyToGrant ? 'cursor-pointer' : 
        interactive ? 'cursor-pointer' : 'cursor-default'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        // Apply CSS optimizations based on quality settings
        willChange: currentQualitySettings.enableGPUAcceleration ? 'transform' : 'auto',
        transform: currentQualitySettings.enableGPUAcceleration ? 'translateZ(0)' : 'none'
      }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ 
          width: config.width, 
          height: config.height,
          // Additional GPU acceleration hints
          ...(currentQualitySettings.enableGPUAcceleration && {
            willChange: 'transform',
            transform: 'translateZ(0)'
          })
        }}
      />
      
      {/* Performance indicator */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-0 right-0 bg-black/70 text-white text-xs p-2 rounded-bl pointer-events-none">
          <div>FPS: {performanceMetrics.fps.toFixed(1)}</div>
          <div>Frame Time: {performanceMetrics.frameTime.toFixed(1)}ms</div>
          <div>Quality: {performanceMetrics.adaptiveQuality}</div>
          <div>Particles: {particlePoolRef.current.filter(p => p.active).length}</div>
          <div>Battery: {isBatteryLow ? 'Low' : 'OK'}</div>
          <div>Device: {isLowEndDevice ? 'Low-End' : 'OK'}</div>
        </div>
      )}
      
      {/* Ready indicator overlay */}
      {interactive && readyToGrant && animationState.mode === 'idle' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-green-500/20 text-green-100 px-3 py-1 rounded-full text-sm font-medium animate-pulse">
            Ready to Grant Wishes
          </div>
        </div>
      )}
      
      {/* Animation mode indicator */}
      {interactive && animationState.mode !== 'idle' && (
        <div className="absolute top-2 right-2 pointer-events-none">
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            animationState.mode === 'wishGranting' ? 'bg-yellow-500/20 text-yellow-100' :
            animationState.mode === 'powerUp' ? 'bg-purple-500/20 text-purple-100' :
            animationState.mode === 'hover' ? 'bg-orange-500/20 text-orange-100' :
            'bg-gray-500/20 text-gray-100'
          }`}>
            {animationState.mode === 'wishGranting' ? 'Granting Wish...' :
             animationState.mode === 'powerUp' ? 'Power Surge!' :
             animationState.mode === 'hover' ? 'Awakening...' :
             'Idle'}
          </div>
        </div>
      )}
    </div>
  )
}

export default SeironSprite

// Additional exports for better module integration
export type {
  SeironSpriteProps,
  AnimationState,
  CoinConfig,
  ParticleConfig,
  CanvasConfig,
  MousePosition,
  PerformanceMetrics,
  QualitySettings
}

export { sizeConfig, qualityConfigs }