/**
 * Audio Waveform Generation Module
 * Generates realistic audio waveforms for testing purposes
 */

const crypto = require('crypto');

// Audio format constants
const FORMATS = {
  wav: { 
    mimeType: 'audio/wav',
    extension: '.wav',
    headerSize: 44,
  },
  mp3: {
    mimeType: 'audio/mpeg', 
    extension: '.mp3',
    headerSize: 0,
  },
  raw: {
    mimeType: 'application/octet-stream',
    extension: '.raw',
    headerSize: 0,
  },
};

// Waveform generation functions
const waveformGenerators = {
  sine: (t, frequency, amplitude) => amplitude * Math.sin(2 * Math.PI * frequency * t),
  
  square: (t, frequency, amplitude) => amplitude * Math.sign(Math.sin(2 * Math.PI * frequency * t)),
  
  triangle: (t, frequency, amplitude) => amplitude * (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * frequency * t)),
  
  sawtooth: (t, frequency, amplitude) => amplitude * 2 * (t * frequency - Math.floor(t * frequency + 0.5)),
  
  noise: (t, frequency, amplitude) => amplitude * (Math.random() - 0.5) * 2,
  
  voice: (t, frequency, amplitude) => {
    // Simulate human voice with multiple formants
    const fundamentalFreq = frequency || 150; // Typical human voice fundamental
    
    // Formant frequencies for vowel-like sounds
    const formants = [
      { freq: fundamentalFreq, amp: 1.0 },
      { freq: fundamentalFreq * 2, amp: 0.5 },
      { freq: fundamentalFreq * 3, amp: 0.3 },
      { freq: fundamentalFreq * 4, amp: 0.2 },
      { freq: fundamentalFreq * 5, amp: 0.1 },
    ];
    
    let sample = 0;
    formants.forEach(formant => {
      sample += formant.amp * Math.sin(2 * Math.PI * formant.freq * t);
    });
    
    // Add vibrato (slight frequency modulation)
    const vibrato = 1 + 0.05 * Math.sin(2 * Math.PI * 5 * t);
    sample *= vibrato;
    
    // Add breath noise
    sample += (Math.random() - 0.5) * 0.02;
    
    // Apply envelope for natural speech
    const envelopeValue = generateSpeechEnvelope(t % 1); // 1-second cycles
    sample *= envelopeValue;
    
    return amplitude * sample * 0.3; // Normalize
  },
};

// Generate speech envelope for natural-sounding voice
function generateSpeechEnvelope(t) {
  // Create a more natural speech pattern
  const attackTime = 0.02;  // 20ms attack
  const decayTime = 0.1;    // 100ms decay
  const sustainLevel = 0.8; // 80% sustain level
  const releaseTime = 0.05; // 50ms release
  
  if (t < attackTime) {
    return t / attackTime;
  } else if (t < attackTime + decayTime) {
    const decayProgress = (t - attackTime) / decayTime;
    return 1 - (1 - sustainLevel) * decayProgress;
  } else if (t < 1 - releaseTime) {
    // Add natural speech modulation during sustain
    const modulation = 1 + 0.1 * Math.sin(t * 20 * Math.PI);
    return sustainLevel * modulation;
  } else {
    const releaseProgress = (t - (1 - releaseTime)) / releaseTime;
    return sustainLevel * (1 - releaseProgress);
  }
}

