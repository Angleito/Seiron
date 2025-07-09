import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Get API key from server environment (not exposed to client)
    const apiKey = process.env.ELEVENLABS_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'ElevenLabs API key not configured', code: 'API_KEY_ERROR' },
        { status: 500 }
      )
    }
    
    // Make request to ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${body.voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text: body.text,
          model_id: body.modelId || 'eleven_monolingual_v1',
          voice_settings: body.voiceSettings
        })
      }
    )
    
    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { success: false, error: error || 'ElevenLabs API error', code: 'API_ERROR' },
        { status: response.status }
      )
    }
    
    // Convert response to base64
    const audioBuffer = await response.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')
    
    return NextResponse.json({
      success: true,
      data: {
        audioBuffer: base64Audio,
        contentType: 'audio/mpeg',
        characterCount: body.text.length
      }
    })
    
  } catch (error) {
    console.error('Voice synthesis error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'NETWORK_ERROR' },
      { status: 500 }
    )
  }
}