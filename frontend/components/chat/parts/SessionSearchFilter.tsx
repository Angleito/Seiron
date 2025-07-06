'use client'

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Input } from '../../ui/forms/Input'
import { Button } from '../../ui/forms/Button'
import { Badge } from '../../ui/display/Badge'
import { Card } from '../../ui/display/Card'
import { SessionsQueryParams } from '../../../services/chat-persistence.service'

interface SessionSearchFilterProps {
  initialParams?: SessionsQueryParams
  onParamsChange: (params: SessionsQueryParams) => void
  onSearch: (query: string) => void
  isLoading?: boolean
  resultsCount?: number
  className?: string
}

interface DateRange {
  from: Date | null
  to: Date | null
}

export const SessionSearchFilter = React.memo(function SessionSearchFilter({
  initialParams = {},
  onParamsChange,
  onSearch,
  isLoading = false,
  resultsCount,
  className = ''
}: SessionSearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState(initialParams.search || '')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [archived, setArchived] = useState(initialParams.archived || false)
  const [order, setOrder] = useState<'asc' | 'desc'>(initialParams.order || 'desc')
  const [limit, setLimit] = useState(initialParams.limit || 20)
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null })
  
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const isInitialMount = useRef(true)

  // Debounced search
  const debouncedSearch = useCallback((query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      onSearch(query)
    }, 300)
  }, [onSearch])

  // Handle search input change
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
    debouncedSearch(query)
  }, [debouncedSearch])

  // Handle filter changes
  const handleFilterChange = useCallback((newParams: Partial<SessionsQueryParams>) => {
    const updatedParams = {
      ...initialParams,
      search: searchQuery,
      archived,
      order,
      limit,
      ...newParams
    }
    
    onParamsChange(updatedParams)
  }, [initialParams, searchQuery, archived, order, limit, onParamsChange])

  // Apply filters
  const applyFilters = useCallback(() => {
    handleFilterChange({})
  }, [handleFilterChange])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setArchived(false)
    setOrder('desc')
    setLimit(20)
    setDateRange({ from: null, to: null })
    
    const clearedParams: SessionsQueryParams = {
      page: 1,
      limit: 20,
      archived: false,
      order: 'desc'
    }
    
    onParamsChange(clearedParams)
    onSearch('')
  }, [onParamsChange, onSearch])

  // Handle quick filters
  const handleQuickFilter = useCallback((filterType: string) => {
    switch (filterType) {
      case 'recent':
        handleFilterChange({ order: 'desc', limit: 10 })
        break
      case 'oldest':
        handleFilterChange({ order: 'asc', limit: 10 })
        break
      case 'active':
        setArchived(false)
        handleFilterChange({ archived: false })
        break
      case 'archived':
        setArchived(true)
        handleFilterChange({ archived: true })
        break
      case 'today':
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        setDateRange({ from: today, to: new Date() })
        break
    }
  }, [handleFilterChange])

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (searchQuery) count++
    if (archived) count++
    if (order !== 'desc') count++
    if (limit !== 20) count++
    if (dateRange.from || dateRange.to) count++
    return count
  }, [searchQuery, archived, order, limit, dateRange])

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  // Skip initial effect run
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    applyFilters()
  }, [archived, order, limit])

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="Search sessions... (e.g., 'Training with King Kai')"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="bg-black/30 border-orange-500/50 text-white placeholder-orange-300/50 pr-12"
            disabled={isLoading}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-orange-500/50 border-t-orange-500 rounded-full animate-spin"></div>
            ) : (
              <span className="text-orange-300/50">🔍</span>
            )}
          </div>
        </div>
        
        <Button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          variant={showAdvancedFilters ? 'secondary' : 'ghost'}
          className={`${
            showAdvancedFilters 
              ? 'bg-orange-600 text-white' 
              : 'text-orange-300 hover:text-orange-200'
          } relative`}
        >
          <span className="mr-1">⚙️</span>
          Filters
          {activeFiltersCount > 0 && (
            <Badge 
              variant="danger" 
              size="sm" 
              className="absolute -top-2 -right-2 min-w-[1.5rem] h-6 flex items-center justify-center"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Results Summary */}
      {(resultsCount !== undefined || searchQuery) && (
        <div className="flex items-center justify-between text-sm text-orange-300/70">
          <div>
            {resultsCount !== undefined && (
              <span>
                {resultsCount} session{resultsCount !== 1 ? 's' : ''} found
                {searchQuery && ` for "${searchQuery}"`}
              </span>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <Button
              onClick={clearFilters}
              variant="ghost"
              size="sm"
              className="text-orange-300/70 hover:text-orange-300"
            >
              Clear all filters
            </Button>
          )}
        </div>
      )}

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => handleQuickFilter('recent')}
          variant="ghost"
          size="sm"
          className="text-orange-300 hover:text-orange-200 border border-orange-500/30 hover:border-orange-500/50"
        >
          📅 Recent
        </Button>
        <Button
          onClick={() => handleQuickFilter('oldest')}
          variant="ghost"
          size="sm"
          className="text-orange-300 hover:text-orange-200 border border-orange-500/30 hover:border-orange-500/50"
        >
          🕰️ Oldest
        </Button>
        <Button
          onClick={() => handleQuickFilter('active')}
          variant="ghost"
          size="sm"
          className={`border border-orange-500/30 hover:border-orange-500/50 ${
            !archived ? 'bg-orange-600/20 text-orange-200' : 'text-orange-300 hover:text-orange-200'
          }`}
        >
          ⚡ Active
        </Button>
        <Button
          onClick={() => handleQuickFilter('archived')}
          variant="ghost"
          size="sm"
          className={`border border-orange-500/30 hover:border-orange-500/50 ${
            archived ? 'bg-orange-600/20 text-orange-200' : 'text-orange-300 hover:text-orange-200'
          }`}
        >
          📦 Archived
        </Button>
        <Button
          onClick={() => handleQuickFilter('today')}
          variant="ghost"
          size="sm"
          className="text-orange-300 hover:text-orange-200 border border-orange-500/30 hover:border-orange-500/50"
        >
          🌟 Today
        </Button>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <Card className="p-4 bg-gradient-to-r from-orange-900/20 to-red-900/20 border-orange-500/30">
          <h3 className="text-lg font-semibold text-orange-300 mb-4 flex items-center gap-2">
            <span>🎛️</span>
            Advanced Filters
          </h3>
          
          <div className="space-y-4">
            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-orange-300 mb-2">
                Sort Order
              </label>
              <div className="flex gap-2">
                <Button
                  onClick={() => setOrder('desc')}
                  variant={order === 'desc' ? 'secondary' : 'ghost'}
                  size="sm"
                  className={order === 'desc' ? 'bg-orange-600 text-white' : 'text-orange-300'}
                >
                  Newest First
                </Button>
                <Button
                  onClick={() => setOrder('asc')}
                  variant={order === 'asc' ? 'secondary' : 'ghost'}
                  size="sm"
                  className={order === 'asc' ? 'bg-orange-600 text-white' : 'text-orange-300'}
                >
                  Oldest First
                </Button>
              </div>
            </div>

            {/* Results Per Page */}
            <div>
              <label className="block text-sm font-medium text-orange-300 mb-2">
                Results Per Page
              </label>
              <div className="flex gap-2">
                {[10, 20, 50].map((count) => (
                  <Button
                    key={count}
                    onClick={() => setLimit(count)}
                    variant={limit === count ? 'secondary' : 'ghost'}
                    size="sm"
                    className={limit === count ? 'bg-orange-600 text-white' : 'text-orange-300'}
                  >
                    {count}
                  </Button>
                ))}
              </div>
            </div>

            {/* Session Status */}
            <div>
              <label className="block text-sm font-medium text-orange-300 mb-2">
                Session Status
              </label>
              <div className="flex gap-2">
                <Button
                  onClick={() => setArchived(false)}
                  variant={!archived ? 'secondary' : 'ghost'}
                  size="sm"
                  className={!archived ? 'bg-green-600 text-white' : 'text-orange-300'}
                >
                  Active Only
                </Button>
                <Button
                  onClick={() => setArchived(true)}
                  variant={archived ? 'secondary' : 'ghost'}
                  size="sm"
                  className={archived ? 'bg-gray-600 text-white' : 'text-orange-300'}
                >
                  Archived Only
                </Button>
              </div>
            </div>

            {/* Date Range (Future Implementation) */}
            <div className="opacity-50">
              <label className="block text-sm font-medium text-orange-300 mb-2">
                Date Range (Coming Soon)
              </label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  disabled
                  className="bg-black/30 border-orange-500/30 text-white"
                  placeholder="From"
                />
                <Input
                  type="date"
                  disabled
                  className="bg-black/30 border-orange-500/30 text-white"
                  placeholder="To"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-orange-500/30">
              <Button
                onClick={applyFilters}
                className="bg-orange-600 hover:bg-orange-700 text-white"
                disabled={isLoading}
              >
                Apply Filters
              </Button>
              <Button
                onClick={clearFilters}
                variant="ghost"
                className="text-orange-300 hover:text-orange-200"
              >
                Reset All
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-orange-300/70">Active filters:</span>
          {searchQuery && (
            <Badge variant="warning" className="flex items-center gap-1">
              Search: "{searchQuery.slice(0, 20)}{searchQuery.length > 20 ? '...' : ''}"
              <button
                onClick={() => handleSearchChange('')}
                className="ml-1 text-orange-200 hover:text-white"
              >
                ×
              </button>
            </Badge>
          )}
          {archived && (
            <Badge variant="default" className="flex items-center gap-1">
              Archived
              <button
                onClick={() => {
                  setArchived(false)
                  handleFilterChange({ archived: false })
                }}
                className="ml-1 text-gray-200 hover:text-white"
              >
                ×
              </button>
            </Badge>
          )}
          {order === 'asc' && (
            <Badge variant="info" className="flex items-center gap-1">
              Oldest First
              <button
                onClick={() => {
                  setOrder('desc')
                  handleFilterChange({ order: 'desc' })
                }}
                className="ml-1 text-blue-200 hover:text-white"
              >
                ×
              </button>
            </Badge>
          )}
          {limit !== 20 && (
            <Badge variant="info" className="flex items-center gap-1">
              {limit} per page
              <button
                onClick={() => {
                  setLimit(20)
                  handleFilterChange({ limit: 20 })
                }}
                className="ml-1 text-purple-200 hover:text-white"
              >
                ×
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
})