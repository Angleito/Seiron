/**
 * API retry utility with exponential backoff and request debouncing
 */

interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffFactor?: number
  onRetry?: (attempt: number, error: Error) => void
}

interface RequestCache {
  promise: Promise<Response>
  timestamp: number
}

// Request cache to prevent duplicate requests
const requestCache = new Map<string, RequestCache>()
const CACHE_DURATION = 1000 // 1 second

/**
 * Fetch with retry logic and exponential backoff
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 32000,
    backoffFactor = 2,
    onRetry
  } = retryOptions

  // Create cache key from URL and method
  const cacheKey = `${options.method || 'GET'}:${url}`
  
  // Check cache for recent identical requests
  const cached = requestCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`[API Retry] Using cached request for ${cacheKey}`)
    return cached.promise
  }

  // Create new request promise
  const requestPromise = executeWithRetry()
  
  // Cache the request
  requestCache.set(cacheKey, {
    promise: requestPromise,
    timestamp: Date.now()
  })

  // Clean up old cache entries
  setTimeout(() => {
    requestCache.delete(cacheKey)
  }, CACHE_DURATION)

  return requestPromise

  async function executeWithRetry(): Promise<Response> {
    let lastError: Error = new Error('Unknown error')
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options)
        
        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
          return response
        }
        
        // For server errors or rate limits, throw to trigger retry
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
      }
      
      // Don't retry after the last attempt
      if (attempt < maxRetries) {
        const delay = Math.min(initialDelay * Math.pow(backoffFactor, attempt), maxDelay)
        
        if (onRetry) {
          onRetry(attempt + 1, lastError)
        }
        
        console.log(`[API Retry] Attempt ${attempt + 1}/${maxRetries} failed for ${url}. Retrying in ${delay}ms...`, lastError.message)
        
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    console.error(`[API Retry] All ${maxRetries} retry attempts failed for ${url}`)
    throw lastError
  }
}

/**
 * Clear the request cache (useful for testing or forcing fresh requests)
 */
export function clearRequestCache(): void {
  requestCache.clear()
}