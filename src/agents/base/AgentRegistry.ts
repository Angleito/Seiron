import { Either, left, right } from 'fp-ts/Either';
import { TaskEither } from 'fp-ts/TaskEither';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { BaseAgent, AgentConfig, AgentError } from './BaseAgent';

/**
 * Agent Registry for managing multiple agents
 * 
 * Features:
 * - Agent lifecycle management
 * - Discovery and routing
 * - Health monitoring
 * - Load balancing
 */

export interface AgentRegistryConfig {
  maxAgents: number;
  healthCheckInterval: number;
  autoRestart: boolean;
  loadBalancing: 'round-robin' | 'least-active' | 'random';
}

export interface AgentEntry {
  agent: BaseAgent;
  config: AgentConfig;
  health: AgentHealth;
  lastHealthCheck: Date;
  requestCount: number;
}

export interface AgentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  errorRate: number;
  uptime: number;
  lastError?: AgentError;
}

/**
 * Registry for managing DeFi agents
 */
export class AgentRegistry {
  private agents: Map<string, AgentEntry> = new Map();
  private config: AgentRegistryConfig;
  private healthCheckTimer?: NodeJS.Timer;
  private loadBalancingIndex = 0;

  constructor(config: AgentRegistryConfig) {
    this.config = config;
    this.startHealthChecking();
  }

  /**
   * Register a new agent
   */
  public registerAgent(agent: BaseAgent): Either<AgentError, void> {
    const agentConfig = agent.getConfig();
    
    if (this.agents.has(agentConfig.id)) {
      return left(this.createError('AGENT_EXISTS', `Agent ${agentConfig.id} already registered`));
    }

    if (this.agents.size >= this.config.maxAgents) {
      return left(this.createError('MAX_AGENTS_EXCEEDED', 'Maximum number of agents exceeded'));
    }

    const entry: AgentEntry = {
      agent,
      config: agentConfig,
      health: {
        status: 'healthy',
        responseTime: 0,
        errorRate: 0,
        uptime: 0
      },
      lastHealthCheck: new Date(),
      requestCount: 0
    };

    this.agents.set(agentConfig.id, entry);
    return right(undefined);
  }

  /**
   * Unregister an agent
   */
  public unregisterAgent(agentId: string): TaskEither<AgentError, void> {
    const entry = this.agents.get(agentId);
    
    if (!entry) {
      return TE.left(this.createError('AGENT_NOT_FOUND', `Agent ${agentId} not found`));
    }

    return pipe(
      entry.agent.stop(),
      TE.map(() => {
        this.agents.delete(agentId);
      })
    );
  }

  /**
   * Get agent by ID
   */
  public getAgent(agentId: string): Either<AgentError, BaseAgent> {
    const entry = this.agents.get(agentId);
    
    if (!entry) {
      return left(this.createError('AGENT_NOT_FOUND', `Agent ${agentId} not found`));
    }

    return right(entry.agent);
  }

  /**
   * Get agents by capability
   */
  public getAgentsByCapability(capability: string): BaseAgent[] {
    const matchingAgents: BaseAgent[] = [];
    
    for (const entry of this.agents.values()) {
      if (entry.config.capabilities.includes(capability)) {
        matchingAgents.push(entry.agent);
      }
    }
    
    return matchingAgents;
  }

  /**
   * Select agent for load balancing
   */
  public selectAgent(capability?: string): Either<AgentError, BaseAgent> {
    const availableAgents = capability 
      ? this.getAgentsByCapability(capability)
      : Array.from(this.agents.values()).map(entry => entry.agent);

    if (availableAgents.length === 0) {
      return left(this.createError('NO_AGENTS_AVAILABLE', 'No agents available'));
    }

    const healthyAgents = availableAgents.filter(agent => {
      const entry = this.agents.get(agent.getConfig().id);
      return entry?.health.status === 'healthy';
    });

    if (healthyAgents.length === 0) {
      return left(this.createError('NO_HEALTHY_AGENTS', 'No healthy agents available'));
    }

    let selectedAgent: BaseAgent;

    switch (this.config.loadBalancing) {
      case 'round-robin':
        selectedAgent = healthyAgents[this.loadBalancingIndex % healthyAgents.length];
        this.loadBalancingIndex++;
        break;

      case 'least-active':
        selectedAgent = healthyAgents.reduce((least, current) => {
          const leastEntry = this.agents.get(least.getConfig().id)!;
          const currentEntry = this.agents.get(current.getConfig().id)!;
          return currentEntry.requestCount < leastEntry.requestCount ? current : least;
        });
        break;

      case 'random':
        selectedAgent = healthyAgents[Math.floor(Math.random() * healthyAgents.length)];
        break;

      default:
        selectedAgent = healthyAgents[0];
    }

    // Increment request count
    const entry = this.agents.get(selectedAgent.getConfig().id);
    if (entry) {
      entry.requestCount++;
    }

    return right(selectedAgent);
  }

