import { Orchestrator } from '../orchestrator-client'

describe('Orchestrator Adapter Integration', () => {
  const testConfig = {
    apiEndpoint: 'http://localhost:3001',
    wsEndpoint: 'ws://localhost:3001',
    timeout: 5000,
  }

  let orchestrator: Orchestrator

  beforeEach(() => {
    orchestrator = new Orchestrator(testConfig)
  })

  afterEach(async () => {
    await orchestrator.disconnectAllAdapters()
    await orchestrator.disconnectWebSocket()
  })

  describe('Adapter Management', () => {
    it('should create and manage adapters', () => {
      const sakAdapter = orchestrator.createAdapter('sak')
      expect(sakAdapter).toBeDefined()
      
      const retrievedAdapter = orchestrator.getAdapter('sak')
      expect(retrievedAdapter).toBe(sakAdapter)
    })

    it('should get all adapters', () => {
      orchestrator.createAdapter('sak')
      orchestrator.createAdapter('hive')
      
      const adapters = orchestrator.getAllAdapters()
      expect(adapters.size).toBe(2)
    })

    it('should get adapter health status', async () => {
      orchestrator.createAdapter('sak')
      orchestrator.createAdapter('hive')
      
      const healthMap = await orchestrator.getAdapterHealth()
      expect(healthMap.size).toBe(2)
    })

    it('should destroy specific adapter', async () => {
      orchestrator.createAdapter('sak')
      expect(orchestrator.getAdapter('sak')).toBeDefined()
      
      await orchestrator.destroyAdapter('sak')
      expect(orchestrator.getAdapter('sak')).toBeNull()
    })
  })

  describe('WebSocket Management', () => {
    it('should check WebSocket connection state', () => {
      expect(orchestrator.isWebSocketConnected()).toBe(false)
    })

    it('should get WebSocket connection state', () => {
      const state = orchestrator.getWebSocketConnectionState()
      expect(state.status).toBe('disconnected')
      expect(state.reconnectAttempts).toBe(0)
    })
  })

  describe('Adapter Actions', () => {
    it('should handle SAK adapter actions', async () => {
      const action = {
        type: 'sak' as const,
        action: 'test_tool',
        params: { test: 'param' },
        description: 'Test SAK action',
      }

      // This will fail because there's no real backend, but it should create the adapter
      const result = await orchestrator.executeAdapterAction(action)
      
      // Should have the proper structure even if it fails
      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right.success).toBe(false)
        expect(result.right.metadata.adapterType).toBe('sak')
        expect(result.right.metadata.action).toBe('test_tool')
      }
      
      // Adapter should be created
      expect(orchestrator.getAdapter('sak')).toBeDefined()
    })

    it('should handle Hive adapter actions', async () => {
      const action = {
        type: 'hive' as const,
        action: 'search',
        params: { query: 'test query' },
        description: 'Test Hive search',
      }

      const result = await orchestrator.executeAdapterAction(action)
      
      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right.metadata.adapterType).toBe('hive')
        expect(result.right.metadata.action).toBe('search')
      }
      
      expect(orchestrator.getAdapter('hive')).toBeDefined()
    })

    it('should handle MCP adapter actions', async () => {
      const action = {
        type: 'mcp' as const,
        action: 'get_network_status',
        params: {},
        description: 'Test MCP network status',
      }

      const result = await orchestrator.executeAdapterAction(action)
      
      expect(result._tag).toBe('Right')
      if (result._tag === 'Right') {
        expect(result.right.metadata.adapterType).toBe('mcp')
        expect(result.right.metadata.action).toBe('get_network_status')
      }
      
      expect(orchestrator.getAdapter('mcp')).toBeDefined()
    })

    it('should handle unsupported adapter types', async () => {
      const action = {
        type: 'invalid' as any,
        action: 'test',
        params: {},
        description: 'Invalid adapter',
      }

      const result = await orchestrator.executeAdapterAction(action)
      expect(result._tag).toBe('Left')
      if (result._tag === 'Left') {
        expect(result.left).toContain('Unsupported adapter type')
      }
    })

    it('should handle unsupported actions', async () => {
      const action = {
        type: 'hive' as const,
        action: 'invalid_action',
        params: {},
        description: 'Invalid Hive action',
      }

      const result = await orchestrator.executeAdapterAction(action)
      expect(result._tag).toBe('Left')
      if (result._tag === 'Left') {
        expect(result.left).toContain('Unsupported Hive action')
      }
    })
  })

  describe('Backward Compatibility', () => {
    it('should maintain SAK method compatibility', async () => {
      const result = await orchestrator.executeSAKAction('test_tool', { test: 'param' })
      expect(result._tag).toBe('Left') // Will fail without backend, but structure is correct
      
      const toolsResult = await orchestrator.listSAKTools()
      expect(toolsResult._tag).toBe('Left') // Will fail without backend, but structure is correct
    })

    it('should maintain Hive method compatibility', async () => {
      const searchResult = await orchestrator.executeHiveSearch('test query')
      expect(searchResult._tag).toBe('Left') // Will fail without backend
      
      const analyticsResult = await orchestrator.getHiveAnalytics('test query')
      expect(analyticsResult._tag).toBe('Left') // Will fail without backend
      
      const portfolioResult = await orchestrator.getHivePortfolioAnalysis('test_address')
      expect(portfolioResult._tag).toBe('Left') // Will fail without backend
      
      const creditsResult = await orchestrator.getHiveCreditUsage()
      expect(creditsResult._tag).toBe('Left') // Will fail without backend
    })

    it('should maintain MCP method compatibility', async () => {
      const statusResult = await orchestrator.getMCPNetworkStatus()
      expect(statusResult._tag).toBe('Left') // Will fail without backend
      
      const balanceResult = await orchestrator.getMCPWalletBalance('test_address')
      expect(balanceResult._tag).toBe('Left') // Will fail without backend
      
      const txResult = await orchestrator.executeMCPTransaction({ test: 'tx' })
      expect(txResult._tag).toBe('Left') // Will fail without backend
      
      const queryResult = await orchestrator.queryMCPContract('test_address', { test: 'query' })
      expect(queryResult._tag).toBe('Left') // Will fail without backend
    })
  })
})