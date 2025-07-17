/**
 * Audio Device Simulation Module
 * Simulates various audio devices and their capabilities for testing
 */

const crypto = require('crypto');
const { generateAudioWaveform, analyzeAudio } = require('./audio-generator');

// Device quality profiles
const QUALITY_PROFILES = {
  high: {
    noiseFloor: 0.001,
    frequencyResponse: { low: 0.95, mid: 1.0, high: 0.98 },
    dynamicRange: 96, // dB
    thd: 0.001, // 0.1%
    latency: 5, // ms
    dropoutRate: 0.0001,
    jitter: 0.5, // ms
  },
  medium: {
    noiseFloor: 0.01,
    frequencyResponse: { low: 0.9, mid: 1.0, high: 0.85 },
    dynamicRange: 72, // dB
    thd: 0.01, // 1%
    latency: 15, // ms
    dropoutRate: 0.001,
    jitter: 2, // ms
  },
  low: {
    noiseFloor: 0.05,
    frequencyResponse: { low: 0.7, mid: 0.9, high: 0.6 },
    dynamicRange: 48, // dB
    thd: 0.05, // 5%
    latency: 50, // ms
    dropoutRate: 0.01,
    jitter: 10, // ms
  },
  unstable: {
    noiseFloor: 0.1,
    frequencyResponse: { low: 0.5, mid: 0.8, high: 0.4 },
    dynamicRange: 36, // dB
    thd: 0.1, // 10%
    latency: 100, // ms
    dropoutRate: 0.05,
    jitter: 25, // ms
  },
};

// Device type definitions
const DEVICE_TYPES = {
  microphone: {
    name: 'Microphone',
    capabilities: ['record'],
    defaultSampleRates: [16000, 44100, 48000],
    defaultChannels: [1, 2],
  },
  speaker: {
    name: 'Speaker', 
    capabilities: ['playback'],
    defaultSampleRates: [44100, 48000, 96000],
    defaultChannels: [2, 5.1, 7.1],
  },
  headset: {
    name: 'Headset',
    capabilities: ['record', 'playback'],
    defaultSampleRates: [16000, 44100, 48000],
    defaultChannels: [1, 2],
  },
  usbMicrophone: {
    name: 'USB Microphone',
    capabilities: ['record'],
    defaultSampleRates: [16000, 44100, 48000, 96000],
    defaultChannels: [1, 2],
  },
  bluetoothHeadset: {
    name: 'Bluetooth Headset',
    capabilities: ['record', 'playback'],
    defaultSampleRates: [16000, 44100],
    defaultChannels: [1, 2],
  },
  webcamMicrophone: {
    name: 'Webcam Microphone',
    capabilities: ['record'],
    defaultSampleRates: [16000, 44100],
    defaultChannels: [1],
  },
};

// Global device registry
const deviceRegistry = new Map();

// Generate realistic device characteristics
function generateDeviceCharacteristics(type, quality) {
  const deviceType = DEVICE_TYPES[type] || DEVICE_TYPES.microphone;
  const qualityProfile = QUALITY_PROFILES[quality] || QUALITY_PROFILES.medium;
  
  return {
    type,
    quality,
    capabilities: deviceType.capabilities,
    sampleRates: deviceType.defaultSampleRates,
    channelCounts: deviceType.defaultChannels,
    characteristics: {
      ...qualityProfile,
      // Add some randomness for realism
      noiseFloor: qualityProfile.noiseFloor * (0.5 + Math.random()),
      latency: qualityProfile.latency + (Math.random() - 0.5) * qualityProfile.latency * 0.2,
      dropoutRate: qualityProfile.dropoutRate * (0.5 + Math.random()),
    },
  };
}

