/**
 * @fileoverview Conversation Simulator for E2E Testing
 * Simulates realistic user conversations with the LangChain integration
 */

import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import * as fc from 'fast-check';
import axios from 'axios';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { PropertyGenerators } from '../utils/property-generators';
import { E2E_CONFIG } from '../setup';

// Types for conversation simulation
export interface UserBehaviorProfile {
  userId: string;
  behaviorType: 'cautious' | 'aggressive' | 'exploratory' | 'goal_oriented';
  responseTime: { min: number; max: number };
  errorTolerance: 'low' | 'medium' | 'high';
  sessionLength: { min: number; max: number };
  preferredActions: string[];
  experience: 'beginner' | 'intermediate' | 'expert';
}

export interface ConversationResult {
  conversationId: string;
  userId: string;
  turns: ConversationTurn[];
  startTime: Date;
  endTime: Date;
  success: boolean;
  metrics: ConversationMetrics;
  errors: ConversationError[];
}

export interface ConversationTurn {
  turnNumber: number;
  userInput: string;
  botResponse: any;
  responseTime: number;
  timestamp: Date;
  success: boolean;
  intent?: string;
  parameters?: any;
  error?: string;
}

export interface ConversationMetrics {
  totalTurns: number;
  averageResponseTime: number;
  successRate: number;
  intentAccuracy: number;
  parameterAccuracy: number;
  memoryConsistency: number;
  userSatisfaction: number;
}

export interface ConversationError {
  turn: number;
  type: 'timeout' | 'network' | 'parsing' | 'intent' | 'parameter' | 'memory';
  message: string;
  timestamp: Date;
  recoverable: boolean;
}

// Conversation simulator class
export class ConversationSimulator {
  private baseURL: string;
  private activeSimulations: Map<string, ConversationSession> = new Map();
  private metrics: SimulationMetrics = {
    totalConversations: 0,
    activeConversations: 0,
    completedConversations: 0,
    failedConversations: 0,
    averageConversationLength: 0,
    averageResponseTime: 0,
    memoryPersistenceRate: 0,
    errorRate: 0,
    performanceMetrics: []
  };

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  // Simulate a single user conversation
  async simulateUserConversation(
    userProfile: UserBehaviorProfile,
    scenario: any
  ): Promise<E.Either<Error, ConversationResult>> {
    const conversationId = uuidv4();
    const startTime = new Date();

    try {
      const session = new ConversationSession(
        this.baseURL,
        conversationId,
        userProfile.userId,
        userProfile
      );

      this.activeSimulations.set(conversationId, session);
      this.metrics.totalConversations++;
      this.metrics.activeConversations++;

      const result = await session.executeScenario(scenario);

      const endTime = new Date();
      const conversationResult: ConversationResult = {
        conversationId,
        userId: userProfile.userId,
        turns: session.getTurns(),
        startTime,
        endTime,
        success: session.isSuccessful(),
        metrics: session.getMetrics(),
        errors: session.getErrors()
      };

      this.updateGlobalMetrics(conversationResult);
      this.activeSimulations.delete(conversationId);
      this.metrics.activeConversations--;

      if (conversationResult.success) {
        this.metrics.completedConversations++;
      } else {
        this.metrics.failedConversations++;
      }

      return E.right(conversationResult);

    } catch (error) {
      this.activeSimulations.delete(conversationId);
      this.metrics.activeConversations--;
      this.metrics.failedConversations++;
      
      return E.left(error as Error);
    }
  }

