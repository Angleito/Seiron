import React, { Suspense, lazy, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Enhanced components with error boundaries
const EnhancedHeroSection = lazy(() => 
  import('../components/homepage/EnhancedHeroSection').catch(() => ({
    default: () => <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
          Seiron
        </h1>
        <p className="text-2xl mb-8 text-white">Granting your wildest Sei investing wishes</p>
      </div>
    </div>
  }))
)

const DragonBallFeatureCards = lazy(() => 
  import('../components/homepage/DragonBallFeatureCards').catch(() => ({
    default: () => <div className="py-16 bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: 'Elite Warrior', power: '9.0K', description: 'Master the Sei battlefield with lightning-fast execution' },
            { title: 'Super Saiyan', power: '15.0K', description: 'Transform your portfolio with AI-powered insights' },
            { title: 'Fusion Master', power: '25.0K', description: 'Advanced DeFi strategies and yield optimization' },
            { title: 'Legendary Saiyan', power: '50.0K', description: 'Ultimate power level rankings and exclusive rewards' }
          ].map((card, index) => (
            <div key={index} className="bg-gradient-to-b from-gray-800 to-gray-900 p-6 rounded-lg border border-yellow-500/20 hover:border-yellow-500/50 transition-all">
              <div className="text-yellow-400 text-2xl font-bold mb-2">{card.power}</div>
              <h3 className="text-white text-xl font-bold mb-2">{card.title}</h3>
              <p className="text-gray-300 text-sm">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  }))
)

// Lazy load the effect components
const StormLightningEffect = lazy(() => 
  import('../components/effects/StormLightningEffect').catch(() => ({
    default: () => null
  }))
)

const DragonSummoningLightning = lazy(() => 
  import('../components/effects/DragonSummoningLightning').catch(() => ({
    default: () => null
  }))
)

const VideoPlayer = lazy(() => 
  import('../components/effects/VideoPlayer').catch(() => ({
    default: () => null
  }))
)

// Voice integration components
const VoiceHomepageIntegration = lazy(() => 
  import('../components/voice/VoiceHomepageIntegration').catch(() => ({
    default: () => null
  }))
)

// Loading fallback component
const LoadingFallback = ({ name }: { name: string }) => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
    <span className="ml-2 text-yellow-400">Loading {name}...</span>
  </div>
)

export default function HomePage() {
  const navigate = useNavigate()
  const [isSummoning, setIsSummoning] = useState(false)
  const [showVideo, setShowVideo] = useState(false)
  const [isDarkening, setIsDarkening] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)

  // Voice configuration
  const voiceConfig = {
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    stability: 0.75,
    similarityBoost: 1.0,
    style: 0.0,
    useSpeakerBoost: true,
    optimizeStreamingLatency: 4,
    outputFormat: 'mp3_22050_32'
  }

  // Handle dragon summoning
  const handleDragonSummon = () => {
    setIsDarkening(true)
    setIsSummoning(true)
    
    setTimeout(() => {
      setShowVideo(true)
    }, 3000)
    
    setTimeout(() => {
      navigate('/chat')
    }, 8000)
  }

  // Voice handlers
  const handleVoiceDragonSummon = () => {
    handleDragonSummon()
  }

  const handleVoiceFeatureActivate = (feature: string) => {
    console.log(`Voice activated feature: ${feature}`)
  }

  const handleVoiceNavigation = (path: string) => {
    navigate(path)
  }

  if (showVideo) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <Suspense fallback={<div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-500"></div>
        </div>}>
          <VideoPlayer
            src="/videos/dragon-summon.mp4"
            autoPlay
            muted
            onEnded={() => navigate('/chat')}
            className="w-full h-full object-cover"
          />
        </Suspense>
      </div>
    )
  }

  return (
    <>
      {/* Storm and Lightning Effects */}
      {isSummoning && (
        <Suspense fallback={null}>
          <StormLightningEffect isDarkening={isDarkening} />
          <DragonSummoningLightning isActive={isSummoning} />
        </Suspense>
      )}

      {/* Main Content */}
      {!isSummoning ? (
        <div className="relative">
          {/* Enhanced Hero Section */}
          <Suspense fallback={<LoadingFallback name="Hero Section" />}>
            <EnhancedHeroSection onNavigate={navigate} />
          </Suspense>

          {/* Dragon Ball Feature Cards */}
          <Suspense fallback={<LoadingFallback name="Feature Cards" />}>
            <DragonBallFeatureCards />
          </Suspense>

          {/* Ready to Power Up Section */}
          <section className="py-16 bg-gradient-to-r from-gray-900 via-black to-gray-900">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Ready to Power Up?
              </h2>
              <p className="text-xl mb-8 text-gray-300">
                Join the elite ranks of Saiyan traders and unlock your true potential
              </p>
              <button
                onClick={handleDragonSummon}
                className="px-12 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xl font-bold rounded-lg hover:from-yellow-400 hover:to-orange-400 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-yellow-500/25"
              >
                🚀 READY TO POWER UP?
              </button>
              <p className="text-sm text-gray-400 mt-4">
                No registration required • Connect any wallet
              </p>
            </div>
          </section>
        </div>
      ) : (
        // Summoning overlay
        <div className={`fixed inset-0 z-40 transition-all duration-3000 ${isDarkening ? 'bg-black' : 'bg-transparent'}`}>
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <div className="text-6xl mb-4">🐉</div>
              <h2 className="text-3xl font-bold mb-2">Summoning the Dragon...</h2>
              <p className="text-xl text-yellow-400">Prepare for legendary power!</p>
            </div>
          </div>
        </div>
      )}

      {/* Voice Integration */}
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