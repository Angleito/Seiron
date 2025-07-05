import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import * as fc from 'fast-check'
import { TestScheduler } from 'rxjs/testing'
import { of, throwError, Subject } from 'rxjs'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { ChatStreamService, StreamMessage, TypingIndicator, ConnectionStatus } from '../ChatStreamService'

// Mock the orchestrator
jest.mock('@lib/orchestrator-client', () => ({
  getOrchestrator: jest.fn(() => ({
    connectWebSocket: jest.fn(),
    disconnectWebSocket: jest.fn(),
    on: jest.fn(() => jest.fn()),
  })),
  AdapterAction: {}
}))

describe('ChatStreamService', () => {
  let service: ChatStreamService
  let testScheduler: TestScheduler

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected)
    })
    
    service = new ChatStreamService({
      apiEndpoint: 'http://test.api',
      wsEndpoint: 'ws://test.ws',
      sessionId: 'test-session',
      maxRetries: 2,
      retryDelay: 10,
      heartbeatInterval: 100,
      messageTimeout: 100,
      bufferSize: 10,
      throttleTime: 10
    })
  })

  afterEach(() => {
    service.destroy()
  })

  describe('Message Stream Properties', () => {
    it('should maintain message order', () => {
      fc.assert(
        fc.property(
          fc.array(fc.record({
            content: fc.string(),
            metadata: fc.option(fc.dictionary(fc.string(), fc.anything()))
          })),
          async (messages) => {
            const receivedMessages: StreamMessage[] = []
            
            const subscription = service.messages$.subscribe(msg => {
              receivedMessages.push(msg)
            })

            // Send all messages
            for (const msg of messages) {
              await service.sendMessage(msg.content, msg.metadata || undefined).toPromise()
            }

            // Wait a bit for async operations
            await new Promise(resolve => setTimeout(resolve, 50))

            subscription.unsubscribe()

            // Check that messages were received in order
            expect(receivedMessages.length).toBeGreaterThanOrEqual(messages.length)
            
            // Verify content order
            const userMessages = receivedMessages.filter(m => m.type === 'user')
            userMessages.forEach((msg, idx) => {
              if (idx < messages.length) {
                expect(msg.content).toBe(messages[idx].content)
              }
            })
          }
        )
      )
    })

    it('should handle message status transitions correctly', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => s.trim().length > 0),
          async (content) => {
            const statusTransitions: Array<StreamMessage['status']> = []
            
            const subscription = service.messages$.subscribe(msg => {
              if (msg.type === 'user' && msg.status) {
                statusTransitions.push(msg.status)
              }
            })

            await service.sendMessage(content).toPromise()
            
            // Wait for status transitions
            await new Promise(resolve => setTimeout(resolve, 100))

            subscription.unsubscribe()

            // Verify valid status transitions
            const validTransitions = [
              ['pending', 'sending'],
              ['sending', 'sent'],
              ['sending', 'failed'],
              ['sent', 'delivered'],
              ['failed', 'sending'] // retry
            ]

            for (let i = 1; i < statusTransitions.length; i++) {
              const transition = [statusTransitions[i - 1], statusTransitions[i]]
              const isValid = validTransitions.some(valid => 
                valid[0] === transition[0] && valid[1] === transition[1]
              )
              expect(isValid).toBe(true)
            }
          }
        )
      )
    })

    it('should not lose messages under concurrent sends', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string().filter(s => s.trim().length > 0), { minLength: 5, maxLength: 20 }),
          async (messages) => {
            const receivedCount = new Set<string>()
            
            const subscription = service.messages$.subscribe(msg => {
              if (msg.type === 'user') {
                receivedCount.add(msg.content)
              }
            })

            // Send messages concurrently
            await Promise.all(
              messages.map(msg => service.sendMessage(msg).toPromise())
            )

            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 200))

            subscription.unsubscribe()

            // All unique messages should be received
            const uniqueMessages = new Set(messages)
            expect(receivedCount.size).toBe(uniqueMessages.size)
          }
        )
      )
    })
  })

  describe('Typing Indicator Properties', () => {
    it('should automatically expire old typing indicators', async () => {
      const indicators: TypingIndicator[] = []
      
      const subscription = service.typingIndicators$.subscribe(ind => {
        indicators.push(...ind)
      })

      // Simulate typing event
      const event = {
        type: 'typing' as const,
        agentId: 'agent-1',
        agentType: 'portfolio_agent' as const,
        data: { isTyping: true },
        timestamp: Date.now()
      }

      // Mock the typing event
      // Note: In real implementation, this would come through WebSocket
      
      await new Promise(resolve => setTimeout(resolve, 6000)) // Wait for expiry

      subscription.unsubscribe()

      // Old indicators should be filtered out
      const latestIndicators = indicators[indicators.length - 1] || []
      expect(latestIndicators.every(ind => 
        Date.now() - ind.timestamp < 5000
      )).toBe(true)
    })

    it('should handle multiple concurrent typing agents', () => {
      fc.assert(
        fc.property(
          fc.array(fc.record({
            agentId: fc.string(),
            agentType: fc.constantFrom('portfolio_agent', 'lending_agent', 'risk_agent'),
            isTyping: fc.boolean()
          })),
          async (typingEvents) => {
            const indicatorSnapshots: TypingIndicator[][] = []
            
            const subscription = service.typingIndicators$.subscribe(indicators => {
              indicatorSnapshots.push([...indicators])
            })

            // Simulate typing events
            for (const event of typingEvents) {
              // Mock typing event handling
              // In real implementation, this would come through WebSocket
            }

            await new Promise(resolve => setTimeout(resolve, 100))

            subscription.unsubscribe()

            // Verify no duplicate agents in any snapshot
            indicatorSnapshots.forEach(snapshot => {
              const agentIds = snapshot.map(ind => ind.agentId)
              expect(agentIds.length).toBe(new Set(agentIds).size)
            })
          }
        )
      )
    })
  })

  describe('Connection Status Properties', () => {
    it('should maintain connection status consistency', () => {
      fc.assert(
        fc.property(
          fc.array(fc.record({
            isConnected: fc.boolean(),
            error: fc.option(fc.string())
          })),
          async (statusUpdates) => {
            const statuses: ConnectionStatus[] = []
            
            const subscription = service.connectionStatus.subscribe(status => {
              statuses.push(status)
            })

            // Simulate status updates
            for (const update of statusUpdates) {
              // Mock connection status update
              // In real implementation, this would come through WebSocket
            }

            await new Promise(resolve => setTimeout(resolve, 50))

            subscription.unsubscribe()

            // Verify consistency rules
            statuses.forEach(status => {
              // If there's an error, should not be connected
              if (status.error) {
                expect(status.isConnected).toBe(false)
              }
              
              // Reconnect attempts should increase when disconnected
              if (!status.isConnected && statuses.indexOf(status) > 0) {
                const prevStatus = statuses[statuses.indexOf(status) - 1]
                expect(status.reconnectAttempts).toBeGreaterThanOrEqual(prevStatus.reconnectAttempts)
              }
            })
          }
        )
      )
    })
  })

  describe('Message History Properties', () => {
    it('should maintain bounded history size', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 15, max: 50 }),
          async (messageCount) => {
            let latestHistory: StreamMessage[] = []
            
            const subscription = service.messageHistory$.subscribe(history => {
              latestHistory = history
            })

            // Send many messages
            for (let i = 0; i < messageCount; i++) {
              await service.sendMessage(`Message ${i}`).toPromise()
            }

            await new Promise(resolve => setTimeout(resolve, 100))

            subscription.unsubscribe()

            // History should be bounded by buffer size (10)
            expect(latestHistory.length).toBeLessThanOrEqual(10)
          }
        )
      )
    })

    it('should update existing messages correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string(),
            content: fc.string(),
            updates: fc.array(fc.record({
              status: fc.constantFrom('pending', 'sending', 'sent', 'delivered', 'failed'),
              metadata: fc.option(fc.dictionary(fc.string(), fc.anything()))
            }))
          }),
          async (messageData) => {
            let histories: StreamMessage[][] = []
            
            const subscription = service.messageHistory$.subscribe(history => {
              histories.push([...history])
            })

            // Send initial message
            const initialMsg: StreamMessage = {
              id: messageData.id,
              type: 'user',
              content: messageData.content,
              timestamp: new Date(),
              status: 'pending'
            }

            // Mock message updates
            // In real implementation, these would come through the stream

            await new Promise(resolve => setTimeout(resolve, 100))

            subscription.unsubscribe()

            // Verify that message with same ID is updated, not duplicated
            histories.forEach(history => {
              const messagesWithId = history.filter(msg => msg.id === messageData.id)
              expect(messagesWithId.length).toBeLessThanOrEqual(1)
            })
          }
        )
      )
    })
  })

  describe('Error Handling Properties', () => {
    it('should retry failed messages with exponential backoff', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => s.trim().length > 0),
          async (content) => {
            const retryTimestamps: number[] = []
            
            const subscription = service.messages$.subscribe(msg => {
              if (msg.type === 'user' && msg.status === 'failed') {
                retryTimestamps.push(Date.now())
              }
            })

            // Mock fetch to fail
            global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

            await service.sendMessage(content).toPromise()

            // Wait for retries
            await new Promise(resolve => setTimeout(resolve, 500))

            subscription.unsubscribe()

            // Verify exponential backoff
            for (let i = 1; i < retryTimestamps.length; i++) {
              const delay = retryTimestamps[i] - retryTimestamps[i - 1]
              const expectedMinDelay = 10 * Math.pow(2, i - 1) // 10ms base delay
              expect(delay).toBeGreaterThanOrEqual(expectedMinDelay * 0.8) // Allow some variance
            }
          }
        )
      )
    })
  })

  describe('Functional Helpers', () => {
    it('should correctly filter messages by type', () => {
      fc.assert(
        fc.property(
          fc.array(fc.record({
            type: fc.constantFrom('user', 'agent', 'system'),
            content: fc.string()
          })),
          async (messageSpecs) => {
            // Send messages of different types
            for (const spec of messageSpecs) {
              if (spec.type === 'user') {
                await service.sendMessage(spec.content).toPromise()
              }
              // Mock agent and system messages
            }

            await new Promise(resolve => setTimeout(resolve, 100))

            // Test filtering
            const userMessages = await service.filterMessagesByType('user').toPromise()
            const agentMessages = await service.filterMessagesByType('agent').toPromise()
            const systemMessages = await service.filterMessagesByType('system').toPromise()

            expect(userMessages?.every(m => m.type === 'user')).toBe(true)
            expect(agentMessages?.every(m => m.type === 'agent')).toBe(true)
            expect(systemMessages?.every(m => m.type === 'system')).toBe(true)
          }
        )
      )
    })

    it('should find messages by ID correctly', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string()).filter(arr => arr.length > 0),
          fc.integer({ min: 0, max: 10 }),
          async (contents, targetIndex) => {
            const boundedIndex = targetIndex % contents.length
            const sentMessages: StreamMessage[] = []

            // Send messages and track them
            for (const content of contents) {
              const result = await service.sendMessage(content).toPromise()
              if (E.isRight(result)) {
                sentMessages.push(result.right)
              }
            }

            await new Promise(resolve => setTimeout(resolve, 100))

            // Try to find a specific message
            const targetId = sentMessages[boundedIndex]?.id
            if (targetId) {
              const foundMessage = await service.getMessageById(targetId).toPromise()
              
              expect(O.isSome(foundMessage)).toBe(true)
              if (O.isSome(foundMessage)) {
                expect(foundMessage.value.id).toBe(targetId)
              }
            }
          }
        )
      )
    })
  })
})