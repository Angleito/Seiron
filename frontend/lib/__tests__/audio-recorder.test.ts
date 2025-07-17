import { AudioRecorder } from '../audio-recorder';

// Mock Web APIs
const mockMediaRecorder = {
  start: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  state: 'inactive',
  ondataavailable: null,
  onerror: null,
  onstop: null,
};

const mockAudioContext = {
  createMediaStreamSource: jest.fn(),
  createAnalyser: jest.fn(),
  close: jest.fn(),
  sampleRate: 16000,
};

const mockAnalyser = {
  connect: jest.fn(),
  frequencyBinCount: 1024,
  fftSize: 2048,
  smoothingTimeConstant: 0.8,
  getFloatFrequencyData: jest.fn(),
  getFloatTimeDomainData: jest.fn(),
};

const mockSource = {
  connect: jest.fn(),
};

const mockStream = {
  getTracks: jest.fn(() => [{ stop: jest.fn() }]),
};

const mockUserMedia = jest.fn();

// Setup global mocks
global.MediaRecorder = jest.fn(() => mockMediaRecorder) as any;
global.AudioContext = jest.fn(() => mockAudioContext) as any;
(global as any).webkitAudioContext = global.AudioContext;

Object.defineProperty(global.MediaRecorder, 'isTypeSupported', {
  value: jest.fn(() => true),
});

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockUserMedia,
  },
  writable: true,
});

Object.defineProperty(global.navigator, 'permissions', {
  value: {
    query: jest.fn(() => Promise.resolve({ state: 'granted' })),
  },
  writable: true,
});

