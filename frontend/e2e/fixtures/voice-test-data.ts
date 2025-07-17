/**
 * Test data and fixtures for voice chat E2E testing
 */

export const voiceTestData = {
  // Sample conversation data
  conversations: {
    basic: {
      userInput: "Hello, how are you today?",
      expectedAIResponse: "Hello! I'm doing well, thank you for asking.",
      transcription: "hello how are you today"
    },
    complex: {
      userInput: "Can you explain quantum computing in simple terms?",
      expectedAIResponse: "Quantum computing uses quantum mechanics principles...",
      transcription: "can you explain quantum computing in simple terms"
    },
    error: {
      userInput: "This is a test message",
      transcription: null, // Simulate transcription failure
      expectedError: "Speech recognition failed"
    }
  },

  // Mock audio data (base64 encoded audio samples)
  audioSamples: {
    silence: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+Dyvmk=",
    shortSpeech: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+Dyvmk=",
    longSpeech: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+Dyvmk="
  },

  // Voice activity detection test cases
  vadTestCases: [
    {
      name: "silence",
      audioLevel: 0,
      expectedDetection: false,
      duration: 1000
    },
    {
      name: "quiet_speech",
      audioLevel: 0.3,
      expectedDetection: true,
      duration: 2000
    },
    {
      name: "normal_speech",
      audioLevel: 0.7,
      expectedDetection: true,
      duration: 3000
    },
    {
      name: "loud_speech",
      audioLevel: 0.9,
      expectedDetection: true,
      duration: 2500
    },
    {
      name: "background_noise",
      audioLevel: 0.1,
      expectedDetection: false,
      duration: 1500
    }
  ],

  // Error scenarios
  errorScenarios: {
    networkFailure: {
      type: "network",
      statusCode: 500,
      message: "Internal server error"
    },
    audioDeviceError: {
      type: "device",
      message: "Audio device not found"
    },
    permissionDenied: {
      type: "permission",
      message: "Microphone access denied"
    },
    transcriptionError: {
      type: "transcription",
      message: "Speech recognition failed"
    },
    ttsError: {
      type: "tts",
      message: "Text-to-speech synthesis failed"
    }
  },

  // Mobile test configurations
  mobileConfigs: [
    {
      name: "iPhone_13",
      viewport: { width: 390, height: 844 },
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15"
    },
    {
      name: "Galaxy_S21",
      viewport: { width: 360, height: 800 },
      userAgent: "Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36"
    },
    {
      name: "iPad_Air",
      viewport: { width: 820, height: 1180 },
      userAgent: "Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15"
    }
  ],

  // Performance thresholds
  performanceThresholds: {
    voiceLatency: {
      transcription: 2000, // 2 seconds max
      aiResponse: 5000,    // 5 seconds max
      ttsPlayback: 1000    // 1 second max
    },
    audioProcessing: {
      vadResponse: 100,    // 100ms max
      recordingStart: 500, // 500ms max
      playbackStart: 300   // 300ms max
    }
  },

  // API mock responses
  mockResponses: {
    elevenLabs: {
      success: {
        status: 200,
        headers: { "content-type": "audio/mpeg" },
        body: "mock-audio-data"
      },
      error: {
        status: 429,
        body: { error: "Rate limit exceeded" }
      }
    },
    speechRecognition: {
      success: {
        transcript: "hello how are you today",
        confidence: 0.95
      },
      error: {
        error: "Recognition failed"
      }
    },
    aiChat: {
      success: {
        response: "Hello! I'm doing well, thank you for asking.",
        sessionId: "test-session-123"
      },
      error: {
        error: "AI service unavailable"
      }
    }
  },

  // Accessibility test data
  accessibility: {
    keyboardNavigation: [
      { key: "Tab", expectedFocus: "voice-button" },
      { key: "Space", action: "start-recording" },
      { key: "Escape", action: "stop-recording" }
    ],
    screenReader: {
      announcements: [
        "Voice chat enabled",
        "Recording started",
        "Recording stopped",
        "Processing speech",
        "AI response ready"
      ]
    }
  }
};

export default voiceTestData;