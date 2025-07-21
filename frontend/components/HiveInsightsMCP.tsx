'use client'

import { useState, useEffect } from 'react'
import { Search, TrendingUp, AlertTriangle, Target, BarChart3, Brain, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMCPClient, HiveIntelligenceConfig } from '@/lib/mcp'
import { logger } from '@/lib/logger'

interface HiveInsight {
  id: string
  type: 'trend' | 'anomaly' | 'opportunity' | 'risk' | 'correlation'
  title: string
  description: string
  confidence: number
  data: Record<string, any>
  impact?: 'low' | 'medium' | 'high'
  timeframe?: string
  actionable?: boolean
}

interface HiveRecommendation {
  id: string
  type: 'buy' | 'sell' | 'hold' | 'monitor' | 'optimize'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  expectedImpact: number
  actionItems: string[]
  reasoning?: string
  riskLevel?: 'low' | 'medium' | 'high'
}

interface HiveAnalyticsData {
  insights: HiveInsight[]
  recommendations: HiveRecommendation[]
  metadata: {
    queryId: string
    analysisType: 'portfolio' | 'market' | 'risk' | 'performance'
    creditsUsed: number
    timestamp: number
    confidence: number
  }
}

interface CreditUsage {
  totalCredits: number
  usedCredits: number
  remainingCredits: number
  resetDate: string
}

export interface HiveInsightsMCPProps {
  walletAddress?: string
  autoRefresh?: boolean
  refreshInterval?: number
  showCredits?: boolean
  className?: string
  maxInsights?: number
  maxRecommendations?: number
}

/**
 * HiveInsights component updated to use MCP (Model Context Protocol)
 * This replaces the old adapter pattern with direct MCP client usage
 */