// Create virtual audio device
async function createVirtualDevice(config) {
  const {
    name = 'Virtual Audio Device',
    type = 'microphone',
    quality = 'medium',
    latency = 10,
    noiseLevel = 0.02,
    dropoutRate = 0.001,
    sampleRates = [16000, 44100],
    channelCount = 1,
    customCharacteristics = {},
  } = config;
  
  const deviceId = crypto.randomUUID();
  const characteristics = generateDeviceCharacteristics(type, quality);
  
  const device = {
    id: deviceId,
    name,
    type,
    quality,
    isVirtual: true,
    isConnected: true,
    isDefault: false,
    characteristics: {
      ...characteristics.characteristics,
      latency,
      noiseFloor: noiseLevel,
      dropoutRate,
      ...customCharacteristics,
    },
    capabilities: characteristics.capabilities,
    supportedSampleRates: sampleRates,
    supportedChannelCounts: channelCount ? [channelCount] : [1],
    metadata: {
      createdAt: new Date().toISOString(),
      vendor: 'Virtual Audio Simulator',
      driver: 'simulator-v1.0',
      firmwareVersion: '1.0.0',
    },
  };
  
  deviceRegistry.set(deviceId, device);
  return device;
}

// Simulate device capabilities
async function simulateDeviceCapabilities() {
  const commonDevices = [
    {
      name: 'Built-in Microphone',
      type: 'microphone',
      quality: 'medium',
      isDefault: true,
    },
    {
      name: 'Built-in Speakers',
      type: 'speaker',
      quality: 'medium',
      isDefault: true,
    },
    {
      name: 'USB Headset Pro',
      type: 'headset',
      quality: 'high',
      isDefault: false,
    },
    {
      name: 'Bluetooth AirPods',
      type: 'bluetoothHeadset',
      quality: 'medium',
      isDefault: false,
    },
    {
      name: 'Studio Microphone USB',
      type: 'usbMicrophone',
      quality: 'high',
      isDefault: false,
    },
    {
      name: 'Webcam Integrated Mic',
      type: 'webcamMicrophone',
      quality: 'low',
      isDefault: false,
    },
  ];
  
  const devices = [];
  
  for (const deviceConfig of commonDevices) {
    const device = await createVirtualDevice(deviceConfig);
    devices.push(device);
  }
  
  return devices;
}

// Simulate audio device recording/playback
async function simulateAudioDevice(deviceId, config) {
  const {
    scenario = 'normal',
    duration = 5000,
    recordingSettings = {},
  } = config;
  
  const device = deviceRegistry.get(deviceId);
  if (!device) {
    throw new Error(`Device not found: ${deviceId}`);
  }
  
  const {
    sampleRate = 16000,
    channelCount = 1,
    format = 'wav',
  } = recordingSettings;
  
  // Validate device capabilities
  if (!device.supportedSampleRates.includes(sampleRate)) {
    throw new Error(`Sample rate ${sampleRate} not supported by device ${device.name}`);
  }
  
  if (!device.supportedChannelCounts.includes(channelCount)) {
    throw new Error(`Channel count ${channelCount} not supported by device ${device.name}`);
  }
  
  // Simulate different scenarios
  const scenarioConfigs = {
    normal: {
      amplitude: 0.5,
      noiseLevel: device.characteristics.noiseFloor,
      quality: device.quality,
      dropouts: false,
    },
    quiet: {
      amplitude: 0.1,
      noiseLevel: device.characteristics.noiseFloor,
      quality: device.quality,
      dropouts: false,
    },
    loud: {
      amplitude: 0.9,
      noiseLevel: device.characteristics.noiseFloor * 0.5,
      quality: device.quality,
      dropouts: false,
    },
    noisy: {
      amplitude: 0.5,
      noiseLevel: device.characteristics.noiseFloor * 10,
      quality: 'noisy',
      dropouts: false,
    },
    unstable: {
      amplitude: 0.3 + Math.random() * 0.4,
      noiseLevel: device.characteristics.noiseFloor * 5,
      quality: 'unstable',
      dropouts: true,
    },
    disconnected: {
      throw: new Error(`Device ${device.name} is disconnected`),
    },
    permission_denied: {
      throw: new Error(`Permission denied for device ${device.name}`),
    },
  };
  
  const scenarioConfig = scenarioConfigs[scenario];
  if (scenarioConfig.throw) {
    throw scenarioConfig.throw;
  }
  
  // Simulate device latency
  await new Promise(resolve => setTimeout(resolve, device.characteristics.latency));
  
  // Generate audio data based on scenario
  let audioData;
  try {
    audioData = await generateAudioWaveform({
      duration,
      sampleRate,
      waveform: 'voice',
      amplitude: scenarioConfig.amplitude,
      noiseLevel: scenarioConfig.noiseLevel,
      quality: scenarioConfig.quality,
      format,
    });
    
    // Apply device-specific characteristics
    audioData = applyDeviceCharacteristics(audioData, device, {
      sampleRate,
      channelCount,
      dropouts: scenarioConfig.dropouts,
    });
    
  } catch (error) {
    throw new Error(`Audio generation failed for device ${device.name}: ${error.message}`);
  }
  
  // Analyze the generated audio
  const analysis = await analyzeAudio(audioData);
  
  // Calculate device-specific metrics
  const deviceMetrics = calculateDeviceMetrics(analysis, device);
  
  return {
    deviceId,
    deviceName: device.name,
    scenario,
    duration,
    audioData: format === 'raw' ? Array.from(audioData) : audioData.toString('base64'),
    analysis,
    deviceMetrics,
    settings: {
      sampleRate,
      channelCount,
      format,
    },
    metadata: {
      simulatedAt: new Date().toISOString(),
      latency: device.characteristics.latency,
      quality: device.quality,
    },
  };
}

