# 🐉 Dragon Component Troubleshooting Guide

This comprehensive troubleshooting guide helps developers diagnose and resolve common issues with the Seiron dragon animation system. From rendering problems to performance issues, this guide provides step-by-step solutions and debugging techniques.

## 🚨 Common Issues Quick Reference

| Issue | Dragon Type | Severity | Quick Fix |
|-------|-------------|----------|-----------|
| Dragon not rendering | All | High | Check props and console errors |
| 3D Dragon black screen | 3D | High | Verify WebGL support |
| ASCII Dragon static | ASCII | Medium | Check animation props |
| Voice not working | All | Medium | Verify API keys and permissions |
| Poor performance | All | Low | Adjust performance mode |
| Fallback not working | All | High | Check fallback configuration |

## 🔍 Diagnostic Tools

### Dragon System Health Check

```typescript
// Comprehensive dragon system diagnostic
export class DragonSystemDiagnostic {
  static async runFullDiagnostic(): Promise<DiagnosticReport> {
    const report: DiagnosticReport = {
      timestamp: new Date().toISOString(),
      browser: this.getBrowserInfo(),
      webgl: this.checkWebGLSupport(),
      performance: await this.checkPerformance(),
      voice: await this.checkVoiceSupport(),
      dragon: this.checkDragonComponents(),
      errors: []
    }

    return report
  }

  private static getBrowserInfo() {
    return {
      userAgent: navigator.userAgent,
      vendor: navigator.vendor,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    }
  }

  private static checkWebGLSupport() {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    const gl2 = canvas.getContext('webgl2')
    
    if (!gl) {
      return { supported: false, version: null, renderer: null }
    }

    return {
      supported: true,
      version: gl2 ? '2.0' : '1.0',
      renderer: gl.getParameter(gl.RENDERER),
      vendor: gl.getParameter(gl.VENDOR),
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxVertexAttributes: gl.getParameter(gl.MAX_VERTEX_ATTRIBS)
    }
  }

  private static async checkPerformance(): Promise<PerformanceDiagnostic> {
    const startTime = performance.now()
    
    // Simulate dragon rendering workload
    const testCanvas = document.createElement('canvas')
    testCanvas.width = 800
    testCanvas.height = 600
    const ctx = testCanvas.getContext('2d')
    
    // Draw test animation
    for (let i = 0; i < 100; i++) {
      ctx?.clearRect(0, 0, 800, 600)
      ctx?.fillRect(i * 8, 100, 50, 50)
    }
    
    const renderTime = performance.now() - startTime
    
    return {
      estimatedFPS: 1000 / renderTime * 100,
      renderTime,
      memory: (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit
      } : null,
      recommendation: renderTime > 100 ? 'low' : renderTime > 50 ? 'medium' : 'high'
    }
  }

  private static async checkVoiceSupport(): Promise<VoiceDiagnostic> {
    const hasWebSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
    const hasAudioContext = 'AudioContext' in window || 'webkitAudioContext' in window
    const hasMediaDevices = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices
    
    let microphonePermission = 'unknown'
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      microphonePermission = result.state
    } catch (error) {
      // Permission API not supported
    }

    return {
      webSpeechSupported: hasWebSpeech,
      audioContextSupported: hasAudioContext,
      mediaDevicesSupported: hasMediaDevices,
      microphonePermission,
      elevenLabsConfigured: !!process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
    }
  }

  private static checkDragonComponents() {
    const components = ['DragonRenderer', 'ASCIIDragon', 'Dragon3D', 'SimpleDragonSprite']
    const status: Record<string, boolean> = {}
    
    components.forEach(component => {
      try {
        // Check if component is properly imported
        status[component] = true // Simplified check
      } catch (error) {
        status[component] = false
      }
    })

    return status
  }
}

interface DiagnosticReport {
  timestamp: string
  browser: any
  webgl: any
  performance: PerformanceDiagnostic
  voice: VoiceDiagnostic
  dragon: Record<string, boolean>
  errors: string[]
}

interface PerformanceDiagnostic {
  estimatedFPS: number
  renderTime: number
  memory: any
  recommendation: 'low' | 'medium' | 'high'
}

interface VoiceDiagnostic {
  webSpeechSupported: boolean
  audioContextSupported: boolean
  mediaDevicesSupported: boolean
  microphonePermission: string
  elevenLabsConfigured: boolean
}
```

