'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Mic, 
  MicOff, 
  AlertTriangle, 
  CheckCircle, 
  Settings, 
  RefreshCw,
  X,
  Shield,
  Volume2,
  HelpCircle
} from 'lucide-react'
import { cn } from '@lib/utils'

export interface AudioPermissionModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal should close */
  onClose: () => void
  /** Callback when permission is granted */
  onPermissionGranted: () => void
  /** Callback when permission is denied */
  onPermissionDenied: () => void
  /** Whether to show the "don't ask again" option */
  showRememberChoice?: boolean
  /** Whether this is a retry after initial denial */
  isRetry?: boolean
  /** Custom title */
  title?: string
  /** Custom description */
  description?: string
}

export type PermissionState = 'unknown' | 'requesting' | 'granted' | 'denied' | 'error'

export const AudioPermissionModal = React.memo(function AudioPermissionModal({
  isOpen,
  onClose,
  onPermissionGranted,
  onPermissionDenied,
  showRememberChoice = true,
  isRetry = false,
  title,
  description
}: AudioPermissionModalProps) {
  const [permissionState, setPermissionState] = useState<PermissionState>('unknown')
  const [rememberChoice, setRememberChoice] = useState(false)
  const [showTroubleshooting, setShowTroubleshooting] = useState(false)
  const [errorDetails, setErrorDetails] = useState<string>('')

  // Check current permission status
  const checkPermissionStatus = useCallback(async () => {
    try {
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        switch (permission.state) {
          case 'granted':
            setPermissionState('granted')
            onPermissionGranted()
            break
          case 'denied':
            setPermissionState('denied')
            break
          default:
            setPermissionState('unknown')
        }
      }
    } catch (error) {
      console.warn('Could not check microphone permission:', error)
    }
  }, [onPermissionGranted])

  // Request microphone permission
  const requestPermission = useCallback(async () => {
    setPermissionState('requesting')
    setErrorDetails('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      // Permission granted - clean up the stream immediately
      stream.getTracks().forEach(track => track.stop())
      
      setPermissionState('granted')
      
      if (rememberChoice) {
        localStorage.setItem('audioPermissionGranted', 'true')
      }
      
      onPermissionGranted()
    } catch (error: any) {
      console.error('Microphone permission error:', error)
      setPermissionState('denied')
      setErrorDetails(error.message || 'Unknown error occurred')
      
      if (rememberChoice) {
        localStorage.setItem('audioPermissionDenied', 'true')
      }
      
      onPermissionDenied()
    }
  }, [rememberChoice, onPermissionGranted, onPermissionDenied])

  // Check permission on mount
  useEffect(() => {
    if (isOpen) {
      checkPermissionStatus()
    }
  }, [isOpen, checkPermissionStatus])

  // Handle browser-specific guidance
  const getBrowserGuidance = () => {
    const userAgent = navigator.userAgent.toLowerCase()
    
    if (userAgent.includes('chrome')) {
      return {
        browser: 'Chrome',
        steps: [
          'Click the microphone icon in the address bar',
          'Select "Always allow" for this site',
          'Refresh the page if needed'
        ]
      }
    } else if (userAgent.includes('firefox')) {
      return {
        browser: 'Firefox',
        steps: [
          'Click the microphone icon next to the address bar',
          'Choose "Allow" and check "Remember this decision"',
          'Refresh the page if needed'
        ]
      }
    } else if (userAgent.includes('safari')) {
      return {
        browser: 'Safari',
        steps: [
          'Go to Safari → Preferences → Websites',
          'Select "Microphone" from the sidebar',
          'Set this website to "Allow"'
        ]
      }
    } else if (userAgent.includes('edge')) {
      return {
        browser: 'Edge',
        steps: [
          'Click the microphone icon in the address bar',
          'Select "Allow" for this site',
          'Refresh the page if needed'
        ]
      }
    }
    
    return {
      browser: 'Your browser',
      steps: [
        'Look for a microphone icon in your address bar',
        'Click it and select "Allow"',
        'Refresh the page if needed'
      ]
    }
  }

  const browserGuidance = getBrowserGuidance()

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.8, y: -20 }
  }

  const getPermissionIcon = () => {
    switch (permissionState) {
      case 'granted':
        return <CheckCircle className="w-16 h-16 text-green-500" />
      case 'denied':
        return <MicOff className="w-16 h-16 text-red-500" />
      case 'requesting':
        return <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw className="w-16 h-16 text-blue-500" />
        </motion.div>
      case 'error':
        return <AlertTriangle className="w-16 h-16 text-yellow-500" />
      default:
        return <Mic className="w-16 h-16 text-blue-500" />
    }
  }

  const getPermissionMessage = () => {
    if (title && description) {
      return { title, description }
    }

    switch (permissionState) {
      case 'granted':
        return {
          title: 'Microphone Access Granted!',
          description: 'You can now use voice features. The dragon awaits your commands!'
        }
      case 'denied':
        return {
          title: isRetry ? 'Still Need Microphone Access' : 'Microphone Access Denied',
          description: isRetry 
            ? 'Voice features require microphone access to work. Please allow access to continue.'
            : 'Voice features have been disabled. You can enable them by allowing microphone access.'
        }
      case 'requesting':
        return {
          title: 'Requesting Microphone Access',
          description: 'Please allow microphone access in the browser prompt to use voice features.'
        }
      case 'error':
        return {
          title: 'Microphone Error',
          description: 'There was an issue accessing your microphone. Please check your settings and try again.'
        }
      default:
        return {
          title: 'Enable Voice Features',
          description: 'Allow microphone access to talk with the Sei portfolio dragon and use voice commands.'
        }
    }
  }

  const message = getPermissionMessage()

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            {getPermissionIcon()}
          </div>

          {/* Title and description */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-3">
              {message.title}
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              {message.description}
            </p>
          </div>

          {/* Error details */}
          {permissionState === 'error' && errorDetails && (
            <div className="mb-6 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">
                Error: {errorDetails}
              </p>
            </div>
          )}

          {/* Privacy notice */}
          {permissionState === 'unknown' && (
            <div className="mb-6 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-300">
                  <strong>Privacy:</strong> Audio is processed locally and only sent to AI services when you actively speak. 
                  No recording happens in the background.
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            {permissionState === 'unknown' && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={requestPermission}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Mic className="w-4 h-4" />
                Allow Microphone Access
              </motion.button>
            )}

            {permissionState === 'denied' && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={requestPermission}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </motion.button>
            )}

            {permissionState === 'granted' && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Volume2 className="w-4 h-4" />
                Start Using Voice
              </motion.button>
            )}

            {/* Troubleshooting toggle */}
            {(permissionState === 'denied' || permissionState === 'error') && (
              <button
                onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                className="w-full text-gray-400 hover:text-gray-300 py-2 text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
                {showTroubleshooting ? 'Hide' : 'Show'} Troubleshooting
              </button>
            )}

            {/* Skip button */}
            <button
              onClick={onClose}
              className="w-full text-gray-500 hover:text-gray-400 py-2 text-sm transition-colors"
            >
              Continue without voice features
            </button>
          </div>

          {/* Remember choice checkbox */}
          {showRememberChoice && permissionState === 'unknown' && (
            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="remember-choice"
                checked={rememberChoice}
                onChange={(e) => setRememberChoice(e.target.checked)}
                className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
              />
              <label 
                htmlFor="remember-choice" 
                className="text-sm text-gray-400 cursor-pointer"
              >
                Remember my choice
              </label>
            </div>
          )}

          {/* Troubleshooting section */}
          <AnimatePresence>
            {showTroubleshooting && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-6 overflow-hidden"
              >
                <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="w-4 h-4 text-gray-400" />
                    <h3 className="text-sm font-medium text-gray-300">
                      Troubleshooting for {browserGuidance.browser}
                    </h3>
                  </div>
                  
                  <ol className="space-y-2 text-sm text-gray-400">
                    {browserGuidance.steps.map((step, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>

                  <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded">
                    <p className="text-yellow-300 text-xs">
                      <strong>Still having issues?</strong> Try refreshing the page, 
                      checking your browser settings, or restarting your browser.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  )
})

export default AudioPermissionModal