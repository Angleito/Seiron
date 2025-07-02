/**
 * Custom Message Router for AIPortfolioManager
 * 
 * Routes messages between the orchestrator and agent adapters,
 * handling the actual execution of tasks through the existing managers
 */

import { MessageRouter } from '../router';
import type { Agent, Task, TaskResult, AgentMessage } from '../types';
import { EitherM } from '../../types/utils';
import type { Either } from '../../types';
import { AgentAdapter } from './AgentAdapter';
import { LendingManager } from '../../lending/LendingManager';
import { LiquidityManager } from '../../liquidity/LiquidityManager';
import { PortfolioManager } from '../../portfolio/PortfolioManager';

export interface CustomRouterConfig {
  lendingManager: LendingManager;
  liquidityManager: LiquidityManager;
  portfolioManager: PortfolioManager;
}

export class CustomMessageRouter extends MessageRouter {
  private agentAdapters: Map<string, AgentAdapter> = new Map();
  private managers: CustomRouterConfig;

  constructor(config: any, managers: CustomRouterConfig) {
    super(config);
    this.managers = managers;
  }

  /**
   * Register an agent adapter
   */
  public registerAgentAdapter(agentId: string, adapter: AgentAdapter): void {
    this.agentAdapters.set(agentId, adapter);
  }

  /**
   * Override sendTaskRequest to route through agent adapters or direct manager calls
   */
  public override async sendTaskRequest(
    task: Task,
    agent: Agent
  ): Promise<Either<string, TaskResult>> {
    const adapter = this.agentAdapters.get(agent.id);

    if (adapter) {
      // Route through agent adapter
      const taskRequest: AgentMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'task_request',
        senderId: 'orchestrator',
        receiverId: agent.id,
        payload: {
          task,
          context: {
            // Add any necessary context
          }
        },
        timestamp: Date.now()
      };

      const response = await adapter.processMessage(taskRequest);
      
      return EitherM.flatMap(response, (msg: AgentMessage) => {
        if (msg.type === 'task_response') {
          return EitherM.right(msg.payload as TaskResult);
        }
        return EitherM.left('Invalid response type from agent');
      });
    }

    // Direct manager execution for simpler tasks
    return this.executeDirectManagerTask(task, agent);
  }

  /**
   * Execute task directly through managers without agent adapters
   */
  private async executeDirectManagerTask(
    task: Task,
    agent: Agent
  ): Promise<Either<string, TaskResult>> {
    try {
      const startTime = Date.now();
      let result: any;
      let success = true;
      let error: any;

      // Route based on agent type and action
      switch (agent.type) {
        case 'lending_agent':
          result = await this.executeLendingTask(task);
          break;
        case 'liquidity_agent':
          result = await this.executeLiquidityTask(task);
          break;
        case 'portfolio_agent':
          result = await this.executePortfolioTask(task);
          break;
        default:
          return EitherM.left(`Unsupported agent type: ${agent.type}`);
      }

      const taskResult: TaskResult = {
        taskId: task.id,
        status: success ? 'completed' : 'failed',
        result: result,
        error: error,
        executionTime: Date.now() - startTime,
        metadata: {
          executedBy: 'direct_manager',
          agentId: agent.id
        }
      };

      return EitherM.right(taskResult);
    } catch (error) {
      return EitherM.left(`Task execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute lending tasks
   */
  private async executeLendingTask(task: Task): Promise<any> {
    const { action, parameters } = task;

    switch (action) {
      case 'supply':
        return await this.managers.lendingManager.lend({
          asset: parameters.asset as string,
          amount: parameters.amount as number,
          protocol: parameters.protocol as string
        });

      case 'borrow':
        return await this.managers.lendingManager.borrow({
          asset: parameters.asset as string,
          amount: parameters.amount as number,
          protocol: parameters.protocol as string
        });

      case 'withdraw':
        return await this.managers.lendingManager.withdraw({
          asset: parameters.asset as string,
          amount: parameters.amount as number,
          protocol: parameters.protocol as string
        });

      case 'repay':
        return await this.managers.lendingManager.repay({
          asset: parameters.asset as string,
          amount: parameters.amount as number,
          protocol: parameters.protocol as string
        });

      default:
        throw new Error(`Unsupported lending action: ${action}`);
    }
  }

  /**
   * Execute liquidity tasks
   */
  private async executeLiquidityTask(task: Task): Promise<any> {
    const { action, parameters } = task;

    switch (action) {
      case 'add_liquidity':
        return await this.managers.liquidityManager.addLiquidity({
          tokenA: parameters.tokenA as string,
          tokenB: parameters.tokenB as string,
          amountA: parameters.amountA as number,
          amountB: parameters.amountB as number
        });

      case 'remove_liquidity':
        return await this.managers.liquidityManager.removeLiquidity({
          poolId: parameters.poolId as string,
          lpAmount: parameters.lpAmount as number
        });

      case 'swap':
        return await this.managers.liquidityManager.swap({
          tokenIn: parameters.tokenIn as string,
          tokenOut: parameters.tokenOut as string,
          amountIn: parameters.amountIn as number,
          slippage: parameters.slippage as number || 0.01
        });

      default:
        throw new Error(`Unsupported liquidity action: ${action}`);
    }
  }

  /**
   * Execute portfolio tasks
   */
  private async executePortfolioTask(task: Task): Promise<any> {
    const { action, parameters } = task;

    switch (action) {
      case 'show_positions':
        return await this.managers.portfolioManager.getPortfolioSummary();

      case 'rebalance':
        // Implement rebalancing logic
        return await this.managers.portfolioManager.rebalance(
          parameters.targetAllocations as Record<string, number>
        );

      case 'analyze':
        return await this.managers.portfolioManager.calculatePerformance(
          parameters.timeframe as string || '24h'
        );

      case 'get_balance':
        return await this.managers.portfolioManager.getBalances();

      default:
        throw new Error(`Unsupported portfolio action: ${action}`);
    }
  }

  /**
   * Health check for all registered agents
   */
  public async checkAgentHealth(): Promise<Map<string, boolean>> {
    const healthStatus = new Map<string, boolean>();

    for (const [agentId, adapter] of this.agentAdapters) {
      try {
        const healthMessage: AgentMessage = {
          id: `health_${Date.now()}`,
          type: 'health_check',
          senderId: 'orchestrator',
          receiverId: agentId,
          payload: {},
          timestamp: Date.now()
        };

        const response = await adapter.processMessage(healthMessage);
        healthStatus.set(agentId, response._tag === 'Right');
      } catch (error) {
        healthStatus.set(agentId, false);
      }
    }

    return healthStatus;
  }
}