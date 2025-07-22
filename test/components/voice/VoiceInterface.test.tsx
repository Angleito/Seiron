import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VoiceInterface } from '@components/voice/VoiceInterface'
import { renderWithStores, createMockStore } from '../../utils/zustand-test-utils'

// Mock browser APIs
const mockMediaRecorder = {
  start: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  requestData: jest.fn(),
  state: 'inactive',
  ondataavailable: null,
  onerror: null,
  onstart: null,
  onstop: null,
}

const mockGetUserMedia = jest.fn()

// Mock Web Speech API
const mockSpeechRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  continuous: false,
  interimResults: false,
  onresult: null,
  onerror: null,
  onstart: null,
  onend: null,
}

// Mock Audio context
const mockAudioContext = {
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: { value: 1 }
  })),
  createOscillator: jest.fn(() => ({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    frequency: { value: 440 }
  })),
  resume: jest.fn(),
  close: jest.fn(),
  state: 'running'
}

// Setup mocks
beforeAll(() => {
  global.MediaRecorder = jest.fn().mockImplementation(() => mockMediaRecorder)
  global.navigator.mediaDevices = {
    getUserMedia: mockGetUserMedia
  } as any

  global.webkitSpeechRecognition = jest.fn().mockImplementation(() => mockSpeechRecognition)
  global.SpeechRecognition = jest.fn().mockImplementation(() => mockSpeechRecognition)
  
  global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext)
  global.webkitAudioContext = jest.fn().mockImplementation(() => mockAudioContext)
})

// Mock stores
const mockVoiceStore = createMockStore({
  isRecording: false,
  isProcessing: false,
  transcript: '',
  audioUrl: null,
  error: null,
  isSupported: true,
  startRecording: jest.fn(),
  stopRecording: jest.fn(),
  playAudio: jest.fn(),
  clearTranscript: jest.fn(),
})

const mockChatStore = createMockStore({
  sendVoiceMessage: jest.fn(),
  isLoading: false,
})

