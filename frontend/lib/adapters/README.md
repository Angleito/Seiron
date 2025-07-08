# Adapter Pattern Implementation

This directory implements the adapter pattern for the Seiron orchestrator-client, providing a clean separation of concerns between different service integrations (SAK, Hive Intelligence, and MCP).

## Architecture

### Core Components

1. **Base Interfaces** (`types.ts`)
   - `BaseAdapter`: Common interface for all adapters
   - `AdapterConfig`: Configuration for adapter initialization  
   - `AdapterHealth`: Health status reporting
   - Service-specific interfaces for SAK, Hive, and MCP

2. **Adapter Implementations**
   - `SeiAgentKitAdapter.ts`: Sei Agent Kit integration
   - `HiveIntelligenceAdapter.ts`: Hive Intelligence integration
   - `SeiMCPAdapter.ts`: MCP Protocol integration

3. **Adapter Factory** (`AdapterFactory.ts`)
   - Creates and manages adapter instances
   - Provides singleton pattern for adapter lifecycle
   - Handles batch operations (connect all, health checks, etc.)

4. **WebSocket Manager** (`../services/WebSocketManager.ts`)
   - Extracted WebSocket management from orchestrator-client
   - Provides connection state management and automatic reconnection
   - Event handling and message routing

## Key Features

### 1. Clean Separation of Concerns
- Each adapter handles its specific service integration
- Common functionality abstracted into base interfaces
- Consistent error handling across all adapters

### 2. Health Monitoring
- Built-in health checks for all adapters
- Connection state tracking
- Error count monitoring and latency measurement

### 3. Automatic Connection Management
- Lazy initialization of adapters
- Automatic connection on first use
- Proper cleanup and resource management

### 4. Enhanced Error Handling
- Functional programming patterns with Either types
- Detailed error reporting with execution metadata
- Graceful degradation when services are unavailable

### 5. Backward Compatibility
- All existing orchestrator-client methods maintained
- Same API surface for consuming components
- Progressive migration path

## Usage Examples

### Basic Adapter Usage

```typescript
import { getAdapterFactory } from '@/lib/adapters'

const factory = getAdapterFactory({
  apiEndpoint: 'http://localhost:8000',
  timeout: 30000
})

// Create and use SAK adapter
const sakAdapter = factory.createAdapter('sak')
await sakAdapter.connect()

const result = await sakAdapter.executeTool('swap', {
  tokenA: 'SEI',
  tokenB: 'USDC',
  amount: '100'
})

if (result._tag === 'Right') {
  console.log('Swap successful:', result.right)
} else {
  console.error('Swap failed:', result.left)
}
```

### Health Monitoring

```typescript
// Check health of all adapters
const healthMap = await factory.getHealthStatus()

for (const [type, health] of healthMap) {
  if (health._tag === 'Right') {
    console.log(`${type}: ${health.right.status}`)
  } else {
    console.error(`${type}: ${health.left}`)
  }
}
```

### Using with Orchestrator

```typescript
import { Orchestrator } from '@/lib/orchestrator-client'

const orchestrator = new Orchestrator({
  apiEndpoint: 'http://localhost:8000',
  wsEndpoint: 'ws://localhost:8000'
})

// Execute actions through adapter pattern
const action = {
  type: 'hive',
  action: 'search',
  params: { query: 'DeFi yield farming' },
  description: 'Search for DeFi insights'
}

const result = await orchestrator.executeAdapterAction(action)
```

## Benefits

### 1. Maintainability
- Clear service boundaries
- Easier to add new service integrations
- Simplified testing and mocking

### 2. Reliability  
- Health monitoring and automatic reconnection
- Graceful error handling
- Resource cleanup

### 3. Performance
- Lazy loading of adapters
- Connection pooling and reuse
- Efficient resource management

### 4. Developer Experience
- Type-safe interfaces
- Consistent API patterns
- Clear error messages with metadata

## Testing

The adapter pattern includes comprehensive testing:

- Unit tests for individual adapters (`__tests__/adapter-pattern.test.ts`)
- Integration tests for orchestrator (`__tests__/orchestrator-adapter-integration.test.ts`)
- Health check validation
- Error scenario handling

Run tests:
```bash
npm test lib/adapters
npm test lib/__tests__/orchestrator-adapter-integration
```

## Migration Guide

The adapter pattern maintains full backward compatibility. Existing code will continue to work without changes:

```typescript
// This still works exactly the same
const result = await orchestrator.executeSAKAction('swap', params)
const hiveResults = await orchestrator.executeHiveSearch('query')
const mcpStatus = await orchestrator.getMCPNetworkStatus()
```

New code can leverage the improved adapter pattern:

```typescript
// New adapter-based approach
const action = { type: 'sak', action: 'swap', params, description: '...' }
const result = await orchestrator.executeAdapterAction(action)

// Direct adapter access
const sakAdapter = orchestrator.getAdapter('sak')
if (sakAdapter?.isConnected()) {
  // Use adapter directly
}
```

## Future Enhancements

1. **Adapter Registry**: Dynamic adapter registration
2. **Circuit Breakers**: Automatic service isolation on failures  
3. **Metrics**: Detailed performance and usage metrics
4. **Caching**: Intelligent response caching per adapter
5. **Load Balancing**: Multiple adapter instances for high availability