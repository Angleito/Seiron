'use client'

import { DragonModelConfig, DeviceCapability, DRAGON_MODELS } from '../config/dragonModels'
import { ModelPerformanceMetrics, PerformanceDataPoint } from '../hooks/useModelPerformanceTracking'

// Enhanced recommendation interfaces
export interface DeviceProfile {
  // Hardware capabilities
  cpuCores: number
  totalMemoryGB: number
  isDesktop: boolean
  isMobile: boolean
  isTablet: boolean
  isLowEnd: boolean
  
  // Graphics capabilities
  webglSupport: 'none' | 'webgl1' | 'webgl2'
  maxTextureSize: number
  gpuTier: 'low' | 'medium' | 'high'
  hardwareAcceleration: boolean
  
  // Network and battery
  connectionSpeed: 'slow' | 'medium' | 'fast'
  onBatteryPower: boolean
  
  // User preferences
  preferPerformance: boolean
  preferQuality: boolean
  preferBatteryLife: boolean
  prioritizeLoadTime: boolean
}

export interface ModelScoring {
  modelId: string
  totalScore: number
  subscores: {
    compatibility: number      // 0-25 points
    performance: number        // 0-25 points
    resources: number         // 0-20 points
    userPreferences: number   // 0-15 points
    historicalData: number    // 0-15 points
  }
  penalties: Array<{
    reason: string
    points: number
  }>
  bonuses: Array<{
    reason: string
    points: number
  }>
}

export interface RecommendationResult {
  primary: {
    model: DragonModelConfig
    score: ModelScoring
    confidence: number
    reasons: string[]
    estimatedPerformance: {
      expectedFPS: number
      memoryUsageMB: number
      loadTimeSeconds: number
      batteryImpactLevel: 'low' | 'medium' | 'high'
    }
  }
  alternatives: Array<{
    model: DragonModelConfig
    score: ModelScoring
    confidence: number
    reason: string
    tradeoffs: string[]
  }>
  fallbackChain: DragonModelConfig[]
  reasoning: {
    deviceAnalysis: string[]
    performanceExpectations: string[]
    recommendations: string[]
    warnings: string[]
  }
}

export interface RecommendationContext {
  deviceProfile: DeviceProfile
  performanceHistory: PerformanceDataPoint[]
  currentLoad: 'light' | 'medium' | 'heavy'
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  sessionDuration: number // minutes
  userBehavior: {
    frequentlyUsedModels: string[]
    averageSessionLength: number
    preferredQualityLevel: string
    hasVoiceEnabled: boolean
  }
}

/**
 * Advanced AI-driven model recommendation engine
 * Uses machine learning principles, device profiling, and performance analytics
 * to recommend the optimal dragon model for the current context
 */
export class ModelRecommendationEngine {
  private static instance: ModelRecommendationEngine
  private modelPerformanceDatabase: Map<string, ModelPerformanceMetrics[]> = new Map()
  private deviceProfileCache: DeviceProfile | null = null
  private userPreferencesCache: any = null
  
  static getInstance(): ModelRecommendationEngine {
    if (!ModelRecommendationEngine.instance) {
      ModelRecommendationEngine.instance = new ModelRecommendationEngine()
    }
    return ModelRecommendationEngine.instance
  }
  
