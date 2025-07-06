import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { useSupabaseRealtime } from './useSupabaseRealtime'
import { 
  ChatMessage, 
  UseRealtimeMessagesResult, 
  RealtimePayload,
  MessageEventHandler 
} from '@/types/realtime'

export interface UseRealtimeMessagesOptions {
  sessionId: string
  userId?: string
  limit?: number
  onMessage?: MessageEventHandler
  onMessageUpdate?: MessageEventHandler
  onMessageDelete?: MessageEventHandler
  enableOptimisticUpdates?: boolean
}

export function useRealtimeMessages(options: UseRealtimeMessagesOptions): UseRealtimeMessagesResult {
  const { 
    sessionId, 
    userId, 
    limit = 100, 
    onMessage, 
    onMessageUpdate, 
    onMessageDelete,
    enableOptimisticUpdates = true 
  } = options
  
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  const optimisticUpdatesRef = useRef<Map<string, ChatMessage>>(new Map())
  const channelName = `messages_${sessionId}`
  
  // Initialize realtime connection
  const realtime = useSupabaseRealtime({
    channelName,
    onConnect: () => {
      logger.info('Messages realtime connected', { sessionId })
    },
    onDisconnect: () => {
      logger.warn('Messages realtime disconnected', { sessionId })
    },
    onError: (error) => {
      logger.error('Messages realtime error', { sessionId, error })
      setError(error)
    },
  })
  
  // Load initial messages
  const loadMessages = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      logger.info('Loading initial messages', { sessionId, limit })
      
      const { data, error: fetchError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(limit)
      
      if (fetchError) {
        throw fetchError
      }
      
      const chatMessages = (data || []) as ChatMessage[]
      setMessages(chatMessages)
      
      logger.info('Initial messages loaded', { 
        sessionId, 
        count: chatMessages.length 
      })
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load messages')
      logger.error('Error loading messages', { sessionId, error })
      setError(error)
    } finally {
      setLoading(false)
    }
  }, [sessionId, limit])
  
  // Handle real-time message events
  const handleMessageInsert = useCallback((payload: RealtimePayload<ChatMessage>) => {
    const newMessage = payload.new
    
    logger.debug('New message received', { 
      sessionId, 
      messageId: newMessage.id,
      role: newMessage.role 
    })
    
    setMessages(prev => {
      // Check if message already exists (avoid duplicates)
      const existing = prev.find(m => m.id === newMessage.id)
      if (existing) {
        return prev
      }
      
      // Remove optimistic update if it exists
      if (optimisticUpdatesRef.current.has(newMessage.id)) {
        optimisticUpdatesRef.current.delete(newMessage.id)
      }
      
      // Insert in correct position (sorted by created_at)
      const insertIndex = prev.findIndex(m => m.created_at > newMessage.created_at)
      if (insertIndex === -1) {
        return [...prev, newMessage]
      }
      
      const newMessages = [...prev]
      newMessages.splice(insertIndex, 0, newMessage)
      return newMessages
    })
    
    onMessage?.(payload)
  }, [sessionId, onMessage])
  
  const handleMessageUpdate = useCallback((payload: RealtimePayload<ChatMessage>) => {
    const updatedMessage = payload.new
    
    logger.debug('Message updated', { 
      sessionId, 
      messageId: updatedMessage.id,
      status: updatedMessage.status 
    })
    
    setMessages(prev => prev.map(message => 
      message.id === updatedMessage.id ? updatedMessage : message
    ))
    
    onMessageUpdate?.(payload)
  }, [sessionId, onMessageUpdate])
  
  const handleMessageDelete = useCallback((payload: RealtimePayload<ChatMessage>) => {
    const deletedMessage = payload.old
    
    logger.debug('Message deleted', { 
      sessionId, 
      messageId: deletedMessage.id 
    })
    
    setMessages(prev => prev.filter(message => message.id !== deletedMessage.id))
    
    onMessageDelete?.(payload)
  }, [sessionId, onMessageDelete])
  
  // Send message
  const sendMessage = useCallback(async (content: string, metadata: Record<string, any> = {}) => {
    if (!content.trim()) {
      throw new Error('Message content cannot be empty')
    }
    
    const tempId = `temp_${Date.now()}_${Math.random()}`
    const now = new Date().toISOString()
    
    const newMessage: ChatMessage = {
      id: tempId,
      session_id: sessionId,
      user_id: userId || null,
      content: content.trim(),
      role: 'user',
      metadata: {
        ...metadata,
        client_timestamp: Date.now(),
      },
      created_at: now,
      updated_at: now,
      status: 'sending',
      message_type: metadata.message_type || 'text',
    }
    
    try {
      // Optimistic update
      if (enableOptimisticUpdates) {
        optimisticUpdatesRef.current.set(tempId, newMessage)
        setMessages(prev => [...prev, newMessage])
      }
      
      logger.info('Sending message', { 
        sessionId, 
        contentLength: content.length,
        messageType: newMessage.message_type,
        tempId 
      })
      
      const { data, error: insertError } = await supabase
        .from('chat_messages')
        .insert([{
          session_id: sessionId,
          user_id: userId || null,
          content: content.trim(),
          role: 'user',
          metadata: newMessage.metadata,
          status: 'delivered',
          message_type: newMessage.message_type,
        }])
        .select()
        .single()
      
      if (insertError) {
        throw insertError
      }
      
      // Remove optimistic update
      if (enableOptimisticUpdates) {
        optimisticUpdatesRef.current.delete(tempId)
        setMessages(prev => prev.filter(m => m.id !== tempId))
      }
      
      logger.info('Message sent successfully', { 
        sessionId, 
        messageId: data.id,
        tempId 
      })
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send message')
      logger.error('Error sending message', { sessionId, error, tempId })
      
      // Update optimistic message to failed state
      if (enableOptimisticUpdates) {
        setMessages(prev => prev.map(m => 
          m.id === tempId ? { ...m, status: 'failed' } : m
        ))
      }
      
      throw error
    }
  }, [sessionId, userId, enableOptimisticUpdates])
  
  // Update message
  const updateMessage = useCallback(async (id: string, updates: Partial<ChatMessage>) => {
    try {
      logger.info('Updating message', { sessionId, messageId: id, updates })
      
      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
      
      if (updateError) {
        throw updateError
      }
      
      logger.info('Message updated successfully', { sessionId, messageId: id })
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update message')
      logger.error('Error updating message', { sessionId, messageId: id, error })
      throw error
    }
  }, [sessionId])
  
  // Delete message
  const deleteMessage = useCallback(async (id: string) => {
    try {
      logger.info('Deleting message', { sessionId, messageId: id })
      
      const { error: deleteError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', id)
      
      if (deleteError) {
        throw deleteError
      }
      
      logger.info('Message deleted successfully', { sessionId, messageId: id })
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete message')
      logger.error('Error deleting message', { sessionId, messageId: id, error })
      throw error
    }
  }, [sessionId])
  
  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([])
    optimisticUpdatesRef.current.clear()
  }, [])
  
  // Setup realtime subscriptions
  useEffect(() => {
    if (!realtime.isConnected) {
      return
    }
    
    // Subscribe to messages for this session
    realtime.subscribe({
      table: 'chat_messages',
      filter: `session_id=eq.${sessionId}`,
      onInsert: handleMessageInsert,
      onUpdate: handleMessageUpdate,
      onDelete: handleMessageDelete,
    })
    
    return () => {
      realtime.unsubscribe({
        table: 'chat_messages',
      })
    }
  }, [realtime.isConnected, sessionId, handleMessageInsert, handleMessageUpdate, handleMessageDelete])
  
  // Load initial messages
  useEffect(() => {
    loadMessages()
  }, [loadMessages])
  
  // Cleanup optimistic updates on unmount
  useEffect(() => {
    return () => {
      optimisticUpdatesRef.current.clear()
    }
  }, [])
  
  return {
    messages,
    loading,
    error,
    sendMessage,
    updateMessage,
    deleteMessage,
    clearMessages,
  }
}