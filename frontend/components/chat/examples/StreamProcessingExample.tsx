'use client'

import { useEffect, useState } from 'react'
import { ChatStreamService } from '../ChatStreamService'
import { combineLatest, interval, merge } from 'rxjs'
import { 
  map, 
  filter, 
  scan, 
  debounceTime, 
  distinctUntilChanged,
  switchMap,
  catchError,
  take
} from 'rxjs/operators'
import * as A from 'fp-ts/Array'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'

export function StreamProcessingExample() {
  const [analytics, setAnalytics] = useState({
    messageCount: 0,
    avgResponseTime: 0,
    errorRate: 0,
    activeAgents: [] as string[],
    messageVelocity: 0
  })
  
  useEffect(() => {
    const chatService = new ChatStreamService({
      apiEndpoint: '/api',
      wsEndpoint: 'ws://localhost:3001',
      sessionId: 'example-session'
    })
    
    // Example 1: Message velocity calculation
    const messageVelocity$ = chatService.messages$.pipe(
      // Buffer messages in 5-second windows
      scan((acc, msg) => {
        const now = Date.now()
        const window = 5000 // 5 seconds
        const recentMessages = [...acc, { msg, timestamp: now }]
          .filter(item => now - item.timestamp < window)
        return recentMessages
      }, [] as Array<{ msg: any; timestamp: number }>),
      
      // Calculate messages per second
      map(messages => messages.length / 5),
      
      // Smooth out the values
      distinctUntilChanged((a, b) => Math.abs(a - b) < 0.1)
    )
    
    // Example 2: Response time analytics
    const responseTime$ = chatService.messages$.pipe(
      // Pair user messages with agent responses
      scan((acc, msg) => {
        if (msg.type === 'user') {
          return { ...acc, lastUserMsg: msg, pending: true }
        } else if (msg.type === 'agent' && acc.pending) {
          const responseTime = msg.timestamp.getTime() - acc.lastUserMsg.timestamp.getTime()
          return { ...acc, pending: false, times: [...acc.times, responseTime] }
        }
        return acc
      }, { lastUserMsg: {} as any, pending: false, times: [] as number[] }),
      
      // Calculate average response time
      map(data => {
        const times = data.times.slice(-10) // Last 10 responses
        return times.length > 0 
          ? times.reduce((a, b) => a + b, 0) / times.length 
          : 0
      })
    )
    
    // Example 3: Error rate monitoring
    const errorRate$ = chatService.messages$.pipe(
      // Count errors in sliding window
      scan((acc, msg) => {
        const isError = msg.status === 'failed' || msg.metadata?.error
        const now = Date.now()
        const window = 60000 // 1 minute
        
        const events = [...acc.events, { isError, timestamp: now }]
          .filter(e => now - e.timestamp < window)
        
        const errorCount = events.filter(e => e.isError).length
        const errorRate = events.length > 0 ? errorCount / events.length : 0
        
        return { events, errorRate }
      }, { events: [] as Array<{ isError: boolean; timestamp: number }>, errorRate: 0 }),
      
      map(data => data.errorRate),
      distinctUntilChanged()
    )
    
    // Example 4: Active agent tracking using fp-ts
    const activeAgents$ = chatService.typingIndicators$.pipe(
      map(indicators => 
        pipe(
          indicators,
          A.map(ind => ind.agentType),
          A.uniq({ equals: (a, b) => a === b })
        )
      ),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    )
    
    // Example 5: Smart message batching for bulk operations
    const batchedMessages$ = chatService.messages$.pipe(
      // Only process user messages
      filter(msg => msg.type === 'user'),
      
      // Batch messages that arrive within 2 seconds of each other
      scan((batch, msg) => {
        const now = Date.now()
        if (batch.length === 0 || now - batch[0].timestamp.getTime() < 2000) {
          return [...batch, msg]
        }
        return [msg]
      }, [] as any[]),
      
      // Emit batch when no new messages for 2 seconds
      debounceTime(2000),
      
      // Process batch
      filter(batch => batch.length > 0),
      map(batch => ({
        count: batch.length,
        messages: batch,
        timestamp: new Date()
      }))
    )
    
    // Example 6: Connection health monitoring
    const connectionHealth$ = combineLatest([
      chatService.connectionStatus,
      interval(1000) // Check every second
    ]).pipe(
      map(([status]) => {
        const now = Date.now()
        const timeSinceHeartbeat = now - status.lastHeartbeat
        const health = timeSinceHeartbeat < 60000 ? 'healthy' : 
                      timeSinceHeartbeat < 120000 ? 'degraded' : 'unhealthy'
        return { ...status, health }
      }),
      distinctUntilChanged((a, b) => a.health === b.health)
    )
    
    // Example 7: Message pattern detection
    const messagePatterns$ = chatService.messageHistory$.pipe(
      map(history => 
        pipe(
          history,
          A.takeRight(10), // Last 10 messages
          A.filter(msg => msg.type === 'user'),
          A.map(msg => msg.content.toLowerCase()),
          messages => {
            // Detect common patterns
            const hasGreeting = messages.some(m => 
              /hello|hi|hey|greetings/.test(m)
            )
            const hasQuestion = messages.some(m => 
              /\?|how|what|when|where|why/.test(m)
            )
            const hasCommand = messages.some(m => 
              /show|display|get|fetch|find/.test(m)
            )
            
            return {
              hasGreeting,
              hasQuestion,
              hasCommand,
              patternCount: [hasGreeting, hasQuestion, hasCommand].filter(Boolean).length
            }
          }
        )
      ),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    )
    
    // Combine all analytics streams
    const subscription = combineLatest([
      messageVelocity$,
      responseTime$,
      errorRate$,
      activeAgents$,
      chatService.messages$.pipe(scan((count, _) => count + 1, 0))
    ]).subscribe(([velocity, avgResponse, errorRate, agents, msgCount]) => {
      setAnalytics({
        messageVelocity: velocity,
        avgResponseTime: avgResponse,
        errorRate: errorRate,
        activeAgents: agents,
        messageCount: msgCount
      })
    })
    
    // Cleanup
    return () => {
      subscription.unsubscribe()
      chatService.destroy()
    }
  }, [])
  
  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Stream Processing Analytics</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">Message Velocity</h3>
          <p className="text-3xl text-green-400">
            {analytics.messageVelocity.toFixed(2)} msg/s
          </p>
        </div>
        
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">Avg Response Time</h3>
          <p className="text-3xl text-blue-400">
            {(analytics.avgResponseTime / 1000).toFixed(2)}s
          </p>
        </div>
        
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">Error Rate</h3>
          <p className="text-3xl text-red-400">
            {(analytics.errorRate * 100).toFixed(1)}%
          </p>
        </div>
        
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">Active Agents</h3>
          <div className="space-y-1">
            {analytics.activeAgents.map(agent => (
              <p key={agent} className="text-sm text-yellow-400">
                {agent.replace('_', ' ')}
              </p>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mt-4 bg-gray-800 p-4 rounded">
        <h3 className="text-lg font-semibold mb-2">Total Messages</h3>
        <p className="text-2xl text-purple-400">{analytics.messageCount}</p>
      </div>
    </div>
  )
}