// Apply quality variations to audio
function applyQualityVariations(samples, quality) {
  const result = new Float32Array(samples.length);
  
  switch (quality) {
    case 'high':
      // Minimal processing for high quality
      for (let i = 0; i < samples.length; i++) {
        result[i] = samples[i] + (Math.random() - 0.5) * 0.001; // Very low noise
      }
      break;
      
    case 'medium':
      // Apply moderate compression and noise
      for (let i = 0; i < samples.length; i++) {
        let sample = samples[i];
        
        // Light compression
        sample = Math.sign(sample) * Math.pow(Math.abs(sample), 0.8);
        
        // Add moderate noise
        sample += (Math.random() - 0.5) * 0.01;
        
        // Apply light low-pass filtering
        if (i > 0) {
          sample = 0.7 * sample + 0.3 * result[i - 1];
        }
        
        result[i] = sample;
      }
      break;
      
    case 'low':
      // Apply heavy compression, noise, and filtering
      for (let i = 0; i < samples.length; i++) {
        let sample = samples[i];
        
        // Heavy compression
        sample = Math.sign(sample) * Math.pow(Math.abs(sample), 0.5);
        
        // Add significant noise
        sample += (Math.random() - 0.5) * 0.05;
        
        // Apply aggressive low-pass filtering
        if (i > 2) {
          sample = 0.4 * sample + 0.3 * result[i - 1] + 0.2 * result[i - 2] + 0.1 * result[i - 3];
        }
        
        // Simulate occasional dropouts
        if (Math.random() < 0.001) {
          sample *= 0.1;
        }
        
        result[i] = Math.max(-0.8, Math.min(0.8, sample)); // Limit dynamic range
      }
      break;
      
    case 'noisy':
      // Add heavy noise and interference
      for (let i = 0; i < samples.length; i++) {
        let sample = samples[i];
        
        // Add heavy noise
        sample += (Math.random() - 0.5) * 0.1;
        
        // Add interference patterns
        sample += 0.02 * Math.sin(i * 0.01); // 60Hz hum simulation
        sample += 0.01 * Math.sin(i * 0.001); // Low frequency rumble
        
        // Random clicks and pops
        if (Math.random() < 0.0005) {
          sample += (Math.random() - 0.5) * 0.5;
        }
        
        result[i] = sample;
      }
      break;
      
    default:
      return samples;
  }
  
  return result;
}

// Create WAV file header
function createWavHeader(sampleRate, numChannels, numSamples, bitsPerSample = 16) {
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const subchunk2Size = numSamples * numChannels * bitsPerSample / 8;
  const chunkSize = 36 + subchunk2Size;
  
  const header = Buffer.alloc(44);
  let offset = 0;
  
  // RIFF header
  header.write('RIFF', offset); offset += 4;
  header.writeUInt32LE(chunkSize, offset); offset += 4;
  header.write('WAVE', offset); offset += 4;
  
  // fmt subchunk
  header.write('fmt ', offset); offset += 4;
  header.writeUInt32LE(16, offset); offset += 4; // Subchunk1Size
  header.writeUInt16LE(1, offset); offset += 2;  // AudioFormat (PCM)
  header.writeUInt16LE(numChannels, offset); offset += 2;
  header.writeUInt32LE(sampleRate, offset); offset += 4;
  header.writeUInt32LE(byteRate, offset); offset += 4;
  header.writeUInt16LE(blockAlign, offset); offset += 2;
  header.writeUInt16LE(bitsPerSample, offset); offset += 2;
  
  // data subchunk
  header.write('data', offset); offset += 4;
  header.writeUInt32LE(subchunk2Size, offset);
  
  return header;
}

// Convert Float32Array to 16-bit PCM
function float32To16BitPCM(samples) {
  const buffer = Buffer.alloc(samples.length * 2);
  let offset = 0;
  
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i])); // Clamp to [-1, 1]
    const intSample = Math.round(sample * 32767);
    buffer.writeInt16LE(intSample, offset);
    offset += 2;
  }
  
  return buffer;
}