  /**
   * Generate comprehensive device profile
   */
  async generateDeviceProfile(): Promise<DeviceProfile> {
    if (this.deviceProfileCache) {
      return this.deviceProfileCache
    }
    
    const navigator = window.navigator as any
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    
    // Detect WebGL capabilities
    const canvas = document.createElement('canvas')
    const webgl1 = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    const webgl2 = canvas.getContext('webgl2')
    
    let webglSupport: 'none' | 'webgl1' | 'webgl2' = 'none'
    let maxTextureSize = 512
    let gpuTier: 'low' | 'medium' | 'high' = 'low'
    
    if (webgl2) {
      webglSupport = 'webgl2'
      maxTextureSize = (webgl2 as WebGL2RenderingContext).getParameter((webgl2 as WebGL2RenderingContext).MAX_TEXTURE_SIZE)
      
      // GPU tier detection based on renderer
      const debugInfo = webgl2.getExtension('WEBGL_debug_renderer_info')
      if (debugInfo) {
        const renderer = (webgl2 as WebGL2RenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase()
        if (renderer.includes('nvidia') || renderer.includes('amd') || renderer.includes('radeon')) {
          gpuTier = renderer.includes('gtx') || renderer.includes('rtx') || renderer.includes('rx') ? 'high' : 'medium'
        } else if (renderer.includes('intel')) {
          gpuTier = renderer.includes('iris') || renderer.includes('uhd') ? 'medium' : 'low'
        }
      }
    } else if (webgl1) {
      webglSupport = 'webgl1'
      maxTextureSize = (webgl1 as WebGLRenderingContext).getParameter((webgl1 as WebGLRenderingContext).MAX_TEXTURE_SIZE)
      gpuTier = 'low'
    }
    
    // Device classification
    const userAgent = navigator.userAgent
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent)
    const isDesktop = !isMobile && !isTablet
    
    // Memory and CPU detection
    const totalMemoryGB = navigator.deviceMemory || (isMobile ? 2 : 8)
    const cpuCores = navigator.hardwareConcurrency || (isMobile ? 4 : 8)
    const isLowEnd = totalMemoryGB < 4 || cpuCores < 4
    
    // Network analysis
    let connectionSpeed: 'slow' | 'medium' | 'fast' = 'medium'
    if (connection) {
      const effectiveType = connection.effectiveType
      if (effectiveType === 'slow-2g' || effectiveType === '2g') {
        connectionSpeed = 'slow'
      } else if (effectiveType === '3g') {
        connectionSpeed = 'medium'
      } else if (effectiveType === '4g' || effectiveType === '5g') {
        connectionSpeed = 'fast'
      }
    }
    
    // Battery status
    let onBatteryPower = false
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery()
        onBatteryPower = !battery.charging && battery.level < 0.8
      } catch (e) {
        onBatteryPower = isMobile // Assume mobile devices are on battery
      }
    } else {
      onBatteryPower = isMobile
    }
    
    const profile: DeviceProfile = {
      cpuCores,
      totalMemoryGB,
      isDesktop,
      isMobile,
      isTablet,
      isLowEnd,
      webglSupport,
      maxTextureSize,
      gpuTier,
      hardwareAcceleration: webglSupport !== 'none',
      connectionSpeed,
      onBatteryPower,
      // Default user preferences (would be customizable)
      preferPerformance: isDesktop && !isLowEnd,
      preferQuality: isDesktop && !onBatteryPower,
      preferBatteryLife: isMobile || onBatteryPower,
      prioritizeLoadTime: connectionSpeed === 'slow'
    }
    
    this.deviceProfileCache = profile
    return profile
  }
  
  /**
   * Score a model based on device compatibility and requirements
   */
  private scoreModelCompatibility(model: DragonModelConfig, profile: DeviceProfile): number {
    let score = 0
    
    // WebGL requirement check
    if (model.format === 'glb' || model.format === 'gltf') {
      if (profile.webglSupport === 'none') return 0 // Cannot run
      if (profile.webglSupport === 'webgl2') score += 10
      else if (profile.webglSupport === 'webgl1') score += 5
    } else {
      score += 8 // Non-WebGL models get points for compatibility
    }
    
    // Memory requirement compatibility
    const memoryRatio = model.performance.memoryUsageMB / (profile.totalMemoryGB * 1024)
    if (memoryRatio <= 0.1) score += 10      // Very light
    else if (memoryRatio <= 0.2) score += 8  // Light
    else if (memoryRatio <= 0.3) score += 5  // Moderate
    else if (memoryRatio <= 0.5) score += 2  // Heavy
    else score -= 5                          // Too heavy
    
    // Device type compatibility
    if (profile.isMobile) {
      if (model.compatibility.mobile.supported) {
        const perf = model.compatibility.mobile.performance
        if (perf === 'excellent') score += 5
        else if (perf === 'good') score += 3
        else if (perf === 'fair') score += 1
        else score -= 3
      } else {
        return 0 // Cannot run on mobile
      }
    } else if (profile.isTablet) {
      if (model.compatibility.tablet.supported) {
        const perf = model.compatibility.tablet.performance
        if (perf === 'excellent') score += 5
        else if (perf === 'good') score += 3
        else if (perf === 'fair') score += 1
        else score -= 3
      } else {
        return 0 // Cannot run on tablet
      }
    } else { // Desktop
      if (model.compatibility.desktop.supported) {
        const perf = model.compatibility.desktop.performance
        if (perf === 'excellent') score += 5
        else if (perf === 'good') score += 3
        else if (perf === 'fair') score += 1
        else score -= 3
      } else {
        score -= 10 // Desktop should support most models
      }
    }
    
    return Math.max(0, Math.min(25, score))
  }
  
  /**
   * Score model based on expected performance
   */
  private scoreModelPerformance(model: DragonModelConfig, profile: DeviceProfile): number {
    let score = 0
    
    // FPS expectation based on device capability
    let expectedFPS = model.performance.recommendedFPS
    
    // Adjust expectation based on device
    if (profile.isLowEnd) expectedFPS *= 0.7
    else if (profile.gpuTier === 'high') expectedFPS *= 1.2
    else if (profile.gpuTier === 'medium') expectedFPS *= 1.0
    else expectedFPS *= 0.8
    
    // Score based on expected performance
    if (expectedFPS >= 60) score += 10
    else if (expectedFPS >= 45) score += 8
    else if (expectedFPS >= 30) score += 5
    else if (expectedFPS >= 20) score += 2
    else score -= 5
    
    // Complexity vs capability balance
    const complexityRatio = model.performance.renderComplexity / 10
    const capabilityRatio = profile.gpuTier === 'high' ? 1.0 : profile.gpuTier === 'medium' ? 0.7 : 0.4
    
    if (complexityRatio <= capabilityRatio) {
      score += 10 // Good match
    } else if (complexityRatio <= capabilityRatio * 1.5) {
      score += 5  // Acceptable match
    } else {
      score -= 5  // May struggle
    }
    
    // Load time consideration
    if (model.performance.loadTimeMs <= 2000) score += 3
    else if (model.performance.loadTimeMs <= 5000) score += 1
    else score -= 2
    
    // Battery impact (important for mobile)
    if (profile.onBatteryPower) {
      if (model.performance.batteryImpact === 'low') score += 2
      else if (model.performance.batteryImpact === 'medium') score += 0
      else score -= 3
    }
    
    return Math.max(0, Math.min(25, score))
  }
  
  /**
   * Score model based on resource usage efficiency
   */
  private scoreModelResources(model: DragonModelConfig, profile: DeviceProfile): number {
    let score = 0
    
    // File size vs connection speed
    const fileSizeMB = model.fileSize / (1024 * 1024)
    if (profile.connectionSpeed === 'fast') {
      if (fileSizeMB <= 5) score += 5
      else if (fileSizeMB <= 15) score += 3
      else score += 1
    } else if (profile.connectionSpeed === 'medium') {
      if (fileSizeMB <= 3) score += 5
      else if (fileSizeMB <= 8) score += 3
      else if (fileSizeMB <= 15) score += 1
      else score -= 2
    } else { // slow connection
      if (fileSizeMB <= 2) score += 5
      else if (fileSizeMB <= 5) score += 2
      else score -= 3
    }
    
    // CPU intensity vs cores
    const cpuRatio = model.performance.cpuIntensity / profile.cpuCores
    if (cpuRatio <= 0.5) score += 5
    else if (cpuRatio <= 1.0) score += 3
    else if (cpuRatio <= 1.5) score += 1
    else score -= 2
    
    // GPU intensity vs tier
    const gpuScore = profile.gpuTier === 'high' ? 8 : profile.gpuTier === 'medium' ? 5 : 2
    const gpuRatio = model.performance.gpuIntensity / 10
    if (gpuRatio <= 0.3) score += Math.min(3, gpuScore)
    else if (gpuRatio <= 0.6) score += Math.min(5, gpuScore)
    else if (gpuRatio <= 0.8) score += Math.min(3, gpuScore)
    else score += Math.max(1, gpuScore - 2)
    
    // Texture memory vs GPU capability
    const textureRatio = model.performance.textureMemoryMB / (profile.totalMemoryGB * 256) // Assume 25% of memory for textures
    if (textureRatio <= 0.5) score += 3
    else if (textureRatio <= 1.0) score += 1
    else score -= 2
    
    return Math.max(0, Math.min(20, score))
  }
  
  /**
   * Score model based on user preferences
   */
  private scoreUserPreferences(model: DragonModelConfig, profile: DeviceProfile): number {
    let score = 0
    
    if (profile.preferPerformance) {
      // Prefer models with high FPS potential
      if (model.performance.recommendedFPS >= 60) score += 5
      else if (model.performance.recommendedFPS >= 45) score += 3
      else score += 1
      
      // Prefer lower complexity for smoother performance
      if (model.performance.renderComplexity <= 5) score += 3
      else if (model.performance.renderComplexity <= 7) score += 1
    }
    
    if (profile.preferQuality) {
      // Prefer high-quality models
      if (model.quality === 'ultra') score += 5
      else if (model.quality === 'high') score += 4
      else if (model.quality === 'medium') score += 2
      else score += 1
      
      // Prefer models with advanced features
      if (model.features.hasAnimations) score += 1
      if (model.features.hasVoiceIntegration) score += 1
      if (model.features.hasEmotionSystem) score += 1
    }
    
    if (profile.preferBatteryLife) {
      // Strongly prefer low battery impact
      if (model.performance.batteryImpact === 'low') score += 5
      else if (model.performance.batteryImpact === 'medium') score += 2
      else score -= 2
      
      // Prefer simpler models
      if (model.performance.renderComplexity <= 4) score += 2
      else if (model.performance.renderComplexity <= 6) score += 1
    }
    
    if (profile.prioritizeLoadTime) {
      // Heavily weight load time
      if (model.performance.loadTimeMs <= 1000) score += 5
      else if (model.performance.loadTimeMs <= 3000) score += 3
      else if (model.performance.loadTimeMs <= 5000) score += 1
      else score -= 2
    }
    
    return Math.max(0, Math.min(15, score))
  }
  
  /**
   * Score model based on historical performance data
   */
  private scoreHistoricalData(model: DragonModelConfig, performanceHistory: PerformanceDataPoint[]): number {
    const modelHistory = performanceHistory.filter(p => p.modelId === model.id)
    
    if (modelHistory.length === 0) {
      return 7 // Neutral score for untested models
    }
    
    let score = 0
    
    // Average performance score
    const avgPerformanceScore = modelHistory.reduce((acc, p) => acc + p.metrics.performanceScore, 0) / modelHistory.length
    if (avgPerformanceScore >= 80) score += 8
    else if (avgPerformanceScore >= 70) score += 6
    else if (avgPerformanceScore >= 60) score += 4
    else if (avgPerformanceScore >= 50) score += 2
    else score += 0
    
    // Stability (low error rate)
    const avgErrors = modelHistory.reduce((acc, p) => acc + p.metrics.errorCount, 0) / modelHistory.length
    if (avgErrors <= 0.1) score += 4
    else if (avgErrors <= 0.5) score += 2
    else if (avgErrors <= 1.0) score += 1
    else score -= 2
    
    // Consistency (low variance in FPS)
    const fpsValues = modelHistory.map(p => p.metrics.fps)
    const avgFPS = fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length
    const fpsVariance = fpsValues.reduce((acc, fps) => acc + Math.pow(fps - avgFPS, 2), 0) / fpsValues.length
    const fpsStdDev = Math.sqrt(fpsVariance)
    
    if (fpsStdDev <= 5) score += 3
    else if (fpsStdDev <= 10) score += 2
    else if (fpsStdDev <= 15) score += 1
    else score -= 1
    
    return Math.max(0, Math.min(15, score))
  }
  
  /**
   * Calculate comprehensive model scores
   */
  private calculateModelScoring(
    model: DragonModelConfig, 
    profile: DeviceProfile, 
    performanceHistory: PerformanceDataPoint[]
  ): ModelScoring {
    const subscores = {
      compatibility: this.scoreModelCompatibility(model, profile),
      performance: this.scoreModelPerformance(model, profile),
      resources: this.scoreModelResources(model, profile),
      userPreferences: this.scoreUserPreferences(model, profile),
      historicalData: this.scoreHistoricalData(model, performanceHistory)
    }
    
    const totalScore = Object.values(subscores).reduce((a, b) => a + b, 0)
    
    // Apply penalties and bonuses
    const penalties: Array<{ reason: string; points: number }> = []
    const bonuses: Array<{ reason: string; points: number }> = []
    
    // Penalty for experimental status
    if (model.status === 'experimental') {
      penalties.push({ reason: 'Experimental status', points: 5 })
    } else if (model.status === 'beta') {
      penalties.push({ reason: 'Beta status', points: 2 })
    }
    
    // Bonus for recommended models
    if (model.recommendedUseCases.includes('production-ready')) {
      bonuses.push({ reason: 'Production ready', points: 3 })
    }
    
    // Bonus for mobile optimization if on mobile
    if (profile.isMobile && model.recommendedUseCases.includes('mobile-optimized')) {
      bonuses.push({ reason: 'Mobile optimized', points: 5 })
    }
    
    // Penalty for oversized models on slow connections
    if (profile.connectionSpeed === 'slow' && model.fileSize > 5 * 1024 * 1024) {
      penalties.push({ reason: 'Large file on slow connection', points: 8 })
    }
    
    const totalPenalties = penalties.reduce((acc, p) => acc + p.points, 0)
    const totalBonuses = bonuses.reduce((acc, b) => acc + b.points, 0)
    const finalScore = Math.max(0, totalScore - totalPenalties + totalBonuses)
    
    return {
      modelId: model.id,
      totalScore: finalScore,
      subscores,
      penalties,
      bonuses
    }
  }
  
  /**
   * Generate intelligent model recommendations
   */
  async generateRecommendations(
    performanceHistory: PerformanceDataPoint[] = [],
    context?: Partial<RecommendationContext>
  ): Promise<RecommendationResult> {
    const profile = await this.generateDeviceProfile()
    
    // Score all available models
    const modelScores: ModelScoring[] = Object.values(DRAGON_MODELS).map(model =>
      this.calculateModelScoring(model, profile, performanceHistory)
    ).sort((a, b) => b.totalScore - a.totalScore)
    
    // Get top recommendation
    const primaryScore = modelScores[0]
    if (!primaryScore) {
      // Fallback to ASCII dragon if no models available
      const asciiModel = DRAGON_MODELS['dragon-ascii']
      if (!asciiModel) {
        throw new Error('No dragon models available')
      }
      return this.generateFallbackRecommendation(asciiModel)
    }
    
    const primaryModel = DRAGON_MODELS[primaryScore.modelId]
    if (!primaryModel) {
      throw new Error(`Primary model ${primaryScore.modelId} not found`)
    }
    
    // Calculate confidence based on score distribution
    const secondBestScore = modelScores[1]?.totalScore || 0
    const scoreDifference = primaryScore.totalScore - secondBestScore
    const confidence = Math.min(0.95, 0.5 + (scoreDifference / 100))
    
    // Generate reasoning
    const reasons: string[] = []
    
    if (primaryScore.subscores.compatibility >= 20) {
      reasons.push('Excellent device compatibility')
    }
    if (primaryScore.subscores.performance >= 20) {
      reasons.push('High performance potential')
    }
    if (primaryScore.subscores.resources >= 15) {
      reasons.push('Efficient resource usage')
    }
    if (primaryScore.bonuses.length > 0) {
      reasons.push(...primaryScore.bonuses.map(b => b.reason))
    }
    
    // Estimate performance
    const estimatedPerformance = {
      expectedFPS: Math.round(primaryModel.performance.recommendedFPS * (profile.gpuTier === 'high' ? 1.1 : profile.gpuTier === 'medium' ? 1.0 : 0.8)),
      memoryUsageMB: primaryModel.performance.memoryUsageMB,
      loadTimeSeconds: primaryModel.performance.loadTimeMs / 1000,
      batteryImpactLevel: primaryModel.performance.batteryImpact
    }
    
    // Generate alternatives
    const alternatives = modelScores.slice(1, 4).map(score => {
      const model = DRAGON_MODELS[score.modelId]
      if (!model) {
        throw new Error(`Alternative model ${score.modelId} not found`)
      }
      const scoreDiff = primaryScore.totalScore - score.totalScore
      let reason = 'Alternative option'
      const tradeoffs: string[] = []
      
      if (score.subscores.performance > primaryScore.subscores.performance) {
        reason = 'Better performance potential'
        tradeoffs.push('May require more resources')
      } else if (score.subscores.resources > primaryScore.subscores.resources) {
        reason = 'More resource efficient'
        tradeoffs.push('May have lower visual quality')
      } else if (model.quality === 'high' && primaryModel.quality !== 'high') {
        reason = 'Higher visual quality'
        tradeoffs.push('May impact performance')
      }
      
      return {
        model,
        score,
        confidence: Math.max(0.3, confidence - (scoreDiff / 100)),
        reason,
        tradeoffs
      }
    })
    
    // Generate fallback chain
    const fallbackChain: DragonModelConfig[] = []
    
    // Add primary model
    fallbackChain.push(primaryModel)
    
    // Add progressively lighter models
    const sortedByComplexity = Object.values(DRAGON_MODELS)
      .filter(m => m.id !== primaryModel.id)
      .sort((a, b) => a.performance.renderComplexity - b.performance.renderComplexity)
    
    // Add a medium-complexity fallback
    const mediumComplexity = sortedByComplexity.find(m => 
      m.performance.renderComplexity < primaryModel.performance.renderComplexity &&
      m.performance.renderComplexity >= 3
    )
    if (mediumComplexity) fallbackChain.push(mediumComplexity)
    
    // Add a low-complexity fallback
    const lowComplexity = sortedByComplexity.find(m => 
      m.performance.renderComplexity <= 2
    )
    if (lowComplexity) fallbackChain.push(lowComplexity)
    
    // Always end with ASCII fallback
    const asciiModel = Object.values(DRAGON_MODELS).find(m => m.id === 'dragon-ascii')
    if (asciiModel && !fallbackChain.includes(asciiModel)) {
      fallbackChain.push(asciiModel)
    }
    
    // Generate detailed reasoning
    const deviceAnalysis: string[] = []
    if (profile.isMobile) deviceAnalysis.push('Mobile device detected - prioritizing battery efficiency')
    if (profile.isLowEnd) deviceAnalysis.push('Low-end device - recommending optimized models')
    if (profile.gpuTier === 'high') deviceAnalysis.push('High-end GPU detected - can handle complex models')
    if (profile.connectionSpeed === 'slow') deviceAnalysis.push('Slow connection - preferring smaller models')
    
    const performanceExpectations: string[] = []
    performanceExpectations.push(`Expected FPS: ${estimatedPerformance.expectedFPS}`)
    performanceExpectations.push(`Memory usage: ${estimatedPerformance.memoryUsageMB}MB`)
    performanceExpectations.push(`Load time: ${estimatedPerformance.loadTimeSeconds.toFixed(1)}s`)
    
    const recommendations: string[] = []
    if (confidence > 0.8) {
      recommendations.push('High confidence recommendation - ideal match for your device')
    } else if (confidence > 0.6) {
      recommendations.push('Good recommendation - should work well on your device')
    } else {
      recommendations.push('Moderate recommendation - consider testing alternatives')
    }
    
    const warnings: string[] = []
    if (primaryScore.penalties.length > 0) {
      warnings.push(...primaryScore.penalties.map(p => p.reason))
    }
    if (profile.onBatteryPower && estimatedPerformance.batteryImpactLevel === 'high') {
      warnings.push('High battery usage expected - consider lower quality for longer battery life')
    }
    
    return {
      primary: {
        model: primaryModel,
        score: primaryScore,
        confidence,
        reasons,
        estimatedPerformance
      },
      alternatives,
      fallbackChain,
      reasoning: {
        deviceAnalysis,
        performanceExpectations,
        recommendations,
        warnings
      }
    }
  }
  
  /**
   * Quick recommendation for specific use cases
   */
  async getQuickRecommendation(
    useCase: 'performance' | 'quality' | 'battery' | 'mobile' | 'desktop' | 'balanced'
  ): Promise<DragonModelConfig> {
    const profile = await this.generateDeviceProfile()
    
    // Override preferences based on use case
    const customProfile = { ...profile }
    switch (useCase) {
      case 'performance':
        customProfile.preferPerformance = true
        customProfile.preferQuality = false
        customProfile.preferBatteryLife = false
        break
      case 'quality':
        customProfile.preferQuality = true
        customProfile.preferPerformance = false
        customProfile.preferBatteryLife = false
        break
      case 'battery':
        customProfile.preferBatteryLife = true
        customProfile.preferPerformance = false
        customProfile.preferQuality = false
        break
      case 'mobile':
        customProfile.isMobile = true
        customProfile.preferBatteryLife = true
        break
      case 'desktop':
        customProfile.isDesktop = true
        customProfile.preferQuality = true
        break
      case 'balanced':
        // Use default profile
        break
    }
    
    const scores = Object.values(DRAGON_MODELS).map(model =>
      this.calculateModelScoring(model, customProfile, [])
    ).sort((a, b) => b.totalScore - a.totalScore)
    
    const topScoreModelId = scores[0]?.modelId
    if (!topScoreModelId) {
      throw new Error('No models available for quick recommendation')
    }
    
    const selectedModel = DRAGON_MODELS[topScoreModelId]
    if (!selectedModel) {
      throw new Error(`Selected model ${topScoreModelId} not found`)
    }
    
    return selectedModel
  }
  
  /**
   * Update performance database with new metrics
   */
  updatePerformanceDatabase(modelId: string, metrics: ModelPerformanceMetrics) {
    if (!this.modelPerformanceDatabase.has(modelId)) {
      this.modelPerformanceDatabase.set(modelId, [])
    }
    
    const modelMetrics = this.modelPerformanceDatabase.get(modelId)!
    modelMetrics.push(metrics)
    
    // Keep only recent metrics (last 100 entries)
    if (modelMetrics.length > 100) {
      modelMetrics.splice(0, modelMetrics.length - 100)
    }
  }
  
  /**
   * Clear cached profiles to force re-detection
   */
  clearCache() {
    this.deviceProfileCache = null
    this.userPreferencesCache = null
  }
  
  /**
   * Generate a fallback recommendation when no models are available
   */
  private generateFallbackRecommendation(fallbackModel: DragonModelConfig): RecommendationResult {
    return {
      primary: {
        model: fallbackModel,
        score: {
          modelId: fallbackModel.id,
          totalScore: 50,
          subscores: {
            compatibility: 25,
            performance: 15,
            resources: 10,
            userPreferences: 0,
            historicalData: 0
          },
          penalties: [],
          bonuses: []
        },
        confidence: 0.9,
        reasons: ['Ultimate fallback model - maximum compatibility'],
        estimatedPerformance: {
          expectedFPS: 60,
          memoryUsageMB: 1,
          loadTimeSeconds: 0.1,
          batteryImpactLevel: 'low'
        }
      },
      alternatives: [],
      fallbackChain: [fallbackModel],
      reasoning: {
        deviceAnalysis: ['No compatible models found'],
        performanceExpectations: ['Minimal resource usage'],
        recommendations: ['Using ASCII fallback for maximum compatibility'],
        warnings: ['Limited visual features available']
      }
    }
  }
}

// Singleton instance
export const modelRecommendationEngine = ModelRecommendationEngine.getInstance()

export default ModelRecommendationEngine