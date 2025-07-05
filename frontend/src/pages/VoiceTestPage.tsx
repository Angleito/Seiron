import VoiceInterface from '@components/voice/VoiceInterface'
// import { ChatInterface } from '@components/chat/chat-interface'
// import { useState } from 'react'

export default function VoiceTestPage() {
  // const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([])

  const _handleVoiceCommand = (_transcript: string) => {
    console.log('Voice command received:', _transcript)
    // setMessages(prev => [...prev, { role: 'user', content: _transcript }])
  }

  const _handleAIResponse = (_response: string) => {
    console.log('AI response:', _response)
    // setMessages(prev => [...prev, { role: 'assistant', content: _response }])
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-orange-500 text-center">
          🐉 Seiron Voice Interface Test
        </h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl mb-4">Voice Controls</h2>
          <VoiceInterface 
            elevenLabsConfig={{
              apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY || '',
              voiceId: import.meta.env.VITE_ELEVENLABS_VOICE_ID || ''
            }}
          />
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl mb-4">Test Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Click the microphone button to start voice recording</li>
            <li>Say a command like "Show my portfolio" or "What's the price of SEI?"</li>
            <li>The transcript will appear as you speak</li>
            <li>Enable auto-play to hear AI responses through ElevenLabs TTS</li>
            <li>The dragon emoji will animate while audio is playing</li>
          </ol>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mt-8">
          <h2 className="text-2xl mb-4">Message Log</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded ${
                  msg.role === 'user' 
                    ? 'bg-blue-900 text-blue-100' 
                    : 'bg-green-900 text-green-100'
                }`}
              >
                <span className="font-bold">
                  {msg.role === 'user' ? '🎤 You:' : '🐉 Seiron:'}
                </span>
                <p className="mt-1">{msg.content}</p>
              </div>
            ))}
            {messages.length === 0 && (
              <p className="text-gray-500 text-center">No messages yet. Start speaking!</p>
            )}
          </div>
        </div>

        <div className="mt-8 text-center text-gray-500">
          <p>ElevenLabs Voice ID: {import.meta.env.VITE_ELEVENLABS_VOICE_ID}</p>
          <p>API Key: {import.meta.env.VITE_ELEVENLABS_API_KEY ? '✓ Configured' : '✗ Not configured'}</p>
        </div>
      </div>
    </div>
  )
}