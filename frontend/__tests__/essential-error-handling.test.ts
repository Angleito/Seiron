import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pipe } from 'fp-ts/function'
import * as TE from 'fp-ts/TaskEither'
import * as E from 'fp-ts/Either'

// Mock network utilities
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Essential Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Network Failures', () => {
    it('should handle network connection errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      
      const networkRequest = TE.tryCatch(
        () => fetch('/api/test'),
        (error) => new Error(`Network failure: ${error}`)
      )

      const result = await networkRequest()
      
      expect(E.isLeft(result)).toBe(true)
      if (E.isLeft(result)) {
        expect(result.left.message).toContain('Network failure')
      }
    })

    it('should handle timeout scenarios', async () => {
      mockFetch.mockImplementationOnce(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      )

      const timeoutRequest = pipe(
        TE.tryCatch(
          () => fetch('/api/slow-endpoint'),
          (error) => new Error(`Timeout: ${error}`)
        ),
        TE.mapLeft(error => ({ type: 'TIMEOUT_ERROR', message: error.message }))
      )

      const result = await timeoutRequest()
      
      expect(E.isLeft(result)).toBe(true)
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('TIMEOUT_ERROR')
        expect(result.left.message).toContain('Timeout')
      }
    })
  })

  describe('Invalid API Responses', () => {
    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      })

      const parseResponse = TE.tryCatch(
        async () => {
          const response = await fetch('/api/data')
          return response.json()
        },
        (error) => new Error(`JSON parse error: ${error}`)
      )

      const result = await parseResponse()
      
      expect(E.isLeft(result)).toBe(true)
      if (E.isLeft(result)) {
        expect(result.left.message).toContain('JSON parse error')
      }
    })

    it('should handle HTTP error status codes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      const httpRequest = TE.tryCatch(
        async () => {
          const response = await fetch('/api/missing')
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          return response
        },
        (error) => error as Error
      )

      const result = await httpRequest()
      
      expect(E.isLeft(result)).toBe(true)
      if (E.isLeft(result)) {
        expect(result.left.message).toContain('HTTP 404')
      }
    })
  })

  describe('Input Validation', () => {
    it('should validate required fields', () => {
      const validateInput = (input: any): E.Either<Error, { name: string }> => {
        if (!input?.name || typeof input.name !== 'string') {
          return E.left(new Error('Name is required and must be a string'))
        }
        return E.right({ name: input.name })
      }

      const invalidInput = { age: 25 }
      const result = validateInput(invalidInput)
      
      expect(E.isLeft(result)).toBe(true)
      if (E.isLeft(result)) {
        expect(result.left.message).toContain('Name is required')
      }
    })

    it('should validate data types and formats', () => {
      const validateEmail = (email: string): E.Either<Error, string> => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          return E.left(new Error('Invalid email format'))
        }
        return E.right(email)
      }

      const invalidEmail = 'not-an-email'
      const result = validateEmail(invalidEmail)
      
      expect(E.isLeft(result)).toBe(true)
      if (E.isLeft(result)) {
        expect(result.left.message).toBe('Invalid email format')
      }
    })
  })

  describe('Async Error Composition', () => {
    it('should handle multiple async operations with error propagation', async () => {
      const failingOperation = TE.left(new Error('Operation failed'))
      const successOperation = TE.right('Success')

      const composedOperation = pipe(
        failingOperation,
        TE.chain(() => successOperation),
        TE.mapLeft(error => ({ type: 'COMPOSED_ERROR', original: error.message }))
      )

      const result = await composedOperation()
      
      expect(E.isLeft(result)).toBe(true)
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('COMPOSED_ERROR')
        expect(result.left.original).toBe('Operation failed')
      }
    })
  })
})