// Main audio generation function
async function generateAudioWaveform(config) {
  const {
    duration = 1000,
    sampleRate = 16000,
    frequency = 440,
    amplitude = 0.5,
    waveform = 'sine',
    noiseLevel = 0.01,
    quality = 'high',
    format = 'wav',
    metadata = {},
  } = config;
  
  // Validate parameters
  if (duration < 100 || duration > 300000) { // 100ms to 5 minutes
    throw new Error('Duration must be between 100ms and 5 minutes');
  }
  
  if (sampleRate < 8000 || sampleRate > 96000) {
    throw new Error('Sample rate must be between 8kHz and 96kHz');
  }
  
  if (!waveformGenerators[waveform]) {
    throw new Error(`Unsupported waveform: ${waveform}. Supported: ${Object.keys(waveformGenerators).join(', ')}`);
  }
  
  // Calculate sample count
  const sampleCount = Math.floor((duration / 1000) * sampleRate);
  const samples = new Float32Array(sampleCount);
  const generator = waveformGenerators[waveform];
  
  // Generate base waveform
  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleRate;
    samples[i] = generator(t, frequency, amplitude);
    
    // Add noise
    samples[i] += (Math.random() - 0.5) * noiseLevel;
  }
  
  // Apply quality variations
  const processedSamples = applyQualityVariations(samples, quality);
  
  // Apply envelope for smooth start/end
  const fadeLength = Math.min(sampleCount / 20, sampleRate * 0.01); // 1% fade or 10ms max
  for (let i = 0; i < fadeLength; i++) {
    const fadeIn = i / fadeLength;
    const fadeOut = (sampleCount - 1 - i) / fadeLength;
    
    if (i < fadeLength) {
      processedSamples[i] *= fadeIn;
    }
    if (i >= sampleCount - fadeLength) {
      processedSamples[i] *= fadeOut;
    }
  }
  
  // Convert to requested format
  switch (format) {
    case 'wav':
      const pcmData = float32To16BitPCM(processedSamples);
      const wavHeader = createWavHeader(sampleRate, 1, sampleCount, 16);
      return Buffer.concat([wavHeader, pcmData]);
      
    case 'raw':
      return Buffer.from(processedSamples.buffer);
      
    case 'mp3':
      // For testing purposes, return raw PCM data with MP3 marker
      // In production, you'd use a proper MP3 encoder
      const mp3Data = float32To16BitPCM(processedSamples);
      return Buffer.concat([Buffer.from('MP3_SIMULATION'), mp3Data]);
      
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

// Audio analysis function
async function analyzeAudio(audioBuffer, options = {}) {
  const {
    includeSpectrum = true,
    includeFeatures = true,
    includeVAD = true,
    vadThreshold = 0.01,
  } = options;
  
  // Parse audio data (assuming 16-bit PCM WAV for simplicity)
  let samples;
  let sampleRate = 16000; // Default
  
  if (audioBuffer.length > 44 && audioBuffer.toString('ascii', 0, 4) === 'RIFF') {
    // WAV file detected
    sampleRate = audioBuffer.readUInt32LE(24);
    const dataStart = 44; // Skip WAV header
    const pcmData = audioBuffer.slice(dataStart);
    
    samples = new Float32Array(pcmData.length / 2);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = pcmData.readInt16LE(i * 2) / 32768; // Convert to [-1, 1]
    }
  } else {
    // Assume raw 16-bit PCM
    samples = new Float32Array(audioBuffer.length / 2);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = audioBuffer.readInt16LE(i * 2) / 32768;
    }
  }
  
  const analysis = {
    duration: samples.length / sampleRate,
    sampleRate,
    sampleCount: samples.length,
  };
  
  if (includeFeatures) {
    analysis.features = calculateAudioFeatures(samples, sampleRate);
  }
  
  if (includeSpectrum) {
    analysis.spectrum = calculateSpectrum(samples);
  }
  
  if (includeVAD) {
    analysis.voiceActivity = detectVoiceActivity(samples, vadThreshold);
  }
  
  return analysis;
}

// Calculate audio features
function calculateAudioFeatures(samples, sampleRate) {
  // RMS (Root Mean Square)
  const rms = Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);
  
  // Peak amplitude
  const peak = Math.max(...samples.map(Math.abs));
  
  // Crest factor
  const crestFactor = peak / rms;
  
  // Zero crossing rate
  let zeroCrossings = 0;
  for (let i = 1; i < samples.length; i++) {
    if (Math.sign(samples[i]) !== Math.sign(samples[i - 1])) {
      zeroCrossings++;
    }
  }
  const zeroCrossingRate = zeroCrossings / samples.length;
  
  // Dynamic range
  const minAmplitude = Math.min(...samples.map(s => Math.abs(s) || 0.0001));
  const dynamicRange = 20 * Math.log10(peak / minAmplitude);
  
  // Signal-to-noise ratio (estimate)
  const signal = samples.filter(s => Math.abs(s) > rms * 0.1);
  const noise = samples.filter(s => Math.abs(s) <= rms * 0.1);
  const signalPower = signal.reduce((sum, s) => sum + s * s, 0) / signal.length;
  const noisePower = noise.reduce((sum, s) => sum + s * s, 0) / noise.length;
  const snr = 10 * Math.log10(signalPower / (noisePower || 0.0001));
  
  // Total Harmonic Distortion (THD) estimate
  const fundamentalFreq = estimateFundamentalFrequency(samples, sampleRate);
  const thd = estimateTHD(samples, sampleRate, fundamentalFreq);
  
  return {
    rms,
    peak,
    crestFactor,
    zeroCrossingRate,
    dynamicRange,
    snr,
    thd,
    fundamentalFrequency: fundamentalFreq,
  };
}

