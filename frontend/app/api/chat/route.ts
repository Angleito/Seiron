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
    return `The dragon encountered turbulence: ${result.error.message}. ${
      result.error.recoverable ? "Seiron will try a different mystical approach." : "Please speak your wish more clearly."
    }`
  }

  // Format based on task result
  const data = result.result as any
  let response = ''

  switch (agentType) {
    case 'lending_agent':
      if (data.action === 'supply') {
        response = `🐉 Seiron has manifested your wish! Successfully supplied ${data.amount} ${data.asset} to ${data.protocol}.\n`
        response += `✨ Dragon's Power Level: ${data.apy}%\n`
        response += `💎 Your treasures now grow with mystical energy!`
      } else if (data.action === 'borrow') {
        response = `🐉 The dragon has granted your borrowing wish! ${data.amount} ${data.asset} from ${data.protocol}.\n`
        response += `⚡ Dragon's Demand: ${data.apr}%\n`
        response += `🔮 Keep your power level high to maintain the dragon's favor.`
      }
      break

    case 'liquidity_agent':
      if (data.action === 'add_liquidity') {
        response = `🐉 Seiron has channeled your energy into ${data.pool}!\n`
        response += `💫 Mystical Liquidity: ${data.liquidityAmount}\n`
        response += `✨ Dragon's Blessing: ${data.estimatedApr}%`
      } else if (data.action === 'swap') {
        response = `🐉 The dragon has transformed your treasures!\n`
        response += `⚡ ${data.fromAmount} ${data.fromToken} → ${data.toAmount} ${data.toToken}\n`
        response += `🔮 Mystical Exchange Rate: ${data.executionPrice} ${data.toToken}/${data.fromToken}`
      }
      break

    case 'portfolio_agent':
      if (data.positions) {
        response = `🐉 Seiron's Vision of Your Treasure Vault:\n\n`
        response += `Total Power Level: $${data.totalValue.toLocaleString()}\n`
        response += `Dragon's Favor: ${data.change24h > 0 ? '+' : ''}${data.change24h}%\n\n`
        response += `Mystical Treasures:\n`
        data.positions.forEach((pos: any) => {
          response += `• ${pos.asset}: $${pos.value.toLocaleString()} (${pos.allocation}%)\n`
        })
      }
      break

    default:
      response = `🐉 Seiron has fulfilled your wish! ${JSON.stringify(data)}`
  }

  return response
}

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId } = await request.json()

    if (!message || !sessionId) {
      return NextResponse.json(
        { error: 'The dragon requires both your wish and a summoning circle (sessionId)' },
        { status: 400 }
      )
    }

    // Parse user intent
    const intent = parseUserIntent(message, sessionId)

    // Process intent through orchestrator
    const result = await orchestrator.processIntent(intent)

    if (result._tag === 'Left') {
      return NextResponse.json({
        message: `Seiron could not understand your wish: ${result.left}. Please speak more clearly to the dragon.`,
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
        message: 'The dragon encountered mystical interference. Please try summoning again.',
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
      { error: 'A summoning circle (sessionId) is required for the dragon connection' },
      { status: 400 }
    )
  }

  // Return WebSocket upgrade instructions
  return NextResponse.json({
    wsEndpoint: `${process.env.ORCHESTRATOR_WS_ENDPOINT}/chat/${sessionId}`,
    protocol: 'agent-chat-v1',
  })
}