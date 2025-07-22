import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    audio?: string; // Audio URL for voice messages
    tokens?: number;
    model?: string;
    error?: boolean;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  error: string | null;
}

export interface AIState {
  isGenerating: boolean;
  streamingMessage: string | null;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface ChatState {
  // State
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  voiceState: VoiceState;
  aiState: AIState;
  isLoading: boolean;
  error: string | null;
  
  // Session Actions
  createSession: (title?: string) => ChatSession;
  selectSession: (sessionId: string) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
  deleteSession: (sessionId: string) => void;
  
  // Message Actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (messageId: string) => void;
  clearMessages: () => void;
  
  // Voice Actions
  setVoiceState: (updates: Partial<VoiceState>) => void;
  resetVoiceState: () => void;
  
  // AI Actions
  setAIState: (updates: Partial<AIState>) => void;
  setStreamingMessage: (message: string | null) => void;
  
  // General Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialVoiceState: VoiceState = {
  isListening: false,
  isProcessing: false,
  isSpeaking: false,
  audioLevel: 0,
  error: null,
};

const initialAIState: AIState = {
  isGenerating: false,
  streamingMessage: null,
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 2048,
};

const initialState = {
  currentSession: null,
  sessions: [],
  voiceState: initialVoiceState,
  aiState: initialAIState,
  isLoading: false,
  error: null,
};

// Helper to generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Create store without persistence first (for SSR safety)
const useChatStoreBase = create<ChatState>()(
  immer((set, get) => ({
    ...initialState,
    
    createSession: (title) => {
      const newSession: ChatSession = {
        id: generateId(),
        title: title || `Chat ${new Date().toLocaleDateString()}`,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      set((state) => {
        state.sessions.unshift(newSession);
        state.currentSession = newSession;
      });
      
      return newSession;
    },
    
    selectSession: (sessionId) => set((state) => {
      const session = state.sessions.find(s => s.id === sessionId);
      if (session) {
        state.currentSession = session;
      }
    }),
    
    updateSessionTitle: (sessionId, title) => set((state) => {
      const session = state.sessions.find(s => s.id === sessionId);
      if (session) {
        session.title = title;
        session.updatedAt = new Date();
      }
    }),
    
    deleteSession: (sessionId) => set((state) => {
      state.sessions = state.sessions.filter(s => s.id !== sessionId);
      if (state.currentSession?.id === sessionId) {
        state.currentSession = state.sessions[0] || null;
      }
    }),
    
    addMessage: (message) => set((state) => {
      if (!state.currentSession) {
        // Create a new session if none exists
        const newSession = get().createSession();
        state.currentSession = newSession;
      }
      
      const newMessage: Message = {
        ...message,
        id: generateId(),
        timestamp: new Date(),
      };
      
      state.currentSession!.messages.push(newMessage);
      state.currentSession!.updatedAt = new Date();
    }),
    
    updateMessage: (messageId, updates) => set((state) => {
      if (!state.currentSession) return;
      
      const messageIndex = state.currentSession.messages.findIndex(m => m.id === messageId);
      if (messageIndex !== -1) {
        state.currentSession.messages[messageIndex] = {
          ...state.currentSession.messages[messageIndex],
          ...updates,
        };
        state.currentSession.updatedAt = new Date();
      }
    }),
    
    deleteMessage: (messageId) => set((state) => {
      if (!state.currentSession) return;
      
      state.currentSession.messages = state.currentSession.messages.filter(m => m.id !== messageId);
      state.currentSession.updatedAt = new Date();
    }),
    
    clearMessages: () => set((state) => {
      if (!state.currentSession) return;
      
      state.currentSession.messages = [];
      state.currentSession.updatedAt = new Date();
    }),
    
    setVoiceState: (updates) => set((state) => {
      state.voiceState = { ...state.voiceState, ...updates };
    }),
    
    resetVoiceState: () => set((state) => {
      state.voiceState = initialVoiceState;
    }),
    
    setAIState: (updates) => set((state) => {
      state.aiState = { ...state.aiState, ...updates };
    }),
    
    setStreamingMessage: (message) => set((state) => {
      state.aiState.streamingMessage = message;
    }),
    
    setLoading: (loading) => set((state) => {
      state.isLoading = loading;
    }),
    
    setError: (error) => set((state) => {
      state.error = error;
    }),
    
    reset: () => set(() => initialState),
  }))
);

// Create persisted version for client-side only
export const useChatStore = typeof window !== 'undefined'
  ? create<ChatState>()(
      persist(
        immer((set, get) => ({
          ...initialState,
          
          createSession: (title) => {
            const newSession: ChatSession = {
              id: generateId(),
              title: title || `Chat ${new Date().toLocaleDateString()}`,
              messages: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            
            set((state) => {
              state.sessions.unshift(newSession);
              state.currentSession = newSession;
            });
            
            return newSession;
          },
          
          selectSession: (sessionId) => set((state) => {
            const session = state.sessions.find(s => s.id === sessionId);
            if (session) {
              state.currentSession = session;
            }
          }),
          
          updateSessionTitle: (sessionId, title) => set((state) => {
            const session = state.sessions.find(s => s.id === sessionId);
            if (session) {
              session.title = title;
              session.updatedAt = new Date();
            }
          }),
          
          deleteSession: (sessionId) => set((state) => {
            state.sessions = state.sessions.filter(s => s.id !== sessionId);
            if (state.currentSession?.id === sessionId) {
              state.currentSession = state.sessions[0] || null;
            }
          }),
          
          addMessage: (message) => set((state) => {
            if (!state.currentSession) {
              // Create a new session if none exists
              const newSession = get().createSession();
              state.currentSession = newSession;
            }
            
            const newMessage: Message = {
              ...message,
              id: generateId(),
              timestamp: new Date(),
            };
            
            state.currentSession!.messages.push(newMessage);
            state.currentSession!.updatedAt = new Date();
          }),
          
          updateMessage: (messageId, updates) => set((state) => {
            if (!state.currentSession) return;
            
            const messageIndex = state.currentSession.messages.findIndex(m => m.id === messageId);
            if (messageIndex !== -1) {
              state.currentSession.messages[messageIndex] = {
                ...state.currentSession.messages[messageIndex],
                ...updates,
              };
              state.currentSession.updatedAt = new Date();
            }
          }),
          
          deleteMessage: (messageId) => set((state) => {
            if (!state.currentSession) return;
            
            state.currentSession.messages = state.currentSession.messages.filter(m => m.id !== messageId);
            state.currentSession.updatedAt = new Date();
          }),
          
          clearMessages: () => set((state) => {
            if (!state.currentSession) return;
            
            state.currentSession.messages = [];
            state.currentSession.updatedAt = new Date();
          }),
          
          setVoiceState: (updates) => set((state) => {
            state.voiceState = { ...state.voiceState, ...updates };
          }),
          
          resetVoiceState: () => set((state) => {
            state.voiceState = initialVoiceState;
          }),
          
          setAIState: (updates) => set((state) => {
            state.aiState = { ...state.aiState, ...updates };
          }),
          
          setStreamingMessage: (message) => set((state) => {
            state.aiState.streamingMessage = message;
          }),
          
          setLoading: (loading) => set((state) => {
            state.isLoading = loading;
          }),
          
          setError: (error) => set((state) => {
            state.error = error;
          }),
          
          reset: () => set(() => initialState),
        })),
        {
          name: 'chat-storage',
          storage: createJSONStorage(() => localStorage),
          partialize: (state) => ({
            sessions: state.sessions,
            currentSession: state.currentSession,
            aiState: {
              model: state.aiState.model,
              temperature: state.aiState.temperature,
              maxTokens: state.aiState.maxTokens,
            },
          }),
        }
      )
    )
  : useChatStoreBase;