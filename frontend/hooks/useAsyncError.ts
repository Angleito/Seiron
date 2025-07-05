import { useCallback } from 'react'

/**
 * Hook for handling async errors that should be caught by error boundaries.
 * 
 * Usage:
 * ```typescript
 * const throwError = useAsyncError()
 * 
 * try {
 *   await someAsyncOperation()
 * } catch (error) {
 *   throwError(error)
 * }
 * ```
 */
export function useAsyncError() {
  return useCallback((error: Error | unknown) => {
    // Ensure the error is an Error instance
    const errorToThrow = error instanceof Error 
      ? error 
      : new Error(String(error))
    
    // Throw the error in a way that React's error boundaries can catch
    throw errorToThrow
  }, [])
}

/**
 * Higher-order function that wraps an async function to handle errors
 * and throw them to the nearest error boundary.
 * 
 * Usage:
 * ```typescript
 * const safeAsyncFunction = withAsyncErrorBoundary(async () => {
 *   // Your async code here
 * })
 * ```
 */
export function withAsyncErrorBoundary<T extends (...args: unknown[]) => Promise<unknown>>(
  asyncFn: T
): T {
  return (async (...args) => {
    try {
      return await asyncFn(...args)
    } catch (error) {
      // Re-throw the error synchronously so error boundaries can catch it
      setTimeout(() => {
        throw error instanceof Error ? error : new Error(String(error))
      }, 0)
      
      // Also throw it here for immediate handling
      throw error
    }
  }) as T
}