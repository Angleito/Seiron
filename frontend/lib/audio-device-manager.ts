/**
 * Audio Device Manager with Permission Fallbacks and Error Recovery
 */

import { logger } from './logger'
import { voiceErrorRecovery, VoiceErrorType } from './voice-error-recovery'

// ============================================================================
// Audio Device Types
// ============================================================================

export enum AudioPermissionState {
  GRANTED = 'granted',
  DENIED = 'denied',
  PROMPT = 'prompt',
  UNKNOWN = 'unknown'
}

export enum AudioDeviceState {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  BUSY = 'busy',
  ERROR = 'error',
  UNKNOWN = 'unknown'
}

export interface AudioDevice {
  deviceId: string
  kind: 'audioinput' | 'audiooutput'
  label: string
  groupId: string
}

export interface AudioPermissionStatus {
  microphone: AudioPermissionState
  speaker: AudioPermissionState
  canRequestPermission: boolean
  lastChecked: Date
}

export interface AudioDeviceStatus {
  inputDevices: AudioDevice[]
  outputDevices: AudioDevice[]
  defaultInput?: AudioDevice
  defaultOutput?: AudioDevice
  microphoneState: AudioDeviceState
  speakerState: AudioDeviceState
  currentStream?: MediaStream
  lastUpdated: Date
}

export interface AudioCapabilities {
  hasMicrophone: boolean
  hasSpeaker: boolean
  supportsEchoCancellation: boolean
  supportsNoiseSuppression: boolean
  supportsAutoGainControl: boolean
  maxSampleRate: number
  supportedConstraints: MediaTrackSupportedConstraints
}

// ============================================================================
// Audio Device Manager
// ============================================================================

export class AudioDeviceManager {
  private static instance: AudioDeviceManager
  private permissionStatus: AudioPermissionStatus
  private deviceStatus: AudioDeviceStatus
  private capabilities: AudioCapabilities
  private listeners: Set<(status: AudioDeviceStatus) => void> = new Set()
  private permissionListeners: Set<(status: AudioPermissionStatus) => void> = new Set()
  private activeStream?: MediaStream
  private deviceChangeHandler?: () => void

  private constructor() {
    this.permissionStatus = {
      microphone: AudioPermissionState.UNKNOWN,
      speaker: AudioPermissionState.UNKNOWN,
      canRequestPermission: true,
      lastChecked: new Date()
    }

    this.deviceStatus = {
      inputDevices: [],
      outputDevices: [],
      microphoneState: AudioDeviceState.UNKNOWN,
      speakerState: AudioDeviceState.UNKNOWN,
      lastUpdated: new Date()
    }

    this.capabilities = {
      hasMicrophone: false,
      hasSpeaker: false,
      supportsEchoCancellation: false,
      supportsNoiseSuppression: false,
      supportsAutoGainControl: false,
      maxSampleRate: 44100,
      supportedConstraints: {}
    }

    this.initialize()
  }

  static getInstance(): AudioDeviceManager {
    if (!this.instance) {
      this.instance = new AudioDeviceManager()
    }
    return this.instance
  }

  private async initialize(): Promise<void> {
    try {
      await this.detectCapabilities()
      await this.checkPermissions()
      await this.updateDeviceList()
      this.setupDeviceChangeListener()
      
      logger.info('Audio Device Manager initialized', {
        capabilities: this.capabilities,
        permissions: this.permissionStatus,
        devices: {
          input: this.deviceStatus.inputDevices.length,
          output: this.deviceStatus.outputDevices.length
        }
      })
    } catch (error) {
      logger.error('Failed to initialize Audio Device Manager:', error)
    }
  }

  private async detectCapabilities(): Promise<void> {
    try {
      // Check if MediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.capabilities = {
          hasMicrophone: false,
          hasSpeaker: false,
          supportsEchoCancellation: false,
          supportsNoiseSuppression: false,
          supportsAutoGainControl: false,
          maxSampleRate: 0,
          supportedConstraints: {}
        }
        return
      }

      // Get supported constraints
      const supportedConstraints = navigator.mediaDevices.getSupportedConstraints()
      
