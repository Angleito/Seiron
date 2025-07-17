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

// Mock voice synthesis for demo purposes
// In production, this would integrate with ElevenLabs or other TTS service
function mockVoiceSynthesis(text: string): string {
  // Generate a simple base64 audio mock
  const audioData = Buffer.from(`Mock audio data for: ${text.substring(0, 50)}...`);
  return audioData.toString('base64');
}

function setCorsHeaders(res: VercelResponse, origin: string | undefined) {
  const allowedOrigins = [
    'http://localhost:3000',
    'https://seiron.vercel.app',
    process.env.FRONTEND_URL
  ].filter(Boolean);
  
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : '*';
  
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const origin = req.headers.origin as string | undefined;
  
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
  
  try {
    const { text, voiceId, modelId, voiceSettings, outputFormat } = req.body as VoiceRequest;
    
    // Validate input
    if (!text || typeof text !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Text is required and must be a string',
        code: 'MISSING_TEXT'
      });
      return;
    }
    
    if (text.length > 5000) {
      res.status(400).json({
        success: false,
        error: 'Text is too long (max 5000 characters)',
        code: 'TEXT_TOO_LONG'
      });
      return;
    }
    
    // Check for ElevenLabs API key
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      // Mock response for demo
      const mockAudio = mockVoiceSynthesis(text);
      
      const response: VoiceResponse = {
        success: true,
        data: {
          audioBuffer: mockAudio,
          contentType: 'audio/mpeg',
          characterCount: text.length
        }
      };
      
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
        text,
        model_id: modelId || 'eleven_multilingual_v2',
        voice_settings: voiceSettings || {
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0.0,
          use_speaker_boost: false
        }
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
    console.error('Voice synthesis error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}