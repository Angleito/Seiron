/**
 * Conversation memory property tests
 * Tests memory consistency, search functionality, and data persistence
 */

import * as fc from 'fast-check'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import {
  arbitraryConversation,
  arbitraryVoiceText,
  arbitraryTranscript,
  arbitraryConfidence,
  arbitraryVoiceSessionData,
  arbitraryUserInteractionSequence,
  arbitraryConcurrentUserScenario,
  arbitraryPerformanceConstraint
} from '../../lib/test-utils/voice-generators'

// Memory interfaces
interface ConversationMessage {
  id: string
  sessionId: string
  speaker: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  confidence?: number
  metadata?: Record<string, any>
}

interface ConversationSession {
  id: string
  userId: string
  title: string
  startTime: number
  endTime?: number
  messageCount: number
  lastActivity: number
  metadata?: Record<string, any>
}

interface MemorySearchQuery {
  sessionId?: string
  speaker?: string
  content?: string
  timeRange?: { start: number; end: number }
  minConfidence?: number
  limit?: number
  offset?: number
}

interface MemorySearchResult {
  messages: ConversationMessage[]
  totalCount: number
  hasMore: boolean
}

// Mock conversation memory implementation
class MockConversationMemory {
  private messages: Map<string, ConversationMessage> = new Map()
  private sessions: Map<string, ConversationSession> = new Map()
  private indices: {
    bySession: Map<string, Set<string>>
    byContent: Map<string, Set<string>>
    bySpeaker: Map<string, Set<string>>
    byTimestamp: Array<{ timestamp: number; messageId: string }>
  } = {
    bySession: new Map(),
    byContent: new Map(),
    bySpeaker: new Map(),
    byTimestamp: []
  }

  async saveMessage(message: ConversationMessage): Promise<E.Either<Error, void>> {
    try {
      // Validate message
      if (!message.id || !message.sessionId || !message.content.trim()) {
        return E.left(new Error('Invalid message data'))
      }

      // Store message
      this.messages.set(message.id, { ...message })

      // Update indices
      this.updateIndices(message)

      // Update session
      await this.updateSession(message)

      return E.right(undefined)
    } catch (error) {
      return E.left(error as Error)
    }
  }

  async getMessages(sessionId: string): Promise<E.Either<Error, ConversationMessage[]>> {
    try {
      const messageIds = this.indices.bySession.get(sessionId) || new Set()
      const messages = Array.from(messageIds)
        .map(id => this.messages.get(id))
        .filter((msg): msg is ConversationMessage => msg !== undefined)
        .sort((a, b) => a.timestamp - b.timestamp)

      return E.right(messages)
    } catch (error) {
      return E.left(error as Error)
    }
  }

  async searchMessages(query: MemorySearchQuery): Promise<E.Either<Error, MemorySearchResult>> {
    try {
      let candidateIds = new Set<string>()

      // Start with all messages or filter by session
      if (query.sessionId) {
        candidateIds = this.indices.bySession.get(query.sessionId) || new Set()
      } else {
        candidateIds = new Set(this.messages.keys())
      }

      // Filter by speaker
      if (query.speaker) {
        const speakerIds = this.indices.bySpeaker.get(query.speaker) || new Set()
        candidateIds = new Set([...candidateIds].filter(id => speakerIds.has(id)))
      }

      // Filter by content
      if (query.content) {
        const contentTokens = query.content.toLowerCase().split(/\s+/)
        candidateIds = new Set([...candidateIds].filter(id => {
          const message = this.messages.get(id)
          if (!message) return false
          const messageContent = message.content.toLowerCase()
          return contentTokens.every(token => messageContent.includes(token))
        }))
      }

      // Convert to messages and apply additional filters
      let messages = Array.from(candidateIds)
        .map(id => this.messages.get(id))
        .filter((msg): msg is ConversationMessage => msg !== undefined)

      // Filter by time range
      if (query.timeRange) {
        messages = messages.filter(msg => 
          msg.timestamp >= query.timeRange!.start && 
          msg.timestamp <= query.timeRange!.end
        )
      }

      // Filter by confidence
      if (query.minConfidence !== undefined) {
        messages = messages.filter(msg => 
          msg.confidence !== undefined && msg.confidence >= query.minConfidence!
        )
      }

      // Sort by timestamp
      messages.sort((a, b) => b.timestamp - a.timestamp) // Most recent first

      // Apply pagination
      const totalCount = messages.length
      const offset = query.offset || 0
      const limit = query.limit || 50
      const paginatedMessages = messages.slice(offset, offset + limit)

      return E.right({
        messages: paginatedMessages,
        totalCount,
        hasMore: offset + limit < totalCount
      })
    } catch (error) {
      return E.left(error as Error)
    }
  }

