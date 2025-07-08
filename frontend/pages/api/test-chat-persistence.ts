import type { NextApiRequest, NextApiResponse } from 'next'
import { chatPersistenceService } from '@/services/chat-persistence.service'

/**
 * Test endpoint for chat persistence functionality
 * GET /api/test-chat-persistence
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = 'test-user-123'
  
  try {
    // Test 1: Get sessions
    const sessionsResult = await chatPersistenceService.getSessions(userId)()
    
    if (sessionsResult._tag === 'Left') {
      throw new Error(`Failed to get sessions: ${sessionsResult.left.message}`)
    }

    // Test 2: Create a new session
    const createResult = await chatPersistenceService.createSession(
      'Test Session',
      'This is a test session created by the API test',
      userId
    )()
    
    if (createResult._tag === 'Left') {
      throw new Error(`Failed to create session: ${createResult.left.message}`)
    }

    const newSession = createResult.right

    // Test 3: Get messages for the new session
    const messagesResult = await chatPersistenceService.getMessages(
      newSession.id,
      userId
    )()
    
    if (messagesResult._tag === 'Left') {
      throw new Error(`Failed to get messages: ${messagesResult.left.message}`)
    }

    // Test 4: Update the session
    const updateResult = await chatPersistenceService.updateSession(
      newSession.id,
      { title: 'Updated Test Session' },
      userId
    )()
    
    if (updateResult._tag === 'Left') {
      throw new Error(`Failed to update session: ${updateResult.left.message}`)
    }

    // Test 5: Archive the session
    const archiveResult = await chatPersistenceService.archiveSession(
      newSession.id,
      true,
      userId
    )()
    
    if (archiveResult._tag === 'Left') {
      throw new Error(`Failed to archive session: ${archiveResult.left.message}`)
    }

    // Test 6: Delete the session
    const deleteResult = await chatPersistenceService.deleteSession(
      newSession.id,
      userId
    )()
    
    if (deleteResult._tag === 'Left') {
      throw new Error(`Failed to delete session: ${deleteResult.left.message}`)
    }

    res.status(200).json({
      success: true,
      message: 'All chat persistence tests passed successfully',
      results: {
        sessionsCount: sessionsResult.right.sessions.length,
        createdSessionId: newSession.id,
        messagesCount: messagesResult.right.messages.length,
        testsCompleted: [
          'Get sessions',
          'Create session',
          'Get messages',
          'Update session',
          'Archive session',
          'Delete session'
        ]
      }
    })
  } catch (error) {
    console.error('Chat persistence test failed:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}