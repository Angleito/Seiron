import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatInterface } from '@components/chat/ChatInterface'
import { renderWithStores, createMockStore } from '../../utils/zustand-test-utils'
import { server } from '../../setup/msw.setup'

// Mock the chat store
const mockChatStore = createMockStore({
  messages: [],
  currentSessionId: null,
  isLoading: false,
  error: null,
  sendMessage: jest.fn(),
  startNewSession: jest.fn(),
  loadMessages: jest.fn(),
})

// Mock the auth store
const mockAuthStore = createMockStore({
  user: {
    id: 'test-user',
    email: 'test@example.com',
    walletAddress: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9'
  },
  isAuthenticated: true,
  isLoading: false,
})

describe('ChatInterface', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockChatStore.setState({
      messages: [],
      currentSessionId: null,
      isLoading: false,
      error: null,
    })
  })

  it('renders chat interface correctly', () => {
    renderWithStores(<ChatInterface />, {
      stores: {
        chat: mockChatStore as any,
        auth: mockAuthStore as any,
      }
    })

    expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('displays existing messages', () => {
    const mockMessages = [
      {
        id: '1',
        content: 'Hello, how can I help you?',
        role: 'assistant',
        timestamp: new Date().toISOString(),
      },
      {
        id: '2',
        content: 'Show me my portfolio',
        role: 'user',
        timestamp: new Date().toISOString(),
      }
    ]

    mockChatStore.setState({ messages: mockMessages })

    renderWithStores(<ChatInterface />, {
      stores: {
        chat: mockChatStore as any,
        auth: mockAuthStore as any,
      }
    })

    expect(screen.getByText('Hello, how can I help you?')).toBeInTheDocument()
    expect(screen.getByText('Show me my portfolio')).toBeInTheDocument()
  })

  it('sends message when form is submitted', async () => {
    const user = userEvent.setup()
    const mockSendMessage = jest.fn()
    mockChatStore.setState({ sendMessage: mockSendMessage })

    renderWithStores(<ChatInterface />, {
      stores: {
        chat: mockChatStore as any,
        auth: mockAuthStore as any,
      }
    })

    const input = screen.getByPlaceholderText(/type your message/i)
    const sendButton = screen.getByRole('button', { name: /send/i })

    await user.type(input, 'Test message')
    await user.click(sendButton)

    expect(mockSendMessage).toHaveBeenCalledWith('Test message')
  })

  it('prevents sending empty messages', async () => {
    const user = userEvent.setup()
    const mockSendMessage = jest.fn()
    mockChatStore.setState({ sendMessage: mockSendMessage })

    renderWithStores(<ChatInterface />, {
      stores: {
        chat: mockChatStore as any,
        auth: mockAuthStore as any,
      }
    })

    const sendButton = screen.getByRole('button', { name: /send/i })
    await user.click(sendButton)

    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  it('shows loading state when sending message', () => {
    mockChatStore.setState({ isLoading: true })

    renderWithStores(<ChatInterface />, {
      stores: {
        chat: mockChatStore as any,
        auth: mockAuthStore as any,
      }
    })

    expect(screen.getByText(/sending/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
  })

  it('displays error message when there is an error', () => {
    mockChatStore.setState({ error: 'Failed to send message' })

    renderWithStores(<ChatInterface />, {
      stores: {
        chat: mockChatStore as any,
        auth: mockAuthStore as any,
      }
    })

    expect(screen.getByText('Failed to send message')).toBeInTheDocument()
  })

  it('clears input after successful message send', async () => {
    const user = userEvent.setup()
    const mockSendMessage = jest.fn().mockResolvedValue(undefined)
    mockChatStore.setState({ sendMessage: mockSendMessage })

    renderWithStores(<ChatInterface />, {
      stores: {
        chat: mockChatStore as any,
        auth: mockAuthStore as any,
      }
    })

    const input = screen.getByPlaceholderText(/type your message/i) as HTMLInputElement

    await user.type(input, 'Test message')
    expect(input.value).toBe('Test message')

    await user.click(screen.getByRole('button', { name: /send/i }))
    
    await waitFor(() => {
      expect(input.value).toBe('')
    })
  })

  it('handles keyboard shortcuts for sending', async () => {
    const user = userEvent.setup()
    const mockSendMessage = jest.fn()
    mockChatStore.setState({ sendMessage: mockSendMessage })

    renderWithStores(<ChatInterface />, {
      stores: {
        chat: mockChatStore as any,
        auth: mockAuthStore as any,
      }
    })

    const input = screen.getByPlaceholderText(/type your message/i)

    await user.type(input, 'Test message')
    await user.keyboard('{Control>}{Enter}')

    expect(mockSendMessage).toHaveBeenCalledWith('Test message')
  })

  it('scrolls to bottom when new message is added', async () => {
    const scrollIntoViewMock = jest.fn()
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock

    mockChatStore.setState({
      messages: [
        {
          id: '1',
          content: 'First message',
          role: 'user',
          timestamp: new Date().toISOString(),
        }
      ]
    })

    renderWithStores(<ChatInterface />, {
      stores: {
        chat: mockChatStore as any,
        auth: mockAuthStore as any,
      }
    })

    // Simulate new message being added
    mockChatStore.setState({
      messages: [
        {
          id: '1',
          content: 'First message',
          role: 'user',
          timestamp: new Date().toISOString(),
        },
        {
          id: '2',
          content: 'Second message',
          role: 'assistant',
          timestamp: new Date().toISOString(),
        }
      ]
    })

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled()
    })
  })

  it('shows authentication prompt when user is not logged in', () => {
    mockAuthStore.setState({ isAuthenticated: false, user: null })

    renderWithStores(<ChatInterface />, {
      stores: {
        chat: mockChatStore as any,
        auth: mockAuthStore as any,
      }
    })

    expect(screen.getByText(/please log in to start chatting/i)).toBeInTheDocument()
  })

  it('handles message retry functionality', async () => {
    const user = userEvent.setup()
    const mockRetryMessage = jest.fn()
    
    const failedMessage = {
      id: '1',
      content: 'Failed message',
      role: 'user',
      timestamp: new Date().toISOString(),
      status: 'failed'
    }

    mockChatStore.setState({ 
      messages: [failedMessage],
      retryMessage: mockRetryMessage
    })

    renderWithStores(<ChatInterface />, {
      stores: {
        chat: mockChatStore as any,
        auth: mockAuthStore as any,
      }
    })

    const retryButton = screen.getByRole('button', { name: /retry/i })
    await user.click(retryButton)

    expect(mockRetryMessage).toHaveBeenCalledWith('1')
  })
})