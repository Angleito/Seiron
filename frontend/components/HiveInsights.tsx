'use client'

import { useState, useEffect } from 'react'
import { Search, TrendingUp, AlertTriangle, Target, BarChart3, Brain, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getOrchestrator } from '@/lib/orchestrator-client'

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

export interface HiveInsightsProps {
  walletAddress?: string
  autoRefresh?: boolean
  refreshInterval?: number
  showCredits?: boolean
  className?: string
  maxInsights?: number
  maxRecommendations?: number
}

export function HiveInsights({
  walletAddress,
  autoRefresh = false,
  refreshInterval = 300000, // 5 minutes
  showCredits = true,
  className,
  maxInsights = 5,
  maxRecommendations = 3
}: HiveInsightsProps) {
  const [analyticsData, setAnalyticsData] = useState<HiveAnalyticsData | null>(null)
  const [creditUsage, setCreditUsage] = useState<CreditUsage | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [selectedInsightType, setSelectedInsightType] = useState<string>('all')

  useEffect(() => {
    const orchestrator = getOrchestrator({
      apiEndpoint: process.env.NEXT_PUBLIC_ORCHESTRATOR_API || '/api',
      wsEndpoint: process.env.NEXT_PUBLIC_ORCHESTRATOR_WS || 'ws://localhost:3001',
    })

    // Subscribe to Hive Intelligence events
    const unsubscribeInsights = orchestrator.on('hive:insights', (event) => {
      if (event.data) {
        setAnalyticsData(event.data as HiveAnalyticsData)
        setLastUpdate(new Date())
      }
    })

    const unsubscribeCredits = orchestrator.on('hive:credit_update', (event) => {
      if (event.data) {
        setCreditUsage(event.data as CreditUsage)
      }
    })

    // Auto-refresh if enabled
    let interval: NodeJS.Timeout | null = null
    if (autoRefresh && walletAddress) {
      interval = setInterval(() => {
        fetchAnalytics('portfolio')
      }, refreshInterval)
    }

    return () => {
      unsubscribeInsights()
      unsubscribeCredits()
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, walletAddress])

  const fetchAnalytics = async (analysisType: 'portfolio' | 'market' | 'risk' | 'performance' = 'portfolio') => {
    if (!walletAddress && analysisType === 'portfolio') {
      console.warn('Wallet address required for portfolio analysis')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/hive/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisType,
          walletAddress,
          maxInsights,
          maxRecommendations
        })
      })

      const data = await response.json()
      if (data.success) {
        setAnalyticsData(data.data)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch Hive analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCreditUsage = async () => {
    try {
      const response = await fetch('/api/hive/credits')
      const data = await response.json()
      if (data.success) {
        setCreditUsage(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch credit usage:', error)
    }
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
            🔮 Hive Intelligence
            {analyticsData && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                AI Powered
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAnalytics('portfolio')}
              disabled={isLoading || !walletAddress}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Analyzing...' : 'Analyze Portfolio'}
            </button>
            <button
              onClick={() => fetchAnalytics('market')}
              disabled={isLoading}
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
      </div>

      {/* Content */}
      <div className="p-4">
        {!analyticsData ? (
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
                  🧠 Analysis Summary
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
                  Dragon's AI Wisdom
                </span>
              </div>
              <p className="text-xs text-orange-600 mt-1">
                {analyticsData.insights.length > 0 
                  ? `Your analytical power level is over ${analyticsData.metadata.confidence * 100}! The AI dragons have spoken!`
                  : "The AI dragons are gathering intelligence to enhance your investment power level!"}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}