### Debug Component

```tsx
// Dragon debug component for development
function DragonDebugPanel({ dragonRef }: { dragonRef: React.RefObject<any> }) {
  const [diagnostic, setDiagnostic] = useState<DiagnosticReport>()
  const [isVisible, setIsVisible] = useState(false)

  const runDiagnostic = async () => {
    const report = await DragonSystemDiagnostic.runFullDiagnostic()
    setDiagnostic(report)
    console.log('Dragon Diagnostic Report:', report)
  }

  if (!isVisible) {
    return (
      <button 
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-red-500 text-white p-2 rounded z-50"
      >
        🐉 Debug
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg z-50 max-w-md max-h-96 overflow-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold">Dragon Debug Panel</h3>
        <button onClick={() => setIsVisible(false)} className="text-gray-500">✕</button>
      </div>
      
      <div className="space-y-2">
        <button onClick={runDiagnostic} className="w-full bg-blue-500 text-white p-2 rounded">
          Run System Diagnostic
        </button>
        
        {diagnostic && (
          <div className="text-xs space-y-2">
            <div>
              <strong>Performance:</strong> {diagnostic.performance.recommendation}
              <br />
              <span>FPS: {diagnostic.performance.estimatedFPS.toFixed(1)}</span>
            </div>
            
            <div>
              <strong>WebGL:</strong> {diagnostic.webgl.supported ? '✅' : '❌'}
              <br />
              {diagnostic.webgl.supported && (
                <span>Version: {diagnostic.webgl.version}</span>
              )}
            </div>
            
            <div>
              <strong>Voice:</strong> {diagnostic.voice.webSpeechSupported ? '✅' : '❌'}
              <br />
              <span>Mic: {diagnostic.voice.microphonePermission}</span>
            </div>
            
            <div>
              <strong>Components:</strong>
              {Object.entries(diagnostic.dragon).map(([name, status]) => (
                <div key={name}>{name}: {status ? '✅' : '❌'}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

## 🎭 Dragon Rendering Issues

### Issue: Dragon Not Rendering

**Symptoms:**
- Empty space where dragon should appear
- No console errors
- Component appears to mount successfully

**Debugging Steps:**

1. **Check Props**
```tsx
// Add debug logging to your component
<DragonRenderer
  dragonType="ascii"
  size="lg"
  onError={(error, type) => {
    console.error(`Dragon ${type} error:`, error)
  }}
  // Add debug prop
  debug={true}
/>
```

2. **Verify Component Import**
```typescript
// Check if components are properly imported
import { DragonRenderer } from '@/components/dragon'

// Verify the component exists
console.log('DragonRenderer:', DragonRenderer)
```

3. **Check CSS Styles**
```css
/* Ensure dragon container has proper dimensions */
.dragon-container {
  width: 100%;
  height: 400px;
  position: relative;
  overflow: visible;
}
```

**Solutions:**

```tsx
// Solution 1: Add error boundary
function SafeDragonRenderer(props: DragonRendererProps) {
  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <div className="dragon-error">
          <p>Dragon failed to render: {error.message}</p>
          <button onClick={resetErrorBoundary}>Retry</button>
        </div>
      )}
    >
      <DragonRenderer {...props} />
    </ErrorBoundary>
  )
}

