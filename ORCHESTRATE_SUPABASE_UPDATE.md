# Orchestrate API Supabase Integration

## Overview

The `/api/orchestrate.js` file has been successfully updated to include Supabase persistence for structured responses with comprehensive crypto context. This enhancement maintains all existing Dragon Ball Z theming and functionality while adding robust database storage for chat history and analytics.

## Key Features Added

### 1. Supabase Client Integration
- **Initialization**: Lazy-loaded Supabase client with environment variable validation
- **Configuration**: Uses `SUPABASE_URL` and `SUPABASE_ANON_KEY` environment variables
- **Fallback**: Gracefully continues without database if Supabase is not configured

### 2. Comprehensive Crypto Context Extraction
The system now captures detailed crypto-specific context based on user intents:

#### Lending Operations
```json
{
  "lending_info": {
    "action": "supply|borrow|repay",
    "parameters": { "amount": 100, "asset": "USDC" },
    "protocols": ["Compound", "Aave", "Silo"],
    "amount": 100,
    "asset": "USDC"
  }
}
```

#### Liquidity/Swap Operations
```json
{
  "swap_details": {
    "action": "swap|add_liquidity|remove_liquidity",
    "parameters": { "fromToken": "ETH", "toToken": "USDC" },
    "protocols": ["Uniswap", "SushiSwap", "DragonSwap"]
  }
}
```

#### Portfolio Management
```json
{
  "portfolio_data": {
    "action": "show_positions|rebalance",
    "parameters": {},
    "analysis_requested": true,
    "rebalance_requested": false
  }
}
```

#### Trading Operations
```json
{
  "market_data": {
    "action": "buy|sell",
    "parameters": {},
    "trade_type": "buy|sell"
  }
}
```

#### Risk Assessment
```json
{
  "portfolio_data": {
    "action": "assess_risk",
    "risk_assessment": true,
    "health_check": true,
    "parameters": {}
  }
}
```

### 3. Database Schema Integration
The system integrates with the following Supabase tables:

#### Users Table
- `id`: Primary key
- `wallet_address`: Ethereum wallet address (unique)
- `username`: Optional username (fallback to session ID)

#### Chat Sessions Table
- `id`: Primary key
- `user_id`: Foreign key to users
- `session_name`: Session identifier
- `is_active`: Boolean flag

#### Messages Table
- `id`: Primary key
- `session_id`: Foreign key to chat_sessions
- `user_id`: Foreign key to users
- `role`: 'user' | 'assistant' | 'system'
- `content`: Message content
- `crypto_context`: JSONB field with structured crypto data
- `metadata`: Additional metadata including agent type
- `created_at`: Timestamp

### 4. Dual Message Storage
For each conversation, the system stores:

1. **User Message**: 
   - Role: 'user'
   - Content: Original user input
   - Crypto Context: Basic intent parsing data

2. **AI Response**:
   - Role: 'assistant'
   - Content: Dragon Ball Z themed response
   - Crypto Context: Complete structured context with protocols, amounts, suggestions
   - Metadata: Agent type, confidence, risk level

### 5. Error Handling & Resilience
- **Graceful Degradation**: API continues to work even if Supabase is unavailable
- **Error Logging**: Database errors are logged but don't affect response
- **Error Persistence**: System errors are saved to database for debugging
- **Backward Compatibility**: All existing functionality is preserved

## Environment Variables Required

Add these to your `.env` file:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Dragon Ball Z Theming Preserved

All existing Dragon Ball Z theming is maintained:
- ✅ Mystical dragon persona responses
- ✅ Power level metaphors for yields
- ✅ Treasure references for investments
- ✅ Dragon wisdom in financial advice
- ✅ Error messages with dragon mystique

## Security Features Maintained

- ✅ Rate limiting (15 requests per minute)
- ✅ Request validation and sanitization
- ✅ CORS headers
- ✅ Input length limits (4000 characters)
- ✅ API key validation

## Usage Examples

### Lending Query
```bash
curl -X POST /api/orchestrate \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "I want to lend 100 USDC to earn yield",
    "sessionId": "session_123",
    "walletAddress": "0x1234...5678"
  }'
```

**Database Storage:**
- User message with basic intent parsing
- AI response with detailed lending context including protocols and risk assessment

### Portfolio Query
```bash
curl -X POST /api/orchestrate \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Show me my portfolio positions and suggest rebalancing",
    "sessionId": "session_123",
    "walletAddress": "0x1234...5678"
  }'
```

**Database Storage:**
- Complete portfolio analysis context
- Agent type: 'portfolio_agent'
- Structured suggestions and risk levels

## Benefits

1. **Analytics**: Track user intents and agent performance
2. **History**: Complete conversation history per wallet
3. **Context**: Rich crypto-specific metadata for each interaction
4. **Debugging**: Error tracking and performance monitoring
5. **Personalization**: Foundation for personalized recommendations
6. **Compliance**: Audit trail for financial advice given

## Testing

Two test scripts are included:

1. **test-crypto-context.js**: Validates crypto context extraction logic
2. **test-orchestrate.js**: End-to-end API testing framework

Run tests:
```bash
node test-crypto-context.js
node test-orchestrate.js
```

## File Changes Summary

### Modified Files
- `/api/orchestrate.js`: Added Supabase integration and crypto context extraction

### New Files
- `test-crypto-context.js`: Crypto context validation tests
- `test-orchestrate.js`: API integration tests
- `ORCHESTRATE_SUPABASE_UPDATE.md`: This documentation

### Dependencies Added
- `@supabase/supabase-js`: Supabase client library

## Future Enhancements

The crypto context structure is designed to be extensible for future features:
- Real-time price data integration
- Advanced portfolio analytics
- Risk scoring improvements
- Protocol-specific optimizations
- Cross-chain transaction support

---

**Note**: This implementation maintains 100% backward compatibility while adding powerful new persistence and analytics capabilities. The Dragon Ball Z theming and user experience remain unchanged.