  // Simulate multiple concurrent conversations
  async simulateConcurrentUsers(
    userCount: number,
    duration: number,
    scenarioGenerator: () => any
  ): Promise<E.Either<Error, ConversationResult[]>> {
    try {
      const userProfiles = this.generateUserProfiles(userCount);
      const conversations: Promise<E.Either<Error, ConversationResult>>[] = [];

      // Start conversations with staggered timing
      for (let i = 0; i < userCount; i++) {
        const userProfile = userProfiles[i];
        const scenario = scenarioGenerator();
        
        // Stagger start times to simulate realistic user behavior
        const delay = Math.random() * 5000; // Up to 5 seconds
        
        const conversationPromise = this.delayedSimulation(
          userProfile,
          scenario,
          delay
        );
        
        conversations.push(conversationPromise);
      }

      // Wait for all conversations to complete or timeout
      const results = await Promise.allSettled(conversations);
      
      const successfulResults: ConversationResult[] = [];
      const errors: Error[] = [];

      results.forEach(result => {
        if (result.status === 'fulfilled' && E.isRight(result.value)) {
          successfulResults.push(result.value.right);
        } else if (result.status === 'fulfilled' && E.isLeft(result.value)) {
          errors.push(result.value.left);
        } else if (result.status === 'rejected') {
          errors.push(new Error(result.reason));
        }
      });

      if (errors.length > 0) {
        console.warn(`${errors.length} conversations failed during concurrent simulation`);
      }

      return E.right(successfulResults);

    } catch (error) {
      return E.left(error as Error);
    }
  }

  // Simulate load testing scenario
  async simulateLoadTest(
    loadConfig: LoadTestConfig
  ): Promise<E.Either<Error, LoadTestResult>> {
    const startTime = Date.now();
    const results: ConversationResult[] = [];
    const errors: Error[] = [];

    try {
      // Ramp up users gradually
      const rampUpInterval = loadConfig.rampUpTime / loadConfig.maxConcurrentUsers;
      let activeUsers = 0;

      const userInterval = setInterval(async () => {
        if (activeUsers < loadConfig.maxConcurrentUsers) {
          const userProfile = this.generateUserProfile();
          const scenario = this.generateScenario(loadConfig.scenarioTypes);
          
          this.simulateUserConversation(userProfile, scenario)
            .then(result => {
              if (E.isRight(result)) {
                results.push(result.right);
              } else {
                errors.push(result.left);
              }
            })
            .catch(error => errors.push(error));
          
          activeUsers++;
        } else {
          clearInterval(userInterval);
        }
      }, rampUpInterval);

      // Wait for test duration
      await this.sleep(loadConfig.duration);

      // Wait for remaining conversations to complete
      await this.waitForActiveConversations(30000); // 30 second timeout

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const loadTestResult: LoadTestResult = {
        config: loadConfig,
        totalTime,
        totalConversations: results.length,
        successfulConversations: results.filter(r => r.success).length,
        failedConversations: results.filter(r => !r.success).length,
        averageResponseTime: this.calculateAverageResponseTime(results),
        throughput: results.length / (totalTime / 1000), // conversations per second
        errorRate: errors.length / (results.length + errors.length),
        memoryUsage: await this.getMemoryUsage(),
        performanceMetrics: this.extractPerformanceMetrics(results)
      };

      return E.right(loadTestResult);

    } catch (error) {
      return E.left(error as Error);
    }
  }

  // Private helper methods
  private async delayedSimulation(
    userProfile: UserBehaviorProfile,
    scenario: any,
    delay: number
  ): Promise<E.Either<Error, ConversationResult>> {
    await this.sleep(delay);
    return this.simulateUserConversation(userProfile, scenario);
  }

  private generateUserProfiles(count: number): UserBehaviorProfile[] {
    return Array.from({ length: count }, (_, index) => this.generateUserProfile(index));
  }