// Apply device-specific characteristics to audio
function applyDeviceCharacteristics(audioBuffer, device, options) {
  const { sampleRate, channelCount, dropouts } = options;
  
  // For WAV files, extract PCM data
  let samples;
  let dataStart = 0;
  
  if (audioBuffer.length > 44 && audioBuffer.toString('ascii', 0, 4) === 'RIFF') {
    dataStart = 44; // Skip WAV header
  }
  
  const pcmData = audioBuffer.slice(dataStart);
  samples = new Float32Array(pcmData.length / 2);
  
  for (let i = 0; i < samples.length; i++) {
    samples[i] = pcmData.readInt16LE(i * 2) / 32768;
  }
  
  // Apply frequency response
  samples = applyFrequencyResponse(samples, device.characteristics.frequencyResponse, sampleRate);
  
  // Apply THD
  samples = applyTHD(samples, device.characteristics.thd);
  
  // Apply jitter
  samples = applyJitter(samples, device.characteristics.jitter, sampleRate);
  
  // Apply dropouts if enabled
  if (dropouts) {
    samples = applyDropouts(samples, device.characteristics.dropoutRate);
  }
  
  // Convert back to PCM and reconstruct buffer
  const newPcmData = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    const intSample = Math.round(sample * 32767);
    newPcmData.writeInt16LE(intSample, i * 2);
  }
  
  if (dataStart > 0) {
    // Reconstruct WAV file
    return Buffer.concat([audioBuffer.slice(0, dataStart), newPcmData]);
  } else {
    return newPcmData;
  }
}

// Apply frequency response simulation
function applyFrequencyResponse(samples, response, sampleRate) {
  // Simple 3-band EQ simulation
  const result = new Float32Array(samples.length);
  
  // Low-pass filter for high frequencies
  let highState = 0;
  // Band-pass filter for mid frequencies  
  let midState1 = 0, midState2 = 0;
  // High-pass filter for low frequencies
  let lowState = 0;
  
  for (let i = 0; i < samples.length; i++) {
    const input = samples[i];
    
    // Simple IIR filters for frequency bands
    const alpha = 0.1; // Filter coefficient
    
    // Low frequency (< 300 Hz)
    lowState = alpha * input + (1 - alpha) * lowState;
    const lowComponent = lowState * response.low;
    
    // Mid frequency (300 Hz - 3 kHz)
    midState1 = alpha * (input - lowState) + (1 - alpha) * midState1;
    const midComponent = midState1 * response.mid;
    
    // High frequency (> 3 kHz)
    const highInput = input - lowState - midState1;
    highState = alpha * highInput + (1 - alpha) * highState;
    const highComponent = highState * response.high;
    
    result[i] = lowComponent + midComponent + highComponent;
  }
  
  return result;
}

// Apply Total Harmonic Distortion
function applyTHD(samples, thdLevel) {
  const result = new Float32Array(samples.length);
  
  for (let i = 0; i < samples.length; i++) {
    const input = samples[i];
    
    // Add harmonic distortion
    const distortion = thdLevel * (
      0.5 * Math.sign(input) * Math.pow(Math.abs(input), 2) + // 2nd harmonic
      0.3 * Math.sign(input) * Math.pow(Math.abs(input), 3) + // 3rd harmonic
      0.1 * Math.sign(input) * Math.pow(Math.abs(input), 4)   // 4th harmonic
    );
    
    result[i] = input + distortion;
  }
  
  return result;
}