      this.capabilities = {
        hasMicrophone: true, // Assume available if API exists
        hasSpeaker: typeof Audio !== 'undefined',
        supportsEchoCancellation: supportedConstraints.echoCancellation || false,
        supportsNoiseSuppression: supportedConstraints.noiseSuppression || false,
        supportsAutoGainControl: supportedConstraints.autoGainControl || false,
        maxSampleRate: supportedConstraints.sampleRate ? 48000 : 44100,
        supportedConstraints
      }
    } catch (error) {
      logger.error('Error detecting audio capabilities:', error)
    }
  }

  private async checkPermissions(): Promise<void> {
    try {
      let microphonePermission = AudioPermissionState.UNKNOWN
      let speakerPermission = AudioPermissionState.UNKNOWN

      // Check microphone permission
      if (navigator.permissions) {
        try {
          const micPermissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName })
          microphonePermission = micPermissionStatus.state as AudioPermissionState
          
          // Listen for permission changes
          micPermissionStatus.onchange = () => {
            this.permissionStatus.microphone = micPermissionStatus.state as AudioPermissionState
            this.notifyPermissionListeners()
          }
        } catch (error) {
          logger.debug('Microphone permission query not supported')
        }

        // Speaker permission is generally always granted
        speakerPermission = AudioPermissionState.GRANTED
      }

      this.permissionStatus = {
        microphone: microphonePermission,
        speaker: speakerPermission,
        canRequestPermission: microphonePermission !== AudioPermissionState.DENIED,
        lastChecked: new Date()
      }

      this.notifyPermissionListeners()
    } catch (error) {
      logger.error('Error checking audio permissions:', error)
    }
  }

  private async updateDeviceList(): Promise<void> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return
      }

      const devices = await navigator.mediaDevices.enumerateDevices()
      
      const inputDevices: AudioDevice[] = []
      const outputDevices: AudioDevice[] = []

      devices.forEach(device => {
        if (device.kind === 'audioinput') {
          inputDevices.push({
            deviceId: device.deviceId,
            kind: device.kind,
            label: device.label || `Microphone ${inputDevices.length + 1}`,
            groupId: device.groupId
          })
        } else if (device.kind === 'audiooutput') {
          outputDevices.push({
            deviceId: device.deviceId,
            kind: device.kind,
            label: device.label || `Speaker ${outputDevices.length + 1}`,
            groupId: device.groupId
          })
        }
      })

      this.deviceStatus = {
        ...this.deviceStatus,
        inputDevices,
        outputDevices,
        defaultInput: inputDevices.find(d => d.deviceId === 'default') || inputDevices[0],
        defaultOutput: outputDevices.find(d => d.deviceId === 'default') || outputDevices[0],
        microphoneState: inputDevices.length > 0 ? AudioDeviceState.AVAILABLE : AudioDeviceState.UNAVAILABLE,
        speakerState: outputDevices.length > 0 ? AudioDeviceState.AVAILABLE : AudioDeviceState.UNAVAILABLE,
        lastUpdated: new Date()
      }

      this.notifyListeners()
      logger.debug('Audio device list updated', {
        inputDevices: inputDevices.length,
        outputDevices: outputDevices.length
      })
    } catch (error) {
      logger.error('Error updating device list:', error)
      await voiceErrorRecovery.handleError(error as Error)
    }
  }

  private setupDeviceChangeListener(): void {
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      this.deviceChangeHandler = () => {
        logger.info('Audio devices changed, updating device list')
        this.updateDeviceList()
      }
      
      navigator.mediaDevices.addEventListener('devicechange', this.deviceChangeHandler)
    }
  }

  // ============================================================================
  // Permission Management
  // ============================================================================

  async requestMicrophonePermission(
    options: {
      constraints?: MediaStreamConstraints
      fallbackToBasic?: boolean
      showUserGuidance?: boolean
    } = {}
  ): Promise<{
    granted: boolean
    stream?: MediaStream
    error?: Error
    errorDetails?: any
  }> {
    const {
      constraints = { audio: true },
      fallbackToBasic = true,
      showUserGuidance = true
    } = options

    logger.info('Requesting microphone permission', { constraints, fallbackToBasic })

    try {
      // First attempt with requested constraints
      let stream: MediaStream
      
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      } catch (error) {
        if (fallbackToBasic && constraints.audio !== true) {
          logger.warn('Advanced audio constraints failed, falling back to basic audio')
          stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        } else {
          throw error
        }
      }

      // Success - update permission status
      this.permissionStatus.microphone = AudioPermissionState.GRANTED
      this.permissionStatus.lastChecked = new Date()
      this.deviceStatus.microphoneState = AudioDeviceState.AVAILABLE
      this.activeStream = stream

      // Update device list to get proper labels now that we have permission
      await this.updateDeviceList()
      this.notifyPermissionListeners()

      logger.info('Microphone permission granted successfully')
      
      return {
        granted: true,
        stream
      }

    } catch (error) {
      const err = error as Error
      logger.error('Microphone permission request failed:', err)

      // Update permission status based on error
      this.updatePermissionFromError(err)

      // Handle the error and get user-friendly details
      const errorDetails = await voiceErrorRecovery.handleError(err)

      return {
        granted: false,
        error: err,
        errorDetails
      }
    }
  }

  private updatePermissionFromError(error: Error): void {
    const message = error.message.toLowerCase()
    
    if (message.includes('permission denied') || message.includes('notallowed')) {
      this.permissionStatus.microphone = AudioPermissionState.DENIED
      this.permissionStatus.canRequestPermission = false
      this.deviceStatus.microphoneState = AudioDeviceState.UNAVAILABLE
    } else if (message.includes('device not found') || message.includes('no device')) {
      this.deviceStatus.microphoneState = AudioDeviceState.UNAVAILABLE
    } else {
      this.deviceStatus.microphoneState = AudioDeviceState.ERROR
    }

    this.permissionStatus.lastChecked = new Date()
    this.notifyPermissionListeners()
  }

  async testMicrophoneAccess(): Promise<{
    hasAccess: boolean
    canRecord: boolean
    error?: Error
    suggestions: string[]
  }> {
    const suggestions: string[] = []
    
    try {
      // Quick test with minimal constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false 
        } 
      })

      // Test if we can actually record
      let canRecord = false
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const source = audioContext.createMediaStreamSource(stream)
        const analyser = audioContext.createAnalyser()
        source.connect(analyser)
        
        canRecord = true
        audioContext.close()
      } catch (audioError) {
        logger.warn('Audio context test failed:', audioError)
        suggestions.push('Browser audio features may be limited')
      }

      // Clean up
      stream.getTracks().forEach(track => track.stop())

      return {
        hasAccess: true,
        canRecord,
        suggestions: canRecord ? [] : suggestions
      }

    } catch (error) {
      const err = error as Error
      const message = err.message.toLowerCase()

      if (message.includes('permission')) {
        suggestions.push('Grant microphone permission in browser settings')
        suggestions.push('Click the microphone icon in the address bar')
      } else if (message.includes('device')) {
        suggestions.push('Check that a microphone is connected')
        suggestions.push('Try a different microphone if available')
      } else if (message.includes('secure')) {
        suggestions.push('Use HTTPS or localhost for microphone access')
      } else {
        suggestions.push('Try refreshing the page')
        suggestions.push('Check browser compatibility')
      }

      return {
        hasAccess: false,
        canRecord: false,
        error: err,
        suggestions
      }
    }
  }

  // ============================================================================
  // Device Management
  // ============================================================================

  async getOptimalAudioConstraints(): Promise<MediaStreamConstraints> {
    const baseConstraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: this.capabilities.supportsEchoCancellation,
        noiseSuppression: this.capabilities.supportsNoiseSuppression,
        autoGainControl: this.capabilities.supportsAutoGainControl,
        sampleRate: Math.min(this.capabilities.maxSampleRate, 44100)
      }
    }

    // Use default input device if available
    if (this.deviceStatus.defaultInput?.deviceId && this.deviceStatus.defaultInput.deviceId !== 'default') {
      (baseConstraints.audio as any).deviceId = this.deviceStatus.defaultInput.deviceId
    }

    return baseConstraints
  }

  async switchInputDevice(deviceId: string): Promise<{
    success: boolean
    stream?: MediaStream
    error?: Error
  }> {
    try {
      // Stop current stream if active
      if (this.activeStream) {
        this.activeStream.getTracks().forEach(track => track.stop())
      }

      // Request new stream with specific device
      const constraints = await this.getOptimalAudioConstraints()
      ;(constraints.audio as any).deviceId = deviceId

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      this.activeStream = stream

      // Update default input device
      const device = this.deviceStatus.inputDevices.find(d => d.deviceId === deviceId)
      if (device) {
        this.deviceStatus.defaultInput = device
      }

      logger.info(`Switched to input device: ${device?.label || deviceId}`)
      this.notifyListeners()

      return { success: true, stream }

    } catch (error) {
      logger.error(`Failed to switch to input device ${deviceId}:`, error)
      return { success: false, error: error as Error }
    }
  }

  async testOutputDevice(deviceId: string): Promise<{
    canPlayback: boolean
    error?: Error
  }> {
    try {
      // Create a test audio element
      const audio = new Audio()
      
      // Try to set the sink (output device) if supported
      if (typeof (audio as any).setSinkId === 'function') {
        await (audio as any).setSinkId(deviceId)
      }

      return { canPlayback: true }

    } catch (error) {
      logger.error(`Output device test failed for ${deviceId}:`, error)
      return { canPlayback: false, error: error as Error }
    }
  }

  // ============================================================================
  // Stream Management
  // ============================================================================

  getCurrentStream(): MediaStream | undefined {
    return this.activeStream
  }

  stopCurrentStream(): void {
    if (this.activeStream) {
      this.activeStream.getTracks().forEach(track => track.stop())
      this.activeStream = undefined
      logger.debug('Stopped current audio stream')
    }
  }

  async createAudioStream(
    options: {
      deviceId?: string
      constraints?: MediaStreamConstraints
      timeout?: number
    } = {}
  ): Promise<MediaStream> {
    const {
      deviceId,
      constraints = await this.getOptimalAudioConstraints(),
      timeout = 10000
    } = options

    // Override device if specified
    if (deviceId) {
      (constraints.audio as any).deviceId = deviceId
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Audio stream creation timeout'))
      }, timeout)

      navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
          clearTimeout(timeoutId)
          this.activeStream = stream
          resolve(stream)
        })
        .catch(error => {
          clearTimeout(timeoutId)
          reject(error)
        })
    })
  }

  // ============================================================================
  // Event Listeners
  // ============================================================================

  addDeviceListener(listener: (status: AudioDeviceStatus) => void): void {
    this.listeners.add(listener)
  }

  removeDeviceListener(listener: (status: AudioDeviceStatus) => void): void {
    this.listeners.delete(listener)
  }

  addPermissionListener(listener: (status: AudioPermissionStatus) => void): void {
    this.permissionListeners.add(listener)
  }

  removePermissionListener(listener: (status: AudioPermissionStatus) => void): void {
    this.permissionListeners.delete(listener)
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.deviceStatus)
      } catch (error) {
        logger.error('Device status listener error:', error)
      }
    })
  }

  private notifyPermissionListeners(): void {
    this.permissionListeners.forEach(listener => {
      try {
        listener(this.permissionStatus)
      } catch (error) {
        logger.error('Permission status listener error:', error)
      }
    })
  }

  // ============================================================================
  // Getters
  // ============================================================================

  getPermissionStatus(): AudioPermissionStatus {
    return { ...this.permissionStatus }
  }

  getDeviceStatus(): AudioDeviceStatus {
    return { ...this.deviceStatus }
  }

  getCapabilities(): AudioCapabilities {
    return { ...this.capabilities }
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  destroy(): void {
    this.stopCurrentStream()
    
    if (this.deviceChangeHandler && navigator.mediaDevices) {
      navigator.mediaDevices.removeEventListener('devicechange', this.deviceChangeHandler)
    }
    
    this.listeners.clear()
    this.permissionListeners.clear()
    
    logger.debug('Audio Device Manager destroyed')
  }
}

