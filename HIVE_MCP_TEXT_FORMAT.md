# Hive Intelligence MCP - Natural Language Text Formatting

## Overview

The Hive Intelligence MCP server has been updated to return natural language text responses that are optimized for:
1. **AI text generation** - The AI can directly use the human-readable responses
2. **Text-to-speech** - The TTS system can read the responses without parsing JSON

## Key Changes

### 1. Enhanced Base Server
Created `enhanced-base-server.ts` that supports:
- Optional text formatting for all responses
- Custom text formatters per tool
- Fallback to JSON for backwards compatibility

### 2. Natural Language Formatters
Each Hive Intelligence tool now has a custom text formatter:

#### Market Data
```
Here's the current market data:

SEI is trading at $0.8500
  24h change: +5.20%
  24h volume: $125.00M
  Market cap: $2.10B
```

#### Sentiment Analysis
```
Market sentiment analysis for SEI:

Overall sentiment is bullish with a score of 72.0%.

Sentiment by source:
- twitter: 68.0% (12500 mentions)
- reddit: 75.0% (3200 mentions)

Trending topics: DeFi expansion, Institutional adoption
```

#### Price Predictions
```
Price predictions for SEI:
Current price: $0.8500

Predicted prices:
- 1h: $0.8517 (+0.20%)
  Confidence: 78%
- 24h: $0.8628 (+1.50%)
  Confidence: 65%
```

### 3. API Key Configuration
The Hive development API key is now configured:
```
HIVE_INTELLIGENCE_API_KEY=dev_2f4c0b23e5fb8a9d039e8620b4f52cdc
```

## Benefits

1. **Direct AI Usage**: The AI can use the responses without JSON parsing
2. **Natural TTS**: Text-to-speech reads naturally formatted text
3. **Human Readable**: Developers can easily understand responses
4. **Maintained Structure**: Still returns structured data internally

## Usage

When the MCP server receives a tool call, it:
1. Fetches data from the Hive Intelligence API
2. Processes the response
3. Formats it as natural language text
4. Returns text that can be directly spoken or used by AI

## Example Integration

```typescript
// AI receives this text response:
const response = await mcpClient.callTool('getMarketData', {
  symbols: ['SEI']
});

// Response is already formatted text:
console.log(response);
// "SEI is trading at $0.8500
//  24h change: +5.20%
//  24h volume: $125.00M"

// Can be directly sent to TTS:
await textToSpeech.speak(response);
```

## Testing

To test the text formatting:
```bash
cd mcp-servers
npm install
npm run dev:hive
```

The server will start and format all responses as natural language text suitable for AI consumption and text-to-speech.