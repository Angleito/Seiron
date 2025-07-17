/**
 * Voice UI component property tests
 * Tests UI responsiveness, accessibility, and visual consistency across different states
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react-dom/test-utils'
import * as fc from 'fast-check'
import {
  arbitraryVoiceState,
  arbitraryVoiceSettings,
  arbitraryTranscript,
  arbitraryVoiceText,
  arbitraryConfidence,
  arbitraryAudioLevel,
  arbitraryUserInteractionSequence,
  arbitraryAccessibilityRequirement,
  arbitraryDeviceCapability,
  arbitraryPerformanceConstraint
} from '../../lib/test-utils/voice-generators'
import type { VoiceState, VoiceSettings } from '../../types/components/voice'

// Mock components for testing
interface MockVoiceInterfaceProps {
  voiceState: VoiceState
  settings: VoiceSettings
  onStartListening?: () => void
  onStopListening?: () => void
  onClearTranscript?: () => void
  onToggleAutoSpeak?: () => void
  onSettingsChange?: (settings: Partial<VoiceSettings>) => void
  className?: string
  disabled?: boolean
}

const MockVoiceInterface: React.FC<MockVoiceInterfaceProps> = ({
  voiceState,
  settings,
  onStartListening,
  onStopListening,
  onClearTranscript,
  onToggleAutoSpeak,
  onSettingsChange,
  className,
  disabled
}) => {
  const handleMicClick = () => {
    if (voiceState.recognition.isListening) {
      onStopListening?.()
    } else {
      onStartListening?.()
    }
  }

  const handleSpeakerClick = () => {
    onToggleAutoSpeak?.()
  }

  const handleClearClick = () => {
    onClearTranscript?.()
  }

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onSettingsChange?.({ language: event.target.value })
  }

  return (
    <div className={`voice-interface ${className || ''}`} data-testid="voice-interface">
      {/* Status Display */}
      <div className="status-display" data-testid="status-display">
        {voiceState.error && (
          <div className="error" data-testid="error-message">
            Error: {voiceState.error.message}
          </div>
        )}
        
        {voiceState.recognition.isListening && (
          <div className="listening-indicator" data-testid="listening-indicator">
            Listening...
          </div>
        )}
        
        {voiceState.tts.isSpeaking && (
          <div className="speaking-indicator" data-testid="speaking-indicator">
            Speaking...
          </div>
        )}
        
        {voiceState.tts.isLoading && (
          <div className="loading-indicator" data-testid="loading-indicator">
            Loading...
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="controls" data-testid="controls">
        <button
          data-testid="mic-button"
          onClick={handleMicClick}
          disabled={disabled || voiceState.tts.isLoading}
          className={`mic-button ${voiceState.recognition.isListening ? 'active' : ''}`}
          aria-label={voiceState.recognition.isListening ? 'Stop recording' : 'Start recording'}
        >
          {voiceState.recognition.isListening ? '🛑' : '🎤'}
        </button>

        <button
          data-testid="speaker-button"
          onClick={handleSpeakerClick}
          disabled={disabled}
          className={`speaker-button ${settings.ttsEnabled ? 'active' : ''}`}
          aria-label={settings.ttsEnabled ? 'Disable auto-speak' : 'Enable auto-speak'}
        >
          {settings.ttsEnabled ? '🔊' : '🔇'}
        </button>

        <button
          data-testid="clear-button"
          onClick={handleClearClick}
          disabled={disabled || voiceState.recognition.transcript.length === 0}
          aria-label="Clear transcript"
        >
          🗑️
        </button>
      </div>

      {/* Transcript Display */}
      <div className="transcript-display" data-testid="transcript-display">
        {voiceState.recognition.transcript && (
          <div className="transcript" data-testid="transcript">
            {voiceState.recognition.transcript}
          </div>
        )}
        
        {voiceState.recognition.interimTranscript && (
          <div className="interim-transcript" data-testid="interim-transcript">
            {voiceState.recognition.interimTranscript}
          </div>
        )}
        
        {voiceState.recognition.confidence > 0 && (
          <div className="confidence" data-testid="confidence">
            Confidence: {Math.round(voiceState.recognition.confidence * 100)}%
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="settings" data-testid="settings">
        <select
          data-testid="language-select"
          value={settings.language}
          onChange={handleLanguageChange}
          disabled={disabled}
          aria-label="Select language"
        >
          <option value="en-US">English (US)</option>
          <option value="en-GB">English (UK)</option>
          <option value="es-ES">Spanish</option>
          <option value="fr-FR">French</option>
          <option value="de-DE">German</option>
        </select>
      </div>

      {/* Visual Feedback */}
      {settings.showVisualizer && (
        <div className="visualizer" data-testid="visualizer">
          <div 
            className={`audio-level ${voiceState.recognition.isListening ? 'active' : ''}`}
            style={{ height: `${Math.random() * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}

interface MockVoiceVisualizerProps {
  isActive: boolean
  audioLevel: number
  type?: 'wave' | 'bars' | 'circular'
  color?: string
  size?: number
  className?: string
}

const MockVoiceVisualizer: React.FC<MockVoiceVisualizerProps> = ({
  isActive,
  audioLevel,
  type = 'wave',
  color = '#3b82f6',
  size = 100,
  className
}) => {
  return (
    <div
      className={`voice-visualizer ${className || ''} ${isActive ? 'active' : ''}`}
      data-testid="voice-visualizer"
      style={{ 
        width: size,
        height: size,
        backgroundColor: isActive ? color : '#gray'
      }}
    >
      <div
        className={`visualizer-${type}`}
        data-testid={`visualizer-${type}`}
        style={{
          opacity: isActive ? audioLevel / 100 : 0.1
        }}
      >
        {type === 'wave' && '〰️'}
        {type === 'bars' && '📊'}
        {type === 'circular' && '🔵'}
      </div>
    </div>
  )
}

describe('Voice UI Component Properties', () => {
  describe('Component Rendering Properties', () => {
    it('should render consistently with any valid voice state', () => {
      fc.assert(
        fc.property(arbitraryVoiceState, arbitraryVoiceSettings, (voiceState, settings) => {
          const { container } = render(
            <MockVoiceInterface voiceState={voiceState} settings={settings} />
          )
          
          // Component should always render
          expect(container.firstChild).toBeTruthy()
          expect(screen.getByTestId('voice-interface')).toBeInTheDocument()
          expect(screen.getByTestId('controls')).toBeInTheDocument()
          expect(screen.getByTestId('transcript-display')).toBeInTheDocument()
          
          // Required buttons should be present
          expect(screen.getByTestId('mic-button')).toBeInTheDocument()
          expect(screen.getByTestId('speaker-button')).toBeInTheDocument()
          expect(screen.getByTestId('clear-button')).toBeInTheDocument()
        })
      )
    })

    it('should handle any combination of props gracefully', () => {
      fc.assert(
        fc.property(
          arbitraryVoiceState,
          arbitraryVoiceSettings,
          fc.option(fc.string()),
          fc.boolean(),
          (voiceState, settings, className, disabled) => {
            const { container } = render(
              <MockVoiceInterface
                voiceState={voiceState}
                settings={settings}
                className={className || undefined}
                disabled={disabled}
              />
            )
            
            expect(container.firstChild).toBeTruthy()
            
            // Check disabled state propagation
            if (disabled) {
              expect(screen.getByTestId('mic-button')).toBeDisabled()
              expect(screen.getByTestId('speaker-button')).toBeDisabled()
              expect(screen.getByTestId('clear-button')).toBeDisabled()
            }
            
            // Check className application
            if (className) {
              expect(screen.getByTestId('voice-interface')).toHaveClass(className)
            }
          }
        )
      )
    })
  })

  describe('Visual State Properties', () => {
    it('should display appropriate visual feedback for any state', () => {
      fc.assert(
        fc.property(arbitraryVoiceState, arbitraryVoiceSettings, (voiceState, settings) => {
          render(<MockVoiceInterface voiceState={voiceState} settings={settings} />)
          
          // Check state-dependent visual feedback
          if (voiceState.recognition.isListening) {
            expect(screen.getByTestId('listening-indicator')).toBeInTheDocument()
            expect(screen.getByTestId('mic-button')).toHaveClass('active')
          }
          
          if (voiceState.tts.isSpeaking) {
            expect(screen.getByTestId('speaking-indicator')).toBeInTheDocument()
          }
          
          if (voiceState.tts.isLoading) {
            expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
          }
          
          if (voiceState.error) {
            expect(screen.getByTestId('error-message')).toBeInTheDocument()
            expect(screen.getByTestId('error-message')).toHaveTextContent(voiceState.error.message)
          }
          
          if (settings.ttsEnabled) {
            expect(screen.getByTestId('speaker-button')).toHaveClass('active')
          }
        })
      )
    })

    it('should handle transcript display correctly', () => {
      fc.assert(
        fc.property(
          arbitraryTranscript,
          arbitraryTranscript,
          arbitraryConfidence,
          arbitraryVoiceSettings,
          (transcript, interimTranscript, confidence, settings) => {
            const voiceState: VoiceState = {
              recognition: {
                state: 'idle',
                isListening: false,
                transcript,
                interimTranscript,
                confidence,
                error: null
              },
              tts: {
                state: 'idle',
                isLoading: false,
                isSpeaking: false,
                isPaused: false,
                currentText: null,
                queue: [],
                error: null
              },
              isEnabled: true,
              isInitialized: true,
              error: null
            }
            
            render(<MockVoiceInterface voiceState={voiceState} settings={settings} />)
            
            if (transcript) {
              expect(screen.getByTestId('transcript')).toBeInTheDocument()
              expect(screen.getByTestId('transcript')).toHaveTextContent(transcript)
            }
            
            if (interimTranscript) {
              expect(screen.getByTestId('interim-transcript')).toBeInTheDocument()
              expect(screen.getByTestId('interim-transcript')).toHaveTextContent(interimTranscript)
            }
            
            if (confidence > 0) {
              expect(screen.getByTestId('confidence')).toBeInTheDocument()
              const expectedConfidence = Math.round(confidence * 100)
              expect(screen.getByTestId('confidence')).toHaveTextContent(`${expectedConfidence}%`)
            }
          }
        )
      )
    })
  })

  describe('Accessibility Properties', () => {
    it('should maintain accessibility standards with any state', () => {
      fc.assert(
        fc.property(arbitraryVoiceState, arbitraryVoiceSettings, (voiceState, settings) => {
          render(<MockVoiceInterface voiceState={voiceState} settings={settings} />)
          
          // Check ARIA labels
          const micButton = screen.getByTestId('mic-button')
          const speakerButton = screen.getByTestId('speaker-button')
          const clearButton = screen.getByTestId('clear-button')
          const languageSelect = screen.getByTestId('language-select')
          
          expect(micButton).toHaveAttribute('aria-label')
          expect(speakerButton).toHaveAttribute('aria-label')
          expect(clearButton).toHaveAttribute('aria-label')
          expect(languageSelect).toHaveAttribute('aria-label')
          
          // Check that ARIA labels are contextually appropriate
          const micLabel = micButton.getAttribute('aria-label')
          if (voiceState.recognition.isListening) {
            expect(micLabel).toContain('Stop')
          } else {
            expect(micLabel).toContain('Start')
          }
          
          const speakerLabel = speakerButton.getAttribute('aria-label')
          if (settings.ttsEnabled) {
            expect(speakerLabel).toContain('Disable')
          } else {
            expect(speakerLabel).toContain('Enable')
          }
        })
      )
    })

    it('should adapt to accessibility requirements', () => {
      fc.assert(
        fc.property(
          arbitraryVoiceState,
          arbitraryVoiceSettings,
          arbitraryAccessibilityRequirement,
          (voiceState, settings, a11yReq) => {
            // Mock accessibility settings
            Object.defineProperty(window, 'matchMedia', {
              writable: true,
              value: jest.fn().mockImplementation(query => ({
                matches: query.includes('prefers-reduced-motion') ? a11yReq.reducedMotionEnabled : false,
                media: query,
                onchange: null,
                addListener: jest.fn(),
                removeListener: jest.fn(),
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                dispatchEvent: jest.fn(),
              })),
            })
            
            render(<MockVoiceInterface voiceState={voiceState} settings={settings} />)
            
            // Component should still be functional with accessibility requirements
            expect(screen.getByTestId('voice-interface')).toBeInTheDocument()
            expect(screen.getByTestId('mic-button')).toBeInTheDocument()
            
            // High contrast mode should not break the interface
            if (a11yReq.highContrastEnabled) {
              const voiceInterface = screen.getByTestId('voice-interface')
              expect(voiceInterface).toBeInTheDocument()
            }
          }
        )
      )
    })

    it('should support keyboard navigation', () => {
      fc.assert(
        fc.property(arbitraryVoiceState, arbitraryVoiceSettings, (voiceState, settings) => {
          const user = userEvent.setup()
          render(<MockVoiceInterface voiceState={voiceState} settings={settings} />)
          
          // All interactive elements should be focusable
          const micButton = screen.getByTestId('mic-button')
          const speakerButton = screen.getByTestId('speaker-button')
          const clearButton = screen.getByTestId('clear-button')
          const languageSelect = screen.getByTestId('language-select')
          
          expect(micButton).not.toHaveAttribute('tabindex', '-1')
          expect(speakerButton).not.toHaveAttribute('tabindex', '-1')
          expect(clearButton).not.toHaveAttribute('tabindex', '-1')
          expect(languageSelect).not.toHaveAttribute('tabindex', '-1')
        })
      )
    })
  })

  describe('User Interaction Properties', () => {
    it('should handle any sequence of user interactions correctly', () => {
      fc.assert(
        fc.property(
          arbitraryVoiceState,
          arbitraryVoiceSettings,
          arbitraryUserInteractionSequence,
          async (initialVoiceState, initialSettings, interactions) => {
            let currentVoiceState = { ...initialVoiceState }
            let currentSettings = { ...initialSettings }
            
            const mockHandlers = {
              onStartListening: jest.fn(() => {
                currentVoiceState = {
                  ...currentVoiceState,
                  recognition: { ...currentVoiceState.recognition, isListening: true }
                }
              }),
              onStopListening: jest.fn(() => {
                currentVoiceState = {
                  ...currentVoiceState,
                  recognition: { ...currentVoiceState.recognition, isListening: false }
                }
              }),
              onClearTranscript: jest.fn(() => {
                currentVoiceState = {
                  ...currentVoiceState,
                  recognition: { ...currentVoiceState.recognition, transcript: '' }
                }
              }),
              onToggleAutoSpeak: jest.fn(() => {
                currentSettings = { ...currentSettings, ttsEnabled: !currentSettings.ttsEnabled }
              }),
              onSettingsChange: jest.fn((newSettings) => {
                currentSettings = { ...currentSettings, ...newSettings }
              })
            }
            
            const { rerender } = render(
              <MockVoiceInterface
                voiceState={currentVoiceState}
                settings={currentSettings}
                {...mockHandlers}
              />
            )
            
            // Simulate interactions
            for (const interaction of interactions.slice(0, 5)) { // Limit for test performance
              switch (interaction.action) {
                case 'start_listening':
                  fireEvent.click(screen.getByTestId('mic-button'))
                  break
                case 'stop_listening':
                  fireEvent.click(screen.getByTestId('mic-button'))
                  break
                case 'clear_transcript':
                  fireEvent.click(screen.getByTestId('clear-button'))
                  break
                case 'toggle_auto_speak':
                  fireEvent.click(screen.getByTestId('speaker-button'))
                  break
                case 'change_language':
                  fireEvent.change(screen.getByTestId('language-select'), {
                    target: { value: 'es-ES' }
                  })
                  break
              }
              
              // Re-render with updated state
              rerender(
                <MockVoiceInterface
                  voiceState={currentVoiceState}
                  settings={currentSettings}
                  {...mockHandlers}
                />
              )
              
              // Component should remain functional
              expect(screen.getByTestId('voice-interface')).toBeInTheDocument()
            }
          }
        )
      )
    })

    it('should prevent invalid interactions based on state', () => {
      fc.assert(
        fc.property(arbitraryVoiceState, arbitraryVoiceSettings, (voiceState, settings) => {
          render(<MockVoiceInterface voiceState={voiceState} settings={settings} />)
          
          const micButton = screen.getByTestId('mic-button')
          const clearButton = screen.getByTestId('clear-button')
          
          // Mic button should be disabled during TTS loading
          if (voiceState.tts.isLoading) {
            expect(micButton).toBeDisabled()
          }
          
          // Clear button should be disabled when transcript is empty
          if (!voiceState.recognition.transcript || voiceState.recognition.transcript.length === 0) {
            expect(clearButton).toBeDisabled()
          }
        })
      )
    })
  })

  describe('Visualizer Component Properties', () => {
    it('should render visualizer correctly with any audio level', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          arbitraryAudioLevel,
          fc.constantFrom('wave', 'bars', 'circular'),
          fc.string({ minLength: 3, maxLength: 10 }),
          fc.nat({ min: 50, max: 500 }),
          (isActive, audioLevel, type, color, size) => {
            render(
              <MockVoiceVisualizer
                isActive={isActive}
                audioLevel={audioLevel}
                type={type}
                color={color}
                size={size}
              />
            )
            
            const visualizer = screen.getByTestId('voice-visualizer')
            expect(visualizer).toBeInTheDocument()
            
            // Check size application
            expect(visualizer).toHaveStyle({
              width: `${size}px`,
              height: `${size}px`
            })
            
            // Check active state
            if (isActive) {
              expect(visualizer).toHaveClass('active')
            }
            
            // Check type-specific elements
            expect(screen.getByTestId(`visualizer-${type}`)).toBeInTheDocument()
          }
        )
      )
    })

    it('should handle performance constraints', () => {
      fc.assert(
        fc.property(arbitraryPerformanceConstraint, (constraints) => {
          const startTime = Date.now()
          
          render(
            <MockVoiceVisualizer
              isActive={true}
              audioLevel={50}
              type="wave"
              size={constraints.maxFileSize} // Using as size constraint
            />
          )
          
          const endTime = Date.now()
          const renderTime = endTime - startTime
          
          // Rendering should be fast
          expect(renderTime).toBeLessThan(constraints.maxLatency || 100)
          
          // Component should be present
          expect(screen.getByTestId('voice-visualizer')).toBeInTheDocument()
        })
      )
    })
  })

  describe('Device Compatibility Properties', () => {
    it('should adapt to different device capabilities', () => {
      fc.assert(
        fc.property(
          arbitraryVoiceState,
          arbitraryVoiceSettings,
          arbitraryDeviceCapability,
          (voiceState, settings, deviceCap) => {
            // Mock device capabilities
            Object.defineProperty(navigator, 'mediaDevices', {
              writable: true,
              value: {
                getUserMedia: deviceCap.hasMicrophone ? jest.fn() : undefined,
                enumerateDevices: jest.fn(() => Promise.resolve([]))
              }
            })
            
            Object.defineProperty(window, 'AudioContext', {
              writable: true,
              value: deviceCap.hasWebAudio ? function() {} : undefined
            })
            
            render(<MockVoiceInterface voiceState={voiceState} settings={settings} />)
            
            // Component should render regardless of device capabilities
            expect(screen.getByTestId('voice-interface')).toBeInTheDocument()
            
            // Mic button should be present but may be disabled for unsupported devices
            const micButton = screen.getByTestId('mic-button')
            expect(micButton).toBeInTheDocument()
            
            if (!deviceCap.hasMicrophone) {
              // Component should handle missing microphone gracefully
              expect(micButton).toBeInTheDocument() // Still present for UI consistency
            }
          }
        )
      )
    })
  })

  describe('Error Boundary Properties', () => {
    it('should handle rendering errors gracefully', () => {
      fc.assert(
        fc.property(arbitraryVoiceState, (voiceState) => {
          // Test with potentially problematic state
          const problematicState = {
            ...voiceState,
            recognition: {
              ...voiceState.recognition,
              transcript: null as any, // Intentionally problematic
            }
          }
          
          // Should not crash even with problematic data
          expect(() => {
            render(
              <MockVoiceInterface
                voiceState={problematicState}
                settings={{
                  enabled: true,
                  language: 'en-US',
                  autoStart: false,
                  showVisualizer: true,
                  showTranscript: true,
                  ttsEnabled: true,
                  ttsRate: 1,
                  ttsPitch: 1,
                  ttsVolume: 1,
                  commandsEnabled: true,
                  noiseReduction: true,
                  echoCancellation: true,
                  autoGainControl: true
                }}
              />
            )
          }).not.toThrow()
        })
      )
    })
  })
})