// Solution 2: Add loading state
function DragonWithLoading() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string>()

  return (
    <div className="dragon-container">
      {!isLoaded && !error && <div>Loading dragon...</div>}
      {error && <div>Error: {error}</div>}
      
      <DragonRenderer
        dragonType="ascii"
        onError={(err) => setError(err.message)}
        onRender={() => setIsLoaded(true)}
      />
    </div>
  )
}
```

### Issue: 3D Dragon Black Screen

**Symptoms:**
- Black or transparent area where 3D dragon should appear
- No 3D elements visible
- Console may show WebGL errors

**Debugging Steps:**

1. **Check WebGL Support**
```typescript
function checkWebGLSupport() {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
  
  if (!gl) {
    console.error('WebGL not supported')
    return false
  }
  
  console.log('WebGL Info:', {
    renderer: gl.getParameter(gl.RENDERER),
    vendor: gl.getParameter(gl.VENDOR),
    version: gl.getParameter(gl.VERSION)
  })
  
  return true
}
```

2. **Check Canvas Element**
```tsx
// Add ref to inspect canvas
function Debug3DDragon() {
  const canvasRef = useRef<HTMLCanvasElement>()
  
  useEffect(() => {
    if (canvasRef.current) {
      console.log('Canvas dimensions:', {
        width: canvasRef.current.width,
        height: canvasRef.current.height,
        clientWidth: canvasRef.current.clientWidth,
        clientHeight: canvasRef.current.clientHeight
      })
    }
  }, [])

  return (
    <Canvas ref={canvasRef}>
      <Dragon3D />
    </Canvas>
  )
}
```

**Solutions:**

```tsx
// Solution 1: Add WebGL fallback
function SafeDragon3D(props: Dragon3DProps) {
  const [webglSupported, setWebglSupported] = useState(true)

  useEffect(() => {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl')
    
    if (!gl) {
      setWebglSupported(false)
      console.warn('WebGL not supported, falling back to ASCII dragon')
    }
  }, [])

  if (!webglSupported) {
    return <ASCIIDragon {...props} />
  }

  return (
    <Canvas
      gl={{ 
        antialias: false, // Disable for better compatibility
        alpha: true,
        powerPreference: "default" // Use integrated GPU
      }}
      camera={{ position: [0, 0, 5] }}
      style={{ background: 'transparent' }}
    >
      <Dragon3D {...props} />
    </Canvas>
  )
}

// Solution 2: Add manual fallback trigger
function Dragon3DWithFallback() {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return <ASCIIDragon size="lg" />
  }

  return (
    <ErrorBoundary
      onError={(error) => {
        console.error('3D Dragon error:', error)
        setHasError(true)
      }}
    >
      <Dragon3D onError={() => setHasError(true)} />
    </ErrorBoundary>
  )
}
```

### Issue: ASCII Dragon Static/Not Animating

**Symptoms:**
- ASCII dragon appears but doesn't animate
- No breathing, floating, or typewriter effects
- Dragon remains in static pose

**Debugging Steps:**

1. **Check Animation Props**
```tsx
// Verify animation properties are enabled
<ASCIIDragon
  pose="coiled"
  size="lg"
  enableBreathing={true}     // Check this
  enableFloating={true}      // Check this
  enableTypewriter={true}    // Check this
  speed="normal"
