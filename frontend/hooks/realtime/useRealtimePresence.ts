import { useEffect, useState, useCallback, useRef } from 'react'
import { logger } from '@/lib/logger'
import { useSupabaseRealtime } from './useSupabaseRealtime'
import { 
  PresenceState, 
  TypingIndicator, 
  UseRealtimePresenceResult
} from '@/types/realtime'

export interface UseRealtimePresenceOptions {
  sessionId: string
  userId?: string
  userName?: string
  typingTimeout?: number
  presenceTimeout?: number
  onPresenceChange?: (presence: PresenceState[]) => void
  onTypingChange?: (indicators: TypingIndicator[]) => void
}

export function useRealtimePresence(options: UseRealtimePresenceOptions): UseRealtimePresenceResult {
  const { 
    sessionId, 
    userId, 
    userName,
    typingTimeout = 3000,
    presenceTimeout = 30000,
    onPresenceChange,
    onTypingChange
  } = options
  
  const [presence, setPresence] = useState<PresenceState[]>([])
  const [typingIndicators, setTypingIndicators] = useState<TypingIndicator[]>([])
  const [myPresence, setMyPresence] = useState<PresenceState | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const channelName = `presence_${sessionId}`
  
  // Initialize realtime connection
  const realtime = useSupabaseRealtime({
    channelName,
    onConnect: () => {
      logger.info('Presence realtime connected', { sessionId })
      setIsOnline(true)
    },
    onDisconnect: () => {
      logger.warn('Presence realtime disconnected', { sessionId })
      setIsOnline(false)
    },
    onError: (error) => {
      logger.error('Presence realtime error', { sessionId, error })
      setIsOnline(false)
    },
  })
  
  // Create presence state
  const createPresenceState = useCallback((status: 'online' | 'away' | 'offline', metadata: Record<string, any> = {}): PresenceState => {
    return {
      user_id: userId || 'anonymous',
      session_id: sessionId,
      status,
      last_seen: new Date().toISOString(),
      metadata: {
        user_name: userName,
        timestamp: Date.now(),
        ...metadata,
      },
    }
  }, [userId, sessionId, userName])
  
  // Track presence
  const trackPresence = useCallback(async (state: PresenceState) => {
    try {
      if (!realtime.channel) {
        logger.warn('Cannot track presence - channel not available', { sessionId })
        return
      }
      
      logger.debug('Tracking presence', { sessionId, state })
      
      const response = await realtime.channel.track(state)
      
      if (response === 'ok') {
        setMyPresence(state)
        logger.debug('Presence tracked successfully', { sessionId, userId: state.user_id })
      } else {
        logger.warn('Failed to track presence', { sessionId, response })
      }
    } catch (error) {
      logger.error('Error tracking presence', { sessionId, error })
    }
  }, [realtime.channel, sessionId])
  
  // Untrack presence
  const untrackPresence = useCallback(async () => {
    try {
      if (!realtime.channel) {
        return
      }
      
      logger.debug('Untracking presence', { sessionId })
      
      const response = await realtime.channel.untrack()
      
      if (response === 'ok') {
        setMyPresence(null)
        logger.debug('Presence untracked successfully', { sessionId })
      } else {
        logger.warn('Failed to untrack presence', { sessionId, response })
      }
    } catch (error) {
      logger.error('Error untracking presence', { sessionId, error })
    }
  }, [realtime.channel, sessionId])
  
  // Set user status
  const setStatus = useCallback((status: 'online' | 'away' | 'offline') => {
    const newState = createPresenceState(status)
    trackPresence(newState)
  }, [createPresenceState, trackPresence])
  
  // Update presence metadata
  const updatePresence = useCallback((metadata: Record<string, any>) => {
    if (!myPresence) {
      return
    }
    
    const newState = createPresenceState(myPresence.status, metadata)
    trackPresence(newState)
  }, [myPresence, createPresenceState, trackPresence])
  
  // Set typing status
  const setTyping = useCallback(async (isTyping: boolean) => {
    try {
      if (!realtime.channel) {
        logger.warn('Cannot set typing - channel not available', { sessionId })
        return
      }
      
      const typingData: TypingIndicator = {
        user_id: userId || 'anonymous',
        session_id: sessionId,
        is_typing: isTyping,
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + typingTimeout).toISOString(),
      }
      
      // Send typing indicator via broadcast
      await realtime.send('typing', typingData)
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Auto-clear typing after timeout
      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          setTyping(false)
        }, typingTimeout)
      }
      
      logger.debug('Typing status updated', { sessionId, isTyping })
      
    } catch (error) {
      logger.error('Error setting typing status', { sessionId, error })
    }
  }, [realtime.channel, sessionId, userId, typingTimeout])
  
  // Handle presence sync
  const handlePresenceSync = useCallback(() => {
    if (!realtime.channel) {
      return
    }
    
    const presenceState = realtime.channel.presenceState()
    const presenceList: PresenceState[] = []
    
    Object.values(presenceState).forEach((presences: any) => {
      presences.forEach((presence: any) => {
        presenceList.push(presence as PresenceState)
      })
    })
    
    logger.debug('Presence sync', { sessionId, count: presenceList.length })
    
    setPresence(presenceList)
    onPresenceChange?.(presenceList)
  }, [realtime.channel, sessionId, onPresenceChange])
  
  // Handle typing broadcast
  const handleTypingBroadcast = useCallback((payload: { payload: TypingIndicator }) => {
    const typingData = payload.payload
    
    logger.debug('Typing broadcast received', { sessionId, typingData })
    
    setTypingIndicators(prev => {
      const filtered = prev.filter(t => 
        t.user_id !== typingData.user_id || 
        new Date(t.expires_at) > new Date()
      )
      
      if (typingData.is_typing) {
        return [...filtered, typingData]
      } else {
        return filtered.filter(t => t.user_id !== typingData.user_id)
      }
    })
  }, [sessionId])
  
  // Clean up expired typing indicators
  const cleanupTypingIndicators = useCallback(() => {
    const now = new Date()
    setTypingIndicators(prev => {
      const active = prev.filter(t => new Date(t.expires_at) > now)
      
      if (active.length !== prev.length) {
        logger.debug('Cleaned up expired typing indicators', { 
          sessionId, 
          removed: prev.length - active.length 
        })
        onTypingChange?.(active)
      }
      
      return active
    })
  }, [sessionId, onTypingChange])
  
  // Setup realtime subscriptions
  useEffect(() => {
    if (!realtime.isConnected || !realtime.channel) {
      return
    }
    
    // Subscribe to presence events
    realtime.channel.on('presence', { event: 'sync' }, handlePresenceSync)
    realtime.channel.on('presence', { event: 'join' }, handlePresenceSync)
    realtime.channel.on('presence', { event: 'leave' }, handlePresenceSync)
    
    // Subscribe to typing broadcasts
    realtime.channel.on('broadcast', { event: 'typing' }, handleTypingBroadcast)
    
    // Initial presence sync
    handlePresenceSync()
    
    return () => {
      if (realtime.channel) {
        realtime.channel.unsubscribe()
      }
    }
  }, [realtime.isConnected, realtime.channel, handlePresenceSync, handleTypingBroadcast])
  
  // Track initial presence
  useEffect(() => {
    if (!realtime.isConnected) {
      return
    }
    
    const initialState = createPresenceState('online')
    trackPresence(initialState)
    
    return () => {
      untrackPresence()
    }
  }, [realtime.isConnected, createPresenceState, trackPresence, untrackPresence])
  
  // Setup presence heartbeat
  useEffect(() => {
    if (!realtime.isConnected) {
      return
    }
    
    const interval = setInterval(() => {
      if (myPresence) {
        const updatedState = createPresenceState(myPresence.status, {
          ...myPresence.metadata,
          last_heartbeat: Date.now(),
        })
        trackPresence(updatedState)
      }
    }, presenceTimeout / 2)
    
    presenceIntervalRef.current = interval
    
    return () => {
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current)
      }
    }
  }, [realtime.isConnected, myPresence, createPresenceState, trackPresence, presenceTimeout])
  
  // Cleanup typing indicators periodically
  useEffect(() => {
    const interval = setInterval(cleanupTypingIndicators, 1000)
    
    return () => {
      clearInterval(interval)
    }
  }, [cleanupTypingIndicators])
  
  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setStatus('away')
      } else {
        setStatus('online')
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [setStatus])
  
  // Handle beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      setStatus('offline')
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [setStatus])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current)
      }
      untrackPresence()
    }
  }, [untrackPresence])
  
  return {
    presence,
    typingIndicators,
    myPresence,
    isOnline,
    setTyping,
    setStatus,
    updatePresence,
  }
}