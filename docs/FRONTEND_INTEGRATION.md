# Frontend-Agent System Integration

This document describes how the frontend chat interface connects to the multi-agent system.

## Architecture Overview

```
Frontend (Next.js)
    ↓
Chat API Route (/api/chat)
    ↓
Orchestrator Client (HTTP/WebSocket)
    ↓
API Server (Express + WebSocket)
    ↓
Orchestrator Core
    ↓
Agent System (Lending, Liquidity, Portfolio, etc.)
```

## Key Components

### 1. Chat Interface (`frontend/components/chat/chat-interface.tsx`)
- Enhanced UI with agent type indicators
- Real-time status updates via WebSocket
- Shows execution time and confidence metrics
- Displays which agent is responding

### 2. Chat API Route (`frontend/app/api/chat/route.ts`)
- Parses user messages to extract intent
- Routes requests to orchestrator
- Formats agent responses for display
- Handles WebSocket connection info

### 3. Orchestrator Client (`frontend/lib/orchestrator-client.ts`)
- Manages HTTP and WebSocket connections
- Handles event subscriptions
- Provides retry logic and error handling

### 4. API Server (`src/api/server.ts`)
- Bridges frontend to agent system
- Manages WebSocket connections by session
- Broadcasts real-time updates
- Initializes and manages agents

## Setup Instructions

### 1. Install Dependencies

```bash
# In the root directory
npm install

# In the frontend directory
cd frontend
npm install
```

### 2. Configure Environment

Create `.env.local` in the frontend directory:

```env
NEXT_PUBLIC_ORCHESTRATOR_API=http://localhost:3001
NEXT_PUBLIC_ORCHESTRATOR_WS=ws://localhost:3001
```

### 3. Start the Services

```bash
# Terminal 1: Start the API server
npm run api

# Terminal 2: Start the frontend
cd frontend
npm run dev
```

### 4. Access the Application

Open http://localhost:3000 and navigate to the dashboard.

## Intent Recognition

The system recognizes various user intents:

### Lending Operations
- "Lend 1000 USDC" → Supply assets
- "Borrow 500 ETH" → Borrow assets
- "Repay my loan" → Repay borrowed assets

### Liquidity Management
- "Add liquidity to USDC/ETH pool" → Add liquidity
- "Remove liquidity" → Remove liquidity
- "Swap 100 USDC for ETH" → Token swap

### Portfolio Management
- "Show my portfolio" → Display positions
- "Rebalance my portfolio" → Optimize allocation

### Trading
- "Buy 1 ETH" → Execute buy order
- "Sell 500 USDC" → Execute sell order

### Analysis & Risk
- "Analyze market conditions" → Market analysis
- "Check my risk exposure" → Risk assessment

## Real-time Updates

The WebSocket connection provides:
- Agent status updates
- Task progress notifications
- Execution results
- Error notifications

## Response Format

Agent responses include:
- Formatted message with relevant data
- Agent type identification
- Execution time
- Confidence score
- Task ID for tracking

## Error Handling

The system handles:
- Network failures with retry logic
- Invalid intents with suggestions
- Agent failures with fallback options
- WebSocket reconnection

## Extending the System

### Adding New Intent Types

1. Update `UserIntentType` in `frontend/types/agent.ts`
2. Add parsing logic in `parseUserIntent()` 
3. Add response formatting in `formatAgentResponse()`
4. Update agent mappings in orchestrator

### Adding New Agents

1. Create agent in `src/agents/`
2. Register in `DefaultAgents.ts`
3. Add to orchestrator mappings
4. Update frontend icons/formatting

## Testing

```bash
# Test intent parsing
curl -X POST http://localhost:3001/process-intent \
  -H "Content-Type: application/json" \
  -d '{"intent": {...}}'

# Check agent status
curl http://localhost:3001/agents

# Health check
curl http://localhost:3001/health
```

## Troubleshooting

### WebSocket Connection Issues
- Check CORS settings
- Verify port availability
- Check firewall settings

### Agent Not Responding
- Check agent registration
- Verify orchestrator is running
- Check agent health status

### Intent Not Recognized
- Review intent parsing logic
- Check for typos in commands
- Verify agent capabilities