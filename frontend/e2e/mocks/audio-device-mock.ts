/**
 * Mock audio devices and media APIs for voice testing
 */

export class AudioDeviceMock {
  private static instance: AudioDeviceMock;
  private mockDevices: MediaDeviceInfo[] = [];
  private mockStreams: MediaStream[] = [];
  private permissionState: 'granted' | 'denied' | 'prompt' = 'prompt';

  static getInstance(): AudioDeviceMock {
    if (!AudioDeviceMock.instance) {
      AudioDeviceMock.instance = new AudioDeviceMock();
    }
    return AudioDeviceMock.instance;
  }

  /**
   * Initialize mock audio devices
   */
  initializeMockDevices(): void {
    this.mockDevices = [
      {
        deviceId: 'mock-microphone-1',
        groupId: 'mock-group-1',
        kind: 'audioinput',
        label: 'Mock Microphone 1'
      } as MediaDeviceInfo,
      {
        deviceId: 'mock-microphone-2',
        groupId: 'mock-group-2',
        kind: 'audioinput',
        label: 'Mock Microphone 2'
      } as MediaDeviceInfo,
      {
        deviceId: 'mock-speaker-1',
        groupId: 'mock-group-1',
        kind: 'audiooutput',
        label: 'Mock Speaker 1'
      } as MediaDeviceInfo
    ];
  }

