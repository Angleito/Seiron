import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validation
if (!supabaseUrl) {
  const error = 'VITE_SUPABASE_URL is not defined in environment variables'
  logger.error('Supabase configuration error:', { error })
  throw new Error(error)
}

if (!supabaseAnonKey) {
  const error = 'VITE_SUPABASE_ANON_KEY is not defined in environment variables'
  logger.error('Supabase configuration error:', { error })
  throw new Error(error)
}

// Create and configure Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'seiron-supabase-auth',
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  db: {
    schema: 'public',
  },
})

// Log successful initialization
logger.info('Supabase client initialized successfully', {
  url: supabaseUrl,
  timestamp: Date.now(),
  features: {
    auth: true,
    realtime: true,
    database: true,
  },
})

// Export configured client
export { supabase }
export default supabase

// Utility functions for common operations
export const supabaseHelpers = {
  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    const { data: { user } } = await supabase.auth.getUser()
    return !!user
  },

  /**
   * Get current user
   */
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      logger.error('Error getting current user:', error)
      return null
    }
    return user
  },

  /**
   * Sign out user
   */
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      logger.error('Error signing out:', error)
      throw error
    }
    logger.info('User signed out successfully')
  },

  /**
   * Get session
   */
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      logger.error('Error getting session:', error)
      return null
    }
    return session
  },

  /**
   * Subscribe to auth changes
   */
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  },

  /**
   * Create a typed database query helper
   */
  from(table) {
    return supabase.from(table)
  },

  /**
   * Storage helpers
   */
  storage: {
    from(bucket) {
      return supabase.storage.from(bucket)
    },
  },
}