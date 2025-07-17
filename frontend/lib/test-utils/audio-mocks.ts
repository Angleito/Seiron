/**
 * Comprehensive Audio Mocking Utilities
 * Mock Web Audio API, MediaRecorder, ElevenLabs API, and audio devices with realistic behavior
 */

import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';

// Global mock state
interface MockState {
  webAudioAPI: {
    contexts: Map<string, MockAudioContext>;
    isSupported: boolean;
  };
  mediaRecorder: {
    instances: Map<string, MockMediaRecorder>;
    supportedMimeTypes: string[];
  };
  elevenLabs: {
    apiKey: string | null;
    requestHistory: Array<{ timestamp: number; request: any; response: any }>;
    rateLimitRemaining: number;
  };
  audioDevices: {
    devices: MockAudioDevice[];
    permissions: PermissionState;
    activeDevice: MockAudioDevice | null;
  };
}

const mockState: MockState = {
  webAudioAPI: {
    contexts: new Map(),
    isSupported: true,
  },
  mediaRecorder: {
    instances: new Map(),
    supportedMimeTypes: [
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/webm',
      'audio/ogg',
      'audio/wav',
    ],
  },
  elevenLabs: {
    apiKey: null,
    requestHistory: [],
    rateLimitRemaining: 1000,
  },
  audioDevices: {
    devices: [],
    permissions: 'prompt',
    activeDevice: null,
  },
};

// Mock Audio Device Interface
interface MockAudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
  quality: 'high' | 'medium' | 'low';
  noiseLevel: number;
  latency: number;
  sampleRates: number[];
  channelCount: number;
  isDefault: boolean;
  isConnected: boolean;
}

// Mock AudioContext Implementation
class MockAudioContext implements Partial<AudioContext> {
  private static instanceCount = 0;
  public readonly id: string;
  public sampleRate: number;
  public state: AudioContextState = 'suspended';
  public destination: MockAudioDestinationNode;
  private nodes: Set<MockAudioNode> = new Set();

  constructor(options: AudioContextOptions = {}) {
    this.id = `mock-audio-context-${++MockAudioContext.instanceCount}`;
    this.sampleRate = options.sampleRate || 44100;
    this.destination = new MockAudioDestinationNode();
    mockState.webAudioAPI.contexts.set(this.id, this);
  }

  createAnalyser(): AnalyserNode {
    const analyser = new MockAnalyserNode();
    this.nodes.add(analyser);
    return analyser as unknown as AnalyserNode;
  }

  createMediaStreamSource(stream: MediaStream): MediaStreamAudioSourceNode {
    const source = new MockMediaStreamAudioSourceNode(stream);
    this.nodes.add(source);
    return source as unknown as MediaStreamAudioSourceNode;
  }

  createGain(): GainNode {
    const gain = new MockGainNode();
    this.nodes.add(gain);
    return gain as unknown as GainNode;
  }

  createScriptProcessor(
    bufferSize?: number,
    numberOfInputChannels?: number,
    numberOfOutputChannels?: number
  ): ScriptProcessorNode {
    const processor = new MockScriptProcessorNode(
      bufferSize || 4096,
      numberOfInputChannels || 2,
      numberOfOutputChannels || 2
    );
    this.nodes.add(processor);
    return processor as unknown as ScriptProcessorNode;
  }

  async resume(): Promise<void> {
    this.state = 'running';
  }

  async suspend(): Promise<void> {
    this.state = 'suspended';
  }

  async close(): Promise<void> {
    this.state = 'closed';
    this.nodes.clear();
    mockState.webAudioAPI.contexts.delete(this.id);
  }

  addEventListener(type: string, listener: EventListener): void {
    // Mock event listener
  }

  removeEventListener(type: string, listener: EventListener): void {
    // Mock event listener removal
  }
}

// Mock AudioNode Base Class
class MockAudioNode {
  public context: MockAudioContext;
  public numberOfInputs = 1;
  public numberOfOutputs = 1;
  public channelCount = 2;
  public channelCountMode: ChannelCountMode = 'max';
  public channelInterpretation: ChannelInterpretation = 'speakers';
  private connections: Set<MockAudioNode> = new Set();

  constructor(context?: MockAudioContext) {
    this.context = context || new MockAudioContext();
  }

  connect(destination: MockAudioNode | MockAudioContext): void {
    if (destination instanceof MockAudioNode) {
      this.connections.add(destination);
    }
  }

  disconnect(): void {
    this.connections.clear();
  }
}