// ============================================================================
// Audio Permission Helper Components
// ============================================================================

export const audioPermissionUtils = {
  /**
   * Get user-friendly error message for audio permission issues
   */
  getPermissionErrorMessage: (error: Error): string => {
    const message = error.message.toLowerCase()
    
    if (message.includes('permission denied') || message.includes('notallowed')) {
      return 'Microphone access was denied. Please grant permission to use voice features.'
    } else if (message.includes('device not found') || message.includes('no device')) {
      return 'No microphone found. Please connect a microphone and try again.'
    } else if (message.includes('secure context')) {
      return 'Voice features require a secure connection (HTTPS).'
    } else if (message.includes('not supported')) {
      return 'Voice features are not supported in this browser.'
    } else {
      return 'Unable to access microphone. Please check your device settings.'
    }
  },

  /**
   * Get troubleshooting steps for audio permission issues
   */
  getTroubleshootingSteps: (error: Error): Array<{ icon: string; text: string; action?: () => void }> => {
    const message = error.message.toLowerCase()
    
    if (message.includes('permission denied') || message.includes('notallowed')) {
      return [
        { icon: '🔒', text: 'Click the microphone icon in your browser\'s address bar' },
        { icon: '✅', text: 'Select "Allow" for microphone access' },
        { icon: '🔄', text: 'Refresh the page and try again' },
        { 
          icon: '🛠️', 
          text: 'Open browser settings if needed',
          action: () => {
            // Open browser settings (browser-specific)
            if (navigator.userAgent.includes('Chrome')) {
              window.open('chrome://settings/content/microphone')
            } else if (navigator.userAgent.includes('Firefox')) {
              window.open('about:preferences#privacy')
            }
          }
        }
      ]
    } else if (message.includes('device not found')) {
      return [
        { icon: '🎤', text: 'Connect a microphone to your device' },
        { icon: '🔌', text: 'Check microphone cable connections' },
        { icon: '🔧', text: 'Check audio settings in your operating system' },
        { icon: '🔄', text: 'Restart your browser' }
      ]
    } else if (message.includes('secure context')) {
      return [
        { icon: '🔒', text: 'Use HTTPS instead of HTTP' },
        { icon: '🏠', text: 'Use localhost for development' },
        { icon: '🌐', text: 'Contact site administrator for SSL certificate' }
      ]
    } else {
      return [
        { icon: '🔄', text: 'Refresh the page and try again' },
        { icon: '🌐', text: 'Try a different browser (Chrome, Edge, Safari)' },
        { icon: '🔧', text: 'Check browser and system audio settings' },
        { icon: '💬', text: 'Continue with text chat for now' }
      ]
    }
  },

  /**
   * Check if the current environment supports audio features
   */
  checkAudioSupport: (): {
    supported: boolean
    issues: string[]
    recommendations: string[]
  } => {
    const issues: string[] = []
    const recommendations: string[] = []

    // Check basic API support
    if (!navigator.mediaDevices) {
      issues.push('MediaDevices API not available')
      recommendations.push('Use a modern browser (Chrome 53+, Firefox 36+, Safari 11+)')
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      issues.push('getUserMedia not available')
      recommendations.push('Update your browser to the latest version')
    }

    // Check secure context
    const isSecure = window.location.protocol === 'https:' || 
                    window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1'

    if (!isSecure) {
      issues.push('Insecure context - HTTPS required')
      recommendations.push('Access the site via HTTPS')
    }

    // Check Audio API support
    if (!window.AudioContext && !(window as any).webkitAudioContext) {
      issues.push('Web Audio API not supported')
      recommendations.push('Use Chrome, Edge, or Safari for full audio support')
    }

    return {
      supported: issues.length === 0,
      issues,
      recommendations
    }
  }
}

// Export singleton instance
export const audioDeviceManager = AudioDeviceManager.getInstance()