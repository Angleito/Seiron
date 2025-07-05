import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChatInterface } from '@/components/chat/chat-interface'
import { ChatStreamService } from '@/components/chat/ChatStreamService'
import { of, throwError } from 'rxjs'
import * as E from 'fp-ts/Either'

// Mock the ChatStreamService
vi.mock('@/components/chat/ChatStreamService', () => ({
  ChatStreamService: vi.fn().mockImplementation(() => ({
    messages$: of(),
    typingIndicators$: of([]),
    connectionStatus: of({ isConnected: true, lastHeartbeat: Date.now(), reconnectAttempts: 0 }),
    sendMessage: vi.fn().mockReturnValue(of(E.right({ id: 'msg-1', content: 'test', type: 'user', timestamp: new Date() }))),
    sendAdapterAction: vi.fn().mockReturnValue(of(E.right({ id: 'msg-2', content: 'action executed', type: 'agent', timestamp: new Date() }))),
    destroy: vi.fn()
  }))
}))

// Mock the orchestrator client
vi.mock('@/lib/orchestrator-client', () => ({
  getOrchestrator: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnValue(vi.fn()),
    disconnectWebSocket: vi.fn()
  })
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    time: vi.fn(),
    timeEnd: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  },
  safeDebug: vi.fn(),
  safeInfo: vi.fn(),
  safeWarn: vi.fn(),
  safeError: vi.fn()
}))

// Mock sanitize
vi.mock('@/lib/sanitize', () => ({
  sanitizeChatMessage: vi.fn((msg) => msg),
  useSanitizedContent: vi.fn((content) => ({ sanitized: content, isValid: true, warnings: [] })),
  SANITIZE_CONFIGS: { CHAT_MESSAGE: {}, TEXT_ONLY: {} }
}))

// Mock SeironImage
vi.mock('@/components/SeironImage', () => ({
  SeironImage: vi.fn(() => <div data-testid="seiron-image" />)
}))

// Mock lib/utils
vi.mock('@/lib/utils', () => ({
  cn: vi.fn((...classes) => classes.filter(Boolean).join(' '))
}))

describe('ChatInterface - Adapter Actions Essential Tests', () => {
  let mockChatService: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockChatService = new ChatStreamService({} as any)
  })

  it('should define adapter actions correctly', () => {
    render(<ChatInterface />)

    // Toggle adapter actions panel to show actions
    const adaptersButton = screen.getByText('Adapters')
    fireEvent.click(adaptersButton)

    // Check that key adapter actions are defined
    expect(screen.getByText('search')).toBeInTheDocument()
    expect(screen.getByText('analytics')).toBeInTheDocument()
    expect(screen.getByText('get_token_balance')).toBeInTheDocument()
    expect(screen.getByText('get_blockchain_state')).toBeInTheDocument()
    expect(screen.getByText('get_wallet_balance')).toBeInTheDocument()

    // Verify different adapter types are present
    const sakActions = screen.getAllByText(/get_token_balance|takara_supply|sei_network_status/)
    const hiveActions = screen.getAllByText(/search|analytics|crypto_market_data/)
    const mcpActions = screen.getAllByText(/get_blockchain_state|get_wallet_balance/)

    expect(sakActions.length).toBeGreaterThan(0)
    expect(hiveActions.length).toBeGreaterThan(0)
    expect(mcpActions.length).toBeGreaterThan(0)
  })

  it('should execute adapter actions through UI', async () => {
    render(<ChatInterface />)

    // Show adapter actions panel
    const adaptersButton = screen.getByText('Adapters')
    fireEvent.click(adaptersButton)

    // Find and click a specific adapter action
    const searchAction = screen.getByText('search')
    fireEvent.click(searchAction)

    // Wait for the action to be executed
    await waitFor(() => {
      expect(mockChatService.sendAdapterAction).toHaveBeenCalledWith({
        type: 'hive',
        action: 'search',
        params: {},
        description: 'Search blockchain data with AI'
      })
    })

    // Verify the action was called exactly once
    expect(mockChatService.sendAdapterAction).toHaveBeenCalledTimes(1)
  })

  it('should handle basic error scenarios in UI', async () => {
    // Mock sendAdapterAction to return an error
    mockChatService.sendAdapterAction.mockReturnValue(throwError(() => new Error('Network error')))

    render(<ChatInterface />)

    // Show adapter actions panel
    const adaptersButton = screen.getByText('Adapters')
    fireEvent.click(adaptersButton)

    // Click an action that will fail
    const analyticsAction = screen.getByText('analytics')
    fireEvent.click(analyticsAction)

    // Wait for error handling
    await waitFor(() => {
      expect(mockChatService.sendAdapterAction).toHaveBeenCalledWith({
        type: 'hive',
        action: 'analytics',
        params: {},
        description: 'Get AI-powered market insights'
      })
    })

    // Verify the error was handled (loading state should be reset)
    // The component should still be responsive after error
    expect(screen.getByText('Adapters')).toBeInTheDocument()
  })
})