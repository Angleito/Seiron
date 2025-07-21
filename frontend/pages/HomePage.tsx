import React, { Suspense, lazy, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
// Enhanced components
const EnhancedHeroSection = lazy(() => import('../components/homepage/EnhancedHeroSection'))
const DragonBallFeatureCards = lazy(() => import('../components/homepage/DragonBallFeatureCards'))
// Lazy load the effect components
const StormLightningEffect = lazy(() => import('../components/effects/StormLightningEffect'))
const DragonSummoningLightning = lazy(() => import('../components/effects/DragonSummoningLightning'))
const VideoPlayer = lazy(() => import('../components/effects/VideoPlayer'))
// Voice integration components
const VoiceHomepageIntegration = lazy(() => import('../components/voice/VoiceHomepageIntegration'))


// Enhanced DBZ Feature Card Component
const FeatureCard = ({ 
  title, 
  powerLevel, 
  subtitle, 
  description, 
  ctaText, 
  onClick 
}: { 
  title: string
  powerLevel: string
  subtitle: string
  description: string
  ctaText: string
  onClick: () => void
}) => (
  <div className="dbz-feature-card dbz-hover-power">
    <div className="dbz-aura"></div>
    <div className="flex justify-between items-start mb-4">
      <h3 className="dbz-feature-title text-xl">{title}</h3>
      <span className="dbz-feature-power">{powerLevel}</span>
    </div>
    <h4 className="dbz-subtitle text-lg mb-2">{subtitle}</h4>
    <p className="text-gray-300 mb-4">{description}</p>
    <button
      onClick={onClick}
      className="dbz-button-secondary w-full"
    >
      {ctaText}
    </button>
  </div>
)

type SummoningPhase = 'idle' | 'darkening' | 'storm' | 'lightning' | 'video' | 'arrival'

export default function HomePage() {
  const [powerLevel, setPowerLevel] = useState(0)
  const [isSummoning, setIsSummoning] = useState(false)
  const [summoningPhase, setSummoningPhase] = useState<SummoningPhase>('idle')
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [showEnhancedHero, setShowEnhancedHero] = useState(true)
  const navigate = useNavigate()

  // Voice configuration for homepage integration
  const voiceConfig = {
    voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || 'default-voice-id',
    modelId: 'eleven_turbo_v2_5',
    voiceSettings: {
      stability: 0.8,
      similarityBoost: 0.9,
      style: 0.3,
      useSpeakerBoost: true
    }
  }

  useEffect(() => {
    // Animate power level on mount
    const targetPower = 32.2
    const increment = targetPower / 30
    let currentPower = 0
    
    const timer = setInterval(() => {
      currentPower += increment
      if (currentPower >= targetPower) {
        setPowerLevel(targetPower)
        clearInterval(timer)
      } else {
        setPowerLevel(currentPower)
      }
    }, 50)

    // Enable voice features after a short delay to ensure page is loaded
    const voiceTimer = setTimeout(() => {
      setVoiceEnabled(true)
    }, 2000)

    return () => {
      clearInterval(timer)
      clearTimeout(voiceTimer)
    }
  }, [])

  // Debug phase changes
  useEffect(() => {
    console.log('Summoning phase changed to:', summoningPhase);
  }, [summoningPhase])

  const handleSummon = () => {
    if (isSummoning) return // Prevent multiple summons
    
    // Hide enhanced hero section during summoning
    setShowEnhancedHero(false)
    setIsSummoning(true)
    setSummoningPhase('darkening')
    
    // Animation sequence with proper timing
    const timeouts: ReturnType<typeof setTimeout>[] = []
    
    // Phase 1: Darkening (0-500ms)
    timeouts.push(setTimeout(() => {
      setSummoningPhase('storm')
    }, 500))
    
    // Phase 2: Storm clouds (500ms-2000ms)
    timeouts.push(setTimeout(() => {
      setSummoningPhase('lightning')
    }, 2000))
    
    // Phase 3: Lightning (2000ms-7000ms) - Extended to 5 seconds
    // Lightning will transition to video phase via onLightningComplete callback
    
    // Phase 4: Final arrival and dragon head spawn - no auto navigation
    
    // Cleanup function in case component unmounts
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout))
    }
  }

  const handleAbout = () => {
    navigate('/about')
  }

  const handleFeatureClick = (feature: string) => {
    // Navigate to specific features or show modal
    console.log(`Navigating to ${feature}`)
    navigate('/chat')
  }

  // Voice integration handlers
  const handleVoiceDragonSummon = () => {
    console.log('Voice dragon summon triggered')
    handleSummon()
  }

  const handleVoiceFeatureActivate = (feature: string) => {
    console.log(`Voice feature activation: ${feature}`)
    switch (feature) {
      case 'dragon_summon':
        handleSummon()
        break
      case 'elite':
      case 'saiyan':
      case 'fusion':
      case 'legendary':
        handleFeatureClick(feature)
        break
      default:
        console.log('Unknown voice feature:', feature)
    }
  }

  const handleVoiceNavigation = (destination: string) => {
    console.log(`Voice navigation to: ${destination}`)
    switch (destination) {
      case 'chat':
        handleSummon() // Trigger summoning effect when going to chat
        break
      case 'about':
        navigate('/about')
        break
      default:
        console.log('Unknown voice navigation destination:', destination)
    }
  }

  // Enhanced Hero Section voice command handler
  const handleEnhancedHeroVoiceCommand = (command: string) => {
    console.log(`Enhanced Hero voice command: ${command}`)
    switch (command) {
      case 'chat':
        handleSummon()
        break
      case 'about':
        navigate('/about')
        break
      case 'portfolio':
        navigate('/portfolio')
        break
      default:
        console.log('Unknown enhanced hero voice command:', command)
    }
  }


  const handleEnterChat = () => {
    navigate('/chat')
  }

  const handleVideoComplete = () => {
    console.log('Video complete, transitioning to arrival phase');
    setSummoningPhase('arrival')
  }

  // Reset to enhanced hero after summoning completes
  const handleSummoningComplete = () => {
    setIsSummoning(false)
    setSummoningPhase('idle')
    setShowEnhancedHero(true)
  }

  return (
    <>
      {/* Dragon Summoning Overlay */}
      {isSummoning && (
        <div className={`summoning-overlay active summoning-${summoningPhase}`}>
          <div className="background-transition"></div>
          <div className="background-transition-overlay"></div>
          
          {/* Realistic Dragon Summoning Lightning Effects */}
          <div className="lightning-container">
            <Suspense fallback={null}>
              <DragonSummoningLightning
                isActive={summoningPhase === 'lightning'}
                onLightningComplete={() => {
                  console.log('Lightning complete callback triggered, current phase:', summoningPhase);
                  if (summoningPhase === 'lightning') {
                    console.log('Transitioning to video phase');
                    setSummoningPhase('video')
                  }
                }}
              />
            </Suspense>
          </div>
          
          {/* Enhanced Background Lightning Effect */}
          {(summoningPhase === 'lightning' || summoningPhase === 'video' || summoningPhase === 'arrival') && (
            <Suspense fallback={null}>
              <StormLightningEffect />
            </Suspense>
          )}
          
          {/* Screen Flash Overlay */}
          <div className="screen-flash"></div>
          
          {/* Video Player */}
          {summoningPhase === 'video' && (
            <Suspense fallback={
              <div style={{ 
                color: 'white', 
                textAlign: 'center',
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 10000
              }}>
                Loading Video...
              </div>
            }>
              {console.log('Rendering VideoPlayer component')}
              <VideoPlayer
                src="/videos/dragon-transition.mp4"
                onVideoComplete={handleVideoComplete}
                className="summoning-video"
                cropStyle={{
                  transform: 'scale(1.4)', // More aggressive crop
                  objectPosition: 'center 40%' // Move up to hide bottom watermark
                }}
              />
            </Suspense>
          )}
          
          
        </div>
      )}
      
      {/* Enter Chat Button - appears when summoning is active and in arrival phase */}
      {isSummoning && summoningPhase === 'arrival' && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10002, // Higher than video overlay
          textAlign: 'center'
        }}>
          <button
            onClick={() => {
              handleEnterChat()
              // Reset to enhanced hero after entering chat
              setTimeout(() => {
                handleSummoningComplete()
              }, 1000)
            }}
            className="dbz-button-primary animate-pulse"
            style={{
              fontSize: 'clamp(2rem, 5vw, 4rem)',
              padding: 'clamp(1.5rem, 3vw, 2.5rem) clamp(3rem, 6vw, 5rem)',
              textTransform: 'uppercase',
              fontWeight: 'bold',
              letterSpacing: '0.1em',
              boxShadow: '0 0 50px rgba(255, 215, 0, 0.8), 0 0 100px rgba(255, 215, 0, 0.4)',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite, glow 2s ease-in-out infinite alternate'
            }}
          >
            🐉 ENTER CHAT
          </button>
        </div>
      )}
      
    {/* Enhanced Hero Section - Renders when not summoning */}
    {showEnhancedHero && !isSummoning && (
      <Suspense fallback={
        <div className="min-h-screen dbz-bg-space flex items-center justify-center">
          <div className="text-yellow-400 text-2xl font-bold animate-pulse">Powering Up...</div>
        </div>
      }>
        <EnhancedHeroSection
          onNavigate={(path: string) => {
            if (path === '/chat') {
              handleSummon()
            } else {
              navigate(path)
            }
          }}
          showPowerLevel={true}
          powerValue={powerLevel * 1000} // Convert to actual power level format
          enableAnimations={true}
          enableVoiceShortcuts={voiceEnabled}
          onVoiceCommand={handleEnhancedHeroVoiceCommand}
          size="lg"
          className="min-h-screen"
        />
      </Suspense>
    )}

    {/* Dragon Ball Feature Cards Section - Always visible below hero */}
    {showEnhancedHero && !isSummoning && (
      <Suspense fallback={
        <div className="py-16 text-center">
          <div className="text-yellow-400 text-lg animate-pulse">Loading Legendary Powers...</div>
        </div>
      }>
        <DragonBallFeatureCards
          className="min-h-screen bg-gradient-to-b from-transparent via-slate-900/50 to-slate-950"
          autoRotate={false}
        />
      </Suspense>
    )}

    {/* Legacy Basic Hero - Fallback for summoning states */}
    {(!showEnhancedHero || isSummoning) && (
      <div className="min-h-screen dbz-bg-space overflow-hidden">
        {/* Enhanced DBZ Background with energy effects */}
        <div className="absolute inset-0">
          <div className="dbz-energy-orb" style={{top: '10%', left: '20%', animationDelay: '0s'}}></div>
          <div className="dbz-energy-orb" style={{top: '30%', right: '15%', animationDelay: '1s'}}></div>
          <div className="dbz-energy-orb" style={{bottom: '20%', left: '10%', animationDelay: '2s'}}></div>
        </div>
        
        {/* Main container */}
        <div className="relative z-10 min-h-screen">
          {/* Header Section */}
          <div className="container mx-auto px-4 py-8">
            {/* Enhanced DBZ Power Level Display */}
            <div className="dbz-power-level mx-auto max-w-md mb-8" data-voice-id="power-level">
              <h2 className="dbz-power-label">Seiron Power Level</h2>
              <div className="flex items-center justify-center gap-4">
                <span className="dbz-power-number">{powerLevel.toFixed(1)}K</span>
                <span className="px-3 py-1 dbz-glow-blue bg-blue-500/20 border border-blue-400 rounded dbz-text-energy text-sm dbz-energy-pulse">
                  Elite
                </span>
              </div>
            </div>

            {/* Enhanced DBZ Hero Section */}
            <div className="text-center mb-16" data-voice-id="hero-section">
              <h1 className="dbz-title text-7xl mb-4">SEIRON</h1>
              <p className="dbz-subtitle text-2xl mb-8">Granting your wildest Sei investing wishes</p>
              
              {/* Enhanced DBZ Navigation */}
              <div className="flex justify-center gap-8 mb-8">
                <button className="text-gray-400 hover:dbz-text-saiyan transition-colors dbz-hover-power font-semibold">⚡ Master the Art</button>
                <button className="text-gray-400 hover:dbz-text-energy transition-colors dbz-hover-power font-semibold">📈 Legendary Powers</button>
                <button className="text-gray-400 hover:text-purple-400 transition-colors dbz-hover-power font-semibold">✨ Portfolio Warrior</button>
              </div>

              {/* Enhanced DBZ CTA Buttons */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleSummon}
                  className="dbz-button-primary"
                  data-voice-id="summon-button"
                >
                  🐉 READY TO POWER UP?
                </button>
                <button
                  onClick={handleAbout}
                  className="dbz-button-secondary"
                >
                  ℹ️ ABOUT
                </button>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              <div data-voice-feature="elite-warrior">
                <FeatureCard
                  title="Elite Warrior"
                  powerLevel="9.0K"
                  subtitle="Master the Art of DeFi"
                  description="Begin your journey with legendary Saiyan trading powers"
                  ctaText="Start Training"
                  onClick={() => handleFeatureClick('elite')}
                />
              </div>
              <div data-voice-feature="super-saiyan">
                <FeatureCard
                  title="Super Saiyan"
                  powerLevel="15.0K"
                  subtitle="Transform Into Ultimate Warrior"
                  description="Unleash devastating DeFi combinations and portfolio fusion techniques"
                  ctaText="Transform Now"
                  onClick={() => handleFeatureClick('saiyan')}
                />
              </div>
              <div data-voice-feature="fusion-master">
                <FeatureCard
                  title="Fusion Master"
                  powerLevel="25.0K"
                  subtitle="Legendary Power Combinations"
                  description="Master advanced portfolio fusion and multi-protocol strategies"
                  ctaText="Master Fusion"
                  onClick={() => handleFeatureClick('fusion')}
                />
              </div>
              <div data-voice-feature="legendary-saiyan">
                <FeatureCard
                  title="Legendary Saiyan"
                  powerLevel="50.0K"
                  subtitle="Ultimate Portfolio Warrior"
                  description="Achieve legendary status with maximum DeFi power and influence"
                  ctaText="Ascend to Legend"
                  onClick={() => handleFeatureClick('legendary')}
                />
              </div>
            </div>

            {/* Enhanced DBZ Footer Section */}
            <div className="text-center pb-12">
              <p className="text-gray-400 mb-6">Master the art of DeFi with legendary powers</p>
              <div className="mb-6">
                <p className="text-yellow-400 font-semibold mb-2">Ready to Power Up?</p>
                <p className="text-gray-400 text-sm mb-4">Transform into the ultimate portfolio warrior</p>
              </div>
              <button
                onClick={handleSummon}
                className="dbz-button-primary text-xl px-12 py-4 mb-6 dbz-screen-shake-on-hover"
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.classList.add('dbz-screen-shake')}
                onAnimationEnd={(e: React.AnimationEvent<HTMLButtonElement>) => e.currentTarget.classList.remove('dbz-screen-shake')}
              >
                🚀 READY TO POWER UP?
              </button>
              <p className="text-gray-500 text-sm mb-2">
                No registration required • Connect any wallet
              </p>
              <p className="text-gray-600 text-xs">
                Powered by Saiyan Technology • Sei Network
              </p>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* Voice Homepage Integration */}
      {voiceEnabled && (
        <Suspense fallback={null}>
          <VoiceHomepageIntegration
            voiceConfig={voiceConfig}
            onDragonSummon={handleVoiceDragonSummon}
            onFeatureActivate={handleVoiceFeatureActivate}
            onNavigationChange={handleVoiceNavigation}
            enabled={voiceEnabled}
            autoFeatureDescriptions={false}
            enablePerformanceOptimization={true}
            enableSectionNavigation={true}
            enableInteractionFeedback={true}
            feedbackMode="standard"
            className="voice-integration-layer"
          />
        </Suspense>
      )}
    </>
  )
}