// Mock AnalyserNode
class MockAnalyserNode extends MockAudioNode implements Partial<AnalyserNode> {
  public fftSize = 2048;
  public frequencyBinCount = 1024;
  public minDecibels = -100;
  public maxDecibels = -30;
  public smoothingTimeConstant = 0.8;

  getFloatFrequencyData(array: Float32Array): void {
    // Generate realistic frequency data
    for (let i = 0; i < array.length; i++) {
      const frequency = (i / array.length) * (this.context.sampleRate / 2);
      const amplitude = this.generateFrequencyAmplitude(frequency);
      array[i] = this.minDecibels + (amplitude * (this.maxDecibels - this.minDecibels));
    }
  }

  getFloatTimeDomainData(array: Float32Array): void {
    // Generate realistic waveform data
    const time = Date.now() / 1000;
    for (let i = 0; i < array.length; i++) {
      const t = (i / array.length) + time;
      array[i] = (
        Math.sin(t * 440 * 2 * Math.PI) * 0.3 +
        Math.sin(t * 880 * 2 * Math.PI) * 0.2 +
        (Math.random() - 0.5) * 0.1
      );
    }
  }

  getByteFrequencyData(array: Uint8Array): void {
    const floatArray = new Float32Array(array.length);
    this.getFloatFrequencyData(floatArray);
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.max(0, Math.min(255, (floatArray[i] - this.minDecibels) * 255 / (this.maxDecibels - this.minDecibels)));
    }
  }

  getByteTimeDomainData(array: Uint8Array): void {
    const floatArray = new Float32Array(array.length);
    this.getFloatTimeDomainData(floatArray);
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.max(0, Math.min(255, (floatArray[i] + 1) * 127.5));
    }
  }

  private generateFrequencyAmplitude(frequency: number): number {
    // Simulate human voice frequency response
    if (frequency < 80) return 0.1;
    if (frequency < 300) return 0.3 + Math.random() * 0.2;
    if (frequency < 3000) return 0.6 + Math.random() * 0.3;
    if (frequency < 8000) return 0.4 + Math.random() * 0.2;
    return 0.1 + Math.random() * 0.1;
  }
}

// Mock MediaStreamAudioSourceNode
class MockMediaStreamAudioSourceNode extends MockAudioNode {
  public mediaStream: MediaStream;

  constructor(stream: MediaStream) {
    super();
    this.mediaStream = stream;
  }
}

// Mock AudioDestinationNode
class MockAudioDestinationNode extends MockAudioNode {
  public maxChannelCount = 2;
}

// Mock GainNode
class MockGainNode extends MockAudioNode {
  public gain = { value: 1 };
}

// Mock ScriptProcessorNode
class MockScriptProcessorNode extends MockAudioNode {
  public bufferSize: number;
  public onaudioprocess: ((event: AudioProcessingEvent) => void) | null = null;

  constructor(bufferSize: number, inputChannels: number, outputChannels: number) {
    super();
    this.bufferSize = bufferSize;
    this.numberOfInputs = inputChannels;
    this.numberOfOutputs = outputChannels;
  }
}

// Mock MediaRecorder Implementation
class MockMediaRecorder implements Partial<MediaRecorder> {
  private static instanceCount = 0;
  public readonly id: string;
  public stream: MediaStream;
  public mimeType: string;
  public state: RecordingState = 'inactive';
  public ondataavailable: ((event: BlobEvent) => void) | null = null;
  public onerror: ((event: MediaRecorderErrorEvent) => void) | null = null;
  public onstop: (() => void) | null = null;
  public onstart: (() => void) | null = null;
  public onpause: (() => void) | null = null;
  public onresume: (() => void) | null = null;

  private timeslice?: number;
  private dataInterval?: NodeJS.Timeout;
  private chunks: Blob[] = [];

  constructor(stream: MediaStream, options: MediaRecorderOptions = {}) {
    this.id = `mock-media-recorder-${++MockMediaRecorder.instanceCount}`;
    this.stream = stream;
    this.mimeType = options.mimeType || 'audio/webm';
    mockState.mediaRecorder.instances.set(this.id, this);
  }

  start(timeslice?: number): void {
    if (this.state !== 'inactive') {
      throw new Error('Invalid state error');
    }

    this.state = 'recording';
    this.timeslice = timeslice;
    this.chunks = [];

    if (this.onstart) {
      this.onstart();
    }

    // Simulate data generation
    if (timeslice) {
      this.dataInterval = setInterval(() => {
        this.generateMockData();
      }, timeslice);
    }
  }

