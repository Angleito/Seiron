import React from 'react'

export default function TestTTS() {
  const testTTS = async () => {
    console.log('Testing TTS endpoint...')
    
    try {
      const response = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Hello, this is a test message',
          voiceId: import.meta.env.VITE_ELEVENLABS_VOICE_ID || 'test'
        })
      })
      
      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      
      const data = await response.json()
      console.log('Response data:', data)
      
      if (data.success && data.data?.audioBuffer) {
        // Try to play the audio
        const audioData = atob(data.data.audioBuffer)
        const audioArray = new Uint8Array(audioData.length)
        for (let i = 0; i < audioData.length; i++) {
          audioArray[i] = audioData.charCodeAt(i)
        }
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const audioBuffer = await audioContext.decodeAudioData(audioArray.buffer)
        
        const source = audioContext.createBufferSource()
        source.buffer = audioBuffer
        source.connect(audioContext.destination)
        source.start(0)
        
        console.log('Audio should be playing!')
      }
    } catch (error) {
      console.error('TTS test error:', error)
    }
  }
  
  return (
    <div style={{ padding: '20px' }}>
      <h2>TTS Test</h2>
      <button onClick={testTTS}>Test TTS Endpoint</button>
    </div>
  )
}