// Simple FFT implementation for spectrum analysis
function calculateSpectrum(samples) {
  const N = Math.pow(2, Math.floor(Math.log2(samples.length))); // Next power of 2
  const fftInput = samples.slice(0, N);
  
  // Apply window function (Hann window)
  for (let i = 0; i < N; i++) {
    fftInput[i] *= 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1)));
  }
  
  // Simplified magnitude spectrum (not full FFT)
  const spectrum = new Float32Array(N / 2);
  for (let k = 0; k < N / 2; k++) {
    let real = 0, imag = 0;
    for (let n = 0; n < N; n++) {
      const angle = -2 * Math.PI * k * n / N;
      real += fftInput[n] * Math.cos(angle);
      imag += fftInput[n] * Math.sin(angle);
    }
    spectrum[k] = Math.sqrt(real * real + imag * imag) / N;
  }
  
  return Array.from(spectrum);
}

// Voice activity detection
function detectVoiceActivity(samples, threshold) {
  const windowSize = 160; // 10ms at 16kHz
  const activity = [];
  
  for (let i = 0; i < samples.length; i += windowSize) {
    const window = samples.slice(i, i + windowSize);
    const energy = window.reduce((sum, sample) => sum + sample * sample, 0) / window.length;
    const isActive = Math.sqrt(energy) > threshold;
    
    activity.push({
      startTime: i / 16000, // Assume 16kHz
      endTime: (i + windowSize) / 16000,
      isActive,
      energy: Math.sqrt(energy),
    });
  }
  
  return activity;
}

// Estimate fundamental frequency using autocorrelation
function estimateFundamentalFrequency(samples, sampleRate) {
  const minPeriod = Math.floor(sampleRate / 800); // 800 Hz max
  const maxPeriod = Math.floor(sampleRate / 80);  // 80 Hz min
  
  let maxCorrelation = 0;
  let bestPeriod = minPeriod;
  
  for (let period = minPeriod; period <= maxPeriod; period++) {
    let correlation = 0;
    const windowSize = Math.min(samples.length - period, 1024);
    
    for (let i = 0; i < windowSize; i++) {
      correlation += samples[i] * samples[i + period];
    }
    
    if (correlation > maxCorrelation) {
      maxCorrelation = correlation;
      bestPeriod = period;
    }
  }
  
  return sampleRate / bestPeriod;
}

// Estimate Total Harmonic Distortion
function estimateTHD(samples, sampleRate, fundamentalFreq) {
  // Simplified THD calculation
  const spectrum = calculateSpectrum(samples);
  const binWidth = sampleRate / (spectrum.length * 2);
  
  const fundamentalBin = Math.round(fundamentalFreq / binWidth);
  const fundamentalMagnitude = spectrum[fundamentalBin] || 0;
  
  let harmonicSum = 0;
  for (let harmonic = 2; harmonic <= 10; harmonic++) {
    const harmonicBin = Math.round((fundamentalFreq * harmonic) / binWidth);
    if (harmonicBin < spectrum.length) {
      harmonicSum += Math.pow(spectrum[harmonicBin], 2);
    }
  }
  
  return Math.sqrt(harmonicSum) / (fundamentalMagnitude || 1);
}

module.exports = {
  generateAudioWaveform,
  analyzeAudio,
  calculateAudioFeatures,
  calculateSpectrum,
  detectVoiceActivity,
  waveformGenerators,
  FORMATS,
};