import React, { useState, useEffect } from 'react'
import { supabaseHelpers } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

/**
 * Example component demonstrating Supabase usage in the Seiron project
 * This follows the project's React patterns and functional programming approach
 */
export const SupabaseUsageExample: React.FC = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check current authentication state
    const checkAuth = async () => {
      try {
        const currentUser = await supabaseHelpers.getCurrentUser()
        setUser(currentUser)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Subscribe to auth changes
    const { data: { subscription } } = supabaseHelpers.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session)
        setUser(session?.user || null)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Example: Database operations
  const handleDatabaseOperation = async () => {
    try {
      // Example: Insert data
      const result = await supabaseHelpers
        .from('portfolio_data')
        .insert([
          {
            user_id: user?.id,
            wallet_address: '0x123...abc',
            portfolio_value: 1000.50,
            created_at: new Date().toISOString(),
          },
        ])
        .select()

      console.log('Database operation result:', result)
    } catch (err) {
      console.error('Database operation failed:', err)
    }
  }

  // Example: Real-time subscription
  const handleRealtimeSubscription = () => {
    const channel = supabaseHelpers.realtime.channel('portfolio_changes')
    
    channel
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'portfolio_data' },
        (payload) => {
          console.log('Real-time update:', payload)
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }

  // Example: Storage operations
  const handleFileUpload = async (file: File) => {
    try {
      const fileName = `portfolio-reports/${user?.id}/${Date.now()}-${file.name}`
      
      const { data, error } = await supabaseHelpers.storage
        .from('reports')
        .upload(fileName, file)

      if (error) throw error
      console.log('File uploaded:', data)
    } catch (err) {
      console.error('File upload failed:', err)
    }
  }

  // Example: RPC call
  const handleRPCCall = async () => {
    try {
      const { data, error } = await supabaseHelpers.rpc.call(
        'calculate_portfolio_performance',
        { wallet_address: '0x123...abc' }
      )

      if (error) throw error
      console.log('RPC result:', data)
    } catch (err) {
      console.error('RPC call failed:', err)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center p-4">Loading...</div>
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Error: {error}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Supabase Integration Example</h2>
      
      {/* Authentication Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900">Authentication Status</h3>
        {user ? (
          <div className="mt-2 space-y-1">
            <p className="text-sm text-blue-800">
              <strong>User ID:</strong> {user.id}
            </p>
            <p className="text-sm text-blue-800">
              <strong>Email:</strong> {user.email || 'Not provided'}
            </p>
            <button
              onClick={() => supabaseHelpers.signOut()}
              className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <p className="text-sm text-blue-800 mt-2">Not authenticated</p>
        )}
      </div>

      {/* Database Operations */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-green-900">Database Operations</h3>
        <button
          onClick={handleDatabaseOperation}
          disabled={!user}
          className="mt-2 px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
        >
          Insert Portfolio Data
        </button>
      </div>

      {/* Real-time Subscriptions */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="font-semibold text-purple-900">Real-time Features</h3>
        <button
          onClick={handleRealtimeSubscription}
          className="mt-2 px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
        >
          Subscribe to Portfolio Changes
        </button>
      </div>

      {/* Storage Operations */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <h3 className="font-semibold text-orange-900">File Storage</h3>
        <input
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileUpload(file)
          }}
          disabled={!user}
          className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
        />
      </div>

      {/* RPC Operations */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900">Remote Procedure Calls</h3>
        <button
          onClick={handleRPCCall}
          disabled={!user}
          className="mt-2 px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 disabled:opacity-50"
        >
          Calculate Portfolio Performance
        </button>
      </div>

      {/* Usage Notes */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-900">Integration Notes</h3>
        <ul className="mt-2 text-sm text-yellow-800 space-y-1">
          <li>• The Supabase client is automatically configured with environment variables</li>
          <li>• Authentication state is persisted across browser sessions</li>
          <li>• Real-time subscriptions follow the project's reactive patterns</li>
          <li>• All operations include error handling and logging</li>
          <li>• Storage operations are scoped to user-specific paths</li>
        </ul>
      </div>
    </div>
  )
}

export default SupabaseUsageExample