/**
 * Test Environment Management
 * Provides Docker container orchestration and service coordination for integration tests
 */

import { createConnection, Connection } from 'typeorm';
import { createClient } from 'redis';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface TestEnvironmentConfig {
  postgres: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
  redis: {
    host: string;
    port: number;
  };
  services: {
    [key: string]: {
      url: string;
      healthPath: string;
    };
  };
}

export class TestEnvironment {
  private config: TestEnvironmentConfig;
  private postgresConnection?: Connection;
  private redisClient?: any;
  private serviceHealthChecks: Map<string, boolean> = new Map();

  constructor(config?: Partial<TestEnvironmentConfig>) {
    this.config = {
      postgres: {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: process.env.POSTGRES_DB || 'sei_agent_test',
        username: process.env.POSTGRES_USER || 'testuser',
        password: process.env.POSTGRES_PASSWORD || 'testpass'
      },
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
      },
      services: {
        'symphony-mock': {
          url: process.env.SYMPHONY_API_URL || 'http://localhost:8001',
          healthPath: '/health'
        },
        'takara-mock': {
          url: process.env.TAKARA_API_URL || 'http://localhost:8002',
          healthPath: '/health'
        },
        'sei-testnet': {
          url: process.env.SEI_REST_URL || 'http://localhost:1317',
          healthPath: '/cosmos/base/tendermint/v1beta1/node_info'
        }
      },
      ...config
    };
  }

  static async create(config?: Partial<TestEnvironmentConfig>): Promise<TestEnvironment> {
    const env = new TestEnvironment(config);
    await env.initialize();
    return env;
  }

  private async initialize(): Promise<void> {
    console.log('Initializing test environment...');
    
    try {
      // Initialize database connection
      await this.initializeDatabase();
      
      // Initialize Redis connection
      await this.initializeRedis();
      
      // Wait for core services
      await this.waitForCoreServices();
      
      console.log('Test environment initialized successfully');
    } catch (error) {
      console.error('Failed to initialize test environment:', error);
      throw error;
    }
  }

  private async initializeDatabase(): Promise<void> {
    try {
      this.postgresConnection = await createConnection({
        type: 'postgres',
        host: this.config.postgres.host,
        port: this.config.postgres.port,
        database: this.config.postgres.database,
        username: this.config.postgres.username,
        password: this.config.postgres.password,
        synchronize: true,
        logging: false,
        entities: []
      });
      
      console.log('Database connection established');
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }

  private async initializeRedis(): Promise<void> {
    try {
      this.redisClient = createClient({
        host: this.config.redis.host,
        port: this.config.redis.port
      });
      
      await this.redisClient.connect();
      
      console.log('Redis connection established');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  private async waitForCoreServices(): Promise<void> {
    const coreServices = ['sei-testnet'];
    
    for (const service of coreServices) {
      await this.waitForService(service, 60000); // 60 second timeout
    }
  }

  async waitForServices(services: string[], timeout: number = 30000): Promise<void> {
    console.log(`Waiting for services: ${services.join(', ')}`);
    
    const promises = services.map(service => this.waitForService(service, timeout));
    await Promise.all(promises);
    
    console.log('All requested services are ready');
  }

  private async waitForService(serviceName: string, timeout: number): Promise<void> {
    const service = this.config.services[serviceName];
    if (!service) {
      throw new Error(`Unknown service: ${serviceName}`);
    }

    const startTime = Date.now();
    const checkInterval = 2000; // 2 seconds
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await axios.get(`${service.url}${service.healthPath}`, {
          timeout: 5000
        });
        
        if (response.status === 200) {
          this.serviceHealthChecks.set(serviceName, true);
          console.log(`Service ${serviceName} is ready`);
          return;
        }
      } catch (error) {
        // Service not ready yet, continue waiting
      }
      
      await this.sleep(checkInterval);
    }
    
    throw new Error(`Service ${serviceName} did not become ready within ${timeout}ms`);
  }

  async resetState(): Promise<void> {
    console.log('Resetting test environment state...');
    
    try {
      // Clear Redis cache
      if (this.redisClient) {
        await this.redisClient.flushAll();
      }
      
      // Clean up test data in database
      if (this.postgresConnection) {
        await this.postgresConnection.query('SELECT cleanup_test_data()');
      }
      
      // Reset service states
      await this.resetServiceStates();
      
      console.log('Test environment state reset');
    } catch (error) {
      console.error('Failed to reset test environment state:', error);
      throw error;
    }
  }

  private async resetServiceStates(): Promise<void> {
    // Reset mock service states
    const mockServices = ['symphony-mock', 'takara-mock'];
    
    for (const service of mockServices) {
      try {
        const serviceConfig = this.config.services[service];
        if (serviceConfig) {
          await axios.post(`${serviceConfig.url}/reset`, {}, {
            timeout: 5000
          });
        }
      } catch (error) {
        // Ignore reset failures for mock services
        console.warn(`Failed to reset ${service}:`, error.message);
      }
    }
  }

  async executeQuery(query: string, parameters?: any[]): Promise<any> {
    if (!this.postgresConnection) {
      throw new Error('Database connection not initialized');
    }
    
    return this.postgresConnection.query(query, parameters);
  }

  async getCacheValue(key: string): Promise<string | null> {
    if (!this.redisClient) {
      throw new Error('Redis connection not initialized');
    }
    
    return this.redisClient.get(key);
  }

  async setCacheValue(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.redisClient) {
      throw new Error('Redis connection not initialized');
    }
    
    if (ttl) {
      await this.redisClient.setEx(key, ttl, value);
    } else {
      await this.redisClient.set(key, value);
    }
  }

  async clearCache(): Promise<void> {
    if (!this.redisClient) {
      throw new Error('Redis connection not initialized');
    }
    
    await this.redisClient.flushAll();
  }

  async isServiceHealthy(serviceName: string): Promise<boolean> {
    const service = this.config.services[serviceName];
    if (!service) {
      return false;
    }

    try {
      const response = await axios.get(`${service.url}${service.healthPath}`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async getServiceMetrics(serviceName: string): Promise<any> {
    const service = this.config.services[serviceName];
    if (!service) {
      throw new Error(`Unknown service: ${serviceName}`);
    }

    try {
      const response = await axios.get(`${service.url}/metrics`, {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      console.warn(`Failed to get metrics for ${serviceName}:`, error.message);
      return null;
    }
  }

  async getDockerStats(): Promise<any> {
    try {
      const { stdout } = await execAsync('docker stats --no-stream --format "table {{.Container}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.NetIO}}"');
      return stdout;
    } catch (error) {
      console.warn('Failed to get Docker stats:', error.message);
      return null;
    }
  }

  async getNetworkLatency(serviceName: string): Promise<number> {
    const service = this.config.services[serviceName];
    if (!service) {
      throw new Error(`Unknown service: ${serviceName}`);
    }

    const startTime = Date.now();
    
    try {
      await axios.get(`${service.url}${service.healthPath}`, {
        timeout: 5000
      });
      return Date.now() - startTime;
    } catch (error) {
      throw new Error(`Failed to measure latency for ${serviceName}: ${error.message}`);
    }
  }

  async waitForTransaction(txHash: string, timeout: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 2000;
    
    while (Date.now() - startTime < timeout) {
      try {
        // Check transaction status with Sei node
        const response = await axios.get(
          `${this.config.services['sei-testnet'].url}/cosmos/tx/v1beta1/txs/${txHash}`,
          { timeout: 5000 }
        );
        
        if (response.status === 200) {
          return true;
        }
      } catch (error) {
        // Transaction not found yet
      }
      
      await this.sleep(checkInterval);
    }
    
    return false;
  }

  async getBlockHeight(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.config.services['sei-testnet'].url}/cosmos/base/tendermint/v1beta1/blocks/latest`,
        { timeout: 5000 }
      );
      
      return parseInt(response.data.block.header.height);
    } catch (error) {
      throw new Error(`Failed to get block height: ${error.message}`);
    }
  }

  async waitForBlocks(numberOfBlocks: number): Promise<void> {
    const startHeight = await this.getBlockHeight();
    const targetHeight = startHeight + numberOfBlocks;
    
    while (true) {
      const currentHeight = await this.getBlockHeight();
      if (currentHeight >= targetHeight) {
        return;
      }
      
      await this.sleep(500); // Check every 500ms
    }
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up test environment...');
    
    try {
      if (this.redisClient) {
        await this.redisClient.quit();
      }
      
      if (this.postgresConnection) {
        await this.postgresConnection.close();
      }
      
      console.log('Test environment cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper methods for test scenarios
  async createTestScenario(name: string, data: any): Promise<void> {
    await this.executeQuery(
      'INSERT INTO test_scenarios (name, description, scenario_type, input_data) VALUES ($1, $2, $3, $4)',
      [name, `Generated test scenario: ${name}`, 'integration', JSON.stringify(data)]
    );
  }

  async getTestScenario(name: string): Promise<any> {
    const result = await this.executeQuery(
      'SELECT input_data FROM test_scenarios WHERE name = $1',
      [name]
    );
    
    return result.length > 0 ? result[0].input_data : null;
  }

  async recordTestMetric(metricType: string, value: number, metadata?: any): Promise<void> {
    await this.executeQuery(
      'INSERT INTO performance_metrics (metric_type, value, unit, metadata) VALUES ($1, $2, $3, $4)',
      [metricType, value, 'ms', JSON.stringify(metadata || {})]
    );
  }

  async getTestMetrics(metricType: string, limit: number = 100): Promise<any[]> {
    const result = await this.executeQuery(
      'SELECT * FROM performance_metrics WHERE metric_type = $1 ORDER BY timestamp DESC LIMIT $2',
      [metricType, limit]
    );
    
    return result;
  }
}