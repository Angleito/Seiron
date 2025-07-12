import React, { useState } from 'react'
import { 
  DragonWebGLErrorBoundary,
  DragonWalletErrorBoundary,
  VoiceErrorBoundary,
  ErrorMonitoringDashboard,
  createMonitoredErrorBoundary,
  CompositeErrorBoundary
} from './index'
import { EnhancedDragonRenderer } from '../dragon/DragonRenderer'
// import { WalletConnectButtonWithErrorBoundary } from '../wallet/WalletConnectButton' // Removed WalletConnect
import { Button } from '@/components/ui/forms/Button'
import { errorRecoveryUtils } from '@utils/errorRecovery'

// Demo component that can throw errors
const ErrorThrowingComponent: React.FC<{ errorType: string }> = ({ errorType }) => {
  const throwError = () => {
    switch (errorType) {
      case 'webgl':
        throw new Error('WebGL context lost - GPU driver reset')
      case 'wallet':
        throw new Error('Failed to connect to wallet - user rejected')
      case 'voice':
        throw new Error('Microphone permission denied')
      case 'network':
        throw new Error('Network connection failed')
      default:
        throw new Error('Generic error occurred')
    }
  }

  React.useEffect(() => {
    if (errorType) {
      throwError()
    }
  }, [errorType])

  return (
    <div className="p-4 bg-green-100 text-green-800 rounded">
      Component working normally
    </div>
  )
}

// Create a monitored error boundary for this demo
const DemoErrorBoundary = ({ children }: { children: React.ReactNode }) => (
  <CompositeErrorBoundary name="ErrorBoundaryDemo" pageName="feature">
    {children}
  </CompositeErrorBoundary>
)

export const ErrorBoundaryDemo: React.FC = () => {
  const [webglError, setWebglError] = useState(false)
  const [walletError, setWalletError] = useState(false)
  const [voiceError, setVoiceError] = useState(false)
  const [showMonitoring, setShowMonitoring] = useState(false)

  const handleReset = () => {
    setWebglError(false)
    setWalletError(false)
    setVoiceError(false)
  }

  return (
    <DemoErrorBoundary>
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Error Boundary Demo</h1>
          <p className="text-gray-400">
            Demonstrating enhanced error handling and recovery mechanisms
          </p>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Error Simulation</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              onClick={() => setWebglError(true)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Trigger WebGL Error
            </Button>
            <Button
              onClick={() => setWalletError(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Trigger Wallet Error
            </Button>
            <Button
              onClick={() => setVoiceError(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Trigger Voice Error
            </Button>
            <Button
              onClick={handleReset}
              className="bg-gray-600 hover:bg-gray-700"
            >
              Reset All
            </Button>
          </div>
          <div className="mt-4 flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showMonitoring}
                onChange={(e) => setShowMonitoring(e.target.checked)}
                className="form-checkbox"
              />
              <span className="text-white">Show Error Monitoring</span>
            </label>
          </div>
        </div>

        {/* WebGL Error Boundary Demo */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">WebGL Error Boundary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-300 mb-2">3D Dragon (WebGL)</h3>
              <div className="h-64 bg-gray-900 rounded">
                <DragonWebGLErrorBoundary>
                  {webglError ? (
                    <ErrorThrowingComponent errorType="webgl" />
                  ) : (
                    <EnhancedDragonRenderer
                      dragonType="glb"
                      size="md"
                      enableFallback={true}
                      enableErrorRecovery={true}
                      voiceState={{
                        isListening: false,
                        isSpeaking: false,
                        isProcessing: false,
                        isIdle: true,
                        volume: 0.5
                      }}
                    />
                  )}
                </DragonWebGLErrorBoundary>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-300 mb-2">Features</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• WebGL context loss detection</li>
                <li>• Automatic fallback to 2D/ASCII</li>
                <li>• Hardware acceleration detection</li>
                <li>• Progressive recovery attempts</li>
                <li>• Memory cleanup on errors</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Wallet Error Boundary Demo */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Wallet Error Boundary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-300 mb-2">Wallet Connection</h3>
              <div className="p-4 bg-gray-900 rounded">
                <DragonWalletErrorBoundary>
                  {walletError ? (
                    <ErrorThrowingComponent errorType="wallet" />
                  ) : (
                    <div className="p-4 text-gray-400">WalletConnect removed</div>
                  )}
                </DragonWalletErrorBoundary>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-300 mb-2">Features</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Connection retry with exponential backoff</li>
                <li>• Wallet availability detection</li>
                <li>• Network error handling</li>
                <li>• User rejection recovery</li>
                <li>• Installation guidance</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Voice Error Boundary Demo */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Voice Error Boundary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-300 mb-2">Voice System</h3>
              <div className="p-4 bg-gray-900 rounded">
                <VoiceErrorBoundary>
                  {voiceError ? (
                    <ErrorThrowingComponent errorType="voice" />
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">🎤</div>
                      <div className="text-green-400">Voice system ready</div>
                      <div className="text-sm text-gray-500 mt-2">
                        Microphone and TTS available
                      </div>
                    </div>
                  )}
                </VoiceErrorBoundary>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-300 mb-2">Features</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Microphone permission handling</li>
                <li>• TTS service error recovery</li>
                <li>• Browser compatibility checking</li>
                <li>• Network error detection</li>
                <li>• Contextual troubleshooting</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error Recovery Statistics */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Error Recovery Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900 rounded p-4">
              <div className="text-2xl font-bold text-white">
                {errorRecoveryUtils.monitor.getErrorStats().totalErrors}
              </div>
              <div className="text-sm text-gray-400">Total Errors</div>
            </div>
            <div className="bg-gray-900 rounded p-4">
              <div className="text-2xl font-bold text-green-400">
                {errorRecoveryUtils.monitor.getErrorStats().recoveredErrors}
              </div>
              <div className="text-sm text-gray-400">Recovered</div>
            </div>
            <div className="bg-gray-900 rounded p-4">
              <div className="text-2xl font-bold text-yellow-400">
                {errorRecoveryUtils.monitor.getErrorStats().totalErrors > 0
                  ? Math.round(
                      (errorRecoveryUtils.monitor.getErrorStats().recoveredErrors /
                        errorRecoveryUtils.monitor.getErrorStats().totalErrors) *
                        100
                    )
                  : 0}%
              </div>
              <div className="text-sm text-gray-400">Recovery Rate</div>
            </div>
          </div>
          <div className="mt-4">
            <Button
              onClick={() => errorRecoveryUtils.monitor.clearHistory()}
              className="bg-gray-600 hover:bg-gray-700"
            >
              Clear Statistics
            </Button>
          </div>
        </div>

        {/* Error Monitoring Dashboard */}
        <ErrorMonitoringDashboard
          enabled={showMonitoring}
          position="bottom-right"
          compact={false}
        />
      </div>
    </DemoErrorBoundary>
  )
}

export default ErrorBoundaryDemo