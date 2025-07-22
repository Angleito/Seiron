import { useCallback, useRef, useEffect } from 'react';
import { useChatStore, type Message } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';

export function useChat() {
  const chatStore = useChatStore();
  const { isAuthenticated } = useAuthStore();
  const { addNotification } = useUIStore();
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Send message to AI
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    
    // Add user message
    chatStore.addMessage({
      role: 'user',
      content,
    });
    
    try {
      chatStore.setLoading(true);
      chatStore.setAIState({ isGenerating: true });
      
      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content }),
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const data = await response.json();
      
      // Add assistant response
      chatStore.addMessage({
        role: 'assistant',
        content: data.message,
        metadata: {
          model: data.model,
          tokens: data.tokens,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Message was cancelled
        return;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to get response';
      chatStore.setError(errorMessage);
      
      // Add error message to chat
      chatStore.addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        metadata: { error: true },
      });
      
      addNotification({
        type: 'error',
        title: 'Chat Error',
        message: errorMessage,
      });
    } finally {
      chatStore.setLoading(false);
      chatStore.setAIState({ isGenerating: false });
      abortControllerRef.current = null;
    }
  }, [chatStore, addNotification]);
  
  // Cancel ongoing message generation
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      chatStore.setAIState({ isGenerating: false });
      chatStore.setLoading(false);
    }
  }, [chatStore]);
  
  // Voice message handling
  const sendVoiceMessage = useCallback(async (audioBlob: Blob) => {
    try {
      chatStore.setVoiceState({ isProcessing: true });
      
      // Convert audio to base64 or upload to storage
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // TODO: Implement speech-to-text conversion
      // For now, just add a placeholder
      chatStore.addMessage({
        role: 'user',
        content: '[Voice message]',
        metadata: { audio: audioUrl },
      });
      
      // Send transcribed text to AI
      // await sendMessage(transcribedText);
      
      addNotification({
        type: 'info',
        title: 'Voice message received',
        message: 'Voice messages are not yet implemented',
        duration: 3000,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process voice message';
      chatStore.setVoiceState({ error: errorMessage });
      addNotification({
        type: 'error',
        title: 'Voice Error',
        message: errorMessage,
      });
    } finally {
      chatStore.setVoiceState({ isProcessing: false });
    }
  }, [chatStore, addNotification]);
  
  // Start/stop voice recording
  const toggleVoiceRecording = useCallback(() => {
    const { isListening } = chatStore.voiceState;
    
    if (isListening) {
      chatStore.setVoiceState({ isListening: false });
      // TODO: Stop recording and process audio
    } else {
      chatStore.setVoiceState({ isListening: true });
      // TODO: Start recording
      
      // Placeholder notification
      addNotification({
        type: 'info',
        title: 'Voice recording',
        message: 'Voice recording is not yet implemented',
        duration: 3000,
      });
    }
  }, [chatStore, addNotification]);
  
  // Create new chat session
  const startNewChat = useCallback(() => {
    const session = chatStore.createSession();
    addNotification({
      type: 'success',
      title: 'New chat started',
      duration: 2000,
    });
    return session;
  }, [chatStore, addNotification]);
  
  // Get chat history
  const getChatHistory = useCallback(() => {
    return chatStore.sessions.map(session => ({
      id: session.id,
      title: session.title,
      lastMessage: session.messages[session.messages.length - 1]?.content || '',
      messageCount: session.messages.length,
      updatedAt: session.updatedAt,
    }));
  }, [chatStore.sessions]);
  
  // Clear current chat
  const clearCurrentChat = useCallback(() => {
    if (!chatStore.currentSession) return;
    
    chatStore.clearMessages();
    addNotification({
      type: 'info',
      title: 'Chat cleared',
      duration: 2000,
    });
  }, [chatStore, addNotification]);
  
  // Export chat as markdown
  const exportChat = useCallback(() => {
    if (!chatStore.currentSession) return '';
    
    const { title, messages } = chatStore.currentSession;
    let markdown = `# ${title}\n\n`;
    
    messages.forEach(msg => {
      const role = msg.role === 'user' ? 'You' : 'Assistant';
      markdown += `**${role}**: ${msg.content}\n\n`;
    });
    
    return markdown;
  }, [chatStore.currentSession]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  return {
    // State
    ...chatStore,
    
    // Actions
    sendMessage,
    cancelGeneration,
    sendVoiceMessage,
    toggleVoiceRecording,
    startNewChat,
    clearCurrentChat,
    
    // Computed
    getChatHistory,
    exportChat,
    hasMessages: (chatStore.currentSession?.messages.length || 0) > 0,
    isReady: !chatStore.isLoading && isAuthenticated,
    canSend: !chatStore.isLoading && !chatStore.aiState.isGenerating,
  };
}