  stop(): void {
    if (this.state === 'inactive') {
      throw new Error('Invalid state error');
    }

    this.state = 'inactive';

    if (this.dataInterval) {
      clearInterval(this.dataInterval);
      this.dataInterval = undefined;
    }

    // Generate final chunk
    this.generateMockData();

    if (this.onstop) {
      this.onstop();
    }
  }

  pause(): void {
    if (this.state === 'recording') {
      this.state = 'paused';
      if (this.dataInterval) {
        clearInterval(this.dataInterval);
        this.dataInterval = undefined;
      }
      if (this.onpause) {
        this.onpause();
      }
    }
  }

  resume(): void {
    if (this.state === 'paused') {
      this.state = 'recording';
      if (this.timeslice) {
        this.dataInterval = setInterval(() => {
          this.generateMockData();
        }, this.timeslice);
      }
      if (this.onresume) {
        this.onresume();
      }
    }
  }

  requestData(): void {
    this.generateMockData();
  }

  private generateMockData(): void {
    // Generate realistic audio blob
    const size = Math.floor(Math.random() * 1000) + 500;
    const audioData = new Uint8Array(size);
    
    // Fill with mock audio data
    for (let i = 0; i < size; i++) {
      audioData[i] = Math.floor(Math.random() * 256);
    }

    const blob = new Blob([audioData], { type: this.mimeType });
    this.chunks.push(blob);

    if (this.ondataavailable) {
      const event = new BlobEvent('dataavailable', { data: blob });
      this.ondataavailable(event);
    }
  }

  static isTypeSupported(mimeType: string): boolean {
    return mockState.mediaRecorder.supportedMimeTypes.includes(mimeType);
  }
}

// Mock Audio Devices
const createMockAudioDevices = (): MockAudioDevice[] => [
  {
    deviceId: 'default-microphone',
    label: 'Default Microphone',
    kind: 'audioinput',
    quality: 'high',
    noiseLevel: 0.02,
    latency: 10,
    sampleRates: [16000, 44100, 48000],
    channelCount: 1,
    isDefault: true,
    isConnected: true,
  },
  {
    deviceId: 'external-microphone',
    label: 'External USB Microphone',
    kind: 'audioinput',
    quality: 'high',
    noiseLevel: 0.01,
    latency: 5,
    sampleRates: [16000, 44100, 48000, 96000],
    channelCount: 2,
    isDefault: false,
    isConnected: true,
  },
  {
    deviceId: 'laptop-microphone',
    label: 'Built-in Microphone',
    kind: 'audioinput',
    quality: 'medium',
    noiseLevel: 0.05,
    latency: 15,
    sampleRates: [16000, 44100],
    channelCount: 1,
    isDefault: false,
    isConnected: true,
  },
  {
    deviceId: 'bluetooth-headset',
    label: 'Bluetooth Headset',
    kind: 'audioinput',
    quality: 'low',
    noiseLevel: 0.08,
    latency: 25,
    sampleRates: [16000, 44100],
    channelCount: 1,
    isDefault: false,
    isConnected: false,
  },
];

// Mock ElevenLabs API
interface MockElevenLabsResponse {
  status: number;
  headers: Record<string, string>;
  arrayBuffer(): Promise<ArrayBuffer>;
  json(): Promise<any>;
}

const createMockElevenLabsResponse = (
  request: any,
  simulateError: boolean = false
): MockElevenLabsResponse => {
  if (simulateError) {
    throw new Error('ElevenLabs API Error: Rate limit exceeded');
  }

  const textLength = request.text?.length || 100;
  const audioSize = textLength * 50; // Simulate audio size based on text length
  const audioData = new ArrayBuffer(audioSize);

  return {
    status: 200,
    headers: {
      'content-type': 'audio/mpeg',
      'x-character-cost': textLength.toString(),
      'x-character-limit': '2500',
    },
    arrayBuffer: () => Promise.resolve(audioData),
    json: () => Promise.resolve({ success: true }),
  };
};

