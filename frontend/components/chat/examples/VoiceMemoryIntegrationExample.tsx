import React, { useState, useEffect, useCallback } from 'react';
import { useConversationContext } from '@/hooks/chat/useConversationContext';
import { memoryUtils, conversationAnalyzer } from '@/lib/memory-utils';
import { AIMemoryEntry } from '@/lib/conversation-memory';
import { logger } from '@/lib/logger';

interface VoiceMemoryIntegrationExampleProps {
  userId: string;
  sessionId: string;
  portfolioContext?: any;
  onVoiceInput?: (text: string) => void;
  onAIResponse?: (response: string) => void;
}

interface MemoryInsight {
  type: 'preference' | 'fact' | 'action' | 'context';
  content: string;
  confidence: number;
  relevance: number;
}

export const VoiceMemoryIntegrationExample: React.FC<VoiceMemoryIntegrationExampleProps> = ({
  userId,
  sessionId,
  portfolioContext,
  onVoiceInput,
  onAIResponse,
}) => {
  const [currentInput, setCurrentInput] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [memoryInsights, setMemoryInsights] = useState<MemoryInsight[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationSummary, setConversationSummary] = useState<any>(null);

  // Initialize conversation context with memory system
  const {
    conversation,
    memories,
    isLoading,
    error,
    addTurn,
    captureMemory,
    savePreferences,
    getRecentContext,
    hasConversation,
    turnCount,
    getMemoryByKey,
    getMemoriesByCategory,
    getConversationSummary,
  } = useConversationContext({
    userId,
    sessionId,
    autoSync: true,
    syncInterval: 5000,
    enableMemoryCapture: true,
    portfolioContext,
    onContextUpdate: (context) => {
      logger.info('Conversation context updated:', {
        conversationId: context.conversation?.id,
        memoryCount: context.memories.length,
      });
      
      // Update memory insights
      updateMemoryInsights(context.memories);
    },
    onError: (error) => {
      logger.error('Conversation context error:', error);
    },
  });

  // Update memory insights when memories change
  const updateMemoryInsights = useCallback((newMemories: AIMemoryEntry[]) => {
    const insights: MemoryInsight[] = newMemories.map(memory => {
      const relevance = memoryUtils.scoreMemoryRelevance(memory, {
        currentQuery: currentInput,
        portfolioContext,
      });

      return {
        type: memory.category as any,
        content: `${memory.key}: ${JSON.stringify(memory.value)}`,
        confidence: memory.confidence,
        relevance,
      };
    }).sort((a, b) => b.relevance - a.relevance);

    setMemoryInsights(insights.slice(0, 10)); // Top 10 insights
  }, [currentInput, portfolioContext]);

  // Process voice input with memory integration
  const handleVoiceInput = useCallback(async (voiceText: string) => {
    if (!voiceText.trim()) return;

    setCurrentInput(voiceText);
    setIsProcessing(true);
    onVoiceInput?.(voiceText);

    try {
      // Add user turn to conversation
      const turnResult = await addTurn('user', voiceText, {
        audioTranscribed: true,
        timestamp: Date.now(),
        voiceEnabled: true,
      });

      if (turnResult._tag === 'Left') {
        throw new Error('Failed to add turn to conversation');
      }

      // Extract memories from the input
      if (conversation) {
        const extractedMemories = [
          ...memoryUtils.extractActionableItems(conversation),
          ...memoryUtils.extractPortfolioPreferences(conversation),
          ...memoryUtils.extractVoicePreferences(conversation),
          ...memoryUtils.extractFactualInformation(conversation),
        ];

        // Save extracted memories
        for (const memory of extractedMemories) {
          await captureMemory(
            memory.key,
            memory.value,
            memory.category,
            memory.confidence
          );
        }
      }

      // Get context for AI processing
      const recentContext = getRecentContext(10);
      
      // Simulate AI processing with memory context
      const aiResponseText = await processAIResponse(voiceText, recentContext);
      
      // Add AI response to conversation
      await addTurn('assistant', aiResponseText, {
        modelUsed: 'gpt-4',
        processingTime: Date.now() - Date.now(),
        contextUsed: true,
      });

      setAiResponse(aiResponseText);
      onAIResponse?.(aiResponseText);

      // Update conversation summary
      const summary = getConversationSummary();
      setConversationSummary(summary);

    } catch (error) {
      logger.error('Error processing voice input:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [
    addTurn,
    captureMemory,
    conversation,
    getRecentContext,
    getConversationSummary,
    onVoiceInput,
    onAIResponse,
  ]);

  // Simulate AI response processing with memory context
  const processAIResponse = async (input: string, context: any): Promise<string> => {
    // This would typically call your AI service with the conversation context
    const inputLower = input.toLowerCase();
    
    // Example responses based on memory context
    if (inputLower.includes('portfolio') || inputLower.includes('investment')) {
      const portfolioMemories = getMemoriesByCategory('preference').filter(m => 
        m.key.includes('portfolio') || m.key.includes('investment')
      );
      
      if (portfolioMemories.length > 0) {
        return `Based on your previous preferences, I can see you prefer ${portfolioMemories[0].value.preference}. Let me help you with your portfolio query.`;
      }
      
      return "I'd be happy to help with your portfolio. Could you share your investment preferences so I can provide personalized advice?";
    }
    
    if (inputLower.includes('buy') || inputLower.includes('sell')) {
      const tradingPrefs = getMemoryByKey('trading_confirmation');
      if (tradingPrefs?.value?.confirmationRequired) {
        return "I notice you prefer confirmation before trades. Would you like me to show you the details before proceeding?";
      }
      
      return "I can help you with that trade. Let me get the current market information.";
    }
    
    if (inputLower.includes('remind') || inputLower.includes('alert')) {
      await captureMemory(
        `reminder_${Date.now()}`,
        { request: input, created: Date.now() },
        'interaction',
        0.9
      );
      
      return "I've noted your reminder request and will include it in our future conversations.";
    }
    
    // Default response with memory context
    const totalMemories = memories.length;
    const turnCount = conversation?.turns.length || 0;
    
    return `I understand. Based on our ${turnCount} previous exchanges and ${totalMemories} things I remember about you, let me provide a helpful response.`;
  };

  // Handle preference updates
  const handlePreferenceUpdate = useCallback(async (preferences: Record<string, any>) => {
    try {
      const result = await savePreferences(preferences);
      if (result._tag === 'Left') {
        throw new Error('Failed to save preferences');
      }
      
      logger.info('Preferences updated successfully');
    } catch (error) {
      logger.error('Error saving preferences:', error);
    }
  }, [savePreferences]);

  // Analyze conversation when it updates
  useEffect(() => {
    if (conversation && conversation.turns.length > 0) {
      const sentiment = conversationAnalyzer.analyzeSentiment(conversation);
      const topics = conversationAnalyzer.extractKeyTopics(conversation);
      const complexity = conversationAnalyzer.calculateComplexity(conversation);
      
      logger.info('Conversation analysis:', {
        sentiment: sentiment.overall,
        topics,
        complexity,
        turnCount: conversation.turns.length,
      });
    }
  }, [conversation]);

  if (isLoading && !hasConversation) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm text-gray-600">Initializing conversation memory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border rounded-lg bg-red-50 border-red-200">
        <h3 className="font-semibold text-red-800 mb-2">Memory System Error</h3>
        <p className="text-sm text-red-600">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Voice Memory Integration Demo
        </h2>
        <p className="text-gray-600">
          Demonstrating Vercel KV conversation memory with voice interactions
        </p>
      </div>

      {/* Conversation Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-1">Conversation</h3>
          <p className="text-sm text-blue-600">
            {hasConversation ? `${turnCount} turns` : 'Not started'}
          </p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="font-semibold text-green-800 mb-1">Memories</h3>
          <p className="text-sm text-green-600">{memories.length} stored</p>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <h3 className="font-semibold text-purple-800 mb-1">Context</h3>
          <p className="text-sm text-purple-600">
            {portfolioContext ? 'Portfolio loaded' : 'Basic context'}
          </p>
        </div>
      </div>

      {/* Voice Input Simulation */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Voice Input Simulation</h3>
        <div className="space-y-3">
          <textarea
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            placeholder="Enter text to simulate voice input..."
            className="w-full p-3 border rounded-lg resize-none"
            rows={3}
          />
          <button
            onClick={() => handleVoiceInput(currentInput)}
            disabled={isProcessing || !currentInput.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Process Voice Input'}
          </button>
        </div>
      </div>

      {/* AI Response */}
      {aiResponse && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-semibold mb-2">AI Response</h3>
          <p className="text-gray-800">{aiResponse}</p>
        </div>
      )}

      {/* Memory Insights */}
      {memoryInsights.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Memory Insights</h3>
          <div className="space-y-2">
            {memoryInsights.slice(0, 5).map((insight, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div className="flex-1">
                  <span className={`text-xs px-2 py-1 rounded mr-2 ${
                    insight.type === 'preference' ? 'bg-blue-100 text-blue-800' :
                    insight.type === 'fact' ? 'bg-green-100 text-green-800' :
                    insight.type === 'action' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {insight.type}
                  </span>
                  <span className="text-sm">{insight.content}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {Math.round(insight.relevance * 100)}% relevant
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conversation Summary */}
      {conversationSummary && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Conversation Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Total Turns:</span> {conversationSummary.totalTurns}
            </div>
            <div>
              <span className="font-medium">Last Active:</span>{' '}
              {conversationSummary.lastActive?.toLocaleTimeString()}
            </div>
            {conversationSummary.summary && (
              <div className="col-span-2">
                <span className="font-medium">Summary:</span> {conversationSummary.summary}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Quick Actions</h3>
        <div className="space-x-2">
          <button
            onClick={() => handleVoiceInput("I prefer aggressive investment strategies")}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
          >
            Set Investment Preference
          </button>
          <button
            onClick={() => handleVoiceInput("Please speak slower and be more detailed")}
            className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200"
          >
            Set Voice Preference
          </button>
          <button
            onClick={() => handleVoiceInput("Buy 100 shares of AAPL")}
            className="px-3 py-1 text-sm bg-orange-100 text-orange-800 rounded hover:bg-orange-200"
          >
            Simulate Trade Request
          </button>
          <button
            onClick={() => handleVoiceInput("Remind me to check my portfolio tomorrow")}
            className="px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded hover:bg-purple-200"
          >
            Set Reminder
          </button>
        </div>
      </div>

      {/* Memory Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {['preference', 'fact', 'context', 'interaction'].map(category => {
          const categoryMemories = getMemoriesByCategory(category as any);
          return (
            <div key={category} className="border rounded-lg p-3">
              <h4 className="font-medium text-sm mb-2 capitalize">{category}</h4>
              <p className="text-2xl font-bold text-gray-700">{categoryMemories.length}</p>
              <p className="text-xs text-gray-500">stored items</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VoiceMemoryIntegrationExample;