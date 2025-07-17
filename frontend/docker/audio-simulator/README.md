# Audio Simulator Service

A Docker-based audio simulation service for comprehensive voice chat E2E testing.

## Features

- **Audio Generation**: Generate realistic audio waveforms with various characteristics
- **Voice Simulation**: Create voice-like audio with natural speech patterns
- **Device Simulation**: Simulate different audio devices with varying quality profiles
- **Audio Analysis**: Analyze audio files for features, spectrum, and voice activity
- **Performance Testing**: Latency and stress testing capabilities
- **Real-time Streaming**: WebSocket support for real-time audio streaming
- **Quality Variations**: Simulate different audio quality scenarios (high, medium, low, noisy)

## Quick Start

### Using Docker Compose

```bash
# Start the audio simulator service
docker-compose up -d

# Check service health
curl http://localhost:3001/health

# View logs
docker-compose logs -f audio-simulator
```

### Using Docker

```bash
# Build the image
docker build -t audio-simulator .

# Run the container
docker run -p 3001:3001 audio-simulator

# Health check
curl http://localhost:3001/health
```

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

## API Endpoints

### Audio Generation

#### Generate Audio Waveform
```http
POST /api/audio/generate
Content-Type: application/json

{
  "duration": 5000,
  "sampleRate": 16000,
  "frequency": 440,
  "amplitude": 0.5,
  "waveform": "sine",
  "noiseLevel": 0.01,
  "format": "wav"
}
```

#### Generate Voice Audio
```http
POST /api/audio/voice
Content-Type: application/json

{
  "text": "Hello, this is a test voice message.",
  "language": "en-US",
  "voice": "neutral",
  "speed": 1.0,
  "pitch": 1.0,
  "emotion": "neutral",
  "format": "wav"
}
```

### Audio Analysis

#### Analyze Audio File
```http
POST /api/audio/analyze
Content-Type: multipart/form-data

audio: [audio file]
includeSpectrum: true
includeFeatures: true
includeVAD: true
vadThreshold: 0.01
```

#### Quality Testing
```http
POST /api/audio/quality-test
Content-Type: application/json

{
  "qualities": ["high", "medium", "low", "noisy"],
  "duration": 3000,
  "sampleRate": 16000
}
```

### Device Simulation

#### List Available Devices
```http
GET /api/devices
```

#### Create Virtual Device
```http
POST /api/devices/virtual
Content-Type: application/json

{
  "name": "Test Microphone",
  "type": "microphone",
  "quality": "high",
  "latency": 10,
  "noiseLevel": 0.02,
  "dropoutRate": 0.001,
  "sampleRates": [16000, 44100],
  "channelCount": 1
}
```

#### Simulate Device Recording
```http
POST /api/devices/{deviceId}/simulate
Content-Type: application/json

{
  "scenario": "normal",
  "duration": 5000,
  "recordingSettings": {
    "sampleRate": 16000,
    "channelCount": 1,
    "format": "wav"
  }
}
```

### Performance Testing

#### Latency Testing
```http
POST /api/performance/latency
Content-Type: application/json

{
  "iterations": 10,
  "audioSize": 16000,
  "operations": ["generate", "analyze"]
}
```

#### Stress Testing
```http
POST /api/performance/stress
Content-Type: application/json

{
  "concurrentRequests": 5,
  "requestsPerSecond": 10,
  "testDuration": 30000
}
```

## WebSocket Streaming

Connect to WebSocket for real-time audio streaming:

```javascript
const socket = io('http://localhost:3001');

// Start audio stream
socket.emit('start-stream', {
  interval: 100,
  sampleRate: 16000,
  waveform: 'voice',
  quality: 'medium'
});

// Receive audio chunks
socket.on('audio-chunk', (data) => {
  console.log('Received audio chunk:', data);
});

// Stop stream
socket.emit('stop-stream');
```

## Audio Quality Profiles

