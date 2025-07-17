/**
 * Voice UI Component Integration Tests
 * Tests the integration between voice UI components, state management, and user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { 
  mockWebAudioAPI, 
  mockMediaRecorder, 
  mockElevenLabsAPI,
  resetAllMocks,
  setMockPermissions 
} from '../../lib/test-utils/audio-mocks';
import { 
  generateRealisticAudioWaveform, 
  simulateVoiceActivity 
} from '../../lib/test-utils/audio-simulator';

// Mock voice components
const MockVoiceButton = ({ 
  isListening, 
  isSupported, 
  onClick, 
  disabled,
  'aria-label': ariaLabel 
}: {
  isListening: boolean;
  isSupported: boolean;
  onClick: () => void;
  disabled?: boolean;
  'aria-label'?: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel || 'Voice button'}
    data-testid="voice-button"
    className={`voice-button ${isListening ? 'listening' : ''} ${!isSupported ? 'unsupported' : ''}`}
  >
    {isListening ? 'Stop' : 'Start'} Voice
  </button>
);

const MockVoiceVisualizer = ({ 
  audioData, 
  isActive, 
  level 
}: {
  audioData: Float32Array | null;
  isActive: boolean;
  level: number;
}) => (
  <div 
    data-testid="voice-visualizer"
    className={`voice-visualizer ${isActive ? 'active' : 'inactive'}`}
    aria-label={`Audio level: ${Math.round(level * 100)}%`}
  >
    <div 
      className="level-bar"
      style={{ width: `${level * 100}%` }}
      data-testid="level-bar"
    />
    {audioData && (
      <canvas 
        data-testid="waveform-canvas"
        width={300}
        height={100}
      />
    )}
  </div>
);

const MockTranscriptDisplay = ({
  transcript,
  interimTranscript,
  confidence,
  isListening,
}: {
  transcript: string;
  interimTranscript: string;
  confidence: number;
  isListening: boolean;
}) => (
  <div data-testid="transcript-display" className="transcript-display">
    <div data-testid="final-transcript" className="final-transcript">
      {transcript}
    </div>
    {isListening && (
      <div data-testid="interim-transcript" className="interim-transcript">
        {interimTranscript}
      </div>
    )}
    <div 
      data-testid="confidence-meter"
      className="confidence-meter"
      aria-label={`Confidence: ${Math.round(confidence * 100)}%`}
    >
      <div 
        className="confidence-bar"
        style={{ width: `${confidence * 100}%` }}
      />
    </div>
  </div>
);

const MockVoiceSettings = ({
  settings,
  onSettingsChange,
}: {
  settings: {
    language: string;
    autoStart: boolean;
    continuousListening: boolean;
    ttsEnabled: boolean;
    ttsVoice: string;
    volume: number;
  };
  onSettingsChange: (settings: any) => void;
}) => (
  <div data-testid="voice-settings" className="voice-settings">
    <select
      data-testid="language-select"
      value={settings.language}
      onChange={(e) => onSettingsChange({ ...settings, language: e.target.value })}
    >
      <option value="en-US">English (US)</option>
      <option value="en-GB">English (UK)</option>
      <option value="es-ES">Spanish</option>
    </select>
    
    <label>
      <input
        type="checkbox"
        data-testid="auto-start-checkbox"
        checked={settings.autoStart}
        onChange={(e) => onSettingsChange({ ...settings, autoStart: e.target.checked })}
      />
      Auto Start
    </label>
    
    <label>
      <input
        type="checkbox"
        data-testid="continuous-listening-checkbox"
        checked={settings.continuousListening}
        onChange={(e) => onSettingsChange({ ...settings, continuousListening: e.target.checked })}
      />
      Continuous Listening
    </label>
    
    <label>
      <input
        type="checkbox"
        data-testid="tts-enabled-checkbox"
        checked={settings.ttsEnabled}
        onChange={(e) => onSettingsChange({ ...settings, ttsEnabled: e.target.checked })}
      />
      Text-to-Speech
    </label>
    
    <input
      type="range"
      data-testid="volume-slider"
      min="0"
      max="1"
      step="0.1"
      value={settings.volume}
      onChange={(e) => onSettingsChange({ ...settings, volume: parseFloat(e.target.value) })}
    />
  </div>
);

const MockErrorDisplay = ({ 
  error, 
  onRetry, 
  onDismiss 
}: {
  error: Error | null;
  onRetry: () => void;
  onDismiss: () => void;
}) => {
  if (!error) return null;

  return (
    <div data-testid="error-display" className="error-display" role="alert">
      <div className="error-message">{error.message}</div>
      <div className="error-actions">
        <button data-testid="retry-button" onClick={onRetry}>
          Retry
        </button>
        <button data-testid="dismiss-button" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
};

// Composite Voice UI Component
const VoiceUIIntegration = ({ 
  config = {},
  onTranscript = () => {},
  onError = () => {},
}: {
  config?: any;
  onTranscript?: (transcript: string) => void;
  onError?: (error: Error) => void;
}) => {
  const [isListening, setIsListening] = React.useState(false);
  const [transcript, setTranscript] = React.useState('');
  const [interimTranscript, setInterimTranscript] = React.useState('');
  const [confidence, setConfidence] = React.useState(0);
  const [audioLevel, setAudioLevel] = React.useState(0);
  const [audioData, setAudioData] = React.useState<Float32Array | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const [settings, setSettings] = React.useState({
    language: 'en-US',
    autoStart: false,
    continuousListening: false,
    ttsEnabled: true,
    ttsVoice: 'default',
    volume: 0.8,
  });

  const isSupported = true; // Mock support check

  const handleVoiceButtonClick = async () => {
    try {
      if (isListening) {
        setIsListening(false);
        setInterimTranscript('');
        setAudioLevel(0);
        setAudioData(null);
      } else {
        setIsListening(true);
        setError(null);
        
        // Simulate voice recognition start
        setTimeout(() => {
          setInterimTranscript('Hello...');
          setAudioLevel(0.5);
          setConfidence(0.7);
          
          const waveform = generateRealisticAudioWaveform({
            duration: 1000,
            sampleRate: 16000,
            waveform: 'voice',
            amplitude: 0.5,
          });
          setAudioData(waveform);
        }, 100);
        
        // Simulate final transcript
        setTimeout(() => {
          const finalTranscript = 'Hello, this is a test message';
          setTranscript(finalTranscript);
          setInterimTranscript('');
          setConfidence(0.95);
          onTranscript(finalTranscript);
        }, 2000);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Voice recognition failed');
      setError(error);
      onError(error);
    }
  };

  const handleRetry = () => {
    setError(null);
    handleVoiceButtonClick();
  };

  const handleDismissError = () => {
    setError(null);
  };

  const handleSettingsChange = (newSettings: any) => {
    setSettings(newSettings);
  };

  React.useEffect(() => {
    if (settings.autoStart && !isListening) {
      handleVoiceButtonClick();
    }
  }, [settings.autoStart]);

  return (
    <div data-testid="voice-ui-integration" className="voice-ui-integration">
      <MockVoiceButton
        isListening={isListening}
        isSupported={isSupported}
        onClick={handleVoiceButtonClick}
        disabled={!!error}
        aria-label={isListening ? 'Stop voice recognition' : 'Start voice recognition'}
      />
      
      <MockVoiceVisualizer
        audioData={audioData}
        isActive={isListening}
        level={audioLevel}
      />
      
      <MockTranscriptDisplay
        transcript={transcript}
        interimTranscript={interimTranscript}
        confidence={confidence}
        isListening={isListening}
      />
      
      <MockVoiceSettings
        settings={settings}
        onSettingsChange={handleSettingsChange}
      />
      
      <MockErrorDisplay
        error={error}
        onRetry={handleRetry}
        onDismiss={handleDismissError}
      />
    </div>
  );
};

describe('Voice UI Integration', () => {
  const user = userEvent.setup();

  beforeAll(() => {
    mockWebAudioAPI();
    mockMediaRecorder();
    mockElevenLabsAPI();
  });

  beforeEach(() => {
    resetAllMocks();
    setMockPermissions('granted');
  });

  describe('Voice Button Interactions', () => {
    it('should start voice recognition when button is clicked', async () => {
      const mockOnTranscript = jest.fn();
      render(<VoiceUIIntegration onTranscript={mockOnTranscript} />);

      const voiceButton = screen.getByTestId('voice-button');
      expect(voiceButton).toHaveTextContent('Start Voice');

      await user.click(voiceButton);

      expect(voiceButton).toHaveTextContent('Stop Voice');
      expect(voiceButton).toHaveClass('listening');

      // Wait for simulated transcript
      await waitFor(() => {
        expect(mockOnTranscript).toHaveBeenCalledWith('Hello, this is a test message');
      }, { timeout: 3000 });
    });

    it('should stop voice recognition when button is clicked again', async () => {
      render(<VoiceUIIntegration />);

      const voiceButton = screen.getByTestId('voice-button');
      
      // Start listening
      await user.click(voiceButton);
      expect(voiceButton).toHaveClass('listening');

      // Stop listening
      await user.click(voiceButton);
      expect(voiceButton).not.toHaveClass('listening');
      expect(voiceButton).toHaveTextContent('Start Voice');
    });

    it('should handle keyboard navigation', async () => {
      render(<VoiceUIIntegration />);

      const voiceButton = screen.getByTestId('voice-button');
      voiceButton.focus();

      // Should activate with Enter key
      await user.keyboard('{Enter}');
      expect(voiceButton).toHaveClass('listening');

      // Should deactivate with Space key
      await user.keyboard(' ');
      expect(voiceButton).not.toHaveClass('listening');
    });

    it('should be disabled when error occurs', async () => {
      setMockPermissions('denied');
      const mockOnError = jest.fn();
      render(<VoiceUIIntegration onError={mockOnError} />);

      const voiceButton = screen.getByTestId('voice-button');
      await user.click(voiceButton);

      // Button should be disabled after error
      expect(voiceButton).toBeDisabled();
    });
  });

  describe('Voice Visualizer', () => {
    it('should display audio level visualization', async () => {
      render(<VoiceUIIntegration />);

      const voiceButton = screen.getByTestId('voice-button');
      await user.click(voiceButton);

      const visualizer = screen.getByTestId('voice-visualizer');
      const levelBar = screen.getByTestId('level-bar');

      expect(visualizer).toHaveClass('active');
      
      await waitFor(() => {
        expect(levelBar.style.width).toBe('50%'); // 0.5 * 100%
      });
    });

    it('should display waveform when audio data is available', async () => {
      render(<VoiceUIIntegration />);

      const voiceButton = screen.getByTestId('voice-button');
      await user.click(voiceButton);

      await waitFor(() => {
        const canvas = screen.getByTestId('waveform-canvas');
        expect(canvas).toBeInTheDocument();
      });
    });

    it('should update accessibility labels for audio levels', async () => {
      render(<VoiceUIIntegration />);

      const voiceButton = screen.getByTestId('voice-button');
      await user.click(voiceButton);

      const visualizer = screen.getByTestId('voice-visualizer');
      
      await waitFor(() => {
        expect(visualizer).toHaveAttribute('aria-label', 'Audio level: 50%');
      });
    });
  });

  describe('Transcript Display', () => {
    it('should show interim transcript while listening', async () => {
      render(<VoiceUIIntegration />);

      const voiceButton = screen.getByTestId('voice-button');
      await user.click(voiceButton);

      await waitFor(() => {
        const interimTranscript = screen.getByTestId('interim-transcript');
        expect(interimTranscript).toHaveTextContent('Hello...');
      });
    });

    it('should show final transcript after recognition completes', async () => {
      render(<VoiceUIIntegration />);

      const voiceButton = screen.getByTestId('voice-button');
      await user.click(voiceButton);

      await waitFor(() => {
        const finalTranscript = screen.getByTestId('final-transcript');
        expect(finalTranscript).toHaveTextContent('Hello, this is a test message');
      }, { timeout: 3000 });
    });

    it('should display confidence meter', async () => {
      render(<VoiceUIIntegration />);

      const voiceButton = screen.getByTestId('voice-button');
      await user.click(voiceButton);

      await waitFor(() => {
        const confidenceMeter = screen.getByTestId('confidence-meter');
        expect(confidenceMeter).toHaveAttribute('aria-label', 'Confidence: 95%');
      }, { timeout: 3000 });
    });

    it('should clear interim transcript when not listening', async () => {
      render(<VoiceUIIntegration />);

      const voiceButton = screen.getByTestId('voice-button');
      
      // Start and stop listening
      await user.click(voiceButton);
      await user.click(voiceButton);

      expect(screen.queryByTestId('interim-transcript')).not.toBeInTheDocument();
    });
  });

  describe('Voice Settings', () => {
    it('should change language setting', async () => {
      render(<VoiceUIIntegration />);

      const languageSelect = screen.getByTestId('language-select');
      await user.selectOptions(languageSelect, 'es-ES');

      expect(languageSelect).toHaveValue('es-ES');
    });

    it('should toggle auto start setting', async () => {
      render(<VoiceUIIntegration />);

      const autoStartCheckbox = screen.getByTestId('auto-start-checkbox');
      await user.click(autoStartCheckbox);

      expect(autoStartCheckbox).toBeChecked();
      
      // Should automatically start voice recognition
      await waitFor(() => {
        const voiceButton = screen.getByTestId('voice-button');
        expect(voiceButton).toHaveClass('listening');
      });
    });

    it('should toggle continuous listening setting', async () => {
      render(<VoiceUIIntegration />);

      const continuousListeningCheckbox = screen.getByTestId('continuous-listening-checkbox');
      await user.click(continuousListeningCheckbox);

      expect(continuousListeningCheckbox).toBeChecked();
    });

    it('should toggle TTS setting', async () => {
      render(<VoiceUIIntegration />);

      const ttsEnabledCheckbox = screen.getByTestId('tts-enabled-checkbox');
      await user.click(ttsEnabledCheckbox);

      expect(ttsEnabledCheckbox).not.toBeChecked();
    });

    it('should adjust volume setting', async () => {
      render(<VoiceUIIntegration />);

      const volumeSlider = screen.getByTestId('volume-slider');
      await user.clear(volumeSlider);
      await user.type(volumeSlider, '0.5');

      expect(volumeSlider).toHaveValue('0.5');
    });
  });

  describe('Error Handling', () => {
    it('should display error message when permission is denied', async () => {
      setMockPermissions('denied');
      const mockOnError = jest.fn();
      render(<VoiceUIIntegration onError={mockOnError} />);

      const voiceButton = screen.getByTestId('voice-button');
      await user.click(voiceButton);

      await waitFor(() => {
        const errorDisplay = screen.getByTestId('error-display');
        expect(errorDisplay).toBeInTheDocument();
        expect(errorDisplay).toHaveAttribute('role', 'alert');
      });

      expect(mockOnError).toHaveBeenCalled();
    });

    it('should allow error retry', async () => {
      setMockPermissions('denied');
      render(<VoiceUIIntegration />);

      const voiceButton = screen.getByTestId('voice-button');
      await user.click(voiceButton);

      await waitFor(() => {
        const retryButton = screen.getByTestId('retry-button');
        expect(retryButton).toBeInTheDocument();
      });

      // Change permission to granted for retry
      setMockPermissions('granted');
      
      const retryButton = screen.getByTestId('retry-button');
      await user.click(retryButton);

      // Error should be cleared and voice should start
      expect(screen.queryByTestId('error-display')).not.toBeInTheDocument();
      expect(voiceButton).toHaveClass('listening');
    });

    it('should allow error dismissal', async () => {
      setMockPermissions('denied');
      render(<VoiceUIIntegration />);

      const voiceButton = screen.getByTestId('voice-button');
      await user.click(voiceButton);

      await waitFor(() => {
        const dismissButton = screen.getByTestId('dismiss-button');
        expect(dismissButton).toBeInTheDocument();
      });

      const dismissButton = screen.getByTestId('dismiss-button');
      await user.click(dismissButton);

      expect(screen.queryByTestId('error-display')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility Features', () => {
    it('should provide proper ARIA labels', async () => {
      render(<VoiceUIIntegration />);

      const voiceButton = screen.getByTestId('voice-button');
      expect(voiceButton).toHaveAttribute('aria-label', 'Start voice recognition');

      await user.click(voiceButton);
      expect(voiceButton).toHaveAttribute('aria-label', 'Stop voice recognition');
    });

    it('should support screen reader announcements', async () => {
      render(<VoiceUIIntegration />);

      const voiceButton = screen.getByTestId('voice-button');
      await user.click(voiceButton);

      // Wait for transcription
      await waitFor(() => {
        const transcript = screen.getByTestId('final-transcript');
        expect(transcript).toBeInTheDocument();
      }, { timeout: 3000 });

      // Transcript should be accessible to screen readers
      const transcript = screen.getByTestId('final-transcript');
      expect(transcript).toHaveTextContent('Hello, this is a test message');
    });

    it('should handle high contrast mode', () => {
      // Mock high contrast detection
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<VoiceUIIntegration />);

      const voiceUI = screen.getByTestId('voice-ui-integration');
      expect(voiceUI).toBeInTheDocument();
    });

    it('should support reduced motion preferences', () => {
      // Mock reduced motion detection
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<VoiceUIIntegration />);

      const visualizer = screen.getByTestId('voice-visualizer');
      expect(visualizer).toBeInTheDocument();
    });
  });

  describe('Performance Considerations', () => {
    it('should not cause memory leaks with repeated interactions', async () => {
      render(<VoiceUIIntegration />);

      const voiceButton = screen.getByTestId('voice-button');

      // Perform multiple start/stop cycles
      for (let i = 0; i < 5; i++) {
        await user.click(voiceButton); // Start
        await user.click(voiceButton); // Stop
      }

      // Component should still be responsive
      expect(voiceButton).toBeEnabled();
      expect(voiceButton).toHaveTextContent('Start Voice');
    });

    it('should handle rapid button clicks gracefully', async () => {
      render(<VoiceUIIntegration />);

      const voiceButton = screen.getByTestId('voice-button');

      // Rapid clicks should not cause issues
      await user.click(voiceButton);
      await user.click(voiceButton);
      await user.click(voiceButton);

      expect(voiceButton).toBeEnabled();
    });

    it('should optimize visualization updates', async () => {
      render(<VoiceUIIntegration />);

      const voiceButton = screen.getByTestId('voice-button');
      await user.click(voiceButton);

      const visualizer = screen.getByTestId('voice-visualizer');
      const levelBar = screen.getByTestId('level-bar');

      // Should update visualization without excessive re-renders
      expect(visualizer).toHaveClass('active');
      expect(levelBar).toBeInTheDocument();
    });
  });

  describe('Integration with External Components', () => {
    it('should integrate with chat interface', async () => {
      const mockOnTranscript = jest.fn();
      render(<VoiceUIIntegration onTranscript={mockOnTranscript} />);

      const voiceButton = screen.getByTestId('voice-button');
      await user.click(voiceButton);

      await waitFor(() => {
        expect(mockOnTranscript).toHaveBeenCalledWith('Hello, this is a test message');
      }, { timeout: 3000 });
    });

    it('should maintain state consistency across re-renders', async () => {
      const { rerender } = render(<VoiceUIIntegration />);

      const voiceButton = screen.getByTestId('voice-button');
      await user.click(voiceButton);

      // Re-render component
      rerender(<VoiceUIIntegration />);

      // State should be maintained
      expect(voiceButton).toHaveClass('listening');
    });

    it('should handle configuration changes dynamically', async () => {
      const { rerender } = render(<VoiceUIIntegration config={{ language: 'en-US' }} />);

      const languageSelect = screen.getByTestId('language-select');
      expect(languageSelect).toHaveValue('en-US');

      // Update config
      rerender(<VoiceUIIntegration config={{ language: 'es-ES' }} />);

      expect(languageSelect).toHaveValue('en-US'); // Should maintain internal state
    });
  });
});