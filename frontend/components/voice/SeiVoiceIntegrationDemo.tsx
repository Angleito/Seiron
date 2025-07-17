/**
 * Sei Voice Integration Demo Component
 * 
 * Demonstrates the integration between voice chat and Sei MCP services
 * for investment-focused conversations. Shows real-time intent recognition,
 * market data integration, and voice-optimized responses.
 * 
 * @fileoverview Demo component for Sei voice integration capabilities
 */

'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { ScrollArea } from '../ui/scroll-area'
import { useSeiVoiceIntegration } from '../../hooks/voice/useSeiVoiceIntegration'
import { logger } from '../../lib/logger'
import type { VoiceIntent, EnhancedVoiceResponse } from '../../hooks/voice/useSeiVoiceIntegration'

/**
 * Intent color mapping for visual feedback
 */
const INTENT_COLORS: Record<VoiceIntent, string> = {
  portfolio_inquiry: 'bg-blue-500',
  market_analysis: 'bg-green-500',
  investment_advice: 'bg-purple-500',
  price_check: 'bg-yellow-500',
  transaction_guidance: 'bg-orange-500',
  defi_opportunities: 'bg-pink-500',
  risk_assessment: 'bg-red-500',
  sei_ecosystem: 'bg-indigo-500',
  general_chat: 'bg-gray-500'
}

/**
 * Demo query examples
 */
const DEMO_QUERIES = [
  "What's my portfolio looking like today?",
  "Should I buy more SEI at current prices?",
  "Show me the best DeFi opportunities on Sei",
  "What's the current SEI price and market sentiment?",
  "How do I swap tokens on Sei network?",
  "What are the risks of liquidity farming?",
  "Tell me about the Sei ecosystem",
  "Analyze my portfolio risk exposure"
]

/**
 * Demo component interface
 */
export interface SeiVoiceIntegrationDemoProps {
  walletAddress?: string
  className?: string
}

/**
 * Sei Voice Integration Demo Component
 */
