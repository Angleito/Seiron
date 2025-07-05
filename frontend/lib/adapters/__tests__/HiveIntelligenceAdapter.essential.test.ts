import { HiveIntelligenceAdapter } from '../HiveIntelligenceAdapter'

describe('HiveIntelligenceAdapter - Essential SEI/Crypto Methods', () => {
  let adapter: HiveIntelligenceAdapter

  beforeEach(() => {
    adapter = new HiveIntelligenceAdapter({
      apiEndpoint: 'http://test-api.example.com',
      timeout: 5000
    })

    // Mock fetch for all tests
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('getSeiNetworkData', () => {
    it('should return network data successfully', async () => {
      const mockResponse = {
        insights: [{ id: '1', type: 'network', title: 'SEI Network', description: 'Active', confidence: 0.9 }],
        recommendations: [],
        metadata: { queryId: 'test', creditsUsed: 10, timestamp: Date.now() }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await adapter.getSeiNetworkData()

      expect(result._tag).toBe('Right')
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.example.com/hive/analytics',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('SEI network status')
        })
      )
    })

    it('should handle network errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failed'))

      const result = await adapter.getSeiNetworkData()

      expect(result._tag).toBe('Left')
      expect(result.left).toContain('Network failed')
    })
  })

  describe('getSeiTokenData', () => {
    it('should return token data successfully', async () => {
      const mockResponse = {
        insights: [{ id: '1', type: 'token', title: 'SEI Token', description: 'Price: $1.50', confidence: 0.9 }],
        recommendations: [],
        metadata: { queryId: 'test', creditsUsed: 5, timestamp: Date.now() }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await adapter.getSeiTokenData('SEI')

      expect(result._tag).toBe('Right')
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.example.com/hive/analytics',
        expect.objectContaining({
          body: expect.stringContaining('SEI token information')
        })
      )
    })
  })

  describe('getCryptoMarketData', () => {
    it('should return market data successfully', async () => {
      const mockResponse = {
        insights: [{ id: '1', type: 'market', title: 'Market Data', description: 'BTC: $45000', confidence: 0.9 }],
        recommendations: [],
        metadata: { queryId: 'test', creditsUsed: 15, timestamp: Date.now() }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await adapter.getCryptoMarketData(['BTC', 'ETH'])

      expect(result._tag).toBe('Right')
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.example.com/hive/analytics',
        expect.objectContaining({
          body: expect.stringContaining('crypto market data')
        })
      )
    })
  })

  describe('getSeiDeFiData', () => {
    it('should return DeFi data successfully', async () => {
      const mockResponse = {
        insights: [{ id: '1', type: 'defi', title: 'DeFi Protocols', description: 'TVL: $100M', confidence: 0.9 }],
        recommendations: [],
        metadata: { queryId: 'test', creditsUsed: 20, timestamp: Date.now() }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await adapter.getSeiDeFiData()

      expect(result._tag).toBe('Right')
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.example.com/hive/analytics',
        expect.objectContaining({
          body: expect.stringContaining('SEI DeFi ecosystem')
        })
      )
    })
  })

  describe('getSeiWalletAnalysis', () => {
    it('should return wallet analysis successfully', async () => {
      const mockResponse = {
        insights: [{ id: '1', type: 'wallet', title: 'Wallet Analysis', description: 'Portfolio: $5000', confidence: 0.9 }],
        recommendations: [{ id: '1', type: 'diversification', title: 'Diversify', priority: 'medium', expectedImpact: 0.8 }],
        metadata: { queryId: 'test', creditsUsed: 25, timestamp: Date.now() }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await adapter.getSeiWalletAnalysis('sei1test123')

      expect(result._tag).toBe('Right')
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.example.com/hive/analytics',
        expect.objectContaining({
          body: expect.stringContaining('wallet analysis')
        })
      )
    })
  })
})