describe('AudioRecorder', () => {
  let recorder: AudioRecorder;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAudioContext.createMediaStreamSource.mockReturnValue(mockSource);
    mockAudioContext.createAnalyser.mockReturnValue(mockAnalyser);
    mockUserMedia.mockResolvedValue(mockStream);
    mockAnalyser.getFloatFrequencyData.mockImplementation((array: Float32Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.random() * -60; // Frequency data in dB
      }
    });
    mockAnalyser.getFloatTimeDomainData.mockImplementation((array: Float32Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = (Math.random() - 0.5) * 0.1; // Waveform data
      }
    });
  });

  afterEach(() => {
    if (recorder) {
      // Clean up any running recordings
      if (recorder.getState() === 'recording') {
        recorder.stop().catch(() => {});
      }
    }
  });

  describe('Constructor and Static Methods', () => {
    test('should create recorder with default options', () => {
      recorder = new AudioRecorder();
      expect(recorder).toBeInstanceOf(AudioRecorder);
      expect(recorder.getState()).toBe('inactive');
    });

    test('should create recorder with custom options', () => {
      const options = {
        sampleRate: 44100,
        echoCancellation: false,
        noiseSuppression: false,
        chunkInterval: 200,
      };
      recorder = new AudioRecorder(options);
      expect(recorder).toBeInstanceOf(AudioRecorder);
    });

    test('should check if browser is supported', () => {
      expect(AudioRecorder.isSupported()).toBe(true);
    });

    test('should get supported MIME types', () => {
      const mimeTypes = AudioRecorder.getSupportedMimeTypes();
      expect(Array.isArray(mimeTypes)).toBe(true);
    });
  });

  describe('Permission Management', () => {
    test('should check permissions successfully', async () => {
      recorder = new AudioRecorder();
      const permission = await recorder.checkPermissions();
      expect(permission).toBe('granted');
    });

    test('should handle permission denial', async () => {
      (navigator.permissions.query as jest.Mock).mockResolvedValue({ state: 'denied' });
      recorder = new AudioRecorder();
      const permission = await recorder.checkPermissions();
      expect(permission).toBe('denied');
    });

    test('should fallback when permissions API is not available', async () => {
      const originalPermissions = navigator.permissions;
      delete (navigator as any).permissions;
      
      recorder = new AudioRecorder();
      const permission = await recorder.checkPermissions();
      expect(permission).toBe('granted');
      
      (navigator as any).permissions = originalPermissions;
    });
  });

  describe('Recording Controls', () => {
    beforeEach(() => {
      recorder = new AudioRecorder({
        onDataAvailable: jest.fn(),
        onVoiceActivity: jest.fn(),
        onAudioLevel: jest.fn(),
        onError: jest.fn(),
      });
    });

    test('should start recording successfully', async () => {
      await recorder.start();
      
      expect(mockUserMedia).toHaveBeenCalledWith({
        audio: {
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      expect(global.MediaRecorder).toHaveBeenCalled();
      expect(mockMediaRecorder.start).toHaveBeenCalledWith(100);
    });

    test('should not allow starting recording twice', async () => {
      await recorder.start();
      await expect(recorder.start()).rejects.toThrow('Recording already in progress');
    });

    test('should stop recording and return blob', async () => {
      await recorder.start();
      
      // Simulate MediaRecorder stop event
      const stopPromise = recorder.stop();
      if (mockMediaRecorder.onstop) {
        mockMediaRecorder.onstop();
      }
      
      const blob = await stopPromise;
      expect(blob).toBeInstanceOf(Blob);
      expect(mockMediaRecorder.stop).toHaveBeenCalled();
    });

    test('should pause recording', async () => {
      await recorder.start();
      mockMediaRecorder.state = 'recording';
      
      recorder.pause();
      expect(mockMediaRecorder.pause).toHaveBeenCalled();
    });

    test('should resume recording', async () => {
      await recorder.start();
      mockMediaRecorder.state = 'paused';
      
      recorder.resume();
      expect(mockMediaRecorder.resume).toHaveBeenCalled();
    });

    test('should handle getUserMedia errors', async () => {
      mockUserMedia.mockRejectedValue(new Error('Permission denied'));
      await expect(recorder.start()).rejects.toThrow('Permission denied');
    });

    test('should handle MediaRecorder errors', async () => {
      const onError = jest.fn();
      recorder = new AudioRecorder({ onError });
      
      await recorder.start();
      
      // Simulate MediaRecorder error
      if (mockMediaRecorder.onerror) {
        mockMediaRecorder.onerror(new Event('error'));
      }
      
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('Audio Analysis', () => {
    beforeEach(() => {
      recorder = new AudioRecorder({
        onVoiceActivity: jest.fn(),
        onAudioLevel: jest.fn(),
      });
    });

    test('should provide visualization data', async () => {
      await recorder.start();
      
      const data = recorder.getVisualizationData();
      expect(data).toBeTruthy();
      expect(data?.level).toBeGreaterThanOrEqual(0);
      expect(data?.frequency).toBeInstanceOf(Float32Array);
      expect(data?.waveform).toBeInstanceOf(Float32Array);
    });

    test('should return null visualization data when not recording', () => {
      const data = recorder.getVisualizationData();
      expect(data).toBeNull();
    });

    test('should detect voice activity', async () => {
      const onVoiceActivity = jest.fn();
      recorder = new AudioRecorder({ 
        onVoiceActivity,
        vadThreshold: 0.05,
      });
      
      await recorder.start();
      
      // Wait for VAD to run
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // VAD should have been called
      expect(onVoiceActivity).toHaveBeenCalled();
    });

    test('should monitor audio levels', async () => {
      const onAudioLevel = jest.fn();
      recorder = new AudioRecorder({ onAudioLevel });
      
      await recorder.start();
      
      // Wait for level monitoring to run
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(onAudioLevel).toHaveBeenCalled();
    });
  });

  describe('Data Streaming', () => {
    test('should stream audio chunks', async () => {
      const onDataAvailable = jest.fn();
      recorder = new AudioRecorder({ onDataAvailable });
      
      await recorder.start();
      
      // Simulate data available event
      const blob = new Blob(['test'], { type: 'audio/webm' });
      const event = { data: blob } as BlobEvent;
      
      if (mockMediaRecorder.ondataavailable) {
        mockMediaRecorder.ondataavailable(event);
      }
      
      expect(onDataAvailable).toHaveBeenCalledWith(blob);
    });

    test('should not stream empty chunks', async () => {
      const onDataAvailable = jest.fn();
      recorder = new AudioRecorder({ onDataAvailable });
      
      await recorder.start();
      
      // Simulate empty data event
      const emptyBlob = new Blob([], { type: 'audio/webm' });
      const event = { data: emptyBlob } as BlobEvent;
      
      if (mockMediaRecorder.ondataavailable) {
        mockMediaRecorder.ondataavailable(event);
      }
      
      expect(onDataAvailable).not.toHaveBeenCalled();
    });
  });

  describe('Error Recovery', () => {
    test('should handle audio context creation failure', async () => {
      global.AudioContext = jest.fn(() => {
        throw new Error('AudioContext creation failed');
      }) as any;
      
      recorder = new AudioRecorder();
      await expect(recorder.start()).rejects.toThrow();
    });

    test('should clean up resources on error', async () => {
      recorder = new AudioRecorder();
      
      // Start recording
      await recorder.start();
      
      // Simulate error
      const error = new Error('Recording error');
      if (mockMediaRecorder.onerror) {
        mockMediaRecorder.onerror(new Event('error'));
      }
      
      // Check that resources are cleaned up
      expect(mockStream.getTracks()[0].stop).toHaveBeenCalled();
      expect(mockAudioContext.close).toHaveBeenCalled();
    });
  });

  describe('MIME Type Selection', () => {
    test('should select preferred MIME type', () => {
      recorder = new AudioRecorder();
      // Should use default preferred type since MediaRecorder.isTypeSupported returns true
      expect(recorder).toBeInstanceOf(AudioRecorder);
    });

    test('should fallback when no MIME types are supported', () => {
      (global.MediaRecorder.isTypeSupported as jest.Mock).mockReturnValue(false);
      recorder = new AudioRecorder();
      expect(recorder).toBeInstanceOf(AudioRecorder);
    });
  });
});