import { useEffect, useRef, useCallback, useState } from 'react'
import { RealtimeChannel, RealtimeChannelSendResponse } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { 
  RealtimeConnectionStatus, 
  RealtimeSubscriptionOptions, 
  RealtimePayload,
  RealtimeConfig,
  defaultRealtimeConfig
} from '@/types/realtime'

export interface UseSupabaseRealtimeOptions {
  channelName: string
  config?: Partial<RealtimeConfig>
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Error) => void
}

export interface UseSupabaseRealtimeResult {
  channel: RealtimeChannel | null
  connectionStatus: RealtimeConnectionStatus
  isConnected: boolean
  subscribe: (options: RealtimeSubscriptionOptions) => void
  unsubscribe: (options: Pick<RealtimeSubscriptionOptions, 'table' | 'schema'>) => void
  send: (event: string, payload: any) => Promise<RealtimeChannelSendResponse>
  reconnect: () => void
  disconnect: () => void
}

export function useSupabaseRealtime(options: UseSupabaseRealtimeOptions): UseSupabaseRealtimeResult {
  const { channelName, config = {}, onConnect, onDisconnect, onError } = options
  const finalConfig = { ...defaultRealtimeConfig, ...config }
  
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>({
    isConnected: false,
    connectionState: 'CLOSED',
    lastHeartbeat: 0,
    reconnectAttempts: 0,
    subscriptions: [],
    error: null,
  })
  
  const channelRef = useRef<RealtimeChannel | null>(null)
  const subscriptionsRef = useRef<Map<string, RealtimeSubscriptionOptions>>(new Map())
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Initialize channel
  const initializeChannel = useCallback(() => {
    if (channelRef.current) {
      logger.warn('Channel already initialized', { channelName })
      return
    }
    
    logger.info('Initializing realtime channel', { channelName })
    
    const channel = supabase.channel(channelName)
    channelRef.current = channel
    
    // Setup channel event listeners
    channel
      .on('presence', { event: 'sync' }, () => {
        logger.debug('Presence sync event received', { channelName })
        setConnectionStatus(prev => ({
          ...prev,
          lastHeartbeat: Date.now(),
        }))
      })
      .on('presence', { event: 'join' }, (payload) => {
        logger.debug('Presence join event received', { channelName, payload })
      })
      .on('presence', { event: 'leave' }, (payload) => {
        logger.debug('Presence leave event received', { channelName, payload })
      })
      .on('broadcast', { event: 'heartbeat' }, () => {
        setConnectionStatus(prev => ({
          ...prev,
          lastHeartbeat: Date.now(),
        }))
      })
    
    // Subscribe to channel
    channel.subscribe((status) => {
      logger.info('Channel subscription status changed', { channelName, status })
      
      setConnectionStatus(prev => ({
        ...prev,
        connectionState: status as any,
        isConnected: status === 'SUBSCRIBED',
        reconnectAttempts: status === 'SUBSCRIBED' ? 0 : prev.reconnectAttempts,
        error: null,
      }))
      
      if (status === 'SUBSCRIBED') {
        onConnect?.()
        startHeartbeat()
      } else if (status === 'CLOSED') {
        onDisconnect?.()
        stopHeartbeat()
        
        // Auto-reconnect if not manually disconnected
        if (finalConfig.reconnectInterval > 0) {
          scheduleReconnect()
        }
      }
    })
    
    // Re-apply existing subscriptions
    subscriptionsRef.current.forEach((options) => {
      applySubscription(channel, options)
    })
    
  }, [channelName, onConnect, onDisconnect, finalConfig.reconnectInterval])
  
  // Apply subscription to channel
  const applySubscription = useCallback((channel: RealtimeChannel, options: RealtimeSubscriptionOptions) => {
    const { table, schema = 'public', filter, event = ['INSERT', 'UPDATE', 'DELETE'] } = options
    const events = Array.isArray(event) ? event : [event]
    
    events.forEach(eventType => {
      const config: any = { event: eventType, schema, table }
      if (filter) {
        config.filter = filter
      }
      
      channel.on('postgres_changes', config, (payload: any) => {
        logger.debug('Postgres changes event received', {
          channelName,
          table,
          eventType,
          payload: payload.new || payload.old,
        })
        
        const realtimePayload: RealtimePayload = {
          ...payload,
          eventType: eventType as any,
        }
        
        // Call specific event handlers
        if (eventType === 'INSERT' && options.onInsert) {
          options.onInsert(realtimePayload)
        } else if (eventType === 'UPDATE' && options.onUpdate) {
          options.onUpdate(realtimePayload)
        } else if (eventType === 'DELETE' && options.onDelete) {
          options.onDelete(realtimePayload)
        }
        
        // Call general change handler
        options.onChange?.(realtimePayload)
      })
    })
    
    logger.info('Subscription applied to channel', {
      channelName,
      table,
      schema,
      events,
      filter,
    })
  }, [channelName])
  
  // Subscribe to table changes
  const subscribe = useCallback((options: RealtimeSubscriptionOptions) => {
    const subscriptionKey = `${options.schema || 'public'}.${options.table}`
    
    logger.info('Adding realtime subscription', {
      channelName,
      subscriptionKey,
      options,
    })
    
    subscriptionsRef.current.set(subscriptionKey, options)
    
    setConnectionStatus(prev => ({
      ...prev,
      subscriptions: Array.from(subscriptionsRef.current.keys()),
    }))
    
    // Apply subscription if channel is available
    if (channelRef.current) {
      applySubscription(channelRef.current, options)
    }
    
    options.onConnect?.()
  }, [channelName, applySubscription])
  
  // Unsubscribe from table changes
  const unsubscribe = useCallback((options: Pick<RealtimeSubscriptionOptions, 'table' | 'schema'>) => {
    const subscriptionKey = `${options.schema || 'public'}.${options.table}`
    
    logger.info('Removing realtime subscription', {
      channelName,
      subscriptionKey,
    })
    
    const subscription = subscriptionsRef.current.get(subscriptionKey)
    if (subscription) {
      subscription.onDisconnect?.()
      subscriptionsRef.current.delete(subscriptionKey)
      
      setConnectionStatus(prev => ({
        ...prev,
        subscriptions: Array.from(subscriptionsRef.current.keys()),
      }))
    }
    
    // Note: Supabase doesn't have a direct way to unsubscribe from specific postgres_changes
    // The subscription will be removed when the channel is recreated
  }, [channelName])
  
  // Send message via channel
  const send = useCallback(async (event: string, payload: any): Promise<RealtimeChannelSendResponse> => {
    if (!channelRef.current) {
      throw new Error('Channel not initialized')
    }
    
    logger.debug('Sending realtime message', {
      channelName,
      event,
      payload,
    })
    
    return channelRef.current.send({
      type: 'broadcast',
      event,
      payload,
    })
  }, [channelName])
  
  // Reconnect channel
  const reconnect = useCallback(() => {
    logger.info('Reconnecting realtime channel', { channelName })
    
    setConnectionStatus(prev => ({
      ...prev,
      reconnectAttempts: prev.reconnectAttempts + 1,
    }))
    
    // Clear existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    // Disconnect first
    disconnect()
    
    // Initialize after a short delay
    setTimeout(() => {
      initializeChannel()
    }, 100)
  }, [channelName, initializeChannel])
  
  // Disconnect channel
  const disconnect = useCallback(() => {
    logger.info('Disconnecting realtime channel', { channelName })
    
    stopHeartbeat()
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }
    
    setConnectionStatus(prev => ({
      ...prev,
      isConnected: false,
      connectionState: 'CLOSED',
    }))
  }, [channelName])
  
  // Schedule reconnect
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      return
    }
    
    logger.info('Scheduling reconnect', {
      channelName,
      delay: finalConfig.reconnectInterval,
    })
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null
      reconnect()
    }, finalConfig.reconnectInterval)
  }, [channelName, finalConfig.reconnectInterval, reconnect])
  
  // Start heartbeat
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      return
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'heartbeat',
          payload: { timestamp: Date.now() },
        })
      }
    }, finalConfig.heartbeatInterval)
  }, [finalConfig.heartbeatInterval])
  
  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
  }, [])
  
  // Initialize on mount
  useEffect(() => {
    initializeChannel()
    
    return () => {
      disconnect()
    }
  }, [initializeChannel, disconnect])
  
  // Error handling
  useEffect(() => {
    const handleError = (error: Error) => {
      logger.error('Realtime error', {
        channelName,
        error: error.message,
        stack: error.stack,
      })
      
      setConnectionStatus(prev => ({
        ...prev,
        error,
      }))
      
      onError?.(error)
    }
    
    // Add global error handler
    window.addEventListener('error', handleError as any)
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      handleError(new Error(event.reason))
    })
    
    return () => {
      window.removeEventListener('error', handleError as any)
      window.removeEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
        handleError(new Error(event.reason))
      })
    }
  }, [channelName, onError])
  
  return {
    channel: channelRef.current,
    connectionStatus,
    isConnected: connectionStatus.isConnected,
    subscribe,
    unsubscribe,
    send,
    reconnect,
    disconnect,
  }
}