  async createSession(session: ConversationSession): Promise<E.Either<Error, void>> {
    try {
      if (!session.id || !session.userId) {
        return E.left(new Error('Invalid session data'))
      }

      this.sessions.set(session.id, { ...session })
      this.indices.bySession.set(session.id, new Set())

      return E.right(undefined)
    } catch (error) {
      return E.left(error as Error)
    }
  }

  async getSession(sessionId: string): Promise<E.Either<Error, O.Option<ConversationSession>>> {
    try {
      const session = this.sessions.get(sessionId)
      return E.right(session ? O.some(session) : O.none)
    } catch (error) {
      return E.left(error as Error)
    }
  }

  async deleteSession(sessionId: string): Promise<E.Either<Error, void>> {
    try {
      // Get all messages in session
      const messageIds = this.indices.bySession.get(sessionId) || new Set()
      
      // Delete messages
      messageIds.forEach(id => {
        const message = this.messages.get(id)
        if (message) {
          this.removeFromIndices(message)
          this.messages.delete(id)
        }
      })

      // Delete session
      this.sessions.delete(sessionId)
      this.indices.bySession.delete(sessionId)

      return E.right(undefined)
    } catch (error) {
      return E.left(error as Error)
    }
  }

  async updateMessage(messageId: string, updates: Partial<ConversationMessage>): Promise<E.Either<Error, void>> {
    try {
      const existing = this.messages.get(messageId)
      if (!existing) {
        return E.left(new Error('Message not found'))
      }

      // Remove old indices
      this.removeFromIndices(existing)

      // Apply updates
      const updated = { ...existing, ...updates }
      this.messages.set(messageId, updated)

      // Update indices
      this.updateIndices(updated)

      return E.right(undefined)
    } catch (error) {
      return E.left(error as Error)
    }
  }

  getStats() {
    return {
      totalMessages: this.messages.size,
      totalSessions: this.sessions.size,
      indexSizes: {
        bySession: this.indices.bySession.size,
        byContent: this.indices.byContent.size,
        bySpeaker: this.indices.bySpeaker.size,
        byTimestamp: this.indices.byTimestamp.length
      }
    }
  }

  clear() {
    this.messages.clear()
    this.sessions.clear()
    this.indices.bySession.clear()
    this.indices.byContent.clear()
    this.indices.bySpeaker.clear()
    this.indices.byTimestamp = []
  }

  private updateIndices(message: ConversationMessage) {
    // Session index
    if (!this.indices.bySession.has(message.sessionId)) {
      this.indices.bySession.set(message.sessionId, new Set())
    }
    this.indices.bySession.get(message.sessionId)!.add(message.id)

    // Speaker index
    if (!this.indices.bySpeaker.has(message.speaker)) {
      this.indices.bySpeaker.set(message.speaker, new Set())
    }
    this.indices.bySpeaker.get(message.speaker)!.add(message.id)

    // Content index (simple word-based)
    const words = message.content.toLowerCase().split(/\s+/)
    words.forEach(word => {
      if (word.length > 2) { // Skip very short words
        if (!this.indices.byContent.has(word)) {
          this.indices.byContent.set(word, new Set())
        }
        this.indices.byContent.get(word)!.add(message.id)
      }
    })

    // Timestamp index
    this.indices.byTimestamp.push({ timestamp: message.timestamp, messageId: message.id })
    this.indices.byTimestamp.sort((a, b) => a.timestamp - b.timestamp)
  }

