import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js'
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
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
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

// Type definitions for common operations
export interface SupabaseAuthResponse {
  user: User | null
  session: Session | null
  error: Error | null
}

export interface SupabaseQueryBuilder<T = any> {
  select: (columns?: string) => SupabaseQueryBuilder<T>
  insert: (values: Partial<T> | Partial<T>[]) => SupabaseQueryBuilder<T>
  update: (values: Partial<T>) => SupabaseQueryBuilder<T>
  delete: () => SupabaseQueryBuilder<T>
  eq: (column: string, value: any) => SupabaseQueryBuilder<T>
  single: () => Promise<{ data: T | null; error: Error | null }>
}

// Utility functions for common operations
export const supabaseHelpers = {
  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    return !!user
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
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
  async signOut(): Promise<void> {
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
  async getSession(): Promise<Session | null> {
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
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback)
  },

  /**
   * Create a typed database query helper
   */
  from<T = any>(table: string): SupabaseQueryBuilder<T> {
    return supabase.from(table) as any
  },

  /**
   * Storage helpers
   */
  storage: {
    from(bucket: string) {
      return supabase.storage.from(bucket)
    },
  },

  /**
   * Realtime helpers
   */
  realtime: {
    channel(name: string) {
      return supabase.channel(name)
    },
    removeAllChannels() {
      return supabase.removeAllChannels()
    },
  },

  /**
   * RPC (Remote Procedure Call) helpers
   */
  rpc: {
    async call<T = any>(functionName: string, params?: Record<string, any>): Promise<{ data: T | null; error: Error | null }> {
      return await supabase.rpc(functionName, params)
    },
  },
}

// Export types for external use
export type { SupabaseClient, Session, User }