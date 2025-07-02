import { NextRequest, NextResponse } from 'next/server'
import { Orchestrator } from '@/lib/orchestrator-client'
import { UserIntent, UserIntentType, AgentMessage, TaskResult } from '@/types/agent'

// Initialize orchestrator client
const orchestrator = new Orchestrator({
  apiEndpoint: process.env.ORCHESTRATOR_ENDPOINT || 'http://localhost:3001',
  wsEndpoint: process.env.ORCHESTRATOR_WS_ENDPOINT || 'ws://localhost:3001',
})

// Parse user message to extract intent
function parseUserIntent(message: string, sessionId: string): UserIntent {
  // Simple intent parsing - in production, use NLP
  const lowerMessage = message.toLowerCase()
  
  let type: UserIntentType = 'info'
  let action = 'general_query'
  const parameters: Record<string, unknown> = {}

  // Lending intents
  if (lowerMessage.includes('lend') || lowerMessage.includes('supply')) {
    type = 'lending'
    action = 'supply'
    // Extract amount and asset
    const amountMatch = lowerMessage.match(/(\d+\.?\d*)\s*(usdc|eth|sei)?/i)
    if (amountMatch) {
      parameters.amount = parseFloat(amountMatch[1])
      parameters.asset = amountMatch[2]?.toUpperCase() || 'USDC'
    }
  } else if (lowerMessage.includes('borrow')) {
    type = 'lending'
    action = 'borrow'
  } else if (lowerMessage.includes('repay')) {
    type = 'lending'
    action = 'repay'
  }
  
  // Liquidity intents
  else if (lowerMessage.includes('liquidity') || lowerMessage.includes('pool')) {
    type = 'liquidity'
    action = lowerMessage.includes('remove') ? 'remove_liquidity' : 'add_liquidity'
  } else if (lowerMessage.includes('swap')) {
    type = 'liquidity'
    action = 'swap'
  }
  
  // Portfolio intents
  else if (lowerMessage.includes('portfolio') || lowerMessage.includes('positions')) {
    type = 'portfolio'
    action = 'show_positions'
  } else if (lowerMessage.includes('rebalance')) {
    type = 'portfolio'
    action = 'rebalance'
  }
  
  // Trading intents
  else if (lowerMessage.includes('buy')) {
    type = 'trading'
    action = 'buy'
  } else if (lowerMessage.includes('sell')) {
    type = 'trading'
    action = 'sell'
  }
  
  // Analysis intents
  else if (lowerMessage.includes('analyze') || lowerMessage.includes('analysis')) {
    type = 'analysis'
    action = 'analyze_market'
  }
  
  // Risk intents
  else if (lowerMessage.includes('risk') || lowerMessage.includes('health')) {
    type = 'risk'
    action = 'assess_risk'
  }

  return {
    type,
    action,
    parameters,
    context: {
      sessionId,
      previousIntents: [], // Could be tracked in session
    },
    priority: 'medium',
    timestamp: Date.now(),
  }
}

// Format agent response for chat
function formatAgentResponse(result: TaskResult, agentType?: string): string {
  if (result.error) {
    return `I encountered an error: ${result.error.message}. ${
      result.error.recoverable ? "I'll try a different approach." : "Please try rephrasing your request."
    }`
  }

  // Format based on task result
  const data = result.result as any
  let response = ''

  switch (agentType) {
    case 'lending_agent':
      if (data.action === 'supply') {
        response = `✅ Successfully supplied ${data.amount} ${data.asset} to ${data.protocol}.\n`
        response += `📊 Current APY: ${data.apy}%\n`
        response += `💰 You're now earning interest on your deposit!`
      } else if (data.action === 'borrow') {
        response = `✅ Successfully borrowed ${data.amount} ${data.asset} from ${data.protocol}.\n`
        response += `📊 Borrow APR: ${data.apr}%\n`
        response += `⚠️ Remember to monitor your health factor to avoid liquidation.`
      }
      break

    case 'liquidity_agent':
      if (data.action === 'add_liquidity') {
        response = `✅ Successfully added liquidity to ${data.pool}.\n`
        response += `💧 Liquidity: ${data.liquidityAmount}\n`
        response += `📊 Estimated APR: ${data.estimatedApr}%`
      } else if (data.action === 'swap') {
        response = `✅ Swap executed successfully!\n`
        response += `🔄 ${data.fromAmount} ${data.fromToken} → ${data.toAmount} ${data.toToken}\n`
        response += `💵 Price: ${data.executionPrice} ${data.toToken}/${data.fromToken}`
      }
      break

    case 'portfolio_agent':
      if (data.positions) {
        response = `📊 Your Portfolio Overview:\n\n`
        response += `Total Value: $${data.totalValue.toLocaleString()}\n`
        response += `24h Change: ${data.change24h > 0 ? '+' : ''}${data.change24h}%\n\n`
        response += `Positions:\n`
        data.positions.forEach((pos: any) => {
          response += `• ${pos.asset}: $${pos.value.toLocaleString()} (${pos.allocation}%)\n`
        })
      }
      break

    default:
      response = `Task completed successfully. ${JSON.stringify(data)}`
  }

  return response
}

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId } = await request.json()

    if (!message || !sessionId) {
      return NextResponse.json(
        { error: 'Message and sessionId are required' },
        { status: 400 }
      )
    }

    // Parse user intent
    const intent = parseUserIntent(message, sessionId)

    // Process intent through orchestrator
    const result = await orchestrator.processIntent(intent)

    if (result._tag === 'Left') {
      return NextResponse.json({
        message: `I couldn't process that request: ${result.left}. Please try rephrasing.`,
        timestamp: new Date().toISOString(),
        agentType: 'orchestrator',
        error: true,
      })
    }

    // Format the response based on the agent that handled it
    const taskResult = result.right
    const agentType = taskResult.metadata?.agentType as string

    const response = {
      message: formatAgentResponse(taskResult, agentType),
      timestamp: new Date().toISOString(),
      agentType,
      taskId: taskResult.taskId,
      executionTime: taskResult.executionTime,
      metadata: {
        intent: intent.type,
        action: intent.action,
        confidence: taskResult.metadata?.confidence,
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process message',
        message: 'I encountered an error processing your request. Please try again.',
      },
      { status: 500 }
    )
  }
}

// WebSocket endpoint for real-time updates
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json(
      { error: 'SessionId is required for WebSocket connection' },
      { status: 400 }
    )
  }

  // Return WebSocket upgrade instructions
  return NextResponse.json({
    wsEndpoint: `${process.env.ORCHESTRATOR_WS_ENDPOINT}/chat/${sessionId}`,
    protocol: 'agent-chat-v1',
  })
}