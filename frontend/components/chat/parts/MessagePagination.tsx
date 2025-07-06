'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '../../ui/forms/Button'
import { LoadingSpinner } from '../../ui/feedback/LoadingSpinner'
import { Badge } from '../../ui/display/Badge'
import { ChatMessage } from '../../../services/chat-persistence.service'

interface MessagePaginationProps {
  // Pagination data
  currentPage: number
  totalPages: number
  totalMessages: number
  messagesPerPage: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  
  // State
  isLoading: boolean
  isLoadingMore: boolean
  
  // Actions
  onGoToPage: (page: number) => void
  onGoToNextPage: () => void
  onGoToPreviousPage: () => void
  onLoadMoreMessages: () => void
  
  // Configuration
  showLoadMore?: boolean
  showPageNumbers?: boolean
  showMessageCount?: boolean
  enableInfiniteScroll?: boolean
  
  // Styling
  className?: string
}

export const MessagePagination = React.memo(function MessagePagination({
  currentPage,
  totalPages,
  totalMessages,
  messagesPerPage,
  hasNextPage,
  hasPreviousPage,
  isLoading,
  isLoadingMore,
  onGoToPage,
  onGoToNextPage,
  onGoToPreviousPage,
  onLoadMoreMessages,
  showLoadMore = true,
  showPageNumbers = true,
  showMessageCount = true,
  enableInfiniteScroll = false,
  className = ''
}: MessagePaginationProps) {
  const [showJumpToPage, setShowJumpToPage] = useState(false)
  const [jumpToPageValue, setJumpToPageValue] = useState('')
  const scrollSentinelRef = useRef<HTMLDivElement>(null)

  // Handle jump to page
  const handleJumpToPage = useCallback(() => {
    const pageNumber = parseInt(jumpToPageValue, 10)
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      onGoToPage(pageNumber)
      setShowJumpToPage(false)
      setJumpToPageValue('')
    }
  }, [jumpToPageValue, totalPages, onGoToPage])

  // Generate page numbers for display
  const getPageNumbers = useCallback(() => {
    const pages: (number | string)[] = []
    const maxVisible = 5
    
    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)
      
      let start = Math.max(2, currentPage - 1)
      let end = Math.min(totalPages - 1, currentPage + 1)
      
      // Adjust range to always show 3 middle pages
      if (currentPage <= 3) {
        end = 4
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3
      }
      
      // Add ellipsis before start if needed
      if (start > 2) {
        pages.push('...')
      }
      
      // Add middle pages
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      // Add ellipsis after end if needed
      if (end < totalPages - 1) {
        pages.push('...')
      }
      
      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }
    
    return pages
  }, [currentPage, totalPages])

  // Infinite scroll observer
  useEffect(() => {
    if (!enableInfiniteScroll || !scrollSentinelRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isLoadingMore) {
          onLoadMoreMessages()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(scrollSentinelRef.current)

    return () => observer.disconnect()
  }, [enableInfiniteScroll, hasNextPage, isLoadingMore, onLoadMoreMessages])

  if (totalPages <= 1 && !showMessageCount) {
    return null
  }

  return (
    <div className={`flex flex-col gap-2 p-3 bg-gradient-to-r from-orange-900/20 to-red-900/20 border-t border-orange-500/30 ${className}`}>
      {/* Message Count */}
      {showMessageCount && (
        <div className="flex items-center justify-center gap-2 text-sm text-orange-300/70">
          <span className="text-orange-300">📊</span>
          <span>
            Showing {Math.min(messagesPerPage, totalMessages)} of {totalMessages} messages
          </span>
          {currentPage > 1 && (
            <Badge variant="orange" size="sm">
              Page {currentPage}
            </Badge>
          )}
        </div>
      )}

      {/* Infinite Scroll Sentinel */}
      {enableInfiniteScroll && (
        <div ref={scrollSentinelRef} className="h-4">
          {isLoadingMore && (
            <div className="flex justify-center">
              <LoadingSpinner size="sm" />
            </div>
          )}
        </div>
      )}

      {/* Load More Button */}
      {showLoadMore && hasNextPage && !enableInfiniteScroll && (
        <div className="flex justify-center">
          <Button
            onClick={onLoadMoreMessages}
            disabled={isLoadingMore}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2"
          >
            {isLoadingMore ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span>Loading more messages...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>📥</span>
                <span>Load More Messages</span>
              </div>
            )}
          </Button>
        </div>
      )}

      {/* Page Navigation */}
      {showPageNumbers && totalPages > 1 && (
        <div className="flex items-center justify-between">
          {/* Previous Button */}
          <Button
            onClick={onGoToPreviousPage}
            disabled={!hasPreviousPage || isLoading}
            variant="ghost"
            className="text-orange-300 hover:text-orange-200 disabled:opacity-50"
          >
            <span className="mr-1">←</span>
            Previous
          </Button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, index) => (
              <React.Fragment key={index}>
                {typeof page === 'number' ? (
                  <Button
                    onClick={() => onGoToPage(page)}
                    disabled={isLoading}
                    variant={page === currentPage ? 'default' : 'ghost'}
                    className={
                      page === currentPage
                        ? 'bg-orange-600 text-white min-w-[2.5rem]'
                        : 'text-orange-300 hover:text-orange-200 min-w-[2.5rem]'
                    }
                    size="sm"
                  >
                    {page}
                  </Button>
                ) : (
                  <span className="text-orange-300/50 px-2">...</span>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Next Button */}
          <Button
            onClick={onGoToNextPage}
            disabled={!hasNextPage || isLoading}
            variant="ghost"
            className="text-orange-300 hover:text-orange-200 disabled:opacity-50"
          >
            Next
            <span className="ml-1">→</span>
          </Button>
        </div>
      )}

      {/* Jump to Page */}
      {totalPages > 10 && (
        <div className="flex justify-center">
          {showJumpToPage ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-orange-300">Go to page:</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={jumpToPageValue}
                onChange={(e) => setJumpToPageValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJumpToPage()}
                className="w-16 px-2 py-1 text-sm bg-black/30 border border-orange-500/50 rounded text-white text-center"
                placeholder="1"
                autoFocus
              />
              <Button
                onClick={handleJumpToPage}
                disabled={!jumpToPageValue || isLoading}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Go
              </Button>
              <Button
                onClick={() => {
                  setShowJumpToPage(false)
                  setJumpToPageValue('')
                }}
                variant="ghost"
                size="sm"
                className="text-orange-300 hover:text-orange-200"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setShowJumpToPage(true)}
              variant="ghost"
              size="sm"
              className="text-orange-300/70 hover:text-orange-300"
            >
              Jump to page...
            </Button>
          )}
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded">
          <div className="bg-gradient-to-r from-orange-900/90 to-red-900/90 border border-orange-500/50 rounded-lg p-4 flex items-center gap-3">
            <LoadingSpinner size="md" />
            <span className="text-orange-300">Loading messages...</span>
          </div>
        </div>
      )}
    </div>
  )
})

// Hook for managing pagination state
export interface UseMessagePaginationOptions {
  initialPage?: number
  messagesPerPage?: number
  enableInfiniteScroll?: boolean
}

export interface UseMessagePaginationReturn {
  currentPage: number
  messagesPerPage: number
  setCurrentPage: (page: number) => void
  resetPagination: () => void
  goToNextPage: () => void
  goToPreviousPage: () => void
  goToFirstPage: () => void
  goToLastPage: (totalPages: number) => void
}

export function useMessagePagination(options: UseMessagePaginationOptions = {}): UseMessagePaginationReturn {
  const {
    initialPage = 1,
    messagesPerPage = 20,
    enableInfiniteScroll = false
  } = options

  const [currentPage, setCurrentPage] = useState(initialPage)

  const resetPagination = useCallback(() => {
    setCurrentPage(1)
  }, [])

  const goToNextPage = useCallback(() => {
    setCurrentPage(prev => prev + 1)
  }, [])

  const goToPreviousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1))
  }, [])

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1)
  }, [])

  const goToLastPage = useCallback((totalPages: number) => {
    setCurrentPage(totalPages)
  }, [])

  return {
    currentPage,
    messagesPerPage,
    setCurrentPage,
    resetPagination,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage
  }
}