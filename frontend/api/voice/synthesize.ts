import type { VercelRequest, VercelResponse } from '@vercel/node';

interface VoiceRequest {
  text: string;
  voiceId?: string;
  modelId?: string;
  voiceSettings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
  outputFormat?: string;
}

interface VoiceResponse {
  success: boolean;
  data?: {
    audioBuffer: string; // base64 encoded audio
    contentType: string;
    duration?: number;
    characterCount: number;
  };
  error?: string;
  code?: string;
}

// Clean text for TTS - remove markdown formatting and asterisks
function cleanTextForTTS(text: string): string {
  // Remove markdown formatting
  let cleaned = text
    // Remove bold/italic markers
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
    // Remove code blocks
    .replace(/```[^`]*```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove horizontal rules
    .replace(/^-{3,}$/gm, '')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove list markers
    .replace(/^[\*\-\+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return cleaned;
}

// Mock voice synthesis for demo purposes
// In production, this would integrate with ElevenLabs or other TTS service
function mockVoiceSynthesis(text: string): string {
  // Generate a simple tone (beep) WAV file
  // WAV header for 0.5 second tone at 44100Hz, 16-bit mono
  const sampleRate = 44100;
  const duration = 0.5; // 0.5 seconds
  const frequency = 440; // A4 note (440 Hz)
  const numSamples = Math.floor(sampleRate * duration);
  const dataSize = numSamples * 2; // 16-bit = 2 bytes per sample
  const fileSize = 44 + dataSize; // 44 bytes for WAV header + data
  
  // Create ArrayBuffer for WAV file
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  
  // "RIFF" chunk descriptor
  view.setUint8(0, 0x52); // R
  view.setUint8(1, 0x49); // I
  view.setUint8(2, 0x46); // F
  view.setUint8(3, 0x46); // F
  view.setUint32(4, fileSize - 8, true); // File size - 8
  view.setUint8(8, 0x57);  // W
  view.setUint8(9, 0x41);  // A
  view.setUint8(10, 0x56); // V
  view.setUint8(11, 0x45); // E
  
  // "fmt " sub-chunk
  view.setUint8(12, 0x66); // f
  view.setUint8(13, 0x6D); // m
  view.setUint8(14, 0x74); // t
  view.setUint8(15, 0x20); // (space)
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true); // NumChannels (1 for mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  
  // "data" sub-chunk
  view.setUint8(36, 0x64); // d
  view.setUint8(37, 0x61); // a
  view.setUint8(38, 0x74); // t
  view.setUint8(39, 0x61); // a
  view.setUint32(40, dataSize, true); // Subchunk2Size
  
  // Generate a simple sine wave tone
  const amplitude = 0.3 * 32767; // 30% volume (max is 32767 for 16-bit)
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * amplitude;
    const int16Sample = Math.floor(sample);
    view.setInt16(44 + i * 2, int16Sample, true);
  }
  
  // Convert ArrayBuffer to base64
  const bytes = new Uint8Array(buffer);
  
  // Use Buffer for Node.js environment (Vercel Functions)
  return Buffer.from(bytes).toString('base64');
}

function setCorsHeaders(res: VercelResponse, origin: string | undefined) {
  const allowedOrigins = [
    'http://localhost:3000',
    'https://seiron.vercel.app',
    'https://seiron-git-main-angleitos-projects.vercel.app',
    process.env.FRONTEND_URL
  ].filter(Boolean);
  
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : '*';
  
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

// Clean text for TTS - remove markdown and formatting
function cleanTextForTTS(text: string): string {
  return text
    // Remove asterisks (bold/italic)
    .replace(/\*+/g, '')
    // Remove underscores (italic)
    .replace(/_+/g, '')
    // Remove backticks (code)
    .replace(/`+/g, '')
    // Remove hashtags (headers)
    .replace(/#+\s?/g, '')
    // Remove brackets and parentheses content that are often asides
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    // Remove URLs
    .replace(/https?:\/\/[^\s]+/g, '')
    // Remove excessive newlines
    .replace(/\n{3,}/g, '\n\n')
    // Remove leading/trailing whitespace
    .trim()
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const origin = req.headers.origin as string | undefined;
  
  try {
    console.log('[Voice Synthesis] Handler started', {
      method: req.method,
      origin,
      hasBody: !!req.body,
      bodyType: typeof req.body
    });
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      setCorsHeaders(res, origin);
      res.status(200).end();
      return;
    }
  
    // Only allow POST
    if (req.method !== 'POST') {
      setCorsHeaders(res, origin);
      res.status(405).json({
        success: false,
        error: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      });
      return;
    }
    
    setCorsHeaders(res, origin);
    console.log('Voice synthesis request received:', {
      method: req.method,
      body: req.body,
      headers: req.headers
    });
    
    let { text, voiceId, modelId, voiceSettings, outputFormat } = req.body as VoiceRequest;
    
    // Validate input
    if (!text || typeof text !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Text is required and must be a string',
        code: 'MISSING_TEXT'
      });
      return;
    }
    
    // Clean text for TTS
    text = cleanTextForTTS(text);
    console.log('Cleaned text for TTS:', text)
    
    if (text.length > 5000) {
      res.status(400).json({
        success: false,
        error: 'Text is too long (max 5000 characters)',
        code: 'TEXT_TOO_LONG'
      });
      return;
    }
    
    // Clean text for TTS
    const cleanedText = cleanTextForTTS(text);
    console.log('Text cleaned for TTS:', {
      originalLength: text.length,
      cleanedLength: cleanedText.length,
      preview: cleanedText.substring(0, 100)
    });
    
    // Check for ElevenLabs API key
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    console.log('API Key status:', { hasApiKey: !!apiKey });
    
    if (!apiKey) {
      console.log('No API key found, using mock synthesis');
      // Mock response for demo
      const mockAudio = mockVoiceSynthesis(cleanedText);
      
      const response: VoiceResponse = {
        success: true,
        data: {
          audioBuffer: mockAudio,
          contentType: 'audio/wav',
          characterCount: text.length
        }
      };
      
      console.log('Sending mock response:', {
        success: response.success,
        audioBufferLength: mockAudio.length,
        contentType: response.data?.contentType
      });
      
      res.status(200).json(response);
      return;
    }
    
    // If ElevenLabs API key exists, use real synthesis
    const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId || 'default'}`;
    
    const elevenLabsResponse = await fetch(elevenLabsUrl, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text, // Use cleaned text
        model_id: modelId || 'eleven_turbo_v2_5', // Use turbo model for fastest response
        voice_settings: voiceSettings || {
          stability: 0.75, // Balanced stability as requested
          similarity_boost: 1.0, // Maximum similarity for consistency
          style: 0.0, // Neutral style for speed
          use_speaker_boost: true
        },
        optimize_streaming_latency: 4, // Maximum optimization for lowest latency
        output_format: 'mp3_22050_32' // Lower quality for faster streaming
      })
    });
    
    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text();
      res.status(500).json({
        success: false,
        error: `ElevenLabs API error: ${errorText}`,
        code: 'ELEVENLABS_ERROR'
      });
      return;
    }
    
    const audioBuffer = await elevenLabsResponse.arrayBuffer();
    // Convert to base64 using Buffer (Node.js/Vercel Functions environment)
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    
    const response: VoiceResponse = {
      success: true,
      data: {
        audioBuffer: base64Audio,
        contentType: 'audio/mpeg',
        characterCount: text.length
      }
    };
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('[Voice Synthesis] Critical error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error
    });
    
    setCorsHeaders(res, origin);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV !== 'production' ? {
        message: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.constructor.name : typeof error
      } : undefined
    });
  }
}