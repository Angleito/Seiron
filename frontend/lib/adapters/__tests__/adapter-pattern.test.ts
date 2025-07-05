import { getAdapterFactory } from '../AdapterFactory'
import { AdapterType } from '../types'

describe('Adapter Pattern Implementation', () => {
  const testConfig = {
    apiEndpoint: 'http://localhost:3001',
    timeout: 5000,
  }

  let factory: ReturnType<typeof getAdapterFactory>

  beforeEach(() => {
    factory = getAdapterFactory(testConfig)
  })

  afterEach(async () => {
    await factory.destroyAllAdapters()
  })

  describe('Adapter Factory', () => {
    it('should create SAK adapter', () => {
      const adapter = factory.createAdapter('sak')
      expect(adapter).toBeDefined()
      expect(adapter.name).toBe('SeiAgentKit')
      expect(adapter.version).toBe('1.0.0')
    })

    it('should create Hive adapter', () => {
      const adapter = factory.createAdapter('hive')
      expect(adapter).toBeDefined()
      expect(adapter.name).toBe('HiveIntelligence')
      expect(adapter.version).toBe('1.0.0')
    })

    it('should create MCP adapter', () => {
      const adapter = factory.createAdapter('mcp')
      expect(adapter).toBeDefined()
      expect(adapter.name).toBe('SeiMCP')
      expect(adapter.version).toBe('1.0.0')
    })

    it('should return existing adapter if already created', () => {
      const adapter1 = factory.createAdapter('sak')
      const adapter2 = factory.createAdapter('sak')
      expect(adapter1).toBe(adapter2)
    })

    it('should get adapter by type', () => {
      factory.createAdapter('sak')
      const adapter = factory.getAdapter('sak')
      expect(adapter).toBeDefined()
      expect(adapter?.name).toBe('SeiAgentKit')
    })

    it('should return null for non-existent adapter', () => {
      const adapter = factory.getAdapter('sak' as AdapterType)
      expect(adapter).toBeNull()
    })

    it('should list all adapters', () => {
      factory.createAdapter('sak')
      factory.createAdapter('hive')
      
      const adapters = factory.getAllAdapters()
      expect(adapters.size).toBe(2)
      expect(adapters.has('sak')).toBe(true)
      expect(adapters.has('hive')).toBe(true)
    })

    it('should destroy adapter', async () => {
      factory.createAdapter('sak')
      expect(factory.getAdapter('sak')).toBeDefined()
      
      await factory.destroyAdapter('sak')
      expect(factory.getAdapter('sak')).toBeNull()
    })
  })

  describe('Adapter Health Checks', () => {
    it('should get health status for all adapters', async () => {
      factory.createAdapter('sak')
      factory.createAdapter('hive')
      
      const healthMap = await factory.getHealthStatus()
      expect(healthMap.size).toBe(2)
      expect(healthMap.has('sak')).toBe(true)
      expect(healthMap.has('hive')).toBe(true)
    })
  })

  describe('Adapter Connection State', () => {
    it('should track connection state', () => {
      const adapter = factory.createAdapter('sak')
      expect(adapter.isConnected()).toBe(false)
    })
  })
})