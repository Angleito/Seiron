'use client'

import { useEffect, useState } from 'react'
import { ChatStreamService } from '../ChatStreamService'
import { combineLatest, interval } from 'rxjs'
import { 
  map, 
  filter, 
  scan, 
  debounceTime, 
  distinctUntilChanged
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
      scan((acc: Array<{ msg: any; timestamp: number }>, msg) => {
        const now = Date.now()
        const window = 5000 // 5 seconds
        const newItem = { msg, timestamp: now }
        
        return pipe(
          [...acc, newItem],
          A.filter(item => now - item.timestamp < window)
        )
      }, [] as Array<{ msg: any; timestamp: number }>),
      
      // Calculate messages per second
      map(messages => messages.length / 5),
      
      // Smooth out the values
      distinctUntilChanged((a, b) => Math.abs(a - b) < 0.1)
    )
    
    // Example 2: Response time analytics
    interface ResponseTimeState {
      lastUserMsg: O.Option<any>
      pending: boolean
      times: number[]
    }
    
    const responseTime$ = chatService.messages$.pipe(
      // Pair user messages with agent responses
      scan((acc: ResponseTimeState, msg) => {
        if (msg.type === 'user') {
          return { ...acc, lastUserMsg: O.some(msg), pending: true }
        } else if (msg.type === 'agent' && acc.pending) {
          return pipe(
            acc.lastUserMsg,
            O.fold(
              () => acc,
              (lastMsg) => {
                const responseTime = msg.timestamp.getTime() - lastMsg.timestamp.getTime()
                return { 
                  ...acc, 
                  pending: false, 
                  times: pipe(
                    [...acc.times, responseTime],
                    A.takeRight(10) // Keep last 10 responses
                  )
                }
              }
            )
          )
        }
        return acc
      }, { lastUserMsg: O.none, pending: false, times: [] } as ResponseTimeState),
      
      // Calculate average response time
      map(data => 
        pipe(
          data.times,
          A.isEmpty,
          isEmpty => isEmpty ? 0 : data.times.reduce((a, b) => a + b, 0) / data.times.length
        )
      )
    )
    
    // Example 3: Error rate monitoring
    interface ErrorRateState {
      events: Array<{ isError: boolean; timestamp: number }>
      errorRate: number
    }
    
    const errorRate$ = chatService.messages$.pipe(
      // Count errors in sliding window
      scan((acc: ErrorRateState, msg) => {
        const isError = msg.status === 'failed' || Boolean(msg.metadata?.error)
        const now = Date.now()
        const window = 60000 // 1 minute
        const newEvent = { isError, timestamp: now }
        
        return pipe(
          [...acc.events, newEvent],
          A.filter(e => now - e.timestamp < window),
          (events) => {
            const errorCount = pipe(
              events,
              A.filter(e => e.isError),
              A.size
            )
            const errorRate = events.length > 0 ? errorCount / events.length : 0
            return { events, errorRate }
          }
        )
      }, { events: [], errorRate: 0 } as ErrorRateState),
      
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
    
    // Example 5: Smart message batching for bulk operations (demonstration)
    // This shows how to batch messages functionally
    pipe(
      chatService.messages$,
      // Only process user messages
      filter(msg => msg.type === 'user'),
      
      // Batch messages that arrive within 2 seconds of each other
      scan((batch: any[], msg) => {
        const now = Date.now()
        const batchWindow = 2000 // 2 seconds
        
        return pipe(
          batch,
          A.isEmpty,
          isEmpty => isEmpty || now - batch[0].timestamp.getTime() < batchWindow
            ? [...batch, msg]
            : [msg]
        )
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
    
    // Example 6: Connection health monitoring (demonstration)
    // This shows functional health monitoring patterns
    pipe(
      combineLatest([
        chatService.connectionStatus,
        interval(1000) // Check every second
      ]),
      map(([status]) => {
        const now = Date.now()
        const timeSinceHeartbeat = now - status.lastHeartbeat
        
        const health = pipe(
          timeSinceHeartbeat,
          time => time < 60000 ? 'healthy' as const :
                  time < 120000 ? 'degraded' as const : 'unhealthy' as const
        )
        
        return { ...status, health }
      }),
      distinctUntilChanged((a, b) => a.health === b.health)
    )
    
    // Example 7: Message pattern detection (currently unused but demonstrates functional patterns)
    chatService.messageHistory$.pipe(
      map(history => 
        pipe(
          history,
          A.takeRight(10), // Last 10 messages
          A.filter(msg => msg.type === 'user'),
          A.map(msg => msg.content.toLowerCase()),
          messages => {
            // Detect common patterns using functional approach
            const hasGreeting = pipe(
              messages,
              A.some(m => /hello|hi|hey|greetings/.test(m))
            )
            const hasQuestion = pipe(
              messages,
              A.some(m => /\?|how|what|when|where|why/.test(m))
            )
            const hasCommand = pipe(
              messages,
              A.some(m => /show|display|get|fetch|find/.test(m))
            )
            
            const patternCount = pipe(
              [hasGreeting, hasQuestion, hasCommand],
              A.filter(Boolean),
              A.size
            )
            
            return {
              hasGreeting,
              hasQuestion,
              hasCommand,
              patternCount
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
      chatService.messages$.pipe(scan((count: number, _) => count + 1, 0))
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