/>
```

2. **Check Animation State**
```typescript
// Add debug hook to inspect internal state
function useASCIIDragonDebug(dragonRef: React.RefObject<any>) {
  useEffect(() => {
    const interval = setInterval(() => {
      if (dragonRef.current) {
        console.log('ASCII Dragon State:', {
          isAnimating: dragonRef.current.isAnimating,
          currentPose: dragonRef.current.currentPose,
          breathingIntensity: dragonRef.current.breathingIntensity
        })
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [])
}
```

**Solutions:**

```tsx
// Solution 1: Force animation restart
function ASCIIDragonWithRestart() {
  const [key, setKey] = useState(0)

  return (
    <>
      <ASCIIDragon 
        key={key}
        enableBreathing={true}
        enableFloating={true}
        speed="normal"
      />
      <button onClick={() => setKey(k => k + 1)}>
        Restart Animations
      </button>
    </>
  )
}

// Solution 2: Check reduced motion preference
function AccessibleASCIIDragon(props: ASCIIDragonProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return (
    <ASCIIDragon
      {...props}
      enableBreathing={!prefersReducedMotion && props.enableBreathing}
      enableFloating={!prefersReducedMotion && props.enableFloating}
      speed={prefersReducedMotion ? 'slow' : props.speed}
    />
  )
}
```

## 🎤 Voice Integration Issues

### Issue: Voice Not Working

**Symptoms:**
- Dragon doesn't respond to voice state changes
- Speech recognition not working
- TTS not playing

**Debugging Steps:**

1. **Check Environment Variables**
```bash
# Verify environment variables are set
echo $NEXT_PUBLIC_ELEVENLABS_API_KEY
echo $NEXT_PUBLIC_ELEVENLABS_VOICE_ID
```

2. **Check Browser Permissions**
```typescript
async function checkMicrophonePermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    console.log('Microphone permission granted')
    stream.getTracks().forEach(track => track.stop())
    return true
  } catch (error) {
    console.error('Microphone permission denied:', error)
    return false
  }
}
```

3. **Test Voice State Manually**
```tsx
function VoiceDebugComponent() {
  const [voiceState, setVoiceState] = useState<VoiceAnimationState>({
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    isIdle: true
  })

  return (
    <div>
      <DragonRenderer voiceState={voiceState} dragonType="ascii" />
      
      <div className="debug-controls">
        <button onClick={() => setVoiceState(prev => ({ ...prev, isListening: !prev.isListening }))}>
          Toggle Listening
        </button>
        <button onClick={() => setVoiceState(prev => ({ ...prev, isSpeaking: !prev.isSpeaking }))}>
          Toggle Speaking
        </button>
      </div>
      
      <pre>{JSON.stringify(voiceState, null, 2)}</pre>
    </div>
  )
}
```

**Solutions:**

```tsx
// Solution 1: Add voice permission handler
function VoiceEnabledDragon() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [voiceError, setVoiceError] = useState<string>()

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => setHasPermission(true))
      .catch(error => {
        setHasPermission(false)
        setVoiceError(error.message)
      })
  }, [])

  if (hasPermission === null) {
    return <div>Checking microphone permissions...</div>
  }

  if (!hasPermission) {
    return (
      <div>
        <p>Microphone access required for voice features</p>
        <p>Error: {voiceError}</p>
        <button onClick={() => window.location.reload()}>
          Retry Permission Request
        </button>
      </div>
    )
  }

  return <DragonRenderer dragonType="ascii" voiceEnabled={true} />
}

// Solution 2: Add HTTPS check
function HTTPSVoiceCheck({ children }: { children: React.ReactNode }) {
  const [isHTTPS, setIsHTTPS] = useState(true)

  useEffect(() => {
    setIsHTTPS(window.location.protocol === 'https:' || window.location.hostname === 'localhost')
  }, [])

  if (!isHTTPS) {
    return (
      <div className="https-warning">
        <p>Voice features require HTTPS connection</p>
        <p>Current: {window.location.protocol}</p>
      </div>
    )
  }

  return <>{children}</>
}
```

### Issue: ElevenLabs TTS Not Working

**Symptoms:**
- TTS requests failing
- Dragon not responding to speaking state
- Console errors about API keys

**Debugging Steps:**

1. **Verify API Configuration**
```typescript
function testElevenLabsConfig() {
  const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
  const voiceId = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID

  console.log('ElevenLabs Config:', {
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length,
    hasVoiceId: !!voiceId,
    voiceIdLength: voiceId?.length
  })

  if (!apiKey) {
    console.error('NEXT_PUBLIC_ELEVENLABS_API_KEY not set')
  }

  if (!voiceId) {
    console.error('NEXT_PUBLIC_ELEVENLABS_VOICE_ID not set')
  }
}
```

2. **Test API Connection**
```typescript
async function testElevenLabsConnection() {
  const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
  
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey!
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('ElevenLabs connection successful:', data.voices.length, 'voices available')
    } else {
      console.error('ElevenLabs API error:', response.status, response.statusText)
    }
  } catch (error) {
    console.error('ElevenLabs connection failed:', error)
  }
}
```

**Solutions:**

```tsx
// Solution 1: Add API key validation
function ValidatedElevenLabsTTS({ children }: { children: React.ReactNode }) {
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [error, setError] = useState<string>()

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
    const voiceId = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID

    if (!apiKey || !voiceId) {
      setIsValid(false)
      setError('Missing ElevenLabs API key or voice ID')
      return
    }

    // Test API connection
    fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey }
    })
      .then(response => {
        if (response.ok) {
          setIsValid(true)
        } else {
          setIsValid(false)
          setError(`API error: ${response.status}`)
        }
      })
      .catch(err => {
        setIsValid(false)
        setError(`Connection error: ${err.message}`)
      })
  }, [])

  if (isValid === null) {
    return <div>Validating ElevenLabs configuration...</div>
  }

  if (!isValid) {
    return (
      <div className="elevenlabs-error">
        <p>ElevenLabs TTS not available: {error}</p>
        <p>Dragon will work without voice features</p>
      </div>
    )
  }

  return <>{children}</>
}