// Mock API Functions
export const mockWebAudioAPI = (): void => {
  global.AudioContext = MockAudioContext as any;
  global.webkitAudioContext = MockAudioContext as any;
  
  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: {
      getUserMedia: jest.fn().mockImplementation(async (constraints: MediaStreamConstraints) => {
        if (mockState.audioDevices.permissions === 'denied') {
          throw new Error('Permission denied');
        }

        const mockStream = {
          getTracks: () => [{
            stop: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
          }],
          getAudioTracks: () => [{
            stop: jest.fn(),
            getSettings: () => ({
              sampleRate: constraints.audio?.sampleRate || 44100,
              echoCancellation: constraints.audio?.echoCancellation || true,
              noiseSuppression: constraints.audio?.noiseSuppression || true,
            }),
          }],
        };

        return mockStream as MediaStream;
      }),
      enumerateDevices: jest.fn().mockResolvedValue(mockState.audioDevices.devices),
    },
    writable: true,
  });

  Object.defineProperty(global.navigator, 'permissions', {
    value: {
      query: jest.fn().mockImplementation(async (permission: { name: string }) => {
        if (permission.name === 'microphone') {
          return { state: mockState.audioDevices.permissions };
        }
        return { state: 'granted' };
      }),
    },
    writable: true,
  });
};

export const mockMediaRecorder = (): void => {
  global.MediaRecorder = MockMediaRecorder as any;
  Object.defineProperty(global.MediaRecorder, 'isTypeSupported', {
    value: MockMediaRecorder.isTypeSupported,
  });
};

export const mockElevenLabsAPI = (): void => {
  const originalFetch = global.fetch;
  
  global.fetch = jest.fn().mockImplementation(async (url: string, options: RequestInit = {}) => {
    if (typeof url === 'string' && url.includes('elevenlabs.io')) {
      const request = {
        url,
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body ? JSON.parse(options.body as string) : null,
      };

      mockState.elevenLabs.requestHistory.push({
        timestamp: Date.now(),
        request,
        response: null,
      });

      // Simulate rate limiting
      if (mockState.elevenLabs.rateLimitRemaining <= 0) {
        return createMockElevenLabsResponse(request, true);
      }

      mockState.elevenLabs.rateLimitRemaining--;
      return createMockElevenLabsResponse(request);
    }

    return originalFetch(url, options);
  });
};

export const mockAudioDevices = (): void => {
  mockState.audioDevices.devices = createMockAudioDevices();
  mockState.audioDevices.activeDevice = mockState.audioDevices.devices[0];
};

// Mock Configuration Functions
export const setMockPermissions = (state: PermissionState): void => {
  mockState.audioDevices.permissions = state;
};

export const setMockDeviceQuality = (deviceId: string, quality: 'high' | 'medium' | 'low'): void => {
  const device = mockState.audioDevices.devices.find(d => d.deviceId === deviceId);
  if (device) {
    device.quality = quality;
  }
};

export const simulateDeviceDisconnection = (deviceId: string): void => {
  const device = mockState.audioDevices.devices.find(d => d.deviceId === deviceId);
  if (device) {
    device.isConnected = false;
  }
};

export const simulateNetworkLatency = (ms: number): void => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockImplementation(async (...args) => {
    await new Promise(resolve => setTimeout(resolve, ms));
    return originalFetch(...args);
  });
};

export const setElevenLabsRateLimit = (remaining: number): void => {
  mockState.elevenLabs.rateLimitRemaining = remaining;
};

// Reset Functions
export const resetAllMocks = (): void => {
  mockState.webAudioAPI.contexts.clear();
  mockState.mediaRecorder.instances.clear();
  mockState.elevenLabs.requestHistory = [];
  mockState.elevenLabs.rateLimitRemaining = 1000;
  mockState.audioDevices.permissions = 'granted';
  mockState.audioDevices.devices = createMockAudioDevices();
  
  jest.clearAllMocks();
};

export const resetWebAudioMocks = (): void => {
  mockState.webAudioAPI.contexts.clear();
};

export const resetMediaRecorderMocks = (): void => {
  mockState.mediaRecorder.instances.clear();
};

export const resetElevenLabsMocks = (): void => {
  mockState.elevenLabs.requestHistory = [];
  mockState.elevenLabs.rateLimitRemaining = 1000;
};

// Utility Functions
export const getMockState = (): MockState => mockState;

export const getActiveAudioContexts = (): MockAudioContext[] => 
  Array.from(mockState.webAudioAPI.contexts.values());

export const getMediaRecorderInstances = (): MockMediaRecorder[] =>
  Array.from(mockState.mediaRecorder.instances.values());

export const getElevenLabsRequestHistory = () => mockState.elevenLabs.requestHistory;

export const getMockAudioDevices = (): MockAudioDevice[] => mockState.audioDevices.devices;

// Export types for testing
export type { MockAudioDevice, MockAudioContext, MockMediaRecorder, MockState };