export function HiveInsightsMCP({
  walletAddress,
  autoRefresh = false,
  refreshInterval = 300000, // 5 minutes
  showCredits = true,
  className,
  maxInsights = 5,
  maxRecommendations = 3
}: HiveInsightsMCPProps) {
  const [analyticsData, setAnalyticsData] = useState<HiveAnalyticsData | null>(null)
  const [creditUsage, setCreditUsage] = useState<CreditUsage | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [selectedInsightType, setSelectedInsightType] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)

  // Initialize MCP client for Hive Intelligence
  const { client: hiveClient, connected, callTool } = useMCPClient(HiveIntelligenceConfig)

  useEffect(() => {
    // Auto-refresh if enabled
    let interval: NodeJS.Timeout | null = null
    if (autoRefresh && walletAddress && connected) {
      interval = setInterval(() => {
        fetchAnalytics('portfolio')
      }, refreshInterval)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, walletAddress, connected])

  const fetchAnalytics = async (analysisType: 'portfolio' | 'market' | 'risk' | 'performance' = 'portfolio') => {
    if (!connected) {
      setError('MCP server not connected')
      return
    }

    if (!walletAddress && analysisType === 'portfolio') {
      logger.warn('Wallet address required for portfolio analysis')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Use MCP client to fetch portfolio analysis
      if (analysisType === 'portfolio' && walletAddress) {
        const result = await callTool('getPortfolioAnalysis', {
          walletAddress,
          includeDefi: true,
          includeNFTs: false,
          timeframe: '30d'
        })

        if (result.content) {
          // Transform MCP response to match component's expected format
          const portfolioData = result.content
          setAnalyticsData({
            insights: portfolioData.insights || [],
            recommendations: portfolioData.recommendations || [],
            metadata: {
              queryId: portfolioData.queryId || crypto.randomUUID(),
              analysisType,
              creditsUsed: portfolioData.creditsUsed || 1,
              timestamp: Date.now(),
              confidence: portfolioData.confidence || 85
            }
          })
          setLastUpdate(new Date())
        }
      } else if (analysisType === 'market') {
        // Fetch market insights
        const [marketResult, sentimentResult] = await Promise.all([
          callTool('getMarketData', {
            symbols: ['SEI', 'BTC', 'ETH'],
            timeframe: '1h',
            includeIndicators: true
          }),
          callTool('getSentimentAnalysis', {
            symbols: ['SEI'],
            sources: ['twitter', 'reddit', 'news'],
            timeRange: '24h'
          })
        ])

        // Combine results into analytics data
        const insights: HiveInsight[] = []
        const recommendations: HiveRecommendation[] = []

        // Process market data
        if (marketResult.content) {
          const marketData = marketResult.content
          marketData.data?.forEach((asset: any) => {
            if (asset.priceChange24h > 5) {
              insights.push({
                id: crypto.randomUUID(),
                type: 'trend',
                title: `${asset.symbol} showing strong momentum`,
                description: `${asset.symbol} is up ${asset.priceChange24h.toFixed(2)}% in 24h with increasing volume`,
                confidence: 85,
                impact: 'high',
                timeframe: '24h',
                data: asset
              })
            }
          })
        }

        // Process sentiment data
        if (sentimentResult.content) {
          const sentiment = sentimentResult.content
          if (sentiment.overallSentiment > 0.7) {
            recommendations.push({
              id: crypto.randomUUID(),
              type: 'buy',
              title: 'Positive sentiment detected for SEI',
              description: 'Community sentiment is strongly positive, consider accumulating',
              priority: 'medium',
              expectedImpact: 15,
              actionItems: [
                'Monitor price action for entry points',
                'Set stop-loss at -5%',
                'Consider DCA strategy'
              ],
              reasoning: 'High social sentiment often precedes price movements',
              riskLevel: 'medium'
            })
          }
        }

        setAnalyticsData({
          insights,
          recommendations,
          metadata: {
            queryId: crypto.randomUUID(),
            analysisType,
            creditsUsed: 2,
            timestamp: Date.now(),
            confidence: 80
          }
        })
        setLastUpdate(new Date())
      }

      // Fetch credit usage
      if (showCredits) {
        await fetchCreditUsage()
      }
    } catch (error) {
      logger.error('Failed to fetch Hive analytics via MCP:', error)
      setError(error.message || 'Failed to fetch analytics')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCreditUsage = async () => {
    // In a real implementation, this would be another MCP tool call
    // For now, we'll simulate it
    setCreditUsage({
      totalCredits: 1000,
      usedCredits: 150,
      remainingCredits: 850,
      resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend':
        return <TrendingUp className="h-4 w-4" />
      case 'anomaly':
        return <AlertTriangle className="h-4 w-4" />
      case 'opportunity':
        return <Target className="h-4 w-4" />
      case 'risk':
        return <AlertTriangle className="h-4 w-4" />
      case 'correlation':
        return <BarChart3 className="h-4 w-4" />
      default:
        return <Brain className="h-4 w-4" />
    }
  }

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'trend':
        return 'bg-blue-50 border-blue-200 text-blue-700'
      case 'anomaly':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700'
      case 'opportunity':
        return 'bg-green-50 border-green-200 text-green-700'
      case 'risk':
        return 'bg-red-50 border-red-200 text-red-700'
      case 'correlation':
        return 'bg-purple-50 border-purple-200 text-purple-700'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700'
    }
  }

  const getRecommendationColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-700'
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700'
      case 'low':
        return 'bg-green-50 border-green-200 text-green-700'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700'
    }
  }

  const getConfidenceDisplay = (confidence: number) => {
    const stars = Math.floor(confidence / 20) + 1
    return '⭐'.repeat(Math.min(stars, 5))
  }

  const filteredInsights = analyticsData?.insights.filter(insight => 
    selectedInsightType === 'all' || insight.type === selectedInsightType
  ) || []

  const insightTypes = ['all', 'trend', 'opportunity', 'risk', 'anomaly', 'correlation']

  return (
    <div className={cn("bg-white rounded-lg shadow-md border border-gray-200", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            🔮 Hive Intelligence (MCP)
            {connected ? (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                Connected
              </span>
            ) : (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                Disconnected
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAnalytics('portfolio')}
              disabled={isLoading || !walletAddress || !connected}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Analyzing...' : 'Analyze Portfolio'}
            </button>
            <button
              onClick={() => fetchAnalytics('market')}
              disabled={isLoading || !connected}
              className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              Market Intel
            </button>
          </div>
        </div>

        {/* Credit Usage */}
        {showCredits && creditUsage && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">
              Credits: {creditUsage.remainingCredits}/{creditUsage.totalCredits} remaining
            </span>
            <button
              onClick={fetchCreditUsage}
              className="text-blue-600 hover:text-blue-700"
            >
              Refresh Credits
            </button>
          </div>
        )}

        {lastUpdate && (
          <p className="text-xs text-gray-500 mt-1">
            Last analysis: {lastUpdate.toLocaleTimeString()}
          </p>
        )}

        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {!connected ? (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">MCP server not connected</p>
            <p className="text-sm text-gray-400">
              Waiting for Hive Intelligence MCP server connection...
            </p>
          </div>
        ) : !analyticsData ? (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No analysis data available</p>
            <p className="text-sm text-gray-400">
              Connect your wallet and click "Analyze Portfolio" to get AI-powered insights
            </p>
          </div>
        ) : (
          <>
            {/* Analysis Metadata */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 mb-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">
                  🧠 Analysis Summary (via MCP)
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-blue-600">
                    {getConfidenceDisplay(analyticsData.metadata.confidence)}
                  </span>
                  <span className="text-purple-600">
                    {analyticsData.metadata.creditsUsed} credits used
                  </span>
                </div>
              </div>
              <p className="text-sm text-blue-800 capitalize">
                {analyticsData.metadata.analysisType} analysis with {analyticsData.insights.length} insights 
                and {analyticsData.recommendations.length} recommendations
              </p>
            </div>

            {/* Insight Type Filter */}
            <div className="flex flex-wrap gap-2 mb-4">
              {insightTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedInsightType(type)}
                  className={cn(
                    "px-3 py-1 rounded text-xs font-medium transition-colors",
                    selectedInsightType === type
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                  {type !== 'all' && (
                    <span className="ml-1">
                      ({analyticsData.insights.filter(i => i.type === type).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Insights */}
            {filteredInsights.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">
                  <Sparkles className="h-4 w-4" />
                  Market Intelligence Insights
                </h4>
                <div className="space-y-3">
                  {filteredInsights.slice(0, maxInsights).map((insight) => (
                    <div
                      key={insight.id}
                      className={cn(
                        "rounded-lg p-3 border",
                        getInsightColor(insight.type)
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getInsightIcon(insight.type)}
                          <span className="text-xs font-medium uppercase tracking-wide">
                            {insight.type}
                          </span>
                          {insight.impact && (
                            <span className={cn(
                              "text-xs px-2 py-1 rounded",
                              insight.impact === 'high' && "bg-red-100 text-red-700",
                              insight.impact === 'medium' && "bg-yellow-100 text-yellow-700",
                              insight.impact === 'low' && "bg-green-100 text-green-700"
                            )}>
                              {insight.impact} impact
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span>{getConfidenceDisplay(insight.confidence)}</span>
                          <span>{insight.confidence}%</span>
                        </div>
                      </div>
                      <h5 className="font-medium mb-1">{insight.title}</h5>
                      <p className="text-sm opacity-90">{insight.description}</p>
                      {insight.timeframe && (
                        <p className="text-xs mt-2 opacity-75">
                          Timeframe: {insight.timeframe}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {analyticsData.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  Strategic Recommendations
                </h4>
                <div className="space-y-3">
                  {analyticsData.recommendations.slice(0, maxRecommendations).map((rec) => (
                    <div
                      key={rec.id}
                      className={cn(
                        "rounded-lg p-3 border",
                        getRecommendationColor(rec.priority)
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium uppercase tracking-wide">
                            {rec.type} - {rec.priority} Priority
                          </span>
                          {rec.riskLevel && (
                            <span className={cn(
                              "text-xs px-2 py-1 rounded",
                              rec.riskLevel === 'high' && "bg-red-100 text-red-700",
                              rec.riskLevel === 'medium' && "bg-yellow-100 text-yellow-700",
                              rec.riskLevel === 'low' && "bg-green-100 text-green-700"
                            )}>
                              {rec.riskLevel} risk
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold">
                          +{rec.expectedImpact}% impact
                        </span>
                      </div>
                      <h5 className="font-medium mb-1">{rec.title}</h5>
                      <p className="text-sm opacity-90 mb-2">{rec.description}</p>
                      {rec.reasoning && (
                        <p className="text-xs opacity-75 mb-2 italic">
                          Reasoning: {rec.reasoning}
                        </p>
                      )}
                      {rec.actionItems.length > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-1">Action Items:</p>
                          <ul className="text-xs space-y-1">
                            {rec.actionItems.map((item, index) => (
                              <li key={index} className="flex items-start gap-1">
                                <span className="text-xs">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dragon Ball Z themed footer */}
            <div className="mt-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-3 border border-orange-200">
              <div className="flex items-center gap-2">
                <span className="text-orange-600">🐲</span>
                <span className="text-sm font-medium text-orange-700">
                  Dragon's AI Wisdom (MCP Powered)
                </span>
              </div>
              <p className="text-xs text-orange-600 mt-1">
                {analyticsData.insights.length > 0 
                  ? `Your analytical power level is over ${analyticsData.metadata.confidence * 100}! The AI dragons have spoken through MCP!`
                  : "The AI dragons are gathering intelligence via MCP to enhance your investment power level!"}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}