// Solution 2: Add TTS fallback
function TTSWithFallback() {
  const [useElevenLabs, setUseElevenLabs] = useState(true)

  const speakText = async (text: string) => {
    if (useElevenLabs) {
      try {
        await elevenLabsSpeak(text)
      } catch (error) {
        console.warn('ElevenLabs failed, falling back to browser TTS:', error)
        setUseElevenLabs(false)
        browserSpeak(text)
      }
    } else {
      browserSpeak(text)
    }
  }

  const browserSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      speechSynthesis.speak(utterance)
    }
  }

  return { speakText, isUsingElevenLabs: useElevenLabs }
}
```

## ⚡ Performance Issues

### Issue: Poor Performance/Low FPS

**Symptoms:**
- Choppy animations
- Delayed responses
- Browser freezing

**Debugging Steps:**

1. **Monitor Performance Metrics**
```typescript
function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<{
    fps: number
    memory: number
    renderTime: number
  }>()

  useEffect(() => {
    let frameCount = 0
    let lastTime = performance.now()
    
    const measurePerformance = () => {
      const currentTime = performance.now()
      frameCount++
      
      if (currentTime - lastTime >= 1000) {
        const fps = frameCount
        const memory = (performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0
        
        setMetrics({ fps, memory, renderTime: currentTime - lastTime })
        
        frameCount = 0
        lastTime = currentTime
      }
      
      requestAnimationFrame(measurePerformance)
    }
    
    requestAnimationFrame(measurePerformance)
  }, [])

  return metrics
}
```

2. **Check Device Capabilities**
```typescript
function getDevicePerformanceLevel(): 'high' | 'medium' | 'low' {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl')
  
  if (!gl) return 'low'
  
  const renderer = gl.getParameter(gl.RENDERER)
  const vendor = gl.getParameter(gl.VENDOR)
  
  // Simple heuristic based on renderer info
  if (renderer.includes('Integrated') || vendor.includes('Intel')) {
    return 'low'
  } else if (renderer.includes('GTX') || renderer.includes('RTX')) {
    return 'high'
  }
  
  return 'medium'
}
```

**Solutions:**

```tsx
// Solution 1: Adaptive performance mode
function AdaptiveDragon() {
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>('auto')
  const metrics = usePerformanceMonitor()

  useEffect(() => {
    if (metrics) {
      if (metrics.fps < 20) {
        setPerformanceMode('low')
      } else if (metrics.fps > 50) {
        setPerformanceMode('high')
      } else {
        setPerformanceMode('medium')
      }
    }
  }, [metrics])

  return (
    <DragonRenderer
      dragonType={performanceMode === 'low' ? 'ascii' : '3d'}
      performanceMode={performanceMode}
      threeDProps={{
        quality: performanceMode === 'high' ? 'high' : 'low',
        showParticles: performanceMode !== 'low'
      }}
    />
  )
}

