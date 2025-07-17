/**
 * Audio Simulator Docker Service
 * Express server providing audio simulation APIs for testing
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { generateAudioWaveform, simulateAudioDevice, analyzeAudio } = require('./audio-generator');
const { simulateDeviceCapabilities, createVirtualDevice } = require('./device-simulator');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  },
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Audio Generation Endpoints
app.post('/api/audio/generate', async (req, res) => {
  try {
    const {
      duration = 1000,
      sampleRate = 16000,
      frequency = 440,
      amplitude = 0.5,
      waveform = 'sine',
      noiseLevel = 0.01,
      format = 'wav',
    } = req.body;

    // Validate parameters
    if (duration < 100 || duration > 60000) {
      return res.status(400).json({ error: 'Duration must be between 100ms and 60s' });
    }

    if (sampleRate < 8000 || sampleRate > 96000) {
      return res.status(400).json({ error: 'Sample rate must be between 8kHz and 96kHz' });
    }

    const audioData = await generateAudioWaveform({
      duration,
      sampleRate,
      frequency,
      amplitude,
      waveform,
      noiseLevel,
      format,
    });

    res.set({
      'Content-Type': `audio/${format}`,
      'Content-Length': audioData.length,
      'Cache-Control': 'no-cache',
    });

    res.send(audioData);
  } catch (error) {
    console.error('Audio generation error:', error);
    res.status(500).json({ error: 'Failed to generate audio', details: error.message });
  }
});

app.post('/api/audio/voice', async (req, res) => {
  try {
    const {
      text = 'Hello, this is a test voice message.',
      language = 'en-US',
      voice = 'neutral',
      speed = 1.0,
      pitch = 1.0,
      emotion = 'neutral',
      format = 'wav',
    } = req.body;

    if (!text || text.length > 1000) {
      return res.status(400).json({ error: 'Text must be provided and less than 1000 characters' });
    }

    const voiceAudio = await generateAudioWaveform({
      duration: Math.max(1000, text.length * 100), // ~100ms per character
      sampleRate: 22050,
      waveform: 'voice',
      amplitude: 0.6,
      format,
      metadata: {
        text,
        language,
        voice,
        speed,
        pitch,
        emotion,
      },
    });

    res.set({
      'Content-Type': `audio/${format}`,
      'Content-Length': voiceAudio.length,
      'X-Voice-Text-Length': text.length.toString(),
      'X-Voice-Duration': Math.floor(text.length * 100).toString(),
    });

    res.send(voiceAudio);
  } catch (error) {
    console.error('Voice generation error:', error);
    res.status(500).json({ error: 'Failed to generate voice audio', details: error.message });
  }
});

// Audio Analysis Endpoints
app.post('/api/audio/analyze', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const {
      includeSpectrum = true,
      includeFeatures = true,
      includeVAD = true,
      vadThreshold = 0.01,
    } = req.body;

    const analysis = await analyzeAudio(req.file.buffer, {
      includeSpectrum,
      includeFeatures,
      includeVAD,
      vadThreshold: parseFloat(vadThreshold),
    });

    res.json({
      success: true,
      analysis,
      metadata: {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        processedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Audio analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze audio', details: error.message });
  }
});

app.post('/api/audio/quality-test', async (req, res) => {
  try {
    const {
      qualities = ['high', 'medium', 'low', 'noisy'],
      duration = 3000,
      sampleRate = 16000,
    } = req.body;

    const qualityTests = {};

    for (const quality of qualities) {
      const audioData = await generateAudioWaveform({
        duration,
        sampleRate,
        waveform: 'voice',
        amplitude: 0.6,
        quality,
        format: 'wav',
      });

      const analysis = await analyzeAudio(audioData, {
        includeSpectrum: false,
        includeFeatures: true,
        includeVAD: true,
      });

      qualityTests[quality] = {
        audioSize: audioData.length,
        analysis: analysis.features,
        snr: analysis.features.snr,
        thd: analysis.features.thd,
        dynamicRange: analysis.features.dynamicRange,
      };
    }

    res.json({
      success: true,
      qualityTests,
      metadata: {
        testCount: qualities.length,
        duration,
        sampleRate,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Quality test error:', error);
    res.status(500).json({ error: 'Failed to run quality tests', details: error.message });
  }
});

// Device Simulation Endpoints
app.get('/api/devices', async (req, res) => {
  try {
    const devices = await simulateDeviceCapabilities();
    res.json({
      success: true,
      devices,
      count: devices.length,
    });
  } catch (error) {
    console.error('Device listing error:', error);
    res.status(500).json({ error: 'Failed to list devices', details: error.message });
  }
});

app.post('/api/devices/virtual', async (req, res) => {
  try {
    const {
      name = 'Virtual Audio Device',
      type = 'microphone',
      quality = 'medium',
      latency = 10,
      noiseLevel = 0.02,
      dropoutRate = 0.001,
      sampleRates = [16000, 44100],
      channelCount = 1,
    } = req.body;

    const device = await createVirtualDevice({
      name,
      type,
      quality,
      latency,
      noiseLevel,
      dropoutRate,
      sampleRates,
      channelCount,
    });

    res.json({
      success: true,
      device,
      message: 'Virtual device created successfully',
    });
  } catch (error) {
    console.error('Virtual device creation error:', error);
    res.status(500).json({ error: 'Failed to create virtual device', details: error.message });
  }
});

app.post('/api/devices/:deviceId/simulate', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const {
      scenario = 'normal',
      duration = 5000,
      recordingSettings = {},
    } = req.body;

    const simulationResult = await simulateAudioDevice(deviceId, {
      scenario,
      duration,
      recordingSettings,
    });

    res.json({
      success: true,
      deviceId,
      scenario,
      result: simulationResult,
    });
  } catch (error) {
    console.error('Device simulation error:', error);
    res.status(500).json({ error: 'Failed to simulate device', details: error.message });
  }
});

// Performance Testing Endpoints
app.post('/api/performance/latency', async (req, res) => {
  try {
    const {
      iterations = 10,
      audioSize = 16000, // 1 second at 16kHz
      operations = ['generate', 'analyze'],
    } = req.body;

    const results = {
      generate: [],
      analyze: [],
      statistics: {},
    };

    for (let i = 0; i < iterations; i++) {
      if (operations.includes('generate')) {
        const startTime = process.hrtime.bigint();
        await generateAudioWaveform({
          duration: 1000,
          sampleRate: 16000,
          waveform: 'voice',
        });
        const endTime = process.hrtime.bigint();
        results.generate.push(Number(endTime - startTime) / 1000000); // Convert to milliseconds
      }

      if (operations.includes('analyze')) {
        const audioData = await generateAudioWaveform({
          duration: 1000,
          sampleRate: 16000,
          waveform: 'voice',
        });
        
        const startTime = process.hrtime.bigint();
        await analyzeAudio(audioData);
        const endTime = process.hrtime.bigint();
        results.analyze.push(Number(endTime - startTime) / 1000000);
      }
    }

    // Calculate statistics
    for (const operation of operations) {
      const times = results[operation];
      results.statistics[operation] = {
        mean: times.reduce((a, b) => a + b, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
        median: times.sort((a, b) => a - b)[Math.floor(times.length / 2)],
        standardDeviation: Math.sqrt(
          times.reduce((sum, time) => sum + Math.pow(time - results.statistics[operation]?.mean || 0, 2), 0) / times.length
        ),
      };
    }

    res.json({
      success: true,
      results,
      metadata: {
        iterations,
        audioSize,
        operations,
        testedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Performance test error:', error);
    res.status(500).json({ error: 'Failed to run performance tests', details: error.message });
  }
});

app.post('/api/performance/stress', async (req, res) => {
  try {
    const {
      concurrentRequests = 5,
      requestsPerSecond = 10,
      testDuration = 30000, // 30 seconds
    } = req.body;

    const startTime = Date.now();
    const results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      responseTimes: [],
      errors: [],
    };

    const makeRequest = async () => {
      const requestStart = Date.now();
      try {
        await generateAudioWaveform({
          duration: 1000,
          sampleRate: 16000,
          waveform: 'sine',
        });
        
        const responseTime = Date.now() - requestStart;
        results.responseTimes.push(responseTime);
        results.successfulRequests++;
      } catch (error) {
        results.failedRequests++;
        results.errors.push(error.message);
      }
      results.totalRequests++;
    };

    // Run stress test
    const interval = setInterval(async () => {
      const promises = [];
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(makeRequest());
      }
      await Promise.all(promises);
    }, 1000 / requestsPerSecond);

    // Stop after test duration
    setTimeout(() => {
      clearInterval(interval);
      
      // Calculate final statistics
      results.averageResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
      
      res.json({
        success: true,
        results,
        metadata: {
          testDuration: Date.now() - startTime,
          concurrentRequests,
          requestsPerSecond,
          completedAt: new Date().toISOString(),
        },
      });
    }, testDuration);
    
  } catch (error) {
    console.error('Stress test error:', error);
    res.status(500).json({ error: 'Failed to run stress test', details: error.message });
  }
});

// WebSocket endpoint for real-time audio streaming
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('Client connected for real-time audio simulation');

  socket.on('start-stream', async (config) => {
    try {
      const {
        interval = 100, // 100ms chunks
        sampleRate = 16000,
        waveform = 'voice',
        quality = 'medium',
      } = config;

      const streamInterval = setInterval(async () => {
        try {
          const chunk = await generateAudioWaveform({
            duration: interval,
            sampleRate,
            waveform,
            quality,
            format: 'raw',
          });

          socket.emit('audio-chunk', {
            data: Array.from(chunk),
            timestamp: Date.now(),
            sampleRate,
            duration: interval,
          });
        } catch (error) {
          socket.emit('stream-error', { error: error.message });
        }
      }, interval);

      socket.on('stop-stream', () => {
        clearInterval(streamInterval);
        socket.emit('stream-stopped');
      });

      socket.on('disconnect', () => {
        clearInterval(streamInterval);
      });

    } catch (error) {
      socket.emit('stream-error', { error: error.message });
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'GET /health',
      'POST /api/audio/generate',
      'POST /api/audio/voice',
      'POST /api/audio/analyze',
      'POST /api/audio/quality-test',
      'GET /api/devices',
      'POST /api/devices/virtual',
      'POST /api/devices/:deviceId/simulate',
      'POST /api/performance/latency',
      'POST /api/performance/stress',
    ],
  });
});

// Start server
server.listen(port, () => {
  console.log(`Audio Simulator Server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`API Documentation: http://localhost:${port}/api/docs`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server };