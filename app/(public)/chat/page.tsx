'use client';

import { useState } from 'react'
import { ChatInterface } from '../../components/chat';
import { VoiceInterface } from '../../components/voice';
import { useChat } from '../../hooks';

export default function ChatPage() {
  const { sendMessage } = useChat();
  const [isVoiceListening, setIsVoiceListening] = useState(false);

  const handleSendMessage = async (message: string) => {
    await sendMessage(message);
  };

  const handleVoiceTranscript = async (transcript: string) => {
    await handleSendMessage(transcript);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
            Chat with Seiron AI
          </h1>
          
          {/* Voice Controls */}
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              Voice {isVoiceListening ? 'listening...' : 'ready'}
            </div>
            <VoiceInterface
              onTranscript={handleVoiceTranscript}
              onVoiceStateChange={setIsVoiceListening}
              className="flex items-center space-x-2"
            />
          </div>
        </div>
        
        <div className="h-[calc(100vh-250px)]">
          <ChatInterface 
            onSendMessage={handleSendMessage}
            className="h-full"
          />
        </div>

        {/* Voice Status Indicator */}
        {isVoiceListening && (
          <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-full flex items-center space-x-2 animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full" />
            <span className="text-sm">Listening for voice input...</span>
          </div>
        )}
      </div>
    </div>
  );
}