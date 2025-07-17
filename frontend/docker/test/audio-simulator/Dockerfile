# Audio Device Simulator for Voice Chat Testing
FROM node:20-alpine

# Install system dependencies for audio processing
RUN apk add --no-cache \
    curl \
    dumb-init \
    ffmpeg \
    alsa-utils \
    pulseaudio \
    && rm -rf /var/cache/apk/*

# Create app user
RUN addgroup -g 1001 -S audio && \
    adduser -S audio -u 1001 -G audio

WORKDIR /app

# Create package.json for audio simulator
RUN cat > package.json << 'EOF'
{
  "name": "audio-simulator-service",
  "version": "1.0.0",
  "description": "Simulated audio devices and audio stream processing for voice chat testing",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "uuid": "^9.0.1",
    "morgan": "^1.10.0",
    "ws": "^8.14.2",
    "stream": "^0.0.2"
  }
}
EOF

# Install dependencies
RUN npm install --production

# Create directories
RUN mkdir -p samples artifacts logs streams

# Generate test audio samples
RUN cat > generate-audio-samples.js << 'EOF'
const fs = require('fs');
const { execSync } = require('child_process');

// Audio sample configurations
const sampleConfigs = [
    {
        name: 'user-hello',
        duration: 3,
        frequency: 440,
        description: 'User greeting audio'
    },
    {
        name: 'user-portfolio',
        duration: 4,
        frequency: 523,
        description: 'User asking about portfolio'
    },
    {
        name: 'user-question',
        duration: 2.5,
        frequency: 392,
        description: 'User question audio'
    },
    {
        name: 'assistant-welcome',
        duration: 5,
        frequency: 311,
        description: 'Assistant welcome message'
    },
    {
        name: 'assistant-portfolio',
        duration: 4.5,
        frequency: 349,
        description: 'Assistant portfolio response'
    },
    {
        name: 'noise-sample',
        duration: 2,
        frequency: 200,
        description: 'Background noise simulation'
    },
    {
        name: 'silence',
        duration: 1,
        frequency: 0,
        description: 'Silent audio sample'
    }
];

console.log('Generating audio samples for testing...');

sampleConfigs.forEach(config => {
    const filename = `${config.name}.wav`;
    const filepath = `samples/${filename}`;
    
    try {
        if (config.frequency === 0) {
            // Generate silence
            execSync(`ffmpeg -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=44100" -t ${config.duration} -y ${filepath}`, { stdio: 'ignore' });
        } else {
            // Generate sine wave with some modulation for more realistic sound
            execSync(`ffmpeg -f lavfi -i "sine=frequency=${config.frequency}:duration=${config.duration}" -filter_complex "volume=0.5,tremolo=6:0.4" -ar 44100 -ac 2 -y ${filepath}`, { stdio: 'ignore' });
        }
        console.log(`✅ Generated: ${filename} (${config.description})`);
    } catch (error) {
        console.error(`❌ Failed to generate ${filename}:`, error.message);
    }
});

// Generate test patterns for quality testing
const testPatterns = [
    { name: 'quality-test-low', bitrate: '64k', sampleRate: 22050 },
    { name: 'quality-test-medium', bitrate: '128k', sampleRate: 44100 },
    { name: 'quality-test-high', bitrate: '320k', sampleRate: 48000 }
];

testPatterns.forEach(pattern => {
    const filename = `${pattern.name}.wav`;
    const filepath = `samples/${filename}`;
    
    try {
        execSync(`ffmpeg -f lavfi -i "sine=frequency=440:duration=3" -ab ${pattern.bitrate} -ar ${pattern.sampleRate} -ac 2 -y ${filepath}`, { stdio: 'ignore' });
        console.log(`✅ Generated quality test: ${filename}`);
    } catch (error) {
        console.error(`❌ Failed to generate ${filename}:`, error.message);
    }
});

console.log('Audio sample generation completed!');
EOF

RUN node generate-audio-samples.js && rm generate-audio-samples.js

# Create main server
RUN cat > server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const multer = require('multer');
const morgan = require('morgan');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { PassThrough, Readable } = require('stream');

const app = express();
const port = process.env.PORT || 8888;

// Configuration
const AUDIO_SAMPLE_RATE = parseInt(process.env.AUDIO_SAMPLE_RATE) || 44100;
const AUDIO_CHANNELS = parseInt(process.env.AUDIO_CHANNELS) || 2;
const ENABLE_AUDIO_COMPRESSION = process.env.ENABLE_AUDIO_COMPRESSION === 'true';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(morgan('combined'));

// Configure multer for file uploads
const upload = multer({
    dest: 'artifacts/',
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// Store active audio streams
const activeStreams = new Map();
const recordingSessions = new Map();

// Audio device simulation state
let deviceState = {
    microphone: {
        enabled: true,
        volume: 0.8,
        sampleRate: AUDIO_SAMPLE_RATE,
        channels: AUDIO_CHANNELS,
        deviceId: 'simulator-mic-001'
    },
    speaker: {
        enabled: true,
        volume: 0.9,
        sampleRate: AUDIO_SAMPLE_RATE,
        channels: AUDIO_CHANNELS,
        deviceId: 'simulator-speaker-001'
    }
};

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'audio-simulator',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        activeStreams: activeStreams.size,
        recordingSessions: recordingSessions.size,
        deviceState
    });
});

// Get available audio devices
app.get('/api/devices', (req, res) => {
    res.json({
        microphones: [
            {
                deviceId: deviceState.microphone.deviceId,
                label: 'Simulator Microphone',
                kind: 'audioinput',
                capabilities: {
                    sampleRate: { min: 8000, max: 48000, ideal: AUDIO_SAMPLE_RATE },
                    channelCount: { min: 1, max: 2, ideal: AUDIO_CHANNELS },
                    volume: { min: 0, max: 1, current: deviceState.microphone.volume }
                }
            }
        ],
        speakers: [
            {
                deviceId: deviceState.speaker.deviceId,
                label: 'Simulator Speaker',
                kind: 'audiooutput',
                capabilities: {
                    sampleRate: { min: 8000, max: 48000, ideal: AUDIO_SAMPLE_RATE },
                    channelCount: { min: 1, max: 2, ideal: AUDIO_CHANNELS },
                    volume: { min: 0, max: 1, current: deviceState.speaker.volume }
                }
            }
        ]
    });
});

// Update device settings
app.post('/api/devices/:deviceType/:deviceId/settings', (req, res) => {
    const { deviceType, deviceId } = req.params;
    const { volume, enabled, sampleRate, channels } = req.body;

    if (deviceState[deviceType] && deviceState[deviceType].deviceId === deviceId) {
        if (volume !== undefined) deviceState[deviceType].volume = Math.max(0, Math.min(1, volume));
        if (enabled !== undefined) deviceState[deviceType].enabled = Boolean(enabled);
        if (sampleRate !== undefined) deviceState[deviceType].sampleRate = sampleRate;
        if (channels !== undefined) deviceState[deviceType].channels = channels;

        res.json({
            success: true,
            deviceState: deviceState[deviceType]
        });
    } else {
        res.status(404).json({
            error: 'Device not found',
            deviceType,
            deviceId
        });
    }
});

// Get test audio samples
app.get('/api/samples', async (req, res) => {
    try {
        const samplesDir = path.join(__dirname, 'samples');
        const files = await fs.readdir(samplesDir);
        const samples = files
            .filter(file => file.endsWith('.wav'))
            .map(file => ({
                name: file.replace('.wav', ''),
                url: `/test-audio/${file}`,
                duration: null, // Would be populated by audio analysis
                size: null
            }));

        res.json({ samples });
    } catch (error) {
        console.error('Error reading samples:', error);
        res.status(500).json({ error: 'Failed to read audio samples' });
    }
});

// Serve test audio files
app.get('/test-audio/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filepath = path.join(__dirname, 'samples', filename);
        
        const buffer = await fs.readFile(filepath);
        
        res.set({
            'Content-Type': 'audio/wav',
            'Content-Length': buffer.length,
            'Cache-Control': 'public, max-age=3600'
        });
        
        res.send(buffer);
    } catch (error) {
        console.error('Error serving audio file:', error);
        res.status(404).json({ error: 'Audio file not found' });
    }
});

// Start audio recording simulation
app.post('/api/recording/start', (req, res) => {
    const sessionId = uuidv4();
    const { duration = 10000, quality = 'medium' } = req.body;

    const session = {
        id: sessionId,
        startTime: Date.now(),
        duration,
        quality,
        chunks: [],
        status: 'recording'
    };

    recordingSessions.set(sessionId, session);

    // Simulate recording chunks
    const chunkInterval = setInterval(() => {
        if (Date.now() - session.startTime >= duration) {
            clearInterval(chunkInterval);
            session.status = 'completed';
            return;
        }

        session.chunks.push({
            timestamp: Date.now(),
            size: Math.floor(Math.random() * 1024) + 512, // Random chunk size
            data: `chunk_${session.chunks.length}`
        });
    }, 100);

    res.json({
        sessionId,
        status: 'started',
        message: 'Recording simulation started'
    });
});

// Stop audio recording simulation
app.post('/api/recording/:sessionId/stop', (req, res) => {
    const { sessionId } = req.params;
    const session = recordingSessions.get(sessionId);

    if (!session) {
        return res.status(404).json({ error: 'Recording session not found' });
    }

    session.status = 'stopped';
    session.endTime = Date.now();

    res.json({
        sessionId,
        status: 'stopped',
        duration: session.endTime - session.startTime,
        chunks: session.chunks.length,
        totalSize: session.chunks.reduce((sum, chunk) => sum + chunk.size, 0)
    });
});

// Get recording session info
app.get('/api/recording/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = recordingSessions.get(sessionId);

    if (!session) {
        return res.status(404).json({ error: 'Recording session not found' });
    }

    res.json(session);
});

// Audio processing endpoint (simulate processing audio data)
app.post('/api/process', upload.single('audio'), async (req, res) => {
    try {
        const { operation = 'analyze' } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        // Simulate audio processing
        const processingResult = {
            originalFile: file.originalname,
            size: file.size,
            operation,
            processed: true,
            timestamp: new Date().toISOString(),
            metadata: {
                duration: Math.random() * 10 + 1, // Random duration 1-11 seconds
                sampleRate: AUDIO_SAMPLE_RATE,
                channels: AUDIO_CHANNELS,
                format: 'wav',
                quality: 'good'
            }
        };

        if (operation === 'analyze') {
            processingResult.analysis = {
                volume: Math.random() * 0.8 + 0.1, // 0.1 to 0.9
                frequency: Math.random() * 2000 + 100, // 100 to 2100 Hz
                quality: Math.random() > 0.2 ? 'good' : 'poor',
                noiseLevel: Math.random() * 0.3 // 0 to 0.3
            };
        }

        res.json(processingResult);
    } catch (error) {
        console.error('Audio processing error:', error);
        res.status(500).json({ error: 'Audio processing failed' });
    }
});

// WebSocket server for real-time audio streaming simulation
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
    const streamId = uuidv4();
    console.log(`New audio stream connected: ${streamId}`);

    activeStreams.set(streamId, {
        id: streamId,
        socket: ws,
        startTime: Date.now(),
        bytesTransferred: 0
    });

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'start-stream':
                    handleStreamStart(ws, streamId, message);
                    break;
                case 'audio-chunk':
                    handleAudioChunk(ws, streamId, message);
                    break;
                case 'stop-stream':
                    handleStreamStop(ws, streamId);
                    break;
                default:
                    ws.send(JSON.stringify({ error: 'Unknown message type' }));
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
            ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
    });

    ws.on('close', () => {
        console.log(`Audio stream disconnected: ${streamId}`);
        activeStreams.delete(streamId);
    });
});

function handleStreamStart(ws, streamId, message) {
    const stream = activeStreams.get(streamId);
    if (stream) {
        stream.config = message.config || {};
        ws.send(JSON.stringify({
            type: 'stream-started',
            streamId,
            config: stream.config
        }));
    }
}

function handleAudioChunk(ws, streamId, message) {
    const stream = activeStreams.get(streamId);
    if (stream) {
        stream.bytesTransferred += message.chunk?.length || 0;
        
        // Echo back processed chunk (simulation)
        ws.send(JSON.stringify({
            type: 'processed-chunk',
            streamId,
            chunkId: message.chunkId,
            processed: true,
            timestamp: Date.now()
        }));
    }
}

function handleStreamStop(ws, streamId) {
    const stream = activeStreams.get(streamId);
    if (stream) {
        const duration = Date.now() - stream.startTime;
        ws.send(JSON.stringify({
            type: 'stream-stopped',
            streamId,
            duration,
            bytesTransferred: stream.bytesTransferred
        }));
    }
}

// Error handling
app.use((error, req, res, next) => {
    console.error('Audio Simulator Error:', error);
    res.status(500).json({
        error: 'Internal server error',
        service: 'audio-simulator'
    });
});

// Start server
server.listen(port, '0.0.0.0', () => {
    console.log(`🎵 Audio Simulator running on port ${port}`);
    console.log(`Configuration:`);
    console.log(`- Sample rate: ${AUDIO_SAMPLE_RATE}Hz`);
    console.log(`- Channels: ${AUDIO_CHANNELS}`);
    console.log(`- Compression: ${ENABLE_AUDIO_COMPRESSION ? 'enabled' : 'disabled'}`);
    console.log(`- WebSocket: Available for real-time streaming`);
});
EOF

# Set permissions
RUN chown -R audio:audio /app
USER audio

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8888}/health || exit 1

# Expose port
EXPOSE 8888

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]