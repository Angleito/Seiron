# Orchestrator Integration Guide

## Overview

The orchestrator system enables multi-agent coordination in the AIPortfolioManager, providing intelligent task routing, parallel execution, and error recovery for DeFi operations.

## Architecture

```
AIPortfolioManager
    ├── Orchestrator Core
    │   ├── Intent Analysis
    │   ├── Agent Selection
    │   └── Task Distribution
    ├── Custom Message Router
    │   └── Direct Manager Integration
    └── Agent Adapters
        ├── Lending Agent
        ├── Liquidity Agent
        └── Portfolio Agent
```

## Key Components

### 1. Orchestrator Core (`core.ts`)
- **Intent Analysis**: Converts user requests into structured intents
- **Agent Selection**: Chooses the best agent for each task based on capabilities
- **Task Execution**: Manages task lifecycle and coordination

### 2. Custom Message Router (`adapters/CustomMessageRouter.ts`)
- Routes messages between orchestrator and agents
- Provides direct integration with existing managers
- Handles parallel task execution

### 3. Agent Adapters (`adapters/AgentAdapter.ts`)
- Bridges orchestrator protocol with BaseAgent implementations
- Translates messages between formats
- Manages agent lifecycle

## Integration Points

### AIPortfolioManager Integration

```typescript
// Initialize orchestrator in constructor
this.initializeOrchestrator();

// Process user messages through orchestrator
await this.processMessageWithOrchestrator(message);

// Execute strategies with multi-agent coordination
await this.executeStrategy(strategy);
```

### Strategy Execution Flow

1. **Strategy Validation**: Ensure strategy format is correct
2. **Intent Creation**: Convert actions to intents
3. **Parallel Processing**: Execute independent tasks simultaneously
4. **Error Recovery**: Automatic retry with exponential backoff
5. **Result Aggregation**: Collect and format results

## Error Handling

### Retry Mechanism
```typescript
- Max retries: 3
- Backoff: Exponential (2^attempt seconds)
- Recoverable errors: timeout, network_error, temporary_unavailable
```

### Fallback Strategy
1. Primary: Execute through orchestrator
2. Fallback: Sequential execution with individual retries
3. Continue on failure: Don't fail entire strategy for single action

## Event System

### Available Events
- `intent_received`: New user intent received
- `task_started`: Task execution began
- `task_completed`: Task finished successfully
- `agent_status_changed`: Agent health status changed
- `error_occurred`: Error during processing

### Event Handling
```typescript
orchestrator.addEventListener('task_completed', (event) => {
  console.log(`Task ${event.task.id} completed`);
});
```

## Agent Registration

### Creating Agents
```typescript
const agent = AgentUtils.createAgent(
  'agent_id',
  AGENT_TYPES.LENDING,
  'Agent Name',
  [/* capabilities */],
  { /* metadata */ }
);
```

### Registering with Orchestrator
```typescript
orchestrator.registerAgent(agent);
```

## Performance Optimization

### Load Balancing Strategies
- `round_robin`: Distribute evenly
- `least_connections`: Route to least busy
- `weighted_response_time`: Favor faster agents
- `capability_based`: Match based on capabilities

### Concurrency Limits
- Max concurrent tasks: 5
- Max concurrent messages: 20
- Task timeout: 60 seconds

## Best Practices

1. **Intent Design**
   - Keep intents focused and specific
   - Include all necessary parameters
   - Use appropriate priority levels

2. **Error Handling**
   - Always provide fallback options
   - Log errors for debugging
   - Emit events for monitoring

3. **Agent Design**
   - Keep agents stateless when possible
   - Implement health checks
   - Handle timeouts gracefully

4. **Performance**
   - Batch related operations
   - Use parallel execution for independent tasks
   - Monitor agent response times

## Example Usage

```typescript
// Create and process an intent
const intent = IntentUtils.createIntent(
  INTENT_TYPES.LENDING,
  COMMON_ACTIONS.SUPPLY,
  { asset: 'USDC', amount: 1000 },
  { sessionId: 'session_123' }
);

const result = await orchestrator.processIntent(intent, sessionId);

// Handle result
pipe(
  result,
  EitherM.fold(
    (error) => console.error('Failed:', error),
    (taskResult) => console.log('Success:', taskResult)
  )
);
```

## Troubleshooting

### Common Issues

1. **Agent Not Found**
   - Ensure agent is registered
   - Check agent type matches intent
   - Verify agent capabilities

2. **Task Timeout**
   - Increase timeout in config
   - Check agent health
   - Review task complexity

3. **Rate Limiting**
   - Adjust concurrency limits
   - Implement request queuing
   - Use exponential backoff

### Debug Mode

Enable detailed logging:
```typescript
orchestrator.addEventListener('*', (event) => {
  console.log('[Orchestrator]', event);
});
```

## Future Enhancements

1. **Machine Learning Integration**
   - Predictive agent selection
   - Optimal task scheduling
   - Anomaly detection

2. **Advanced Routing**
   - Geographic routing
   - Cost-based routing
   - Priority queues

3. **Enhanced Monitoring**
   - Real-time dashboards
   - Performance analytics
   - Alert system