  /**
   * Mock getUserMedia API
   */
  mockGetUserMedia(): void {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: (constraints: MediaStreamConstraints) => {
          return new Promise((resolve, reject) => {
            if (this.permissionState === 'denied') {
              reject(new DOMException('Permission denied', 'NotAllowedError'));
              return;
            }

            if (this.permissionState === 'prompt') {
              // Simulate permission prompt delay
              setTimeout(() => {
                this.permissionState = 'granted';
                resolve(this.createMockMediaStream());
              }, 500);
            } else {
              resolve(this.createMockMediaStream());
            }
          });
        },

        enumerateDevices: () => {
          return Promise.resolve(this.mockDevices);
        },

        getDisplayMedia: () => {
          return Promise.resolve(this.createMockMediaStream());
        }
      },
      writable: true
    });
  }

  /**
   * Create a mock MediaStream
   */
  private createMockMediaStream(): MediaStream {
    const mockTrack = {
      id: `mock-track-${Date.now()}`,
      kind: 'audio',
      label: 'Mock Audio Track',
      enabled: true,
      muted: false,
      readyState: 'live',
      stop: () => {
        this.mockTrack.readyState = 'ended';
      },
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true
    } as MediaStreamTrack;

    const mockStream = {
      id: `mock-stream-${Date.now()}`,
      active: true,
      getTracks: () => [mockTrack],
      getAudioTracks: () => [mockTrack],
      getVideoTracks: () => [],
      addTrack: () => {},
      removeTrack: () => {},
      clone: () => this.createMockMediaStream(),
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true
    } as MediaStream;

    this.mockStreams.push(mockStream);
    return mockStream;
  }

  /**
   * Mock MediaRecorder API
   */
  mockMediaRecorder(): void {
    (global as any).MediaRecorder = class MockMediaRecorder {
      state: RecordingState = 'inactive';
      stream: MediaStream;
      ondataavailable: ((event: BlobEvent) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: ((event: MediaRecorderErrorEvent) => void) | null = null;
      onstart: (() => void) | null = null;
      onpause: (() => void) | null = null;
      onresume: (() => void) | null = null;

      constructor(stream: MediaStream, options?: MediaRecorderOptions) {
        this.stream = stream;
      }

      start(timeslice?: number): void {
        this.state = 'recording';
        if (this.onstart) {
          this.onstart();
        }

        // Simulate data availability
        setTimeout(() => {
          if (this.ondataavailable && this.state === 'recording') {
            const mockBlob = new Blob(['mock-audio-data'], { type: 'audio/webm' });
            this.ondataavailable({ data: mockBlob } as BlobEvent);
          }
        }, timeslice || 1000);
      }

      stop(): void {
        this.state = 'inactive';
        if (this.onstop) {
          this.onstop();
        }
      }

      pause(): void {
        this.state = 'paused';
        if (this.onpause) {
          this.onpause();
        }
      }

      resume(): void {
        this.state = 'recording';
        if (this.onresume) {
          this.onresume();
        }
      }

      requestData(): void {
        if (this.ondataavailable && this.state === 'recording') {
          const mockBlob = new Blob(['mock-audio-data'], { type: 'audio/webm' });
          this.ondataavailable({ data: mockBlob } as BlobEvent);
        }
      }

      addEventListener(): void {}
      removeEventListener(): void {}
      dispatchEvent(): boolean { return true; }

      static isTypeSupported(type: string): boolean {
        return ['audio/webm', 'audio/mp4', 'audio/wav'].includes(type);
      }
    };
  }

  /**
   * Mock Web Audio API
   */
  mockWebAudioAPI(): void {
    const mockAudioContext = {
      state: 'running',
      sampleRate: 44100,
      currentTime: 0,
      destination: {},
      listener: {},

      createMediaStreamSource: () => ({
        connect: () => {},
        disconnect: () => {},
        context: mockAudioContext
      }),

      createAnalyser: () => ({
        fftSize: 2048,
        frequencyBinCount: 1024,
        minDecibels: -100,
        maxDecibels: -30,
        smoothingTimeConstant: 0.8,
        getByteFrequencyData: (array: Uint8Array) => {
          // Fill with mock frequency data
          for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 255);
          }
        },
        getFloatFrequencyData: (array: Float32Array) => {
          for (let i = 0; i < array.length; i++) {
            array[i] = Math.random() * -100;
          }
        },
        connect: () => {},
        disconnect: () => {}
      }),

      createGain: () => ({
        gain: { value: 1 },
        connect: () => {},
        disconnect: () => {}
      }),

      createBuffer: (channels: number, length: number, sampleRate: number) => ({
        numberOfChannels: channels,
        length,
        sampleRate,
        getChannelData: () => new Float32Array(length)
      }),

      createBufferSource: () => ({
        buffer: null,
        playbackRate: { value: 1 },
        start: () => {},
        stop: () => {},
        connect: () => {},
        disconnect: () => {}
      }),

      decodeAudioData: (audioData: ArrayBuffer) => {
        return Promise.resolve(mockAudioContext.createBuffer(2, 44100, 44100));
      },

      resume: () => Promise.resolve(),
      suspend: () => Promise.resolve(),
      close: () => Promise.resolve()
    };

    (global as any).AudioContext = function() {
      return mockAudioContext;
    };

    (global as any).webkitAudioContext = (global as any).AudioContext;
  }

  /**
   * Mock SpeechRecognition API
   */
  mockSpeechRecognition(): void {
    const mockSpeechRecognition = class {
      continuous = false;
      interimResults = false;
      lang = 'en-US';
      maxAlternatives = 1;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
      onerror: ((event: SpeechRecognitionErrorEvent) => void) | null = null;

      start(): void {
        setTimeout(() => {
          if (this.onstart) this.onstart();
          
          // Simulate speech recognition result
          setTimeout(() => {
            if (this.onresult) {
              const mockEvent = {
                results: [{
                  0: { transcript: 'hello how are you today', confidence: 0.95 },
                  isFinal: true,
                  length: 1
                }],
                resultIndex: 0
              } as SpeechRecognitionEvent;
              
              this.onresult(mockEvent);
            }
            
            if (this.onend) this.onend();
          }, 1000);
        }, 100);
      }

      stop(): void {
        if (this.onend) {
          setTimeout(() => this.onend!(), 100);
        }
      }

      abort(): void {
        this.stop();
      }

      addEventListener(): void {}
      removeEventListener(): void {}
    };

    (global as any).SpeechRecognition = mockSpeechRecognition;
    (global as any).webkitSpeechRecognition = mockSpeechRecognition;
  }

  /**
   * Set microphone permission state
   */
  setPermissionState(state: 'granted' | 'denied' | 'prompt'): void {
    this.permissionState = state;
  }

  /**
   * Simulate audio device error
   */
  simulateDeviceError(errorType: 'NotFoundError' | 'NotAllowedError' | 'NotReadableError'): void {
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
    
    navigator.mediaDevices.getUserMedia = () => {
      return Promise.reject(new DOMException('Mock device error', errorType));
    };

    // Restore after 5 seconds
    setTimeout(() => {
      navigator.mediaDevices.getUserMedia = originalGetUserMedia;
    }, 5000);
  }

  /**
   * Clean up all mock resources
   */
  cleanup(): void {
    this.mockStreams.forEach(stream => {
      stream.getTracks().forEach(track => track.stop());
    });
    this.mockStreams = [];
    this.permissionState = 'prompt';
  }

  /**
   * Initialize all mocks for browser environment
   */
  initializeAllMocks(): void {
    this.initializeMockDevices();
    this.mockGetUserMedia();
    this.mockMediaRecorder();
    this.mockWebAudioAPI();
    this.mockSpeechRecognition();
  }
}

export default AudioDeviceMock;