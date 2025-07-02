# Chat Interface Module

This module handles the conversational AI interface for the portfolio manager.

## Components

- **NLP Engine**: Natural language processing for user commands
- **Intent Recognition**: Identifies user intentions (lend, provide liquidity, check balance, etc.)
- **Response Generator**: Creates human-friendly responses with portfolio data
- **Command Parser**: Converts natural language to executable actions

## Key Features

- Multi-language support
- Context-aware conversations
- Voice input/output support (optional)
- Command history and suggestions
- Error handling with helpful explanations

## Usage

```typescript
import { ChatInterface } from './ChatInterface';

const chat = new ChatInterface({
  language: 'en',
  aiModel: 'gpt-4',
  contextWindow: 10 // Remember last 10 messages
});

const response = await chat.processMessage("Show me the best lending rates");
```