  private removeFromIndices(message: ConversationMessage) {
    // Remove from session index
    this.indices.bySession.get(message.sessionId)?.delete(message.id)

    // Remove from speaker index
    this.indices.bySpeaker.get(message.speaker)?.delete(message.id)

    // Remove from content index
    const words = message.content.toLowerCase().split(/\s+/)
    words.forEach(word => {
      this.indices.byContent.get(word)?.delete(message.id)
    })

    // Remove from timestamp index
    this.indices.byTimestamp = this.indices.byTimestamp.filter(
      entry => entry.messageId !== message.id
    )
  }

  private async updateSession(message: ConversationMessage) {
    const session = this.sessions.get(message.sessionId)
    if (session) {
      session.messageCount++
      session.lastActivity = Math.max(session.lastActivity, message.timestamp)
    }
  }
}

describe('Conversation Memory Properties', () => {
  let memory: MockConversationMemory

  beforeEach(() => {
    memory = new MockConversationMemory()
  })

  describe('Message Storage Properties', () => {
    it('should store and retrieve any valid message', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuidV(4),
            sessionId: fc.uuidV(4),
            speaker: fc.constantFrom('user', 'assistant', 'system'),
            content: arbitraryVoiceText.filter(text => text.trim().length > 0),
            timestamp: fc.date().map(d => d.getTime()),
            confidence: fc.option(arbitraryConfidence),
            metadata: fc.option(fc.dictionary(fc.string(), fc.anything()))
          }),
          async (message) => {
            const saveResult = await memory.saveMessage(message)
            expect(E.isRight(saveResult)).toBe(true)

            const retrieveResult = await memory.getMessages(message.sessionId)
            expect(E.isRight(retrieveResult)).toBe(true)

            if (E.isRight(retrieveResult)) {
              const messages = retrieveResult.right
              const savedMessage = messages.find(m => m.id === message.id)
              
              expect(savedMessage).toBeDefined()
              expect(savedMessage?.content).toBe(message.content)
              expect(savedMessage?.speaker).toBe(message.speaker)
              expect(savedMessage?.timestamp).toBe(message.timestamp)
              
              if (message.confidence !== undefined) {
                expect(savedMessage?.confidence).toBe(message.confidence)
              }
            }
          }
        )
      )
    })

    it('should maintain message order consistently', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuidV(4),
              sessionId: fc.constant('test-session'),
              speaker: fc.constantFrom('user', 'assistant'),
              content: arbitraryVoiceText.filter(text => text.trim().length > 0),
              timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }).map(d => d.getTime())
            }),
            { minLength: 2, maxLength: 20 }
          ),
          async (messages) => {
            // Save all messages
            for (const message of messages) {
              await memory.saveMessage(message)
            }

            const result = await memory.getMessages('test-session')
            expect(E.isRight(result)).toBe(true)

            if (E.isRight(result)) {
              const retrieved = result.right
              
              // Should be ordered by timestamp
              for (let i = 1; i < retrieved.length; i++) {
                expect(retrieved[i].timestamp).toBeGreaterThanOrEqual(retrieved[i-1].timestamp)
              }

              // All messages should be present
              expect(retrieved.length).toBe(messages.length)
            }
          }
        )
      )
    })

    it('should handle duplicate messages correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuidV(4),
            sessionId: fc.uuidV(4),
            speaker: fc.constantFrom('user', 'assistant'),
            content: arbitraryVoiceText.filter(text => text.trim().length > 0),
            timestamp: fc.date().map(d => d.getTime())
          }),
          async (message) => {
            // Save message twice
            const firstSave = await memory.saveMessage(message)
            const secondSave = await memory.saveMessage(message)

            expect(E.isRight(firstSave)).toBe(true)
            expect(E.isRight(secondSave)).toBe(true)

            const result = await memory.getMessages(message.sessionId)
            expect(E.isRight(result)).toBe(true)

            if (E.isRight(result)) {
              // Should only have one copy (latest overwrites)
              const messages = result.right
              const duplicates = messages.filter(m => m.id === message.id)
              expect(duplicates.length).toBe(1)
            }
          }
        )
      )
    })
  })

  describe('Search Functionality Properties', () => {
    it('should find messages by content correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuidV(4),
              sessionId: fc.uuidV(4),
              speaker: fc.constantFrom('user', 'assistant'),
              content: fc.oneof(
                fc.constant('Hello world'),
                fc.constant('How are you today'),
                fc.constant('The weather is nice'),
                fc.constant('I need help with programming'),
                fc.constant('Thank you very much')
              ),
              timestamp: fc.date().map(d => d.getTime())
            }),
            { minLength: 5, maxLength: 15 }
          ),
          async (messages) => {
            // Save all messages
            for (const message of messages) {
              await memory.saveMessage(message)
            }

            // Search for specific content
            const searchTerms = ['hello', 'help', 'weather', 'thank']
            
            for (const term of searchTerms) {
              const searchResult = await memory.searchMessages({ content: term })
              expect(E.isRight(searchResult)).toBe(true)

              if (E.isRight(searchResult)) {
                const found = searchResult.right.messages
                
                // All found messages should contain the search term
                found.forEach(msg => {
                  expect(msg.content.toLowerCase()).toContain(term.toLowerCase())
                })

                // Count should match the actual occurrences
                const expectedCount = messages.filter(m => 
                  m.content.toLowerCase().includes(term.toLowerCase())
                ).length
                
                expect(searchResult.right.totalCount).toBe(expectedCount)
              }
            }
          }
        )
      )
    })

    it('should filter by speaker correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuidV(4),
              sessionId: fc.constant('test-session'),
              speaker: fc.constantFrom('user', 'assistant', 'system'),
              content: arbitraryVoiceText.filter(text => text.trim().length > 0),
              timestamp: fc.date().map(d => d.getTime())
            }),
            { minLength: 5, maxLength: 20 }
          ),
          async (messages) => {
            // Save all messages
            for (const message of messages) {
              await memory.saveMessage(message)
            }

            // Search by each speaker type
            const speakers: Array<'user' | 'assistant' | 'system'> = ['user', 'assistant', 'system']
            
            for (const speaker of speakers) {
              const searchResult = await memory.searchMessages({ speaker })
              expect(E.isRight(searchResult)).toBe(true)

              if (E.isRight(searchResult)) {
                const found = searchResult.right.messages
                
                // All found messages should be from the specified speaker
                found.forEach(msg => {
                  expect(msg.speaker).toBe(speaker)
                })

                // Count should match
                const expectedCount = messages.filter(m => m.speaker === speaker).length
                expect(searchResult.right.totalCount).toBe(expectedCount)
              }
            }
          }
        )
      )
    })

    it('should handle time range searches correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuidV(4),
              sessionId: fc.constant('test-session'),
              speaker: fc.constantFrom('user', 'assistant'),
              content: arbitraryVoiceText.filter(text => text.trim().length > 0),
              timestamp: fc.integer({ min: 1000000000000, max: 2000000000000 }) // Valid timestamp range
            }),
            { minLength: 10, maxLength: 30 }
          ),
          async (messages) => {
            // Save all messages
            for (const message of messages) {
              await memory.saveMessage(message)
            }

            // Get timestamp range
            const timestamps = messages.map(m => m.timestamp).sort((a, b) => a - b)
            const midPoint = Math.floor(timestamps.length / 2)
            const timeRange = {
              start: timestamps[Math.floor(midPoint / 2)],
              end: timestamps[midPoint + Math.floor(midPoint / 2)]
            }

            const searchResult = await memory.searchMessages({ timeRange })
            expect(E.isRight(searchResult)).toBe(true)

            if (E.isRight(searchResult)) {
              const found = searchResult.right.messages
              
              // All found messages should be within the time range
              found.forEach(msg => {
                expect(msg.timestamp).toBeGreaterThanOrEqual(timeRange.start)
                expect(msg.timestamp).toBeLessThanOrEqual(timeRange.end)
              })

              // Count should match expected
              const expectedCount = messages.filter(m => 
                m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
              ).length
              
              expect(searchResult.right.totalCount).toBe(expectedCount)
            }
          }
        )
      )
    })

    it('should handle pagination correctly', () => {
      fc.assert(
        fc.property(
          fc.nat({ min: 20, max: 100 }),
          fc.nat({ min: 5, max: 20 }),
          async (totalMessages, pageSize) => {
            const sessionId = 'test-session'
            
            // Create and save messages
            const messages = Array.from({ length: totalMessages }, (_, i) => ({
              id: `msg-${i}`,
              sessionId,
              speaker: i % 2 === 0 ? 'user' as const : 'assistant' as const,
              content: `Message ${i}`,
              timestamp: Date.now() + i * 1000
            }))

            for (const message of messages) {
              await memory.saveMessage(message)
            }

            // Test pagination
            let retrievedCount = 0
            let offset = 0
            let hasMore = true

            while (hasMore && retrievedCount < totalMessages) {
              const searchResult = await memory.searchMessages({
                sessionId,
                limit: pageSize,
                offset
              })

              expect(E.isRight(searchResult)).toBe(true)

              if (E.isRight(searchResult)) {
                const page = searchResult.right
                
                expect(page.totalCount).toBe(totalMessages)
                expect(page.messages.length).toBeLessThanOrEqual(pageSize)
                
                // Messages should not overlap with previous pages
                page.messages.forEach(msg => {
                  expect(parseInt(msg.id.split('-')[1])).toBeDefined()
                })

                retrievedCount += page.messages.length
                offset += pageSize
                hasMore = page.hasMore
                
                // If we haven't retrieved all messages, there should be more
                if (retrievedCount < totalMessages) {
                  expect(hasMore).toBe(true)
                }
              }
            }

            expect(retrievedCount).toBe(totalMessages)
          }
        )
      )
    })
  })

  describe('Session Management Properties', () => {
    it('should manage sessions correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuidV(4),
            userId: fc.uuidV(4),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            startTime: fc.date().map(d => d.getTime()),
            metadata: fc.option(fc.dictionary(fc.string(), fc.anything()))
          }),
          async (session) => {
            const sessionData: ConversationSession = {
              ...session,
              messageCount: 0,
              lastActivity: session.startTime
            }

            // Create session
            const createResult = await memory.createSession(sessionData)
            expect(E.isRight(createResult)).toBe(true)

            // Retrieve session
            const getResult = await memory.getSession(session.id)
            expect(E.isRight(getResult)).toBe(true)

            if (E.isRight(getResult)) {
              expect(O.isSome(getResult.right)).toBe(true)
              if (O.isSome(getResult.right)) {
                const retrieved = getResult.right.value
                expect(retrieved.id).toBe(session.id)
                expect(retrieved.userId).toBe(session.userId)
                expect(retrieved.title).toBe(session.title)
                expect(retrieved.startTime).toBe(session.startTime)
              }
            }
          }
        )
      )
    })

    it('should update session statistics correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            sessionId: fc.uuidV(4),
            userId: fc.uuidV(4),
            messages: fc.array(
              fc.record({
                id: fc.uuidV(4),
                speaker: fc.constantFrom('user', 'assistant'),
                content: arbitraryVoiceText.filter(text => text.trim().length > 0),
                timestamp: fc.date().map(d => d.getTime())
              }),
              { minLength: 1, maxLength: 10 }
            )
          }),
          async ({ sessionId, userId, messages }) => {
            // Create session
            const session: ConversationSession = {
              id: sessionId,
              userId,
              title: 'Test Session',
              startTime: Date.now(),
              messageCount: 0,
              lastActivity: Date.now()
            }

            await memory.createSession(session)

            // Add messages
            for (const msgData of messages) {
              const message: ConversationMessage = {
                ...msgData,
                sessionId
              }
              await memory.saveMessage(message)
            }

            // Check session was updated
            const getResult = await memory.getSession(sessionId)
            expect(E.isRight(getResult)).toBe(true)

            if (E.isRight(getResult) && O.isSome(getResult.right)) {
              const updatedSession = getResult.right.value
              expect(updatedSession.messageCount).toBe(messages.length)
              
              // Last activity should be the latest message timestamp
              const latestTimestamp = Math.max(...messages.map(m => m.timestamp))
              expect(updatedSession.lastActivity).toBeGreaterThanOrEqual(latestTimestamp)
            }
          }
        )
      )
    })

    it('should delete sessions and associated messages correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            sessionId: fc.uuidV(4),
            userId: fc.uuidV(4),
            messages: fc.array(
              fc.record({
                id: fc.uuidV(4),
                speaker: fc.constantFrom('user', 'assistant'),
                content: arbitraryVoiceText.filter(text => text.trim().length > 0),
                timestamp: fc.date().map(d => d.getTime())
              }),
              { minLength: 1, maxLength: 10 }
            )
          }),
          async ({ sessionId, userId, messages }) => {
            // Create session and messages
            const session: ConversationSession = {
              id: sessionId,
              userId,
              title: 'Test Session',
              startTime: Date.now(),
              messageCount: 0,
              lastActivity: Date.now()
            }

            await memory.createSession(session)

            for (const msgData of messages) {
              await memory.saveMessage({ ...msgData, sessionId })
            }

            // Verify everything exists
            const beforeStats = memory.getStats()
            expect(beforeStats.totalSessions).toBeGreaterThan(0)
            expect(beforeStats.totalMessages).toBe(messages.length)

            // Delete session
            const deleteResult = await memory.deleteSession(sessionId)
            expect(E.isRight(deleteResult)).toBe(true)

            // Verify session is gone
            const getSessionResult = await memory.getSession(sessionId)
            expect(E.isRight(getSessionResult)).toBe(true)
            if (E.isRight(getSessionResult)) {
              expect(O.isNone(getSessionResult.right)).toBe(true)
            }

            // Verify messages are gone
            const getMessagesResult = await memory.getMessages(sessionId)
            expect(E.isRight(getMessagesResult)).toBe(true)
            if (E.isRight(getMessagesResult)) {
              expect(getMessagesResult.right.length).toBe(0)
            }

            // Verify stats updated
            const afterStats = memory.getStats()
            expect(afterStats.totalMessages).toBe(0)
          }
        )
      )
    })
  })

  describe('Data Consistency Properties', () => {
    it('should maintain referential integrity', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              sessionId: fc.uuidV(4),
              userId: fc.uuidV(4),
              messageId: fc.uuidV(4),
              content: arbitraryVoiceText.filter(text => text.trim().length > 0),
              timestamp: fc.date().map(d => d.getTime())
            }),
            { minLength: 5, maxLength: 15 }
          ),
          async (data) => {
            // Create sessions for unique session IDs
            const uniqueSessionIds = [...new Set(data.map(d => d.sessionId))]
            for (const sessionId of uniqueSessionIds) {
              const sessionData = data.find(d => d.sessionId === sessionId)!
              await memory.createSession({
                id: sessionId,
                userId: sessionData.userId,
                title: `Session ${sessionId}`,
                startTime: Date.now(),
                messageCount: 0,
                lastActivity: Date.now()
              })
            }

            // Add messages
            for (const item of data) {
              await memory.saveMessage({
                id: item.messageId,
                sessionId: item.sessionId,
                speaker: 'user',
                content: item.content,
                timestamp: item.timestamp
              })
            }

            // Verify all messages belong to existing sessions
            for (const sessionId of uniqueSessionIds) {
              const messagesResult = await memory.getMessages(sessionId)
              expect(E.isRight(messagesResult)).toBe(true)

              if (E.isRight(messagesResult)) {
                const messages = messagesResult.right
                const expectedMessages = data.filter(d => d.sessionId === sessionId)
                expect(messages.length).toBe(expectedMessages.length)

                // All messages should reference the correct session
                messages.forEach(msg => {
                  expect(msg.sessionId).toBe(sessionId)
                })
              }
            }
          }
        )
      )
    })

    it('should handle concurrent operations correctly', () => {
      fc.assert(
        fc.property(arbitraryConcurrentUserScenario, async (scenario) => {
          const operations = scenario.users.slice(0, 5).map(async (user, index) => {
            const sessionId = user.sessionId
            const userId = user.userId

            // Create session
            await memory.createSession({
              id: sessionId,
              userId,
              title: `User ${index} Session`,
              startTime: Date.now(),
              messageCount: 0,
              lastActivity: Date.now()
            })

            // Add messages
            const messages = Array.from({ length: 3 }, (_, i) => ({
              id: `${userId}-msg-${i}`,
              sessionId,
              speaker: 'user' as const,
              content: `Message ${i} from user ${index}`,
              timestamp: Date.now() + i
            }))

            for (const message of messages) {
              await memory.saveMessage(message)
            }

            return { sessionId, messageCount: messages.length }
          })

          const results = await Promise.all(operations)

          // Verify all operations completed successfully
          expect(results.length).toBe(Math.min(scenario.users.length, 5))

          // Check final state consistency
          const stats = memory.getStats()
          expect(stats.totalSessions).toBe(results.length)
          expect(stats.totalMessages).toBe(results.reduce((sum, r) => sum + r.messageCount, 0))
        })
      )
    })
  })

  describe('Performance Properties', () => {
    it('should maintain reasonable performance with large datasets', () => {
      fc.assert(
        fc.property(arbitraryPerformanceConstraint, async (constraints) => {
          const messageCount = Math.min(constraints.maxMemoryUsage || 100, 100) // Limit for test performance
          
          const messages = Array.from({ length: messageCount }, (_, i) => ({
            id: `msg-${i}`,
            sessionId: 'perf-test-session',
            speaker: i % 2 === 0 ? 'user' as const : 'assistant' as const,
            content: `Performance test message ${i}`,
            timestamp: Date.now() + i
          }))

          // Create session
          await memory.createSession({
            id: 'perf-test-session',
            userId: 'perf-test-user',
            title: 'Performance Test',
            startTime: Date.now(),
            messageCount: 0,
            lastActivity: Date.now()
          })

          // Measure insertion time
          const insertStart = Date.now()
          for (const message of messages) {
            await memory.saveMessage(message)
          }
          const insertEnd = Date.now()

          const insertTime = insertEnd - insertStart
          const avgInsertTime = insertTime / messageCount

          // Should insert efficiently
          expect(avgInsertTime).toBeLessThan(constraints.maxLatency || 50) // Max 50ms per message

          // Measure search time
          const searchStart = Date.now()
          const searchResult = await memory.searchMessages({
            sessionId: 'perf-test-session',
            content: 'performance'
          })
          const searchEnd = Date.now()

          const searchTime = searchEnd - searchStart
          expect(searchTime).toBeLessThan(constraints.maxLatency || 100) // Max 100ms for search

          expect(E.isRight(searchResult)).toBe(true)
          if (E.isRight(searchResult)) {
            expect(searchResult.right.totalCount).toBe(messageCount)
          }
        })
      )
    })

    it('should handle memory efficiently', () => {
      fc.assert(
        fc.property(
          fc.nat({ min: 10, max: 100 }),
          async (sessionCount) => {
            const initialStats = memory.getStats()
            
            // Create multiple sessions with messages
            for (let i = 0; i < sessionCount; i++) {
              const sessionId = `session-${i}`
              await memory.createSession({
                id: sessionId,
                userId: `user-${i}`,
                title: `Session ${i}`,
                startTime: Date.now(),
                messageCount: 0,
                lastActivity: Date.now()
              })

              // Add a few messages per session
              for (let j = 0; j < 5; j++) {
                await memory.saveMessage({
                  id: `msg-${i}-${j}`,
                  sessionId,
                  speaker: j % 2 === 0 ? 'user' : 'assistant',
                  content: `Message ${j} in session ${i}`,
                  timestamp: Date.now() + j
                })
              }
            }

            const finalStats = memory.getStats()
            
            // Check growth is reasonable
            expect(finalStats.totalSessions).toBe(sessionCount)
            expect(finalStats.totalMessages).toBe(sessionCount * 5)
            
            // Index sizes should be proportional
            expect(finalStats.indexSizes.bySession).toBe(sessionCount)
            expect(finalStats.indexSizes.bySpeaker).toBeLessThanOrEqual(2) // 'user' and 'assistant'
            expect(finalStats.indexSizes.byTimestamp).toBe(sessionCount * 5)
          }
        )
      )
    })
  })
})