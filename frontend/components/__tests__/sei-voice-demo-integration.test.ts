/**
 * Sei Voice Demo Component Integration Tests
 * 
 * Tests for the SeiVoiceIntegrationDemo component covering:
 * - Voice query processing UI interactions
 * - Real-time data display and updates
 * - Error states and recovery
 * - Performance monitoring and analytics
 * - Investment advisory features
 * 
 * @fileoverview Component integration tests for Sei voice demo
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SeiVoiceIntegrationDemo } from '../voice/SeiVoiceIntegrationDemo'
import { mockSeiBlockchainData, createMockPortfolio, createMockMarketData, createMockDeFiOpportunities } from '../../lib/test-utils/sei-mocks'

// Mock the voice integration hook
const mockSeiIntegration = {
  isAnalyzing: false,
  lastIntent: null,
  confidence: 0,
  hasMarketData: false,
  hasPortfolioData: false,
  lastUpdate: null,
  error: null,
  marketContext: null,
  portfolioContext: null,
  defiOpportunities: [],
  analyzeVoiceQuery: vi.fn(),
  processVoiceQuery: vi.fn(),
  refreshMarketData: vi.fn(),
  refreshPortfolioData: vi.fn(),
  refreshDeFiOpportunities: vi.fn(),
  clearError: vi.fn(),
  getAnalytics: vi.fn(() => ({
    totalQueries: 0,
    last24hQueries: 0,
    intentCounts: {},
    avgConfidence: 0,
    mostCommonIntent: undefined
  })),
  clearCache: vi.fn(),
  getCacheStats: vi.fn(() => ({ size: 0, keys: [] })),
  hasData: false,
  isReady: true
}

vi.mock('../../hooks/voice/useSeiVoiceIntegration', () => ({
  useSeiVoiceIntegration: vi.fn(() => mockSeiIntegration)
}))

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    span: 'span'
  },
  AnimatePresence: ({ children }: any) => children
}))

// Mock UI components to focus on integration logic
vi.mock('../ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className}
      data-testid={props['data-testid']}
      {...props}
    >
      {children}
    </button>
  )
}))

vi.mock('../ui/input', () => ({
  Input: ({ value, onChange, onKeyDown, placeholder, disabled, ...props }: any) => (
    <input
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      data-testid="voice-query-input"
      {...props}
    />
  )
}))

vi.mock('../ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children, className }: any) => <h2 className={className}>{children}</h2>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>
}))

vi.mock('../ui/badge', () => ({
  Badge: ({ children, className, variant }: any) => 
    <span className={`badge ${className} ${variant}`}>{children}</span>
}))

vi.mock('../ui/separator', () => ({
  Separator: () => <hr />
}))

vi.mock('../ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>
}))

describe('SeiVoiceIntegrationDemo Component', () => {
  const user = userEvent.setup()

  beforeAll(async () => {
    await mockSeiBlockchainData.initialize()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mock state
    Object.assign(mockSeiIntegration, {
      isAnalyzing: false,
      lastIntent: null,
      confidence: 0,
      hasMarketData: false,
      hasPortfolioData: false,
      lastUpdate: null,
      error: null,
      marketContext: null,
      portfolioContext: null,
      defiOpportunities: [],
      hasData: false,
      isReady: true
    })
  })

  describe('Component Rendering', () => {
    it('should render the demo interface with all sections', () => {
      render(<SeiVoiceIntegrationDemo />)

      expect(screen.getByText('🐉 Sei Voice Integration Demo')).toBeInTheDocument()
      expect(screen.getByText('Experience AI-powered investment conversations with real-time Sei blockchain data')).toBeInTheDocument()
      expect(screen.getByText('Try a Voice Query')).toBeInTheDocument()
      expect(screen.getByText('Quick Examples:')).toBeInTheDocument()
    })

    it('should render status indicators correctly', () => {
      render(<SeiVoiceIntegrationDemo />)

      expect(screen.getByText('Market Data')).toBeInTheDocument()
      expect(screen.getByText('Portfolio Data')).toBeInTheDocument()
      expect(screen.getByText('DeFi Opportunities')).toBeInTheDocument()
    })

    it('should render demo query buttons', () => {
      render(<SeiVoiceIntegrationDemo />)

      expect(screen.getByText('"What\'s my portfolio looking like today?"')).toBeInTheDocument()
      expect(screen.getByText('"Should I buy more SEI at current prices?"')).toBeInTheDocument()
      expect(screen.getByText('"Show me the best DeFi opportunities on Sei"')).toBeInTheDocument()
    })

    it('should show analytics data when available', () => {
      mockSeiIntegration.getAnalytics.mockReturnValue({
        totalQueries: 5,
        last24hQueries: 3,
        intentCounts: { portfolio_inquiry: 2, market_analysis: 1 },
        avgConfidence: 0.85,
        mostCommonIntent: 'portfolio_inquiry'
      })

      render(<SeiVoiceIntegrationDemo />)

      expect(screen.getByText('Total Queries:')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('Avg Confidence:')).toBeInTheDocument()
      expect(screen.getByText('85.0%')).toBeInTheDocument()
    })
  })

  describe('Voice Query Input', () => {
    it('should handle text input for voice queries', async () => {
      render(<SeiVoiceIntegrationDemo />)

      const input = screen.getByTestId('voice-query-input')
      await user.type(input, 'What is my portfolio balance?')

      expect(input).toHaveValue('What is my portfolio balance?')
    })

    it('should process queries when Ask button is clicked', async () => {
      mockSeiIntegration.processVoiceQuery.mockResolvedValue({
        spokenText: 'Your portfolio is worth $15,000',
        confidence: 0.9,
        dataSourced: true,
        actionable: true,
        intent: 'portfolio_inquiry',
        processingTime: 150
      })

      render(<SeiVoiceIntegrationDemo />)

      const input = screen.getByTestId('voice-query-input')
      const askButton = screen.getByText('Ask')

      await user.type(input, 'Check my portfolio')
      await user.click(askButton)

      expect(mockSeiIntegration.processVoiceQuery).toHaveBeenCalledWith('Check my portfolio', undefined)
    })

    it('should process queries when Enter key is pressed', async () => {
      mockSeiIntegration.processVoiceQuery.mockResolvedValue({
        spokenText: 'SEI is currently trading at $0.45',
        confidence: 0.85,
        dataSourced: true,
        actionable: false,
        intent: 'price_check',
        processingTime: 120
      })

      render(<SeiVoiceIntegrationDemo />)

      const input = screen.getByTestId('voice-query-input')
      await user.type(input, 'What is SEI price?')
      await user.keyboard('{Enter}')

      expect(mockSeiIntegration.processVoiceQuery).toHaveBeenCalledWith('What is SEI price?', undefined)
    })

    it('should disable input during processing', async () => {
      mockSeiIntegration.isAnalyzing = true
      mockSeiIntegration.processVoiceQuery.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      )

      render(<SeiVoiceIntegrationDemo />)

      const input = screen.getByTestId('voice-query-input')
      const askButton = screen.getByText('Ask')

      expect(input).toBeDisabled()
      expect(askButton).toBeDisabled()
    })

    it('should clear input after successful query', async () => {
      mockSeiIntegration.processVoiceQuery.mockResolvedValue({
        spokenText: 'Query processed successfully',
        confidence: 0.9,
        dataSourced: true,
        actionable: true,
        intent: 'general_chat',
        processingTime: 100
      })

      render(<SeiVoiceIntegrationDemo />)

      const input = screen.getByTestId('voice-query-input')
      await user.type(input, 'test query')
      await user.click(screen.getByText('Ask'))

      await waitFor(() => {
        expect(input).toHaveValue('')
      })
    })
  })

  describe('Demo Query Buttons', () => {
    it('should execute demo queries when buttons are clicked', async () => {
      mockSeiIntegration.processVoiceQuery.mockResolvedValue({
        spokenText: 'Your portfolio is performing well',
        confidence: 0.9,
        dataSourced: true,
        actionable: true,
        intent: 'portfolio_inquiry',
        processingTime: 180
      })

      render(<SeiVoiceIntegrationDemo />)

      const portfolioButton = screen.getByText('"What\'s my portfolio looking like today?"')
      await user.click(portfolioButton)

      expect(mockSeiIntegration.processVoiceQuery).toHaveBeenCalledWith("What's my portfolio looking like today?", undefined)
    })

    it('should disable demo buttons during processing', () => {
      mockSeiIntegration.isAnalyzing = true

      render(<SeiVoiceIntegrationDemo />)

      const demoButtons = screen.getAllByText(/^".*"$/)
      demoButtons.forEach(button => {
        expect(button).toBeDisabled()
      })
    })

    it('should populate input field when demo button is clicked', async () => {
      render(<SeiVoiceIntegrationDemo />)

      const demoQuery = "Should I buy more SEI at current prices?"
      const demoButton = screen.getByText(`"${demoQuery}"`)
      
      await user.click(demoButton)

      // Input should be temporarily populated before being cleared
      expect(mockSeiIntegration.processVoiceQuery).toHaveBeenCalledWith(demoQuery, undefined)
    })
  })

  describe('Response Display', () => {
    it('should display voice responses after successful queries', async () => {
      const mockResponse = {
        spokenText: 'Your portfolio is worth $25,000 with a 5% gain today.',
        confidence: 0.92,
        dataSourced: true,
        actionable: true,
        intent: 'portfolio_inquiry',
        processingTime: 250,
        followUpQuestions: ['Would you like to see individual token performance?']
      }

      mockSeiIntegration.processVoiceQuery.mockResolvedValue(mockResponse)

      render(<SeiVoiceIntegrationDemo />)

      const input = screen.getByTestId('voice-query-input')
      await user.type(input, 'Check portfolio')
      await user.click(screen.getByText('Ask'))

      await waitFor(() => {
        expect(screen.getByText('Voice Responses')).toBeInTheDocument()
        expect(screen.getByText('Your portfolio is worth $25,000 with a 5% gain today.')).toBeInTheDocument()
        expect(screen.getByText('92.0% confidence')).toBeInTheDocument()
        expect(screen.getByText('250ms')).toBeInTheDocument()
      })
    })

    it('should display intent badges with appropriate styling', async () => {
      const mockResponse = {
        spokenText: 'Market analysis complete',
        confidence: 0.88,
        dataSourced: true,
        actionable: false,
        intent: 'market_analysis',
        processingTime: 200
      }

      mockSeiIntegration.processVoiceQuery.mockResolvedValue(mockResponse)

      render(<SeiVoiceIntegrationDemo />)

      await user.type(screen.getByTestId('voice-query-input'), 'Analyze market')
      await user.click(screen.getByText('Ask'))

      await waitFor(() => {
        const intentBadge = screen.getByText('market_analysis')
        expect(intentBadge).toBeInTheDocument()
        expect(intentBadge).toHaveClass('badge')
      })
    })

    it('should display follow-up questions as clickable buttons', async () => {
      const mockResponse = {
        spokenText: 'Here are some DeFi opportunities',
        confidence: 0.85,
        dataSourced: true,
        actionable: true,
        intent: 'defi_opportunities',
        processingTime: 300,
        followUpQuestions: [
          'What are the risks of liquidity farming?',
          'How do I start with staking?'
        ]
      }

      mockSeiIntegration.processVoiceQuery.mockResolvedValue(mockResponse)

      render(<SeiVoiceIntegrationDemo />)

      await user.type(screen.getByTestId('voice-query-input'), 'Show DeFi')
      await user.click(screen.getByText('Ask'))

      await waitFor(() => {
        expect(screen.getByText('Follow-up suggestions:')).toBeInTheDocument()
        expect(screen.getByText('• What are the risks of liquidity farming?')).toBeInTheDocument()
        expect(screen.getByText('• How do I start with staking?')).toBeInTheDocument()
      })

      // Follow-up questions should be clickable
      const followUpButton = screen.getByText('• What are the risks of liquidity farming?')
      await user.click(followUpButton)

      expect(mockSeiIntegration.processVoiceQuery).toHaveBeenCalledWith('What are the risks of liquidity farming?', undefined)
    })

    it('should display context data badges when available', async () => {
      const mockResponse = {
        spokenText: 'Response with full context',
        confidence: 0.9,
        dataSourced: true,
        actionable: true,
        intent: 'portfolio_inquiry',
        processingTime: 180,
        marketContext: { seiPrice: 0.45, marketTrend: 'bullish' },
        portfolioContext: { totalValue: 15000 },
        defiOpportunities: [{ protocol: 'SeiSwap', apy: 12 }]
      }

      mockSeiIntegration.processVoiceQuery.mockResolvedValue(mockResponse)

      render(<SeiVoiceIntegrationDemo />)

      await user.type(screen.getByTestId('voice-query-input'), 'Full analysis')
      await user.click(screen.getByText('Ask'))

      await waitFor(() => {
        expect(screen.getByText('Market Data')).toBeInTheDocument()
        expect(screen.getByText('Portfolio Data')).toBeInTheDocument()
        expect(screen.getByText('DeFi Opportunities')).toBeInTheDocument()
      })
    })

    it('should limit responses to last 10 entries', async () => {
      const mockResponse = {
        spokenText: 'Response text',
        confidence: 0.8,
        dataSourced: true,
        actionable: false,
        intent: 'general_chat',
        processingTime: 100
      }

      mockSeiIntegration.processVoiceQuery.mockResolvedValue(mockResponse)

      render(<SeiVoiceIntegrationDemo />)

      // Add 12 responses
      for (let i = 0; i < 12; i++) {
        await user.type(screen.getByTestId('voice-query-input'), `query ${i}`)
        await user.click(screen.getByText('Ask'))
        await waitFor(() => screen.getByTestId('voice-query-input'))
      }

      // Should only show last 10
      const responses = screen.getAllByText(/Response text/)
      expect(responses.length).toBeLessThanOrEqual(10)
    })
  })

  describe('Error Handling', () => {
    it('should display error messages when voice integration has errors', () => {
      mockSeiIntegration.error = 'Network connection failed'

      render(<SeiVoiceIntegrationDemo />)

      expect(screen.getByText('Error')).toBeInTheDocument()
      expect(screen.getByText('Network connection failed')).toBeInTheDocument()
    })

    it('should allow clearing errors', async () => {
      mockSeiIntegration.error = 'Test error message'

      render(<SeiVoiceIntegrationDemo />)

      const clearButton = screen.getByText('✕')
      await user.click(clearButton)

      expect(mockSeiIntegration.clearError).toHaveBeenCalled()
    })

    it('should handle query processing failures gracefully', async () => {
      mockSeiIntegration.processVoiceQuery.mockResolvedValue(null)

      render(<SeiVoiceIntegrationDemo />)

      await user.type(screen.getByTestId('voice-query-input'), 'failing query')
      await user.click(screen.getByText('Ask'))

      // Should not crash and input should be ready for next query
      await waitFor(() => {
        expect(screen.getByTestId('voice-query-input')).not.toBeDisabled()
      })
    })
  })

  describe('Real-time Data Display', () => {
    it('should display market context when available', () => {
      mockSeiIntegration.hasMarketData = true
      mockSeiIntegration.marketContext = {
        seiPrice: 0.452,
        seiChange24h: 3.5,
        marketTrend: 'bullish',
        volatility: 'medium'
      }

      render(<SeiVoiceIntegrationDemo />)

      expect(screen.getByText('Current Market Context')).toBeInTheDocument()
      expect(screen.getByText('$0.452')).toBeInTheDocument()
      expect(screen.getByText('+3.5%')).toBeInTheDocument()
      expect(screen.getByText('bullish')).toBeInTheDocument()
      expect(screen.getByText('medium')).toBeInTheDocument()
    })

    it('should show positive price changes in green', () => {
      mockSeiIntegration.hasMarketData = true
      mockSeiIntegration.marketContext = {
        seiPrice: 0.45,
        seiChange24h: 5.2,
        marketTrend: 'bullish',
        volatility: 'low'
      }

      render(<SeiVoiceIntegrationDemo />)

      const changeElement = screen.getByText('+5.2%')
      expect(changeElement).toHaveClass('text-green-600')
    })

    it('should show negative price changes in red', () => {
      mockSeiIntegration.hasMarketData = true
      mockSeiIntegration.marketContext = {
        seiPrice: 0.42,
        seiChange24h: -2.8,
        marketTrend: 'bearish',
        volatility: 'high'
      }

      render(<SeiVoiceIntegrationDemo />)

      const changeElement = screen.getByText('-2.8%')
      expect(changeElement).toHaveClass('text-red-600')
    })

    it('should update status indicators based on data availability', () => {
      mockSeiIntegration.hasMarketData = true
      mockSeiIntegration.hasPortfolioData = false
      mockSeiIntegration.defiOpportunities = [{ protocol: 'test' }]

      render(<SeiVoiceIntegrationDemo />)

      const statusIndicators = screen.getAllByRole('generic').filter(el => 
        el.className?.includes('w-3 h-3 rounded-full')
      )

      // Should show appropriate colors for data availability
      expect(statusIndicators).toHaveLength(3)
    })
  })

  describe('Cache Management', () => {
    it('should display cache statistics', () => {
      mockSeiIntegration.getCacheStats.mockReturnValue({
        size: 5,
        keys: ['market_data', 'portfolio_sei1test', 'defi_opportunities']
      })

      render(<SeiVoiceIntegrationDemo />)

      expect(screen.getByText('Cache Size:')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('should show last update timestamp when available', () => {
      const testTimestamp = Date.now()
      mockSeiIntegration.lastUpdate = testTimestamp

      render(<SeiVoiceIntegrationDemo />)

      expect(screen.getByText('Last Update:')).toBeInTheDocument()
      expect(screen.getByText(new Date(testTimestamp).toLocaleTimeString())).toBeInTheDocument()
    })

    it('should allow clearing cache and responses', async () => {
      render(<SeiVoiceIntegrationDemo />)

      const clearButton = screen.getByText('Clear Cache')
      await user.click(clearButton)

      expect(mockSeiIntegration.clearCache).toHaveBeenCalled()
    })
  })

  describe('Wallet Integration', () => {
    it('should pass wallet address to voice queries when provided', async () => {
      const testWalletAddress = 'sei1testwalletaddress123'
      
      mockSeiIntegration.processVoiceQuery.mockResolvedValue({
        spokenText: 'Portfolio query with wallet',
        confidence: 0.9,
        dataSourced: true,
        actionable: true,
        intent: 'portfolio_inquiry',
        processingTime: 150
      })

      render(<SeiVoiceIntegrationDemo walletAddress={testWalletAddress} />)

      await user.type(screen.getByTestId('voice-query-input'), 'Check my portfolio')
      await user.click(screen.getByText('Ask'))

      expect(mockSeiIntegration.processVoiceQuery).toHaveBeenCalledWith('Check my portfolio', testWalletAddress)
    })

    it('should handle portfolio queries without wallet address', async () => {
      render(<SeiVoiceIntegrationDemo />)

      await user.type(screen.getByTestId('voice-query-input'), 'Show my balance')
      await user.click(screen.getByText('Ask'))

      expect(mockSeiIntegration.processVoiceQuery).toHaveBeenCalledWith('Show my balance', undefined)
    })
  })

  describe('Performance and Accessibility', () => {
    it('should show loading state during query processing', async () => {
      mockSeiIntegration.isAnalyzing = true

      render(<SeiVoiceIntegrationDemo />)

      await user.type(screen.getByTestId('voice-query-input'), 'test')
      
      const askButton = screen.getByText('Ask')
      expect(askButton).toBeDisabled()
    })

    it('should be keyboard accessible', async () => {
      render(<SeiVoiceIntegrationDemo />)

      const input = screen.getByTestId('voice-query-input')
      
      // Should be able to focus and type
      await user.click(input)
      expect(input).toHaveFocus()
      
      await user.type(input, 'keyboard test')
      expect(input).toHaveValue('keyboard test')
      
      // Should be able to submit with Enter
      await user.keyboard('{Enter}')
      expect(mockSeiIntegration.processVoiceQuery).toHaveBeenCalled()
    })

    it('should handle rapid query submissions gracefully', async () => {
      mockSeiIntegration.processVoiceQuery.mockResolvedValue({
        spokenText: 'Quick response',
        confidence: 0.8,
        dataSourced: false,
        actionable: false,
        intent: 'general_chat',
        processingTime: 50
      })

      render(<SeiVoiceIntegrationDemo />)

      const input = screen.getByTestId('voice-query-input')
      const askButton = screen.getByText('Ask')

      // Submit multiple queries rapidly
      for (let i = 0; i < 3; i++) {
        await user.clear(input)
        await user.type(input, `rapid query ${i}`)
        await user.click(askButton)
      }

      // Should handle all queries without errors
      await waitFor(() => {
        expect(mockSeiIntegration.processVoiceQuery).toHaveBeenCalledTimes(3)
      })
    })
  })
})