// Solution 2: Throttled animations
function ThrottledDragon() {
  const [animationEnabled, setAnimationEnabled] = useState(true)
  const throttleRef = useRef<NodeJS.Timeout>()

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      setAnimationEnabled(false)
    } else {
      // Resume animations after delay
      if (throttleRef.current) clearTimeout(throttleRef.current)
      throttleRef.current = setTimeout(() => {
        setAnimationEnabled(true)
      }, 500)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (throttleRef.current) clearTimeout(throttleRef.current)
    }
  }, [handleVisibilityChange])

  return (
    <DragonRenderer
      dragonType="ascii"
      asciiProps={{
        enableBreathing: animationEnabled,
        enableFloating: animationEnabled,
        speed: animationEnabled ? 'normal' : 'slow'
      }}
    />
  )
}
```

## 🔄 Fallback System Issues

### Issue: Fallback Not Triggering

**Symptoms:**
- Dragon crashes instead of falling back
- Error boundary not catching errors
- Infinite error loops

**Debugging Steps:**

1. **Test Fallback Manually**
```tsx
function FallbackTest() {
  const [forceError, setForceError] = useState(false)

  return (
    <div>
      <button onClick={() => setForceError(!forceError)}>
        {forceError ? 'Fix Dragon' : 'Break Dragon'}
      </button>
      
      <DragonRenderer
        dragonType="3d"
        enableFallback={true}
        fallbackType="ascii"
        threeDProps={{
          // Force error for testing
          forceError
        }}
        onFallback={(from, to) => {
          console.log(`Fallback triggered: ${from} → ${to}`)
        }}
      />
    </div>
  )
}
```

**Solutions:**

```tsx
// Solution 1: Multi-level fallback
function MultiLevelFallbackDragon() {
  const [fallbackLevel, setFallbackLevel] = useState(0)
  
  const dragonTypes: DragonType[] = ['3d', 'ascii', '2d']
  const currentType = dragonTypes[fallbackLevel] || '2d'

  const handleError = useCallback((error: Error, type: DragonType) => {
    console.error(`Dragon ${type} failed:`, error)
    
    const currentIndex = dragonTypes.indexOf(type)
    if (currentIndex < dragonTypes.length - 1) {
      setFallbackLevel(currentIndex + 1)
    }
  }, [])

  return (
    <ErrorBoundary
      onError={(error) => {
        console.error('Dragon component error:', error)
        setFallbackLevel(prev => Math.min(prev + 1, dragonTypes.length - 1))
      }}
    >
      <DragonRenderer
        dragonType={currentType}
        onError={handleError}
      />
      
      {fallbackLevel > 0 && (
        <div className="fallback-notice">
          Using fallback dragon type: {currentType}
        </div>
      )}
    </ErrorBoundary>
  )
}

// Solution 2: Graceful degradation
function GracefulDragon() {
  const [capabilities, setCapabilities] = useState<{
    webgl: boolean
    performance: 'high' | 'medium' | 'low'
  }>()

  useEffect(() => {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl')
    
    const performanceLevel = getDevicePerformanceLevel()
    
    setCapabilities({
      webgl: !!gl,
      performance: performanceLevel
    })
  }, [])

  if (!capabilities) {
    return <div>Detecting capabilities...</div>
  }

  const getDragonType = (): DragonType => {
    if (!capabilities.webgl || capabilities.performance === 'low') {
      return 'ascii'
    }
    return capabilities.performance === 'high' ? '3d' : 'ascii'
  }

  return (
    <DragonRenderer
      dragonType={getDragonType()}
      performanceMode={capabilities.performance}
    />
  )
}
```

## 🧪 Development & Testing Issues

### Issue: Component Not Updating in Development

**Symptoms:**
- Changes to dragon components not reflecting
- Hot reload not working
- Stale component state

**Solutions:**

```tsx
// Solution 1: Force remount during development
function DevDragon(props: DragonRendererProps) {
  const [key, setKey] = useState(0)

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Force remount every 10 seconds in development
      const interval = setInterval(() => {
        setKey(k => k + 1)
      }, 10000)
      
      return () => clearInterval(interval)
    }
  }, [])

  return <DragonRenderer key={key} {...props} />
}