// Apply timing jitter
function applyJitter(samples, jitterMs, sampleRate) {
  const maxJitterSamples = Math.floor((jitterMs / 1000) * sampleRate);
  if (maxJitterSamples < 1) return samples;
  
  const result = new Float32Array(samples.length);
  
  for (let i = 0; i < samples.length; i++) {
    const jitterOffset = Math.floor((Math.random() - 0.5) * 2 * maxJitterSamples);
    const sourceIndex = Math.max(0, Math.min(samples.length - 1, i + jitterOffset));
    result[i] = samples[sourceIndex];
  }
  
  return result;
}

// Apply audio dropouts
function applyDropouts(samples, dropoutRate) {
  const result = new Float32Array(samples.length);
  let inDropout = false;
  let dropoutRemaining = 0;
  
  for (let i = 0; i < samples.length; i++) {
    if (!inDropout && Math.random() < dropoutRate) {
      inDropout = true;
      dropoutRemaining = Math.floor(Math.random() * 100) + 10; // 10-110 samples dropout
    }
    
    if (inDropout) {
      result[i] = 0; // Complete silence during dropout
      dropoutRemaining--;
      if (dropoutRemaining <= 0) {
        inDropout = false;
      }
    } else {
      result[i] = samples[i];
    }
  }
  
  return result;
}

// Calculate device-specific performance metrics
function calculateDeviceMetrics(analysis, device) {
  const metrics = {
    overallScore: 0,
    latencyScore: 0,
    qualityScore: 0,
    reliabilityScore: 0,
    noiseScore: 0,
  };
  
  // Latency score (lower is better)
  const latency = device.characteristics.latency;
  metrics.latencyScore = Math.max(0, 100 - latency * 2); // 50ms = 0 points
  
  // Quality score based on THD and frequency response
  const thd = device.characteristics.thd;
  metrics.qualityScore = Math.max(0, 100 - thd * 1000); // 10% THD = 0 points
  
  // Reliability score based on dropout rate
  const dropoutRate = device.characteristics.dropoutRate;
  metrics.reliabilityScore = Math.max(0, 100 - dropoutRate * 10000); // 1% dropout = 0 points
  
  // Noise score based on noise floor
  const noiseFloor = device.characteristics.noiseFloor;
  metrics.noiseScore = Math.max(0, 100 - noiseFloor * 1000); // 10% noise = 0 points
  
  // Overall score (weighted average)
  metrics.overallScore = (
    metrics.latencyScore * 0.25 +
    metrics.qualityScore * 0.35 +
    metrics.reliabilityScore * 0.25 +
    metrics.noiseScore * 0.15
  );
  
  // Add analysis-based metrics
  if (analysis.features) {
    metrics.measuredSNR = analysis.features.snr;
    metrics.measuredTHD = analysis.features.thd;
    metrics.measuredDynamicRange = analysis.features.dynamicRange;
  }
  
  return metrics;
}

// Get device by ID
function getDevice(deviceId) {
  return deviceRegistry.get(deviceId);
}

// List all devices
function listDevices() {
  return Array.from(deviceRegistry.values());
}

// Remove device
function removeDevice(deviceId) {
  return deviceRegistry.delete(deviceId);
}

// Clear all devices
function clearDevices() {
  deviceRegistry.clear();
}

// Device connection simulation
function simulateDeviceConnection(deviceId, connected = true) {
  const device = deviceRegistry.get(deviceId);
  if (device) {
    device.isConnected = connected;
    return device;
  }
  throw new Error(`Device not found: ${deviceId}`);
}

// Device permission simulation
function simulateDevicePermission(deviceId, granted = true) {
  const device = deviceRegistry.get(deviceId);
  if (device) {
    device.permissionGranted = granted;
    return device;
  }
  throw new Error(`Device not found: ${deviceId}`);
}

module.exports = {
  createVirtualDevice,
  simulateDeviceCapabilities,
  simulateAudioDevice,
  generateDeviceCharacteristics,
  calculateDeviceMetrics,
  getDevice,
  listDevices,
  removeDevice,
  clearDevices,
  simulateDeviceConnection,
  simulateDevicePermission,
  QUALITY_PROFILES,
  DEVICE_TYPES,
};