  /**
   * Get all agents
   */
  public getAllAgents(): AgentEntry[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get registry health status
   */
  public getHealthStatus(): {
    totalAgents: number;
    healthyAgents: number;
    degradedAgents: number;
    unhealthyAgents: number;
    averageResponseTime: number;
  } {
    const entries = Array.from(this.agents.values());
    
    return {
      totalAgents: entries.length,
      healthyAgents: entries.filter(e => e.health.status === 'healthy').length,
      degradedAgents: entries.filter(e => e.health.status === 'degraded').length,
      unhealthyAgents: entries.filter(e => e.health.status === 'unhealthy').length,
      averageResponseTime: entries.reduce((sum, e) => sum + e.health.responseTime, 0) / entries.length || 0
    };
  }

  /**
   * Start all agents
   */
  public startAll(): TaskEither<AgentError, void> {
    return pipe(
      TE.tryCatch(
        async () => {
          const startPromises = Array.from(this.agents.values()).map(entry => 
            entry.agent.start()()
          );
          await Promise.all(startPromises);
        },
        (error) => this.createError('START_ALL_FAILED', `Failed to start all agents: ${error}`)
      )
    );
  }

  /**
   * Stop all agents
   */
  public stopAll(): TaskEither<AgentError, void> {
    return pipe(
      TE.tryCatch(
        async () => {
          const stopPromises = Array.from(this.agents.values()).map(entry => 
            entry.agent.stop()()
          );
          await Promise.all(stopPromises);
        },
        (error) => this.createError('STOP_ALL_FAILED', `Failed to stop all agents: ${error}`)
      )
    );
  }

  /**
   * Shutdown registry
   */
  public shutdown(): TaskEither<AgentError, void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    return this.stopAll();
  }

  /**
   * Start health checking
   */
  private startHealthChecking(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health checks on all agents
   */
  private async performHealthChecks(): Promise<void> {
    for (const [agentId, entry] of this.agents) {
      try {
        const startTime = Date.now();
        const state = entry.agent.getState();
        const metrics = entry.agent.getMetrics();
        const responseTime = Date.now() - startTime;

        // Update health based on agent state and metrics
        const health: AgentHealth = {
          status: this.determineHealthStatus(state, metrics),
          responseTime,
          errorRate: metrics.errorCount / metrics.actionsExecuted || 0,
          uptime: metrics.uptime
        };

        entry.health = health;
        entry.lastHealthCheck = new Date();

        // Auto-restart if configured and agent is unhealthy
        if (this.config.autoRestart && health.status === 'unhealthy' && state.status !== 'active') {
          await entry.agent.start()();
        }

      } catch (error) {
        entry.health = {
          status: 'unhealthy',
          responseTime: 0,
          errorRate: 1,
          uptime: 0,
          lastError: this.createError('HEALTH_CHECK_FAILED', `Health check failed: ${error}`)
        };
      }
    }
  }

  /**
   * Determine agent health status
   */
  private determineHealthStatus(state: any, metrics: any): 'healthy' | 'degraded' | 'unhealthy' {
    if (state.status === 'error' || state.status === 'terminated') {
      return 'unhealthy';
    }

    if (metrics.errorRate > 0.1 || metrics.avgResponseTime > 5000) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Create standardized error
   */
  private createError(code: string, message: string): AgentError {
    return {
      code,
      message,
      timestamp: new Date(),
      agentId: 'registry'
    };
  }
}