export const SeiVoiceIntegrationDemo: React.FC<SeiVoiceIntegrationDemoProps> = ({
  walletAddress,
  className = ''
}) => {
  // State
  const [query, setQuery] = useState('')
  const [responses, setResponses] = useState<Array<{
    id: string
    query: string
    response: EnhancedVoiceResponse
    timestamp: number
  }>>([])
  const [isProcessing, setIsProcessing] = useState(false)

  // Sei voice integration hook
  const seiIntegration = useSeiVoiceIntegration({
    walletAddress,
    enableRealTimeMarketData: true,
    enablePortfolioTracking: !!walletAddress,
    enableAnalytics: true
  })

  /**
   * Process demo query
   */
  const handleProcessQuery = useCallback(async (queryText: string = query) => {
    if (!queryText.trim()) return

    setIsProcessing(true)
    logger.info('Processing demo query:', queryText)

    try {
      const response = await seiIntegration.processVoiceQuery(queryText, walletAddress)
      
      if (response) {
        const newResponse = {
          id: `response-${Date.now()}`,
          query: queryText,
          response,
          timestamp: Date.now()
        }
        
        setResponses(prev => [newResponse, ...prev].slice(0, 10)) // Keep last 10
        setQuery('')
        
        logger.info('Demo query processed successfully', {
          intent: response.intent,
          confidence: response.confidence,
          processingTime: response.processingTime
        })
      }
    } catch (error) {
      logger.error('Demo query processing failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [query, seiIntegration, walletAddress])

  /**
   * Handle demo query selection
   */
  const handleDemoQuery = useCallback((demoQuery: string) => {
    setQuery(demoQuery)
    handleProcessQuery(demoQuery)
  }, [handleProcessQuery])

  /**
   * Clear responses
   */
  const handleClearResponses = useCallback(() => {
    setResponses([])
    seiIntegration.clearCache()
  }, [seiIntegration])

  /**
   * Get analytics data
   */
  const analytics = seiIntegration.getAnalytics()

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gradient">
            🐉 Sei Voice Integration Demo
          </CardTitle>
          <CardDescription>
            Experience AI-powered investment conversations with real-time Sei blockchain data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Indicators */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${seiIntegration.hasMarketData ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm">Market Data</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${seiIntegration.hasPortfolioData ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm">Portfolio Data</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${seiIntegration.defiOpportunities.length > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm">DeFi Opportunities</span>
              </div>
            </div>

            {/* Analytics */}
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">Total Queries:</span> {analytics.totalQueries}
              </div>
              <div className="text-sm">
                <span className="font-medium">Avg Confidence:</span> {(analytics.avgConfidence * 100).toFixed(1)}%
              </div>
              <div className="text-sm">
                <span className="font-medium">Last Intent:</span> 
                {seiIntegration.lastIntent && (
                  <Badge 
                    variant="secondary" 
                    className={`ml-2 ${INTENT_COLORS[seiIntegration.lastIntent]} text-white`}
                  >
                    {seiIntegration.lastIntent}
                  </Badge>
                )}
              </div>
            </div>

            {/* Cache Info */}
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">Cache Size:</span> {seiIntegration.getCacheStats().size}
              </div>
              <div className="text-sm">
                <span className="font-medium">Last Update:</span> 
                {seiIntegration.lastUpdate ? new Date(seiIntegration.lastUpdate).toLocaleTimeString() : 'Never'}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearResponses}
                className="text-xs"
              >
                Clear Cache
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Query Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Try a Voice Query</CardTitle>
          <CardDescription>
            Type your investment question or select from examples below
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input */}
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about your portfolio, market conditions, or DeFi opportunities..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleProcessQuery()
                }
              }}
              disabled={isProcessing}
              className="flex-1"
            />
            <Button
              onClick={() => handleProcessQuery()}
              disabled={isProcessing || !query.trim()}
              className="min-w-24"
            >
              {isProcessing ? (
                <motion.div
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                'Ask'
              )}
            </Button>
          </div>

          {/* Demo Queries */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              Quick Examples:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {DEMO_QUERIES.map((demoQuery, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoQuery(demoQuery)}
                  disabled={isProcessing}
                  className="text-left justify-start h-auto p-2 text-xs"
                >
                  "{demoQuery}"
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      <AnimatePresence>
        {seiIntegration.error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded-full" />
                    <span className="text-red-700 font-medium">Error</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={seiIntegration.clearError}
                  >
                    ✕
                  </Button>
                </div>
                <p className="text-red-600 text-sm mt-2">{seiIntegration.error}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Responses */}
      {responses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Voice Responses</CardTitle>
            <CardDescription>
              AI-generated responses with Sei blockchain intelligence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-4">
                <AnimatePresence>
                  {responses.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      {/* Query */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`${INTENT_COLORS[item.response.intent]} text-white`}
                          >
                            {item.response.intent}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {(item.response.confidence * 100).toFixed(1)}% confidence
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.response.processingTime}ms
                          </span>
                        </div>
                        <div className="text-sm font-medium">
                          <span className="text-blue-600">You:</span> "{item.query}"
                        </div>
                      </div>

                      <Separator />

                      {/* Response */}
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-green-600 font-medium">Seiron:</span> {item.response.spokenText}
                        </div>

                        {/* Follow-up Questions */}
                        {item.response.followUpQuestions && item.response.followUpQuestions.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">
                              Follow-up suggestions:
                            </div>
                            <div className="space-y-1">
                              {item.response.followUpQuestions.map((question, idx) => (
                                <Button
                                  key={idx}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDemoQuery(question)}
                                  className="text-xs h-auto p-1 justify-start"
                                >
                                  • {question}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Context Data */}
                        {(item.response.marketContext || item.response.portfolioContext || item.response.defiOpportunities) && (
                          <div className="text-xs text-muted-foreground mt-2">
                            <div className="flex gap-2">
                              {item.response.marketContext && (
                                <Badge variant="outline">Market Data</Badge>
                              )}
                              {item.response.portfolioContext && (
                                <Badge variant="outline">Portfolio Data</Badge>
                              )}
                              {item.response.defiOpportunities && (
                                <Badge variant="outline">DeFi Opportunities</Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="text-xs text-muted-foreground">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Market Context Display */}
      {seiIntegration.marketContext && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Market Context</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium">SEI Price</div>
                <div className="text-lg">${seiIntegration.marketContext.seiPrice.toFixed(3)}</div>
              </div>
              <div>
                <div className="font-medium">24h Change</div>
                <div className={`text-lg ${seiIntegration.marketContext.seiChange24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {seiIntegration.marketContext.seiChange24h >= 0 ? '+' : ''}{seiIntegration.marketContext.seiChange24h.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="font-medium">Trend</div>
                <Badge className={`${seiIntegration.marketContext.marketTrend === 'bullish' ? 'bg-green-500' : seiIntegration.marketContext.marketTrend === 'bearish' ? 'bg-red-500' : 'bg-gray-500'} text-white`}>
                  {seiIntegration.marketContext.marketTrend}
                </Badge>
              </div>
              <div>
                <div className="font-medium">Volatility</div>
                <Badge variant="outline">
                  {seiIntegration.marketContext.volatility}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default SeiVoiceIntegrationDemo