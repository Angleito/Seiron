# ElevenLabs Mock API Service for Testing
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    curl \
    dumb-init \
    ffmpeg \
    && rm -rf /var/cache/apk/*

# Create app user
RUN addgroup -g 1001 -S elevenlabs && \
    adduser -S elevenlabs -u 1001 -G elevenlabs

WORKDIR /app

# Create package.json for mock service
RUN cat > package.json << 'EOF'
{
  "name": "elevenlabs-mock-service",
  "version": "1.0.0",
  "description": "Mock ElevenLabs API service for testing voice synthesis",
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
    "morgan": "^1.10.0"
  }
}
EOF

# Install dependencies
RUN npm install --production

# Create mock audio samples directory
RUN mkdir -p samples logs

# Generate sample audio files for testing
RUN cat > generate-samples.js << 'EOF'
const fs = require('fs');
const { execSync } = require('child_process');

// Generate different voice samples using ffmpeg
const voices = [
    { id: 'adam', name: 'Adam', frequency: 200 },
    { id: 'bella', name: 'Bella', frequency: 300 },
    { id: 'charlie', name: 'Charlie', frequency: 180 },
    { id: 'domi', name: 'Domi', frequency: 250 }
];

const sampleTexts = [
    'Hello, this is a test of the voice synthesis system.',
    'Welcome to Seiron! I can help you with portfolio management.',
    'Your current portfolio balance is being calculated.',
    'Would you like me to explain the trading options available?',
    'I understand you want to check your recent transactions.'
];

console.log('Generating mock audio samples...');

voices.forEach(voice => {
    sampleTexts.forEach((text, index) => {
        const filename = `${voice.id}_sample_${index + 1}.wav`;
        const filepath = `samples/${filename}`;
        
        try {
            // Generate a simple sine wave audio file
            execSync(`ffmpeg -f lavfi -i "sine=frequency=${voice.frequency}:duration=3" -ar 44100 -ac 2 -y ${filepath}`, { stdio: 'ignore' });
            console.log(`Generated: ${filename}`);
        } catch (error) {
            console.error(`Failed to generate ${filename}:`, error.message);
        }
    });
});

console.log('Audio sample generation completed!');
EOF

RUN node generate-samples.js && rm generate-samples.js

# Create main server
RUN cat > server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const morgan = require('morgan');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 11000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

// Mock configuration
const MOCK_RESPONSE_DELAY = parseInt(process.env.MOCK_RESPONSE_DELAY) || 100;
const MOCK_ERROR_RATE = parseFloat(process.env.MOCK_ERROR_RATE) || 0;
const ENABLE_MOCK_LATENCY = process.env.ENABLE_MOCK_LATENCY !== 'false';

// Available mock voices
const MOCK_VOICES = [
    {
        voice_id: 'adam_voice_id',
        name: 'Adam',
        category: 'generated',
        settings: { stability: 0.75, similarity_boost: 0.75 }
    },
    {
        voice_id: 'bella_voice_id', 
        name: 'Bella',
        category: 'premade',
        settings: { stability: 0.65, similarity_boost: 0.8 }
    },
    {
        voice_id: 'charlie_voice_id',
        name: 'Charlie', 
        category: 'cloned',
        settings: { stability: 0.7, similarity_boost: 0.7 }
    },
    {
        voice_id: 'domi_voice_id',
        name: 'Domi',
        category: 'generated', 
        settings: { stability: 0.8, similarity_boost: 0.75 }
    }
];

// Helper functions
function shouldSimulateError() {
    return Math.random() < MOCK_ERROR_RATE;
}

function simulateLatency() {
    if (!ENABLE_MOCK_LATENCY) return Promise.resolve();
    const delay = MOCK_RESPONSE_DELAY + Math.random() * 200;
    return new Promise(resolve => setTimeout(resolve, delay));
}

function getRandomSample(voiceId) {
    const voiceName = MOCK_VOICES.find(v => v.voice_id === voiceId)?.name.toLowerCase() || 'adam';
    const sampleIndex = Math.floor(Math.random() * 5) + 1;
    return path.join(__dirname, 'samples', `${voiceName}_sample_${sampleIndex}.wav`);
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'elevenlabs-mock',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Get available voices
app.get('/v1/voices', async (req, res) => {
    await simulateLatency();
    
    if (shouldSimulateError()) {
        return res.status(500).json({ 
            error: 'Simulated API error',
            code: 'mock_error'
        });
    }

    res.json({
        voices: MOCK_VOICES
    });
});

// Text-to-speech endpoint
app.post('/v1/text-to-speech/:voice_id', async (req, res) => {
    await simulateLatency();
    
    if (shouldSimulateError()) {
        return res.status(400).json({
            error: 'Invalid voice settings',
            code: 'voice_not_found'
        });
    }

    const { voice_id } = req.params;
    const { text, model_id = 'eleven_monolingual_v1' } = req.body;

    if (!text || text.trim().length === 0) {
        return res.status(400).json({
            error: 'Text is required',
            code: 'invalid_request'
        });
    }

    if (text.length > 5000) {
        return res.status(400).json({
            error: 'Text too long',
            code: 'text_too_long'
        });
    }

    try {
        const samplePath = getRandomSample(voice_id);
        const audioBuffer = await fs.readFile(samplePath);
        
        res.set({
            'Content-Type': 'audio/wav',
            'Content-Length': audioBuffer.length,
            'X-Mock-Voice-ID': voice_id,
            'X-Mock-Text-Length': text.length,
            'X-Mock-Model': model_id
        });
        
        res.send(audioBuffer);
        
        console.log(`Synthesized audio for voice ${voice_id}, text length: ${text.length}`);
    } catch (error) {
        console.error('Error reading sample audio:', error);
        res.status(500).json({
            error: 'Audio generation failed',
            code: 'synthesis_error'
        });
    }
});

// Voice settings endpoint
app.get('/v1/voices/:voice_id/settings', async (req, res) => {
    await simulateLatency();
    
    const { voice_id } = req.params;
    const voice = MOCK_VOICES.find(v => v.voice_id === voice_id);
    
    if (!voice) {
        return res.status(404).json({
            error: 'Voice not found',
            code: 'voice_not_found'
        });
    }

    res.json(voice.settings);
});

// Usage/quota endpoint
app.get('/v1/user', async (req, res) => {
    await simulateLatency();
    
    res.json({
        subscription: {
            tier: 'free',
            character_count: 1500,
            character_limit: 10000,
            can_extend_character_limit: true,
            allowed_to_extend_character_limit: true,
            next_character_count_reset_unix: Date.now() + 86400000,
            voice_limit: 10,
            max_voice_add_edits: 5,
            voice_add_edit_counter: 2,
            professional_voice_limit: 1,
            can_use_instant_voice_cloning: true,
            can_use_professional_voice_cloning: false,
            currency: 'usd',
            status: 'active'
        }
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Mock API Error:', error);
    res.status(500).json({
        error: 'Internal server error',
        code: 'internal_error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        code: 'not_found'
    });
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`🎤 ElevenLabs Mock API running on port ${port}`);
    console.log(`Mock configuration:`);
    console.log(`- Response delay: ${MOCK_RESPONSE_DELAY}ms`);
    console.log(`- Error rate: ${MOCK_ERROR_RATE * 100}%`);
    console.log(`- Latency simulation: ${ENABLE_MOCK_LATENCY ? 'enabled' : 'disabled'}`);
    console.log(`- Available voices: ${MOCK_VOICES.length}`);
});
EOF

# Create logs directory and set permissions
RUN mkdir -p logs && \
    chown -R elevenlabs:elevenlabs /app

USER elevenlabs

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:${PORT:-11000}/health || exit 1

# Expose port
EXPOSE 11000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]