### High Quality
- Noise Floor: 0.001
- Dynamic Range: 96 dB
- THD: 0.1%
- Latency: 5ms

### Medium Quality
- Noise Floor: 0.01
- Dynamic Range: 72 dB
- THD: 1%
- Latency: 15ms

### Low Quality
- Noise Floor: 0.05
- Dynamic Range: 48 dB
- THD: 5%
- Latency: 50ms

### Noisy/Unstable
- Noise Floor: 0.1
- Dynamic Range: 36 dB
- THD: 10%
- Latency: 100ms

## Device Types

- **Microphone**: Standard microphone input
- **Speaker**: Audio output device
- **Headset**: Combined input/output device
- **USB Microphone**: High-quality USB microphone
- **Bluetooth Headset**: Wireless headset with lower quality
- **Webcam Microphone**: Integrated webcam microphone

## Supported Audio Formats

- **WAV**: Uncompressed PCM audio with proper headers
- **MP3**: Simulated MP3 format (returns PCM with marker)
- **Raw**: Raw PCM audio data

## Environment Variables

- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)
- `LOG_LEVEL`: Logging level (debug/info/warn/error)
- `WORKER_MODE`: Enable worker mode for background processing
- `REDIS_URL`: Redis connection URL for task queuing

## Testing Integration

### Jest Test Example

```javascript
const request = require('supertest');
const { app } = require('./server');

describe('Audio Generator API', () => {
  test('should generate audio waveform', async () => {
    const response = await request(app)
      .post('/api/audio/generate')
      .send({
        duration: 1000,
        sampleRate: 16000,
        waveform: 'sine',
        format: 'wav'
      })
      .expect(200);
      
    expect(response.headers['content-type']).toBe('audio/wav');
    expect(response.body.length).toBeGreaterThan(1000);
  });
});
```

### Frontend Integration

```typescript
// Use in voice chat integration tests
const audioSimulator = new AudioSimulatorClient('http://localhost:3001');

// Generate test audio
const testAudio = await audioSimulator.generateVoice({
  text: 'Test message for voice recognition',
  quality: 'high'
});

// Simulate device recording
const deviceSimulation = await audioSimulator.simulateDevice('microphone-1', {
  scenario: 'normal',
  duration: 5000
});
```

## Performance Considerations

- Maximum audio duration: 5 minutes
- Maximum file size: 50MB
- Concurrent connections: 100
- Memory usage: ~100MB base + ~10MB per active connection
- CPU usage: ~5% idle + ~20% per audio generation request

## Monitoring

### Health Check
```bash
curl http://localhost:3001/health
```

### Metrics (if enabled)
```bash
curl http://localhost:3001/metrics
```

### Logs
```bash
docker-compose logs -f audio-simulator
```

## Development

### Adding New Waveforms

```javascript
// In audio-generator.js
waveformGenerators.customWave = (t, frequency, amplitude) => {
  // Your custom waveform logic
  return amplitude * Math.sin(2 * Math.PI * frequency * t);
};
```

### Adding New Device Types

```javascript
// In device-simulator.js
DEVICE_TYPES.newDevice = {
  name: 'New Device Type',
  capabilities: ['record', 'playback'],
  defaultSampleRates: [16000, 44100],
  defaultChannels: [1, 2],
};
```

## Troubleshooting

### Common Issues

1. **Port already in use**: Change PORT environment variable
2. **Audio generation fails**: Check sample rate and duration parameters
3. **Memory issues**: Reduce concurrent requests or audio duration
4. **Container won't start**: Check Docker daemon and port availability

### Debug Mode

```bash
# Enable debug logging
NODE_ENV=development LOG_LEVEL=debug npm start
```

### Performance Issues

```bash
# Monitor resource usage
docker stats audio-simulator

# Profile memory usage
npm run test:coverage
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit pull request

## License

MIT License - see LICENSE file for details