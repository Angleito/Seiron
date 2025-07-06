import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { 
  RealtimeConnectionStatus, 
  UseRealtimeConnectionResult,
  RealtimeConfig,
  defaultRealtimeConfig
} from '@/types/realtime'

export interface UseRealtimeConnectionOptions {
  config?: Partial<RealtimeConfig>
  onConnect?: () => void
  onDisconnect?: () => void
  onReconnect?: () => void
  onError?: (error: Error) => void
}

export function useRealtimeConnection(options: UseRealtimeConnectionOptions = {}): UseRealtimeConnectionResult {
  const { 
    config = {},
    onConnect,
    onDisconnect,
    onReconnect,
    onError
  } = options
  
  const finalConfig = { ...defaultRealtimeConfig, ...config }
  
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>({
    isConnected: false,
    connectionState: 'CLOSED',
    lastHeartbeat: 0,
    reconnectAttempts: 0,
    subscriptions: [],
    error: null,
  })
  
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const channelStatusRef = useRef<Map<string, string>>(new Map())
  const isManuallyDisconnectedRef = useRef(false)
  
  // Check connection status
  const checkConnection = useCallback(() => {
    try {
      const channels = supabase.getChannels()
      const activeChannels = channels.filter(channel => channel.state === 'joined')
      
      const isConnected = activeChannels.length > 0
      const subscriptions = activeChannels.map(channel => channel.topic)
      
      setConnectionStatus(prev => ({
        ...prev,
        isConnected,
        subscriptions,
        connectionState: isConnected ? 'OPEN' : 'CLOSED',
        lastHeartbeat: Date.now(),
      }))
      
      logger.debug('Connection status checked', {
        isConnected,
        activeChannels: activeChannels.length,
        totalChannels: channels.length,
        subscriptions
      })
      
      return isConnected
      
    } catch (error) {
      logger.error('Error checking connection status', { error })
      setConnectionStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Connection check failed'),
      }))
      return false
    }
  }, [])
  
  // Start heartbeat
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      return
    }
    
    logger.debug('Starting connection heartbeat', {
      interval: finalConfig.heartbeatInterval
    })
    
    heartbeatIntervalRef.current = setInterval(() => {
      const isConnected = checkConnection()
      
      if (!isConnected && !isManuallyDisconnectedRef.current) {
        logger.warn('Connection lost, attempting to reconnect')
        reconnect()
      }
    }, finalConfig.heartbeatInterval)
  }, [finalConfig.heartbeatInterval, checkConnection])
  
  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
      logger.debug('Connection heartbeat stopped')
    }
  }, [])
  
  // Reconnect
  const reconnect = useCallback(() => {
    if (isManuallyDisconnectedRef.current) {
      logger.debug('Skipping reconnect - manually disconnected')
      return
    }
    
    if (reconnectTimeoutRef.current) {
      logger.debug('Reconnect already scheduled')
      return
    }
    
    setConnectionStatus(prev => ({
      ...prev,
      reconnectAttempts: prev.reconnectAttempts + 1,
      connectionState: 'CONNECTING',
    }))
    
    logger.info('Scheduling reconnect', {
      attempts: connectionStatus.reconnectAttempts + 1,
      delay: finalConfig.reconnectInterval
    })
    
    reconnectTimeoutRef.current = setTimeout(async () => {
      reconnectTimeoutRef.current = null
      
      try {
        logger.info('Attempting to reconnect all channels')
        
        // Get all channels and attempt to reconnect
        const channels = supabase.getChannels()
        const reconnectPromises = channels.map(async (channel) => {
          try {
            if (channel.state === 'closed' || channel.state === 'errored') {
              await channel.subscribe()
              channelStatusRef.current.set(channel.topic, 'subscribed')
              logger.debug('Channel reconnected', { topic: channel.topic })
            }
          } catch (error) {
            logger.error('Error reconnecting channel', { 
              topic: channel.topic, 
              error 
            })
            channelStatusRef.current.set(channel.topic, 'error')
          }
        })
        
        await Promise.allSettled(reconnectPromises)
        
        // Check if reconnection was successful
        const isConnected = checkConnection()
        
        if (isConnected) {
          logger.info('Reconnection successful')
          setConnectionStatus(prev => ({
            ...prev,
            error: null,
            connectionState: 'OPEN',
          }))
          onReconnect?.()
        } else {
          logger.warn('Reconnection failed, will retry')
          // Schedule another reconnect attempt
          reconnect()
        }
        
      } catch (error) {
        logger.error('Error during reconnect', { error })
        setConnectionStatus(prev => ({
          ...prev,
          error: error instanceof Error ? error : new Error('Reconnect failed'),
        }))
        onError?.(error instanceof Error ? error : new Error('Reconnect failed'))
        
        // Schedule another reconnect attempt
        reconnect()
      }
    }, finalConfig.reconnectInterval)
  }, [
    finalConfig.reconnectInterval,
    connectionStatus.reconnectAttempts,
    checkConnection,
    onReconnect,
    onError
  ])
  
  // Disconnect
  const disconnect = useCallback(() => {
    logger.info('Manually disconnecting realtime connection')
    
    isManuallyDisconnectedRef.current = true
    
    // Stop heartbeat
    stopHeartbeat()
    
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    // Remove all channels
    supabase.removeAllChannels()
    
    setConnectionStatus(prev => ({
      ...prev,
      isConnected: false,
      connectionState: 'CLOSED',
      subscriptions: [],
      error: null,
    }))
    
    channelStatusRef.current.clear()
    onDisconnect?.()
  }, [stopHeartbeat, onDisconnect])
  
  // Manual reconnect
  const manualReconnect = useCallback(() => {
    logger.info('Manual reconnect requested')
    
    isManuallyDisconnectedRef.current = false
    
    setConnectionStatus(prev => ({
      ...prev,
      reconnectAttempts: 0,
      error: null,
    }))
    
    reconnect()
  }, [reconnect])
  
  // Get channel status
  const getChannelStatus = useCallback((channelName: string): string | null => {
    const channel = supabase.getChannels().find(ch => ch.topic === channelName)
    return channel ? channel.state : null
  }, [])
  
  // Initialize connection monitoring
  useEffect(() => {
    logger.info('Initializing realtime connection monitoring')
    
    isManuallyDisconnectedRef.current = false
    
    // Initial connection check
    checkConnection()
    
    // Start heartbeat
    startHeartbeat()
    
    // Listen for online/offline events
    const handleOnline = () => {
      logger.info('Network came online')
      if (!connectionStatus.isConnected) {
        manualReconnect()
      }
    }
    
    const handleOffline = () => {
      logger.warn('Network went offline')
      setConnectionStatus(prev => ({
        ...prev,
        isConnected: false,
        connectionState: 'CLOSED',
        error: new Error('Network offline'),
      }))
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Listen for page visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden && !connectionStatus.isConnected) {
        logger.info('Page became visible, checking connection')
        checkConnection()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      stopHeartbeat()
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
  
  // Monitor connection status changes
  useEffect(() => {
    if (connectionStatus.isConnected) {
      onConnect?.()
    } else if (connectionStatus.connectionState === 'CLOSED' && !isManuallyDisconnectedRef.current) {
      onDisconnect?.()
    }
  }, [connectionStatus.isConnected, connectionStatus.connectionState, onConnect, onDisconnect])
  
  // Handle errors
  useEffect(() => {
    if (connectionStatus.error) {
      onError?.(connectionStatus.error)
    }
  }, [connectionStatus.error, onError])
  
  return {
    connectionStatus,
    isConnected: connectionStatus.isConnected,
    reconnect: manualReconnect,
    disconnect,
    getChannelStatus,
  }
}