'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { ChatSession } from '../../../services/chat-persistence.service'
import { useChatSessions } from '../../../hooks/useChatSessions'
import { Button } from '../../ui/forms/Button'
import { Input } from '../../ui/forms/Input'
import { Card } from '../../ui/display/Card'
import { LoadingSpinner } from '../../ui/feedback/LoadingSpinner'
import { Badge } from '../../ui/display/Badge'
import { logger } from '@lib/logger'

interface SessionManagerProps {
  userId?: string
  currentSessionId?: string
  onSessionSelect: (sessionId: string) => void
  onSessionCreate?: (session: ChatSession) => void
  className?: string
}

export const SessionManager = React.memo(function SessionManager({
  userId = 'anonymous',
  currentSessionId,
  onSessionSelect,
  onSessionCreate,
  className = ''
}: SessionManagerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newSessionTitle, setNewSessionTitle] = useState('')
  const [newSessionDescription, setNewSessionDescription] = useState('')
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active')

  const {
    sessions,
    stats,
    pagination,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    activeSessions,
    archivedSessions,
    hasNextPage,
    hasPreviousPage,
    loadSessions,
    createSession,
    updateSession,
    deleteSession,
    archiveSession,
    searchSessions,
    refreshSessions,
    clearError,
    goToNextPage,
    goToPreviousPage,
    currentParams
  } = useChatSessions({
    userId,
    autoLoad: true,
    initialParams: { page: 1, limit: 10, archived: false, order: 'desc' }
  })

  // Filter sessions based on view mode
  const displaySessions = useMemo(() => {
    return viewMode === 'active' ? activeSessions : archivedSessions
  }, [viewMode, activeSessions, archivedSessions])

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      await searchSessions(query, { archived: viewMode === 'archived' })
    } else {
      await loadSessions({ archived: viewMode === 'archived' })
    }
  }, [searchSessions, loadSessions, viewMode])

  // Handle create session
  const handleCreateSession = useCallback(async () => {
    if (!newSessionTitle.trim()) return

    const session = await createSession(
      newSessionTitle.trim(),
      newSessionDescription.trim() || undefined,
      { theme: 'dragon-ball-z' }
    )

    if (session) {
      setNewSessionTitle('')
      setNewSessionDescription('')
      setShowCreateForm(false)
      onSessionCreate?.(session)
      logger.info('New session created', { sessionId: session.id })
    }
  }, [newSessionTitle, newSessionDescription, createSession, onSessionCreate])

  // Handle session actions
  const handleArchiveSession = useCallback(async (sessionId: string, archived: boolean) => {
    await archiveSession(sessionId, archived)
    await refreshSessions()
  }, [archiveSession, refreshSessions])

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    if (window.confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      await deleteSession(sessionId)
    }
  }, [deleteSession])

  const handleUpdateSession = useCallback(async (sessionId: string, title: string) => {
    await updateSession(sessionId, { title })
  }, [updateSession])

  // Handle view mode change
  const handleViewModeChange = useCallback(async (mode: 'active' | 'archived') => {
    setViewMode(mode)
    await loadSessions({ archived: mode === 'archived' })
  }, [loadSessions])

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={`bg-gradient-to-b from-orange-900/20 to-red-900/20 border border-orange-500/30 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-orange-300 flex items-center gap-2">
          <span className="text-2xl">🐉</span>
          Chat Sessions
        </h2>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 text-sm"
          disabled={isCreating}
        >
          {isCreating ? <LoadingSpinner size="sm" /> : '+ New Session'}
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <Badge variant="orange" className="text-center">
            <div className="text-xs">Total</div>
            <div className="font-bold">{stats.total_sessions}</div>
          </Badge>
          <Badge variant="green" className="text-center">
            <div className="text-xs">Active</div>
            <div className="font-bold">{stats.active_sessions}</div>
          </Badge>
          <Badge variant="gray" className="text-center">
            <div className="text-xs">Archived</div>
            <div className="font-bold">{stats.archived_sessions}</div>
          </Badge>
          <Badge variant="blue" className="text-center">
            <div className="text-xs">Messages</div>
            <div className="font-bold">{stats.total_messages}</div>
          </Badge>
        </div>
      )}

      {/* Create Session Form */}
      {showCreateForm && (
        <Card className="mb-4 p-4 bg-gradient-to-r from-orange-900/30 to-red-900/30 border-orange-500/50">
          <h3 className="text-lg font-semibold text-orange-300 mb-3">Create New Session</h3>
          <div className="space-y-3">
            <Input
              placeholder="Session title (e.g., 'Training with King Kai')"
              value={newSessionTitle}
              onChange={(e) => setNewSessionTitle(e.target.value)}
              className="bg-black/30 border-orange-500/50 text-white placeholder-orange-300/50"
            />
            <Input
              placeholder="Description (optional)"
              value={newSessionDescription}
              onChange={(e) => setNewSessionDescription(e.target.value)}
              className="bg-black/30 border-orange-500/50 text-white placeholder-orange-300/50"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleCreateSession}
                disabled={!newSessionTitle.trim() || isCreating}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isCreating ? <LoadingSpinner size="sm" /> : 'Create Session'}
              </Button>
              <Button
                onClick={() => setShowCreateForm(false)}
                variant="ghost"
                className="text-orange-300 hover:text-orange-200"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="mb-4">
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 bg-black/30 border-orange-500/50 text-white placeholder-orange-300/50"
          />
          <Button
            onClick={() => handleViewModeChange('active')}
            variant={viewMode === 'active' ? 'default' : 'ghost'}
            className={viewMode === 'active' ? 'bg-orange-600 text-white' : 'text-orange-300'}
          >
            Active
          </Button>
          <Button
            onClick={() => handleViewModeChange('archived')}
            variant={viewMode === 'archived' ? 'default' : 'ghost'}
            className={viewMode === 'archived' ? 'bg-orange-600 text-white' : 'text-orange-300'}
          >
            Archived
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-md">
          <div className="text-red-300 text-sm font-medium mb-1">Error</div>
          <div className="text-red-200 text-sm">{error.message}</div>
          <Button
            onClick={clearError}
            variant="ghost"
            className="text-red-300 hover:text-red-200 text-xs mt-1"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Sessions List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : displaySessions.length === 0 ? (
          <div className="text-center py-8 text-orange-300/70">
            {searchQuery ? 'No sessions found matching your search.' : 'No sessions yet. Create your first session!'}
          </div>
        ) : (
          displaySessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isActive={session.id === currentSessionId}
              isUpdating={isUpdating}
              isDeleting={isDeleting}
              onSelect={() => onSessionSelect(session.id)}
              onUpdate={handleUpdateSession}
              onArchive={(archived) => handleArchiveSession(session.id, archived)}
              onDelete={() => handleDeleteSession(session.id)}
              formatDate={formatDate}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-orange-500/30">
          <div className="text-sm text-orange-300/70">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={goToPreviousPage}
              disabled={!hasPreviousPage}
              variant="ghost"
              className="text-orange-300 hover:text-orange-200 disabled:opacity-50"
              size="sm"
            >
              Previous
            </Button>
            <Button
              onClick={goToNextPage}
              disabled={!hasNextPage}
              variant="ghost"
              className="text-orange-300 hover:text-orange-200 disabled:opacity-50"
              size="sm"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
})

// Session Card Component
interface SessionCardProps {
  session: ChatSession
  isActive: boolean
  isUpdating: boolean
  isDeleting: boolean
  onSelect: () => void
  onUpdate: (sessionId: string, title: string) => void
  onArchive: (archived: boolean) => void
  onDelete: () => void
  formatDate: (dateString: string) => string
}

const SessionCard = React.memo(function SessionCard({
  session,
  isActive,
  isUpdating,
  isDeleting,
  onSelect,
  onUpdate,
  onArchive,
  onDelete,
  formatDate
}: SessionCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(session.title)

  const handleSaveEdit = useCallback(() => {
    if (editTitle.trim() && editTitle !== session.title) {
      onUpdate(session.id, editTitle.trim())
    }
    setIsEditing(false)
  }, [editTitle, session.id, session.title, onUpdate])

  const handleCancelEdit = useCallback(() => {
    setEditTitle(session.title)
    setIsEditing(false)
  }, [session.title])

  return (
    <Card
      className={`p-3 cursor-pointer transition-all duration-200 ${
        isActive
          ? 'bg-gradient-to-r from-orange-600/40 to-red-600/40 border-orange-400/70 shadow-lg'
          : 'bg-gradient-to-r from-orange-900/20 to-red-900/20 border-orange-500/30 hover:border-orange-400/50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="bg-black/30 border-orange-500/50 text-white text-sm"
                onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                onBlur={handleSaveEdit}
                autoFocus
              />
              <Button
                onClick={handleCancelEdit}
                variant="ghost"
                size="sm"
                className="text-orange-300 hover:text-orange-200"
              >
                ×
              </Button>
            </div>
          ) : (
            <div>
              <h3 className="font-semibold text-white truncate">{session.title}</h3>
              <div className="flex items-center gap-2 text-sm text-orange-300/70">
                <span>{formatDate(session.last_message_at)}</span>
                <span>•</span>
                <span>{session.message_count} messages</span>
                {session.is_archived && (
                  <>
                    <span>•</span>
                    <Badge variant="gray" size="sm">Archived</Badge>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
          {!isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              variant="ghost"
              size="sm"
              className="text-orange-300 hover:text-orange-200 opacity-0 group-hover:opacity-100"
              disabled={isUpdating}
            >
              ✏️
            </Button>
          )}
          <Button
            onClick={() => onArchive(!session.is_archived)}
            variant="ghost"
            size="sm"
            className="text-orange-300 hover:text-orange-200"
            disabled={isUpdating}
            title={session.is_archived ? 'Restore' : 'Archive'}
          >
            {session.is_archived ? '📤' : '📥'}
          </Button>
          <Button
            onClick={onDelete}
            variant="ghost"
            size="sm"
            className="text-red-300 hover:text-red-200"
            disabled={isDeleting}
            title="Delete"
          >
            {isDeleting ? <LoadingSpinner size="xs" /> : '🗑️'}
          </Button>
        </div>
      </div>
    </Card>
  )
})