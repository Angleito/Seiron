import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createApiHandler } from '@/app/lib/security/middleware';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;

// Request schema
const synthesizeRequestSchema = z.object({
  text: z.string().min(1).max(5000),
  voiceId: z.string().optional(),
  voiceSettings: z.object({
    stability: z.number().min(0).max(1).optional(),
    similarityBoost: z.number().min(0).max(1).optional(),
    style: z.number().min(0).max(1).optional(),
    useSpeakerBoost: z.boolean().optional(),
  }).optional(),
  modelId: z.string().optional(),
  outputFormat: z.enum(['mp3_44100_128', 'mp3_44100_192', 'pcm_16000', 'pcm_22050', 'pcm_44100']).optional(),
});

export const POST = createApiHandler(
  async (req, { session, body }) => {
    try {
      const {
        text,
        voiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
        voiceSettings = {
          stability: 0.5,
          similarityBoost: 0.5,
          style: 0.5,
          useSpeakerBoost: true,
        },
        modelId = 'eleven_monolingual_v1',
        outputFormat = 'mp3_44100_128',
      } = body!;
      
      // Log voice synthesis usage
      await logVoiceUsage({
        userId: session!.userId,
        textLength: text.length,
        voiceId,
        timestamp: new Date().toISOString(),
      });
      
      // Make request to ElevenLabs API
      const response = await fetch(
        `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': `audio/${outputFormat.startsWith('mp3') ? 'mpeg' : 'wav'}`,
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: voiceSettings,
            output_format: outputFormat,
          }),
        }
      );
      
      if (!response.ok) {
        const error = await response.text();
        console.error('ElevenLabs API error:', error);
        
        if (response.status === 429) {
          return NextResponse.json(
            { error: 'Voice synthesis rate limit exceeded. Please try again later.' },
            { status: 429 }
          );
        }
        
        return NextResponse.json(
          { error: 'Voice synthesis failed' },
          { status: response.status }
        );
      }
      
      // Get audio data
      const audioData = await response.arrayBuffer();
      
      // Return audio file
      return new NextResponse(audioData, {
        status: 200,
        headers: {
          'Content-Type': outputFormat.startsWith('mp3') ? 'audio/mpeg' : 'audio/wav',
          'Content-Length': audioData.byteLength.toString(),
          'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
        },
      });
      
    } catch (error) {
      console.error('Voice synthesis error:', error);
      return NextResponse.json(
        { error: 'Failed to synthesize voice' },
        { status: 500 }
      );
    }
  },
  {
    requireAuth: true,
    rateLimit: 'voice',
    schema: synthesizeRequestSchema,
  }
);

// Get available voices
export const GET = createApiHandler(
  async (req, { session }) => {
    try {
      const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch voices');
      }
      
      const data = await response.json();
      
      // Filter and sanitize voice data
      const voices = data.voices.map((voice: any) => ({
        voiceId: voice.voice_id,
        name: voice.name,
        category: voice.category,
        description: voice.description,
        previewUrl: voice.preview_url,
        labels: voice.labels,
      }));
      
      return NextResponse.json({ voices });
      
    } catch (error) {
      console.error('Failed to fetch voices:', error);
      return NextResponse.json(
        { error: 'Failed to fetch available voices' },
        { status: 500 }
      );
    }
  },
  {
    requireAuth: true,
    rateLimit: 'api',
  }
);

// Helper to log voice usage
async function logVoiceUsage(usage: {
  userId: string;
  textLength: number;
  voiceId: string;
  timestamp: string;
}) {
  // TODO: Implement actual logging to database or analytics service
  console.log('Voice usage:', usage);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    },
  });
}