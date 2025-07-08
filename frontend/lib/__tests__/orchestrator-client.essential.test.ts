import { Orchestrator } from '../orchestrator-client'
import { HiveAnalyticsResult } from '../adapters/types'

// Mock adapters with minimal setup
const mockHiveAdapter = {
  name: 'HiveIntelligence',
  version: '1.0.0',
  isConnected: jest.fn(() => true),
  connect: jest.fn(),
  disconnect: jest.fn(),
  getHealth: jest.fn(),
  getSeiNetworkData: jest.fn(),
  getSeiTokenData: jest.fn(),
  getCryptoMarketData: jest.fn(),
  getSeiDeFiData: jest.fn(),
  getSeiWalletAnalysis: jest.fn(),
}

const mockAdapterFactory = {
  createAdapter: jest.fn(),
  getAdapter: jest.fn(() => mockHiveAdapter),
  getHiveAdapter: jest.fn(() => mockHiveAdapter),
  getSAKAdapter: jest.fn(),
  getMCPAdapter: jest.fn(),
  getAllAdapters: jest.fn(() => new Map()),
  getHealthStatus: jest.fn(() => Promise.resolve(new Map())),
  connectAll: jest.fn(),
  disconnectAll: jest.fn(),
  destroyAdapter: jest.fn(),
}

// Mock the adapter factory
jest.mock('../adapters/AdapterFactory', () => ({
  getAdapterFactory: jest.fn(() => mockAdapterFactory)
}))

// Mock the WebSocket manager
jest.mock('../services/WebSocketManager', () => ({
  WebSocketManagerImpl: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    isConnected: jest.fn(() => false),
    getConnectionState: jest.fn(() => ({ status: 'disconnected', reconnectAttempts: 0 })),
    sendMessage: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  }))
}))

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  logRequest: jest.fn(),
  logResponse: jest.fn(),
  time: jest.fn(),
  timeEnd: jest.fn(() => ({ duration: 100 })),
}))

describe('Orchestrator Client - Essential Wrapper Tests', () => {
  let orchestrator: Orchestrator

  const testConfig = {
    apiEndpoint: 'http://localhost:8000',
    wsEndpoint: 'ws://localhost:8000',
    timeout: 5000,
  }

  const mockSuccessResult: HiveAnalyticsResult = {
    insights: [{ id: '1', type: 'test', title: 'Test', description: 'Test insight', confidence: 0.95 }],
    recommendations: [],
    metadata: { queryId: 'test-query', creditsUsed: 1, timestamp: Date.now() }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockHiveAdapter.isConnected.mockReturnValue(true)
    mockHiveAdapter.connect.mockResolvedValue(undefined)
    orchestrator = new Orchestrator(testConfig)
  })

  describe('getSeiNetworkData', () => {
    it('should call adapter method and return successful result', async () => {
      mockHiveAdapter.getSeiNetworkData.mockResolvedValue({
        _tag: 'Right',
        right: mockSuccessResult
      })

      const result = await orchestrator.getSeiNetworkData()

      expect(mockHiveAdapter.getSeiNetworkData).toHaveBeenCalledTimes(1)
      expect(result._tag).toBe('Right')
      expect(result.right).toEqual(mockSuccessResult)
    })

    it('should handle basic errors from adapter', async () => {
      mockHiveAdapter.getSeiNetworkData.mockRejectedValue(new Error('Network error'))

      const result = await orchestrator.getSeiNetworkData()

      expect(result._tag).toBe('Left')
      expect(result.left).toBe('Network error')
    })
  })

  describe('getSeiTokenData', () => {
    it('should call adapter method with symbol and return successful result', async () => {
      const symbol = 'SEI'
      mockHiveAdapter.getSeiTokenData.mockResolvedValue({
        _tag: 'Right',
        right: mockSuccessResult
      })

      const result = await orchestrator.getSeiTokenData(symbol)

      expect(mockHiveAdapter.getSeiTokenData).toHaveBeenCalledWith(symbol)
      expect(result._tag).toBe('Right')
      expect(result.right).toEqual(mockSuccessResult)
    })

    it('should handle basic errors from adapter', async () => {
      mockHiveAdapter.getSeiTokenData.mockRejectedValue(new Error('Token not found'))

      const result = await orchestrator.getSeiTokenData('INVALID')

      expect(result._tag).toBe('Left')
      expect(result.left).toBe('Token not found')
    })
  })

  describe('getCryptoMarketData', () => {
    it('should call adapter method with symbols array and return successful result', async () => {
      const symbols = ['BTC', 'ETH', 'SEI']
      mockHiveAdapter.getCryptoMarketData.mockResolvedValue({
        _tag: 'Right',
        right: mockSuccessResult
      })

      const result = await orchestrator.getCryptoMarketData(symbols)

      expect(mockHiveAdapter.getCryptoMarketData).toHaveBeenCalledWith(symbols)
      expect(result._tag).toBe('Right')
      expect(result.right).toEqual(mockSuccessResult)
    })

    it('should handle basic errors from adapter', async () => {
      mockHiveAdapter.getCryptoMarketData.mockRejectedValue(new Error('Market data unavailable'))

      const result = await orchestrator.getCryptoMarketData(['BTC'])

      expect(result._tag).toBe('Left')
      expect(result.left).toBe('Market data unavailable')
    })
  })

  describe('getSeiDeFiData', () => {
    it('should call adapter method and return successful result', async () => {
      mockHiveAdapter.getSeiDeFiData.mockResolvedValue({
        _tag: 'Right',
        right: mockSuccessResult
      })

      const result = await orchestrator.getSeiDeFiData()

      expect(mockHiveAdapter.getSeiDeFiData).toHaveBeenCalledTimes(1)
      expect(result._tag).toBe('Right')
      expect(result.right).toEqual(mockSuccessResult)
    })

    it('should handle basic errors from adapter', async () => {
      mockHiveAdapter.getSeiDeFiData.mockRejectedValue(new Error('DeFi data error'))

      const result = await orchestrator.getSeiDeFiData()

      expect(result._tag).toBe('Left')
      expect(result.left).toBe('DeFi data error')
    })
  })

  describe('getSeiWalletAnalysis', () => {
    it('should call adapter method with address and return successful result', async () => {
      const address = 'sei1test123address456'
      mockHiveAdapter.getSeiWalletAnalysis.mockResolvedValue({
        _tag: 'Right',
        right: mockSuccessResult
      })

      const result = await orchestrator.getSeiWalletAnalysis(address)

      expect(mockHiveAdapter.getSeiWalletAnalysis).toHaveBeenCalledWith(address)
      expect(result._tag).toBe('Right')
      expect(result.right).toEqual(mockSuccessResult)
    })

    it('should handle basic errors from adapter', async () => {
      mockHiveAdapter.getSeiWalletAnalysis.mockRejectedValue(new Error('Invalid address'))

      const result = await orchestrator.getSeiWalletAnalysis('invalid')

      expect(result._tag).toBe('Left')
      expect(result.left).toBe('Invalid address')
    })
  })
})