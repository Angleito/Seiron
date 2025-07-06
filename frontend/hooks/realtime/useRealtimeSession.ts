import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { useSupabaseRealtime } from './useSupabaseRealtime'
import { 
  ChatSession, 
  UseRealtimeSessionResult, 
  RealtimePayload,
  SessionEventHandler 
} from '@/types/realtime'

export interface UseRealtimeSessionOptions {
  sessionId: string
  userId?: string
  onSessionUpdate?: SessionEventHandler
  onSessionDelete?: SessionEventHandler
  autoUpdateActivity?: boolean
  activityInterval?: number
}

export function useRealtimeSession(options: UseRealtimeSessionOptions): UseRealtimeSessionResult {
  const { 
    sessionId, 
    userId, 
    onSessionUpdate, 
    onSessionDelete,
    autoUpdateActivity = true,
    activityInterval = 30000 // 30 seconds
  } = options
  
  const [session, setSession] = useState<ChatSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  const channelName = `session_${sessionId}`
  
  // Initialize realtime connection
  const realtime = useSupabaseRealtime({
    channelName,
    onConnect: () => {
      logger.info('Session realtime connected', { sessionId })
    },
    onDisconnect: () => {
      logger.warn('Session realtime disconnected', { sessionId })
    },
    onError: (error) => {
      logger.error('Session realtime error', { sessionId, error })
      setError(error)
    },
  })
  
  // Load session
  const loadSession = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      logger.info('Loading session', { sessionId })
      
      const { data, error: fetchError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()
      
      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // Session doesn't exist, create it
          const newSession = await createSession()
          setSession(newSession)
          return
        }
        throw fetchError
      }
      
      const chatSession = data as ChatSession
      setSession(chatSession)
      
      logger.info('Session loaded', { 
        sessionId, 
        status: chatSession.status,
        lastActivity: chatSession.last_activity 
      })
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load session')
      logger.error('Error loading session', { sessionId, error })
      setError(error)
    } finally {
      setLoading(false)
    }
  }, [sessionId])
  
  // Create session
  const createSession = useCallback(async (title?: string): Promise<ChatSession> => {
    try {
      logger.info('Creating new session', { sessionId, title })
      
      const now = new Date().toISOString()
      const sessionData = {
        id: sessionId,
        user_id: userId || null,
        title: title || null,
        status: 'active' as const,
        last_activity: now,
        created_at: now,
        updated_at: now,
        metadata: {
          created_by: 'client',
          user_agent: navigator.userAgent,
        },
      }
      
      const { data, error: insertError } = await supabase
        .from('chat_sessions')
        .insert([sessionData])
        .select()
        .single()
      
      if (insertError) {
        throw insertError
      }
      
      const newSession = data as ChatSession
      setSession(newSession)
      
      logger.info('Session created successfully', { 
        sessionId, 
        title: newSession.title 
      })
      
      return newSession
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create session')
      logger.error('Error creating session', { sessionId, error })
      throw error
    }
  }, [sessionId, userId])
  
  // Update session
  const updateSession = useCallback(async (updates: Partial<ChatSession>) => {
    try {
      logger.info('Updating session', { sessionId, updates })
      
      const { error: updateError } = await supabase
        .from('chat_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
        })
        .eq('id', sessionId)
      
      if (updateError) {
        throw updateError
      }
      
      logger.info('Session updated successfully', { sessionId })
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update session')
      logger.error('Error updating session', { sessionId, error })
      throw error
    }
  }, [sessionId])
  
  // Archive session
  const archiveSession = useCallback(async () => {
    try {
      logger.info('Archiving session', { sessionId })
      
      const { error: updateError } = await supabase
        .from('chat_sessions')
        .update({
          status: 'archived',
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
      
      if (updateError) {
        throw updateError
      }
      
      logger.info('Session archived successfully', { sessionId })
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to archive session')
      logger.error('Error archiving session', { sessionId, error })
      throw error
    }
  }, [sessionId])
  
  // Update activity
  const updateActivity = useCallback(async () => {
    if (!session || session.status !== 'active') {
      return
    }
    
    try {
      const { error: updateError } = await supabase
        .from('chat_sessions')
        .update({
          last_activity: new Date().toISOString(),
        })
        .eq('id', sessionId)
      
      if (updateError) {
        logger.error('Error updating session activity', { sessionId, error: updateError })
        return
      }
      
      logger.debug('Session activity updated', { sessionId })
      
    } catch (err) {
      logger.error('Error updating session activity', { sessionId, error: err })
    }
  }, [sessionId, session])
  
  // Handle real-time session events
  const handleSessionUpdate = useCallback((payload: RealtimePayload<ChatSession>) => {
    const updatedSession = payload.new
    
    logger.debug('Session updated', { 
      sessionId, 
      status: updatedSession.status,
      lastActivity: updatedSession.last_activity 
    })
    
    setSession(updatedSession)
    onSessionUpdate?.(payload)
  }, [sessionId, onSessionUpdate])
  
  const handleSessionDelete = useCallback((payload: RealtimePayload<ChatSession>) => {
    const deletedSession = payload.old
    
    logger.debug('Session deleted', { 
      sessionId: deletedSession.id 
    })
    
    if (deletedSession.id === sessionId) {
      setSession(null)
    }
    
    onSessionDelete?.(payload)
  }, [sessionId, onSessionDelete])
  
  // Setup realtime subscriptions
  useEffect(() => {
    if (!realtime.isConnected) {
      return
    }
    
    // Subscribe to session updates
    realtime.subscribe({
      table: 'chat_sessions',
      schema: 'public',
      filter: `id=eq.${sessionId}`,
      onUpdate: handleSessionUpdate,
      onDelete: handleSessionDelete,
    })
    
    return () => {
      realtime.unsubscribe({
        table: 'chat_sessions',
        schema: 'public',
      })
    }
  }, [realtime.isConnected, sessionId, handleSessionUpdate, handleSessionDelete])
  
  // Auto-update activity
  useEffect(() => {
    if (!autoUpdateActivity || !session) {
      return
    }
    
    const interval = setInterval(updateActivity, activityInterval)
    
    return () => {
      clearInterval(interval)
    }
  }, [autoUpdateActivity, activityInterval, updateActivity, session])
  
  // Load session on mount
  useEffect(() => {
    loadSession()
  }, [loadSession])
  
  // Update activity on user interaction
  useEffect(() => {
    if (!autoUpdateActivity) {
      return
    }
    
    const handleUserActivity = () => {
      updateActivity()
    }
    
    const events = ['click', 'keypress', 'scroll', 'mousemove', 'touchstart']
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true })
    })
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity)
      })
    }
  }, [autoUpdateActivity, updateActivity])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Update session to inactive when component unmounts
      if (session && session.status === 'active') {
        supabase
          .from('chat_sessions')
          .update({
            status: 'inactive',
            updated_at: new Date().toISOString(),
          })
          .eq('id', sessionId)
          .then(() => {
            logger.info('Session marked as inactive on unmount', { sessionId })
          }, (error: Error) => {
            logger.error('Error marking session as inactive', { sessionId, error })
          })
      }
    }
  }, [sessionId, session])
  
  return {
    session,
    loading,
    error,
    updateSession,
    archiveSession,
    createSession,
  }
}