describe('VoiceInterface', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }]
    })
    mockVoiceStore.setState({
      isRecording: false,
      isProcessing: false,
      transcript: '',
      audioUrl: null,
      error: null,
      isSupported: true,
    })
  })

  it('renders voice interface correctly', () => {
    renderWithStores(<VoiceInterface />, {
      stores: {
        voice: mockVoiceStore as any,
        chat: mockChatStore as any,
      }
    })

    expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument()
    expect(screen.getByText(/press and hold to record/i)).toBeInTheDocument()
  })

  it('shows unsupported message when voice is not supported', () => {
    mockVoiceStore.setState({ isSupported: false })

    renderWithStores(<VoiceInterface />, {
      stores: {
        voice: mockVoiceStore as any,
        chat: mockChatStore as any,
      }
    })

    expect(screen.getByText(/voice recording is not supported/i)).toBeInTheDocument()
  })

  it('starts recording when record button is pressed', async () => {
    const user = userEvent.setup()
    const mockStartRecording = jest.fn()
    mockVoiceStore.setState({ startRecording: mockStartRecording })

    renderWithStores(<VoiceInterface />, {
      stores: {
        voice: mockVoiceStore as any,
        chat: mockChatStore as any,
      }
    })

    const recordButton = screen.getByRole('button', { name: /start recording/i })
    await user.click(recordButton)

    expect(mockStartRecording).toHaveBeenCalled()
  })

  it('stops recording when record button is released', async () => {
    const user = userEvent.setup()
    const mockStopRecording = jest.fn()
    mockVoiceStore.setState({ 
      isRecording: true,
      stopRecording: mockStopRecording 
    })

    renderWithStores(<VoiceInterface />, {
      stores: {
        voice: mockVoiceStore as any,
        chat: mockChatStore as any,
      }
    })

    const recordButton = screen.getByRole('button', { name: /stop recording/i })
    await user.click(recordButton)

    expect(mockStopRecording).toHaveBeenCalled()
  })

  it('displays transcript when available', () => {
    mockVoiceStore.setState({ transcript: 'Hello, show me my portfolio' })

    renderWithStores(<VoiceInterface />, {
      stores: {
        voice: mockVoiceStore as any,
        chat: mockChatStore as any,
      }
    })

    expect(screen.getByText('Hello, show me my portfolio')).toBeInTheDocument()
  })

  it('shows processing state during voice processing', () => {
    mockVoiceStore.setState({ isProcessing: true })

    renderWithStores(<VoiceInterface />, {
      stores: {
        voice: mockVoiceStore as any,
        chat: mockChatStore as any,
      }
    })

    expect(screen.getByText(/processing audio/i)).toBeInTheDocument()
    expect(screen.getByTestId('processing-spinner')).toBeInTheDocument()
  })

  it('displays audio playback controls when audio is available', () => {
    mockVoiceStore.setState({ audioUrl: 'blob:audio-data' })

    renderWithStores(<VoiceInterface />, {
      stores: {
        voice: mockVoiceStore as any,
        chat: mockChatStore as any,
      }
    })

    expect(screen.getByRole('button', { name: /play audio/i })).toBeInTheDocument()
  })

  it('handles audio playback', async () => {
    const user = userEvent.setup()
    const mockPlayAudio = jest.fn()
    mockVoiceStore.setState({ 
      audioUrl: 'blob:audio-data',
      playAudio: mockPlayAudio
    })

    renderWithStores(<VoiceInterface />, {
      stores: {
        voice: mockVoiceStore as any,
        chat: mockChatStore as any,
      }
    })

    const playButton = screen.getByRole('button', { name: /play audio/i })
    await user.click(playButton)

    expect(mockPlayAudio).toHaveBeenCalled()
  })

  it('sends voice message when transcript is available', async () => {
    const user = userEvent.setup()
    const mockSendVoiceMessage = jest.fn()
    mockVoiceStore.setState({ transcript: 'Test voice message' })
    mockChatStore.setState({ sendVoiceMessage: mockSendVoiceMessage })

    renderWithStores(<VoiceInterface />, {
      stores: {
        voice: mockVoiceStore as any,
        chat: mockChatStore as any,
      }
    })

    const sendButton = screen.getByRole('button', { name: /send message/i })
    await user.click(sendButton)

    expect(mockSendVoiceMessage).toHaveBeenCalledWith('Test voice message')
  })

  it('clears transcript after sending message', async () => {
    const user = userEvent.setup()
    const mockClearTranscript = jest.fn()
    const mockSendVoiceMessage = jest.fn().mockResolvedValue(undefined)
    
    mockVoiceStore.setState({ 
      transcript: 'Test voice message',
      clearTranscript: mockClearTranscript
    })
    mockChatStore.setState({ sendVoiceMessage: mockSendVoiceMessage })

    renderWithStores(<VoiceInterface />, {
      stores: {
        voice: mockVoiceStore as any,
        chat: mockChatStore as any,
      }
    })

    const sendButton = screen.getByRole('button', { name: /send message/i })
    await user.click(sendButton)

    await waitFor(() => {
      expect(mockClearTranscript).toHaveBeenCalled()
    })
  })

  it('shows error message when voice error occurs', () => {
    mockVoiceStore.setState({ error: 'Microphone access denied' })

    renderWithStores(<VoiceInterface />, {
      stores: {
        voice: mockVoiceStore as any,
        chat: mockChatStore as any,
      }
    })

    expect(screen.getByText('Microphone access denied')).toBeInTheDocument()
  })

  it('handles keyboard shortcuts for voice recording', async () => {
    const user = userEvent.setup()
    const mockStartRecording = jest.fn()
    const mockStopRecording = jest.fn()
    
    mockVoiceStore.setState({ 
      startRecording: mockStartRecording,
      stopRecording: mockStopRecording
    })

    renderWithStores(<VoiceInterface />, {
      stores: {
        voice: mockVoiceStore as any,
        chat: mockChatStore as any,
      }
    })

    // Test space key for start recording
    await user.keyboard('[Space>]')
    expect(mockStartRecording).toHaveBeenCalled()

    // Simulate recording state
    mockVoiceStore.setState({ isRecording: true })

    // Test space key for stop recording
    await user.keyboard('[/Space]')
    expect(mockStopRecording).toHaveBeenCalled()
  })

  it('shows recording duration during recording', () => {
    mockVoiceStore.setState({ 
      isRecording: true,
      recordingDuration: 15 
    })

    renderWithStores(<VoiceInterface />, {
      stores: {
        voice: mockVoiceStore as any,
        chat: mockChatStore as any,
      }
    })

    expect(screen.getByText('00:15')).toBeInTheDocument()
  })

  it('shows visual recording indicator during recording', () => {
    mockVoiceStore.setState({ isRecording: true })

    renderWithStores(<VoiceInterface />, {
      stores: {
        voice: mockVoiceStore as any,
        chat: mockChatStore as any,
      }
    })

    expect(screen.getByTestId('recording-indicator')).toBeInTheDocument()
    expect(screen.getByTestId('recording-waveform')).toBeInTheDocument()
  })

  it('handles voice confidence threshold', () => {
    mockVoiceStore.setState({ 
      transcript: 'unclear speech',
      confidence: 0.3 // Low confidence
    })

    renderWithStores(<VoiceInterface />, {
      stores: {
        voice: mockVoiceStore as any,
        chat: mockChatStore as any,
      }
    })

    expect(screen.getByText(/low confidence/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry recording/i })).toBeInTheDocument()
  })

  it('supports voice commands for interface control', async () => {
    const user = userEvent.setup()
    mockVoiceStore.setState({ transcript: 'clear transcript' })

    renderWithStores(<VoiceInterface />, {
      stores: {
        voice: mockVoiceStore as any,
        chat: mockChatStore as any,
      }
    })

    // Voice command should be recognized and executed
    expect(screen.getByText(/voice command recognized/i)).toBeInTheDocument()
  })
})