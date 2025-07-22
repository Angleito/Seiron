import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WalletConnect } from '@components/wallet/WalletConnect'
import { renderWithStores, createMockStore } from '../../utils/zustand-test-utils'

// Mock wallet providers
const mockProvider = {
  request: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
  selectedAddress: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9',
}

// Mock window.ethereum
beforeAll(() => {
  global.window.ethereum = mockProvider
})

// Mock stores
const mockAuthStore = createMockStore({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  connect: jest.fn(),
  disconnect: jest.fn(),
  switchNetwork: jest.fn(),
})

const mockWalletStore = createMockStore({
  account: null,
  isConnected: false,
  isConnecting: false,
  balance: '0',
  network: null,
  supportedNetworks: [
    { chainId: '1329', name: 'Sei Network', symbol: 'SEI' }
  ],
  connect: jest.fn(),
  disconnect: jest.fn(),
  switchNetwork: jest.fn(),
  error: null,
})

describe('WalletConnect', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockProvider.request.mockClear()
    mockAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
    mockWalletStore.setState({
      account: null,
      isConnected: false,
      isConnecting: false,
      balance: '0',
      network: null,
      error: null,
    })
  })

  it('renders connect button when wallet is not connected', () => {
    renderWithStores(<WalletConnect />, {
      stores: {
        auth: mockAuthStore as any,
        wallet: mockWalletStore as any,
      }
    })

    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument()
  })

  it('shows wallet info when connected', () => {
    mockWalletStore.setState({
      isConnected: true,
      account: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9',
      balance: '1000.5',
      network: { chainId: '1329', name: 'Sei Network', symbol: 'SEI' }
    })

    mockAuthStore.setState({
      isAuthenticated: true,
      user: {
        walletAddress: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9'
      }
    })

    renderWithStores(<WalletConnect />, {
      stores: {
        auth: mockAuthStore as any,
        wallet: mockWalletStore as any,
      }
    })

    expect(screen.getByText('0x742d...8c4e8D9')).toBeInTheDocument() // Truncated address
    expect(screen.getByText('1000.5 SEI')).toBeInTheDocument()
    expect(screen.getByText('Sei Network')).toBeInTheDocument()
  })

  it('handles wallet connection', async () => {
    const user = userEvent.setup()
    const mockConnect = jest.fn().mockResolvedValue({
      account: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9'
    })
    mockWalletStore.setState({ connect: mockConnect })

    renderWithStores(<WalletConnect />, {
      stores: {
        auth: mockAuthStore as any,
        wallet: mockWalletStore as any,
      }
    })

    const connectButton = screen.getByRole('button', { name: /connect wallet/i })
    await user.click(connectButton)

    expect(mockConnect).toHaveBeenCalled()
  })

  it('shows connecting state during wallet connection', () => {
    mockWalletStore.setState({ isConnecting: true })

    renderWithStores(<WalletConnect />, {
      stores: {
        auth: mockAuthStore as any,
        wallet: mockWalletStore as any,
      }
    })

    expect(screen.getByText(/connecting/i)).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('handles wallet disconnection', async () => {
    const user = userEvent.setup()
    const mockDisconnect = jest.fn()
    
    mockWalletStore.setState({
      isConnected: true,
      account: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9',
      disconnect: mockDisconnect
    })

    renderWithStores(<WalletConnect />, {
      stores: {
        auth: mockAuthStore as any,
        wallet: mockWalletStore as any,
      }
    })

    const disconnectButton = screen.getByRole('button', { name: /disconnect/i })
    await user.click(disconnectButton)

    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('shows network switch prompt for unsupported network', () => {
    mockWalletStore.setState({
      isConnected: true,
      account: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9',
      network: { chainId: '1', name: 'Ethereum', symbol: 'ETH' } // Unsupported network
    })

    renderWithStores(<WalletConnect />, {
      stores: {
        auth: mockAuthStore as any,
        wallet: mockWalletStore as any,
      }
    })

    expect(screen.getByText(/unsupported network/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /switch to sei network/i })).toBeInTheDocument()
  })

  it('handles network switching', async () => {
    const user = userEvent.setup()
    const mockSwitchNetwork = jest.fn()
    
    mockWalletStore.setState({
      isConnected: true,
      account: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9',
      network: { chainId: '1', name: 'Ethereum', symbol: 'ETH' },
      switchNetwork: mockSwitchNetwork
    })

    renderWithStores(<WalletConnect />, {
      stores: {
        auth: mockAuthStore as any,
        wallet: mockWalletStore as any,
      }
    })

    const switchButton = screen.getByRole('button', { name: /switch to sei network/i })
    await user.click(switchButton)

    expect(mockSwitchNetwork).toHaveBeenCalledWith('1329')
  })

  it('displays error message when connection fails', () => {
    mockWalletStore.setState({ 
      error: 'User rejected the request'
    })

    renderWithStores(<WalletConnect />, {
      stores: {
        auth: mockAuthStore as any,
        wallet: mockWalletStore as any,
      }
    })

    expect(screen.getByText('User rejected the request')).toBeInTheDocument()
  })

  it('shows wallet selection modal when multiple wallets available', async () => {
    const user = userEvent.setup()
    
    // Mock multiple wallet providers
    global.window.ethereum = {
      ...mockProvider,
      isMetaMask: true
    }
    global.window.keplr = {
      enable: jest.fn(),
      getKey: jest.fn(),
    }

    renderWithStores(<WalletConnect />, {
      stores: {
        auth: mockAuthStore as any,
        wallet: mockWalletStore as any,
      }
    })

    const connectButton = screen.getByRole('button', { name: /connect wallet/i })
    await user.click(connectButton)

    expect(screen.getByText(/choose wallet/i)).toBeInTheDocument()
    expect(screen.getByText(/metamask/i)).toBeInTheDocument()
    expect(screen.getByText(/keplr/i)).toBeInTheDocument()
  })

  it('handles wallet account change', async () => {
    mockWalletStore.setState({
      isConnected: true,
      account: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9'
    })

    renderWithStores(<WalletConnect />, {
      stores: {
        auth: mockAuthStore as any,
        wallet: mockWalletStore as any,
      }
    })

    // Simulate account change event
    const accountChangeHandler = mockProvider.on.mock.calls
      .find(call => call[0] === 'accountsChanged')?.[1]
    
    if (accountChangeHandler) {
      accountChangeHandler(['0x123...'])
    }

    await waitFor(() => {
      expect(mockWalletStore.getState().account).toBe('0x123...')
    })
  })

  it('shows installation prompt when wallet is not installed', () => {
    // Remove ethereum provider
    delete global.window.ethereum

    renderWithStores(<WalletConnect />, {
      stores: {
        auth: mockAuthStore as any,
        wallet: mockWalletStore as any,
      }
    })

    expect(screen.getByText(/no wallet detected/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /install metamask/i })).toBeInTheDocument()
  })

  it('formats wallet balance correctly', () => {
    mockWalletStore.setState({
      isConnected: true,
      account: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9',
      balance: '1234567.123456789',
      network: { chainId: '1329', name: 'Sei Network', symbol: 'SEI' }
    })

    renderWithStores(<WalletConnect />, {
      stores: {
        auth: mockAuthStore as any,
        wallet: mockWalletStore as any,
      }
    })

    expect(screen.getByText('1,234,567.12 SEI')).toBeInTheDocument() // Formatted with 2 decimals
  })

  it('shows wallet dropdown menu with options', async () => {
    const user = userEvent.setup()
    
    mockWalletStore.setState({
      isConnected: true,
      account: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9',
    })

    renderWithStores(<WalletConnect />, {
      stores: {
        auth: mockAuthStore as any,
        wallet: mockWalletStore as any,
      }
    })

    // Click on wallet info to open dropdown
    const walletButton = screen.getByRole('button', { name: /0x742d/i })
    await user.click(walletButton)

    expect(screen.getByText(/copy address/i)).toBeInTheDocument()
    expect(screen.getByText(/view on explorer/i)).toBeInTheDocument()
    expect(screen.getByText(/disconnect/i)).toBeInTheDocument()
  })

  it('copies wallet address to clipboard', async () => {
    const user = userEvent.setup()
    const mockWriteText = jest.fn()
    
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    })

    mockWalletStore.setState({
      isConnected: true,
      account: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9',
    })

    renderWithStores(<WalletConnect />, {
      stores: {
        auth: mockAuthStore as any,
        wallet: mockWalletStore as any,
      }
    })

    const walletButton = screen.getByRole('button', { name: /0x742d/i })
    await user.click(walletButton)

    const copyButton = screen.getByRole('button', { name: /copy address/i })
    await user.click(copyButton)

    expect(mockWriteText).toHaveBeenCalledWith('0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9')
  })
})