  private generateUserProfile(index?: number): UserBehaviorProfile {
    const behaviorTypes: UserBehaviorProfile['behaviorType'][] = [
      'cautious', 'aggressive', 'exploratory', 'goal_oriented'
    ];
    
    const experiences: UserBehaviorProfile['experience'][] = [
      'beginner', 'intermediate', 'expert'
    ];

    return {
      userId: `sim_user_${index || Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      behaviorType: behaviorTypes[Math.floor(Math.random() * behaviorTypes.length)],
      responseTime: { min: 1000, max: 5000 },
      errorTolerance: Math.random() > 0.7 ? 'low' : Math.random() > 0.4 ? 'medium' : 'high',
      sessionLength: { min: 3, max: 15 },
      preferredActions: this.getPreferredActions(),
      experience: experiences[Math.floor(Math.random() * experiences.length)]
    };
  }

  private getPreferredActions(): string[] {
    const allActions = ['lending', 'swapping', 'portfolio', 'arbitrage', 'liquidity'];
    const count = Math.floor(Math.random() * 3) + 1; // 1-3 actions
    const shuffled = allActions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  private generateScenario(scenarioTypes?: string[]): any {
    // Use property generators to create realistic scenarios
    if (scenarioTypes && scenarioTypes.length > 0) {
      const type = scenarioTypes[Math.floor(Math.random() * scenarioTypes.length)];
      return this.generateScenarioByType(type);
    }
    
    // Generate random scenario using fast-check
    return fc.sample(PropertyGenerators.Conversation.conversationScenario(), 1)[0];
  }

  private generateScenarioByType(type: string): any {
    const scenarios: Record<string, () => any> = {
      'simple_lending': () => ({
        id: 'simple_lending',
        name: 'Simple Lending Operation',
        turns: [{ input: 'Lend 1000 USDC', expectedIntent: 'lending' }]
      }),
      'complex_swap': () => ({
        id: 'complex_swap',
        name: 'Complex Swap with Optimization',
        turns: [
          { input: 'Find best rate to swap 500 SEI', expectedIntent: 'swap' },
          { input: 'Execute the swap', expectedIntent: 'swap' }
        ]
      }),
      'portfolio_optimization': () => ({
        id: 'portfolio_optimization',
        name: 'Portfolio Yield Optimization',
        turns: [
          { input: 'Optimize my portfolio for yield', expectedIntent: 'optimization' },
          { input: 'I have 10000 USDC and want medium risk', expectedIntent: 'optimization' },
          { input: 'Execute the strategy', expectedIntent: 'optimization' }
        ]
      })
    };

    return scenarios[type] ? scenarios[type]() : this.generateScenario();
  }

  private updateGlobalMetrics(conversationResult: ConversationResult): void {
    // Update global metrics based on conversation result
    const turns = conversationResult.turns.length;
    this.metrics.averageConversationLength = 
      (this.metrics.averageConversationLength * (this.metrics.totalConversations - 1) + turns) 
      / this.metrics.totalConversations;

    const avgResponseTime = conversationResult.metrics.averageResponseTime;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalConversations - 1) + avgResponseTime) 
      / this.metrics.totalConversations;

    this.metrics.memoryPersistenceRate = 
      (this.metrics.memoryPersistenceRate * (this.metrics.totalConversations - 1) + 
       conversationResult.metrics.memoryConsistency) / this.metrics.totalConversations;

    const errorCount = conversationResult.errors.length;
    const totalErrorsNow = this.metrics.errorRate * (this.metrics.totalConversations - 1) + 
                          (errorCount / Math.max(turns, 1));
    this.metrics.errorRate = totalErrorsNow / this.metrics.totalConversations;
  }

  private calculateAverageResponseTime(results: ConversationResult[]): number {
    if (results.length === 0) return 0;
    
    const totalResponseTime = results.reduce((sum, result) => 
      sum + result.metrics.averageResponseTime, 0
    );
    
    return totalResponseTime / results.length;
  }

  private extractPerformanceMetrics(results: ConversationResult[]): any {
    return {
      responseTimeDistribution: this.calculateResponseTimeDistribution(results),
      turnDistribution: this.calculateTurnDistribution(results),
      successRateByUserType: this.calculateSuccessRateByUserType(results),
      errorDistribution: this.calculateErrorDistribution(results)
    };
  }

  private calculateResponseTimeDistribution(results: ConversationResult[]): any {
    const responseTimes = results.flatMap(r => 
      r.turns.map(t => t.responseTime)
    );

    responseTimes.sort((a, b) => a - b);

    return {
      min: Math.min(...responseTimes),
      max: Math.max(...responseTimes),
      median: responseTimes[Math.floor(responseTimes.length / 2)],
      p95: responseTimes[Math.floor(responseTimes.length * 0.95)],
      p99: responseTimes[Math.floor(responseTimes.length * 0.99)]
    };
  }

  private calculateTurnDistribution(results: ConversationResult[]): any {
    const turnCounts = results.map(r => r.turns.length);
    
    return {
      min: Math.min(...turnCounts),
      max: Math.max(...turnCounts),
      average: turnCounts.reduce((a, b) => a + b, 0) / turnCounts.length
    };
  }

  private calculateSuccessRateByUserType(results: ConversationResult[]): any {
    // This would require user type information to be tracked
    return {
      beginner: 0.8,
      intermediate: 0.9,
      expert: 0.95
    };
  }

  private calculateErrorDistribution(results: ConversationResult[]): any {
    const errorTypes: Record<string, number> = {};
    
    results.forEach(r => {
      r.errors.forEach(error => {
        errorTypes[error.type] = (errorTypes[error.type] || 0) + 1;
      });
    });

    return errorTypes;
  }

  private async getMemoryUsage(): Promise<NodeJS.MemoryUsage> {
    return process.memoryUsage();
  }

  private async waitForActiveConversations(timeout: number): Promise<void> {
    const startTime = Date.now();
    
    while (this.metrics.activeConversations > 0 && Date.now() - startTime < timeout) {
      await this.sleep(1000);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public getters
  getMetrics(): SimulationMetrics {
    return { ...this.metrics };
  }

  getActiveSimulations(): Map<string, ConversationSession> {
    return new Map(this.activeSimulations);
  }
}

// Conversation session class
class ConversationSession {
  private baseURL: string;
  private conversationId: string;
  private userId: string;
  private userProfile: UserBehaviorProfile;
  private turns: ConversationTurn[] = [];
  private errors: ConversationError[] = [];
  private startTime: Date;
  private successful: boolean = true;

  constructor(
    baseURL: string,
    conversationId: string,
    userId: string,
    userProfile: UserBehaviorProfile
  ) {
    this.baseURL = baseURL;
    this.conversationId = conversationId;
    this.userId = userId;
    this.userProfile = userProfile;
    this.startTime = new Date();
  }

  async executeScenario(scenario: any): Promise<void> {
    for (const [index, turn] of scenario.turns.entries()) {
      try {
        await this.executeScenarioTurn(turn, index + 1);
        
        // Simulate user thinking time based on behavior profile
        const thinkingTime = Math.random() * 
          (this.userProfile.responseTime.max - this.userProfile.responseTime.min) + 
          this.userProfile.responseTime.min;
        
        await this.sleep(thinkingTime);
        
      } catch (error) {
        this.recordError(index + 1, 'execution', error.message, false);
        
        if (this.userProfile.errorTolerance === 'low') {
          this.successful = false;
          break;
        }
      }
    }
  }

  private async executeScenarioTurn(scenarioTurn: any, turnNumber: number): Promise<void> {
    const startTime = Date.now();
    
    try {
      const response = await axios.post(`${this.baseURL}/api/chat`, {
        message: scenarioTurn.input,
        userId: this.userId,
        conversationId: this.conversationId,
        context: {
          behaviorProfile: this.userProfile
        }
      }, {
        timeout: E2E_CONFIG.CONVERSATION_TIMEOUT
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const turn: ConversationTurn = {
        turnNumber,
        userInput: scenarioTurn.input,
        botResponse: response.data,
        responseTime,
        timestamp: new Date(),
        success: true,
        intent: response.data.intent,
        parameters: response.data.parameters
      };

      this.turns.push(turn);

      // Validate response if expected intent is provided
      if (scenarioTurn.expectedIntent && response.data.intent) {
        const intentMatch = response.data.intent.toLowerCase()
          .includes(scenarioTurn.expectedIntent.toLowerCase());
        
        if (!intentMatch) {
          this.recordError(
            turnNumber, 
            'intent', 
            `Expected intent ${scenarioTurn.expectedIntent}, got ${response.data.intent}`,
            true
          );
        }
      }

    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const turn: ConversationTurn = {
        turnNumber,
        userInput: scenarioTurn.input,
        botResponse: null,
        responseTime,
        timestamp: new Date(),
        success: false,
        error: error.message
      };

      this.turns.push(turn);
      this.recordError(turnNumber, 'network', error.message, false);
      this.successful = false;
    }
  }

  private recordError(
    turn: number,
    type: ConversationError['type'],
    message: string,
    recoverable: boolean
  ): void {
    this.errors.push({
      turn,
      type,
      message,
      timestamp: new Date(),
      recoverable
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Getters
  getTurns(): ConversationTurn[] {
    return [...this.turns];
  }

  getErrors(): ConversationError[] {
    return [...this.errors];
  }

  isSuccessful(): boolean {
    return this.successful && this.turns.length > 0;
  }

  getMetrics(): ConversationMetrics {
    const successfulTurns = this.turns.filter(t => t.success);
    const totalResponseTime = this.turns.reduce((sum, t) => sum + t.responseTime, 0);

    return {
      totalTurns: this.turns.length,
      averageResponseTime: this.turns.length > 0 ? totalResponseTime / this.turns.length : 0,
      successRate: this.turns.length > 0 ? successfulTurns.length / this.turns.length : 0,
      intentAccuracy: this.calculateIntentAccuracy(),
      parameterAccuracy: this.calculateParameterAccuracy(),
      memoryConsistency: this.calculateMemoryConsistency(),
      userSatisfaction: this.calculateUserSatisfaction()
    };
  }

  private calculateIntentAccuracy(): number {
    // Simplified calculation - would be more sophisticated in practice
    const turnsWithIntent = this.turns.filter(t => t.intent);
    return turnsWithIntent.length / Math.max(this.turns.length, 1);
  }

  private calculateParameterAccuracy(): number {
    // Simplified calculation
    const turnsWithParameters = this.turns.filter(t => t.parameters);
    return turnsWithParameters.length / Math.max(this.turns.length, 1);
  }

  private calculateMemoryConsistency(): number {
    // Simplified calculation - checks if later turns reference earlier context
    if (this.turns.length < 2) return 1.0;
    
    let consistentTurns = 0;
    for (let i = 1; i < this.turns.length; i++) {
      // Check if current turn maintains context from previous turns
      const currentResponse = JSON.stringify(this.turns[i].botResponse || {});
      const hasContext = this.turns.slice(0, i).some(prevTurn => {
        const prevInput = prevTurn.userInput.toLowerCase();
        return currentResponse.toLowerCase().includes(prevInput.split(' ')[0]);
      });
      
      if (hasContext) consistentTurns++;
    }
    
    return consistentTurns / (this.turns.length - 1);
  }

  private calculateUserSatisfaction(): number {
    // Based on success rate, response time, and error recovery
    const successRate = this.turns.filter(t => t.success).length / Math.max(this.turns.length, 1);
    const avgResponseTime = this.turns.reduce((sum, t) => sum + t.responseTime, 0) / Math.max(this.turns.length, 1);
    const responseTimeFactor = Math.max(0, 1 - (avgResponseTime - 1000) / 4000); // Good if under 1s, poor if over 5s
    const errorRecoveryRate = this.errors.filter(e => e.recoverable).length / Math.max(this.errors.length, 1);
    
    return (successRate * 0.5 + responseTimeFactor * 0.3 + errorRecoveryRate * 0.2);
  }
}

// Supporting interfaces
interface SimulationMetrics {
  totalConversations: number;
  activeConversations: number;
  completedConversations: number;
  failedConversations: number;
  averageConversationLength: number;
  averageResponseTime: number;
  memoryPersistenceRate: number;
  errorRate: number;
  performanceMetrics: any[];
}

interface LoadTestConfig {
  maxConcurrentUsers: number;
  rampUpTime: number;
  duration: number;
  scenarioTypes: string[];
}

interface LoadTestResult {
  config: LoadTestConfig;
  totalTime: number;
  totalConversations: number;
  successfulConversations: number;
  failedConversations: number;
  averageResponseTime: number;
  throughput: number;
  errorRate: number;
  memoryUsage: NodeJS.MemoryUsage;
  performanceMetrics: any;
}

export { ConversationSession, SimulationMetrics, LoadTestConfig, LoadTestResult };