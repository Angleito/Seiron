import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PortfolioSidebar } from '@components/portfolio/PortfolioSidebar'
import { renderWithStores, createMockStore } from '../../utils/zustand-test-utils'

// Mock portfolio store
const mockPortfolioStore = createMockStore({
  portfolio: null,
  isLoading: false,
  error: null,
  fetchPortfolio: jest.fn(),
  refreshPortfolio: jest.fn(),
})

// Mock auth store
const mockAuthStore = createMockStore({
  user: {
    id: 'test-user',
    walletAddress: '0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9'
  },
  isAuthenticated: true,
})

describe('PortfolioSidebar', () => {
  const mockPortfolioData = {
    totalValue: 10000,
    totalValueUsd: 10000,
    positions: [
      {
        token: 'SEI',
        symbol: 'SEI',
        amount: '1000',
        value: 5000,
        valueUsd: 5000,
        price: 5.0,
        change24h: 0.05
      },
      {
        token: 'USDC',
        symbol: 'USDC',
        amount: '5000',
        value: 5000,
        valueUsd: 5000,
        price: 1.0,
        change24h: 0.0
      }
    ],
    change24h: 0.025,
    lastUpdated: new Date().toISOString()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockPortfolioStore.setState({
      portfolio: null,
      isLoading: false,
      error: null,
    })
  })

  it('renders portfolio sidebar with data', () => {
    mockPortfolioStore.setState({ portfolio: mockPortfolioData })

    renderWithStores(<PortfolioSidebar />, {
      stores: {
        portfolio: mockPortfolioStore as any,
        auth: mockAuthStore as any,
      }
    })

    expect(screen.getByText('$10,000.00')).toBeInTheDocument()
    expect(screen.getByText('+2.50%')).toBeInTheDocument()
    expect(screen.getByText('SEI')).toBeInTheDocument()
    expect(screen.getByText('USDC')).toBeInTheDocument()
  })

  it('shows loading state when fetching portfolio', () => {
    mockPortfolioStore.setState({ isLoading: true })

    renderWithStores(<PortfolioSidebar />, {
      stores: {
        portfolio: mockPortfolioStore as any,
        auth: mockAuthStore as any,
      }
    })

    expect(screen.getByTestId('portfolio-loading')).toBeInTheDocument()
  })

  it('displays error message when portfolio fetch fails', () => {
    mockPortfolioStore.setState({ 
      error: 'Failed to fetch portfolio data',
      isLoading: false 
    })

    renderWithStores(<PortfolioSidebar />, {
      stores: {
        portfolio: mockPortfolioStore as any,
        auth: mockAuthStore as any,
      }
    })

    expect(screen.getByText('Failed to fetch portfolio data')).toBeInTheDocument()
  })

  it('shows refresh button and handles refresh action', async () => {
    const user = userEvent.setup()
    const mockRefresh = jest.fn()
    
    mockPortfolioStore.setState({ 
      portfolio: mockPortfolioData,
      refreshPortfolio: mockRefresh
    })

    renderWithStores(<PortfolioSidebar />, {
      stores: {
        portfolio: mockPortfolioStore as any,
        auth: mockAuthStore as any,
      }
    })

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    await user.click(refreshButton)

    expect(mockRefresh).toHaveBeenCalled()
  })

  it('displays individual position details', () => {
    mockPortfolioStore.setState({ portfolio: mockPortfolioData })

    renderWithStores(<PortfolioSidebar />, {
      stores: {
        portfolio: mockPortfolioStore as any,
        auth: mockAuthStore as any,
      }
    })

    // Check SEI position
    expect(screen.getByText('1,000')).toBeInTheDocument() // Amount
    expect(screen.getByText('$5.00')).toBeInTheDocument() // Price
    expect(screen.getByText('+5.00%')).toBeInTheDocument() // 24h change

    // Check USDC position
    expect(screen.getByText('5,000')).toBeInTheDocument() // Amount
    expect(screen.getByText('$1.00')).toBeInTheDocument() // Price
    expect(screen.getByText('0.00%')).toBeInTheDocument() // 24h change
  })

  it('handles position click to view details', async () => {
    const user = userEvent.setup()
    const mockOnPositionClick = jest.fn()
    
    mockPortfolioStore.setState({ portfolio: mockPortfolioData })

    renderWithStores(
      <PortfolioSidebar onPositionClick={mockOnPositionClick} />, 
      {
        stores: {
          portfolio: mockPortfolioStore as any,
          auth: mockAuthStore as any,
        }
      }
    )

    const seiPosition = screen.getByTestId('position-SEI')
    await user.click(seiPosition)

    expect(mockOnPositionClick).toHaveBeenCalledWith(mockPortfolioData.positions[0])
  })

  it('shows empty state when no positions', () => {
    mockPortfolioStore.setState({ 
      portfolio: {
        ...mockPortfolioData,
        positions: []
      }
    })

    renderWithStores(<PortfolioSidebar />, {
      stores: {
        portfolio: mockPortfolioStore as any,
        auth: mockAuthStore as any,
      }
    })

    expect(screen.getByText(/no positions found/i)).toBeInTheDocument()
  })

  it('formats currency values correctly', () => {
    const portfolioWithDecimals = {
      ...mockPortfolioData,
      totalValue: 12345.67,
      positions: [
        {
          ...mockPortfolioData.positions[0],
          value: 123.456,
          price: 0.123456
        }
      ]
    }

    mockPortfolioStore.setState({ portfolio: portfolioWithDecimals })

    renderWithStores(<PortfolioSidebar />, {
      stores: {
        portfolio: mockPortfolioStore as any,
        auth: mockAuthStore as any,
      }
    })

    expect(screen.getByText('$12,345.67')).toBeInTheDocument()
    expect(screen.getByText('$0.12')).toBeInTheDocument() // Price rounded to 2 decimals
  })

  it('displays correct change indicators (positive/negative)', () => {
    const portfolioWithNegativeChange = {
      ...mockPortfolioData,
      change24h: -0.05, // -5%
      positions: [
        {
          ...mockPortfolioData.positions[0],
          change24h: -0.1 // -10%
        },
        {
          ...mockPortfolioData.positions[1],
          change24h: 0.03 // +3%
        }
      ]
    }

    mockPortfolioStore.setState({ portfolio: portfolioWithNegativeChange })

    renderWithStores(<PortfolioSidebar />, {
      stores: {
        portfolio: mockPortfolioStore as any,
        auth: mockAuthStore as any,
      }
    })

    expect(screen.getByText('-5.00%')).toBeInTheDocument()
    expect(screen.getByText('-10.00%')).toBeInTheDocument()
    expect(screen.getByText('+3.00%')).toBeInTheDocument()
  })

  it('shows last updated timestamp', () => {
    const now = new Date()
    mockPortfolioStore.setState({ 
      portfolio: {
        ...mockPortfolioData,
        lastUpdated: now.toISOString()
      }
    })

    renderWithStores(<PortfolioSidebar />, {
      stores: {
        portfolio: mockPortfolioStore as any,
        auth: mockAuthStore as any,
      }
    })

    expect(screen.getByText(/last updated/i)).toBeInTheDocument()
  })

  it('handles wallet disconnect gracefully', () => {
    mockAuthStore.setState({ 
      isAuthenticated: false, 
      user: null 
    })

    renderWithStores(<PortfolioSidebar />, {
      stores: {
        portfolio: mockPortfolioStore as any,
        auth: mockAuthStore as any,
      }
    })

    expect(screen.getByText(/connect wallet to view portfolio/i)).toBeInTheDocument()
  })

  it('fetches portfolio on mount when authenticated', () => {
    const mockFetchPortfolio = jest.fn()
    mockPortfolioStore.setState({ fetchPortfolio: mockFetchPortfolio })

    renderWithStores(<PortfolioSidebar />, {
      stores: {
        portfolio: mockPortfolioStore as any,
        auth: mockAuthStore as any,
      }
    })

    expect(mockFetchPortfolio).toHaveBeenCalled()
  })
})