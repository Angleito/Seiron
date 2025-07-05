import { 
  AdapterType, 
  AdapterConfig, 
  AdapterFactory, 
  BaseAdapter,
  SeiAgentKitAdapter as ISeiAgentKitAdapter,
  HiveIntelligenceAdapter as IHiveIntelligenceAdapter,
  SeiMCPAdapter as ISeiMCPAdapter
} from './types'
import { SeiAgentKitAdapter } from './SeiAgentKitAdapter'
import { HiveIntelligenceAdapter } from './HiveIntelligenceAdapter'
import { SeiMCPAdapter } from './SeiMCPAdapter'
import { logger } from '../logger'

export class AdapterFactoryImpl implements AdapterFactory {
  private adapters: Map<AdapterType, BaseAdapter> = new Map()
  private defaultConfig: AdapterConfig

  constructor(defaultConfig: AdapterConfig) {
    this.defaultConfig = defaultConfig
  }

  createAdapter(type: AdapterType, config?: AdapterConfig): BaseAdapter {
    const adapterConfig = { ...this.defaultConfig, ...config }
    
    // Check if adapter already exists
    if (this.adapters.has(type)) {
      logger.warn(`Adapter ${type} already exists, returning existing instance`)
      return this.adapters.get(type)!
    }

    let adapter: BaseAdapter

    switch (type) {
      case 'sak':
        adapter = new SeiAgentKitAdapter(adapterConfig)
        break
      case 'hive':
        adapter = new HiveIntelligenceAdapter(adapterConfig)
        break
      case 'mcp':
        adapter = new SeiMCPAdapter(adapterConfig)
        break
      default:
        throw new Error(`Unsupported adapter type: ${type}`)
    }

    this.adapters.set(type, adapter)
    logger.info(`Created adapter: ${type}`)
    
    return adapter
  }

  getAdapter(type: AdapterType): BaseAdapter | null {
    return this.adapters.get(type) || null
  }

  getAllAdapters(): Map<AdapterType, BaseAdapter> {
    return new Map(this.adapters)
  }

  async destroyAdapter(type: AdapterType): Promise<void> {
    const adapter = this.adapters.get(type)
    if (adapter) {
      try {
        await adapter.disconnect()
        this.adapters.delete(type)
        logger.info(`Destroyed adapter: ${type}`)
      } catch (error) {
        logger.error(`Failed to destroy adapter ${type}:`, error)
        throw error
      }
    }
  }

  async destroyAllAdapters(): Promise<void> {
    const adapterTypes = Array.from(this.adapters.keys())
    const destroyPromises = adapterTypes.map(type => 
      this.destroyAdapter(type)
    )
    
    await Promise.allSettled(destroyPromises)
    this.adapters.clear()
    logger.info('All adapters destroyed')
  }

  // Helper methods for specific adapter types
  getSAKAdapter(): ISeiAgentKitAdapter | null {
    return this.getAdapter('sak') as ISeiAgentKitAdapter
  }

  getHiveAdapter(): IHiveIntelligenceAdapter | null {
    return this.getAdapter('hive') as IHiveIntelligenceAdapter
  }

  getMCPAdapter(): ISeiMCPAdapter | null {
    return this.getAdapter('mcp') as ISeiMCPAdapter
  }

  // Batch operations
  async connectAll(): Promise<void> {
    const adapters = Array.from(this.adapters.values())
    const connectPromises = adapters.map(adapter => 
      adapter.connect().catch(error => {
        logger.error(`Failed to connect adapter ${adapter.name}:`, error)
        return error
      })
    )
    
    const results = await Promise.allSettled(connectPromises)
    
    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const adapter = adapters[index]
        if (adapter && adapter.name) {
          logger.error(`Failed to connect adapter ${adapter.name}:`, result.reason)
        } else {
          logger.error(`Failed to connect adapter at index ${index}:`, result.reason)
        }
      }
    })
  }

  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.adapters.values()).map(adapter => 
      adapter.disconnect().catch(error => {
        logger.error(`Failed to disconnect adapter ${adapter.name}:`, error)
        return error
      })
    )
    
    await Promise.allSettled(disconnectPromises)
  }

  async getHealthStatus(): Promise<Map<AdapterType, any>> {
    const healthMap = new Map()
    
    const adapterEntries = Array.from(this.adapters.entries())
    for (const [type, adapter] of adapterEntries) {
      try {
        const healthResult = await adapter.getHealth()
        healthMap.set(type, healthResult)
      } catch (error) {
        healthMap.set(type, { 
          _tag: 'Left', 
          left: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
        })
      }
    }
    
    return healthMap
  }
}

// Singleton instance
let adapterFactoryInstance: AdapterFactoryImpl | null = null

export function getAdapterFactory(config?: AdapterConfig): AdapterFactoryImpl {
  if (!adapterFactoryInstance && config) {
    adapterFactoryInstance = new AdapterFactoryImpl(config)
  }
  
  if (!adapterFactoryInstance) {
    throw new Error('AdapterFactory not initialized. Please provide config on first call.')
  }
  
  return adapterFactoryInstance
}

export { AdapterFactoryImpl as AdapterFactory }