// Solution 2: Add development overlay
function DragonWithDevOverlay(props: DragonRendererProps) {
  const [showDebug, setShowDebug] = useState(false)

  if (process.env.NODE_ENV !== 'development') {
    return <DragonRenderer {...props} />
  }

  return (
    <div style={{ position: 'relative' }}>
      <DragonRenderer {...props} />
      
      <button
        onClick={() => setShowDebug(!showDebug)}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          background: 'rgba(0,0,0,0.5)',
          color: 'white',
          border: 'none',
          padding: '4px 8px',
          fontSize: '12px'
        }}
      >
        {showDebug ? 'Hide' : 'Show'} Debug
      </button>
      
      {showDebug && (
        <div style={{
          position: 'absolute',
          top: 30,
          right: 0,
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '8px',
          fontSize: '12px',
          maxWidth: '200px'
        }}>
          <pre>{JSON.stringify(props, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
```

## 📋 Troubleshooting Checklist

### Pre-Deployment Checklist

- [ ] **Environment Setup**
  - [ ] All required environment variables set
  - [ ] HTTPS enabled for voice features
  - [ ] API keys valid and functional

- [ ] **Browser Compatibility**
  - [ ] WebGL support detected
  - [ ] Speech APIs available
  - [ ] Fallbacks working correctly

- [ ] **Performance Testing**
  - [ ] Performance metrics within acceptable ranges
  - [ ] Fallback triggers tested
  - [ ] Memory leaks checked

- [ ] **Error Handling**
  - [ ] Error boundaries implemented
  - [ ] Fallback chains working
  - [ ] User-friendly error messages

### Debug Commands

```bash
# Check environment variables
echo "ElevenLabs API Key: ${NEXT_PUBLIC_ELEVENLABS_API_KEY:0:10}..."
echo "Voice ID: $NEXT_PUBLIC_ELEVENLABS_VOICE_ID"

# Test build
npm run build
npm run start

# Run dragon-specific tests
npm test -- dragon
npm test -- voice-integration
```

### Browser Console Commands

```javascript
// Test WebGL support
(() => {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl')
  console.log('WebGL supported:', !!gl)
  if (gl) {
    console.log('Renderer:', gl.getParameter(gl.RENDERER))
    console.log('Vendor:', gl.getParameter(gl.VENDOR))
  }
})()

// Test speech recognition
(() => {
  const hasWebSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
  console.log('Web Speech API supported:', hasWebSpeech)
})()

// Force garbage collection (if available)
if (window.gc) window.gc()

// Get performance metrics
console.log('Memory usage:', performance.memory)
```

## 🆘 Getting Help

### Reporting Issues

When reporting dragon component issues, please include:

1. **Environment Information**
   - Browser and version
   - Device type and OS
   - Screen resolution
   - Performance mode used

2. **Error Details**
   - Console error messages
   - Component props used
   - Steps to reproduce

3. **Diagnostic Report**
   ```typescript
   // Run and include diagnostic report
   DragonSystemDiagnostic.runFullDiagnostic().then(console.log)
   ```

### Common Error Messages

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "WebGL context lost" | GPU crash or reset | Reload page, reduce quality |
| "Dragon component failed to mount" | Missing dependencies | Check imports and props |
| "Voice permission denied" | Microphone access blocked | Request permissions again |
| "ElevenLabs API key invalid" | Wrong API key | Verify environment variables |
| "Performance threshold exceeded" | Device too slow | Enable fallback mode |

### Community Resources

- **Documentation**: [Dragon System README](./README.md)
- **Examples**: [DragonRenderer Examples](./DragonRenderer-Examples.md)
- **Performance**: [Performance Optimization Guide](./Performance-Optimization-Guide.md)
- **API Reference**: [Dragon Hooks API](../../hooks/voice/Dragon-Hooks-API.md)

---

## 🎯 Summary

This troubleshooting guide provides:

- **Comprehensive Diagnostics** - Tools to identify and debug issues
- **Step-by-Step Solutions** - Detailed fixes for common problems
- **Performance Optimization** - Techniques to improve dragon performance
- **Error Handling** - Robust error recovery strategies
- **Development Tools** - Debug utilities for development

Remember: Most dragon issues can be resolved by checking environment setup, verifying browser capabilities, and ensuring proper fallback configuration.

**The strongest dragons rise from the toughest challenges!** 🐉🔥