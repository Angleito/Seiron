'use client'

/**
 * Model Validation Dashboard
 * 
 * A comprehensive dashboard for testing and validating the model loading system:
 * - Real-time model existence validation
 * - Fallback chain testing
 * - Performance monitoring
 * - 404 error detection
 */

import React, { useState, useEffect } from 'react'
import { logger } from '@lib/logger'
import { ModelExistenceValidator, AVAILABLE_MODEL_PATHS } from '../../utils/modelExistenceValidator'
import { EnhancedModelLoader } from '../../utils/enhancedModelLoader'
import { ModelValidationTester } from '../../utils/modelValidationTest'

interface ValidationResult {
  timestamp: string
  summary: {
    healthStatus: string
    healthScore: number
    total: number
    existing: number
    missing: number
    missingModels: string[]
  }
  validationResults: Array<{
    name: string
    path: string
    exists: boolean
    size?: number
    isExpected: boolean
    error?: string
  }>
}

interface DashboardState {
  validationResult: ValidationResult | null
  isValidating: boolean
  error: string | null
  lastValidation: string | null
  modelTests: Map<string, { loading: boolean; success: boolean; error?: string }>
}

export const ModelValidationDashboard: React.FC = () => {
  const [state, setState] = useState<DashboardState>({
    validationResult: null,
    isValidating: false,
    error: null,
    lastValidation: null,
    modelTests: new Map()
  })

  const [validator] = useState(() => ModelExistenceValidator.getInstance())
  const [loader] = useState(() => EnhancedModelLoader.getInstance())
  const [tester] = useState(() => ModelValidationTester.getInstance())

  // Validate models on component mount
  useEffect(() => {
    runValidation()
  }, [])

  const runValidation = async () => {
    setState(prev => ({ ...prev, isValidating: true, error: null }))
    
    try {
      logger.info('Starting model validation from dashboard')
      
      // Call our API endpoint for server-side validation
      const response = await fetch('/api/models/verify?comprehensive=true')
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      setState(prev => ({
        ...prev,
        validationResult: result,
        isValidating: false,
        lastValidation: new Date().toISOString(),
        error: null
      }))
      
      logger.info('Model validation completed successfully', {
        healthStatus: result.summary.healthStatus,
        totalModels: result.summary.total,
        existingModels: result.summary.existing
      })
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setState(prev => ({
        ...prev,
        isValidating: false,
        error: errorMessage
      }))
      
      logger.error('Model validation failed:', error)
    }
  }

  const testModelLoading = async (modelId: string) => {
    setState(prev => ({
      ...prev,
      modelTests: new Map(prev.modelTests.set(modelId, { loading: true, success: false }))
    }))

    try {
      const result = await loader.loadModel(modelId, {
        strategy: 'immediate',
        timeout: 5000,
        maxFallbackDepth: 2
      })

      setState(prev => ({
        ...prev,
        modelTests: new Map(prev.modelTests.set(modelId, {
          loading: false,
          success: result.success,
          error: result.error?.message
        }))
      }))

      logger.info(`Model loading test completed for ${modelId}:`, {
        success: result.success,
        fallbackUsed: result.fallbackUsed,
        loadTime: result.loadTime
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setState(prev => ({
        ...prev,
        modelTests: new Map(prev.modelTests.set(modelId, {
          loading: false,
          success: false,
          error: errorMessage
        }))
      }))

      logger.error(`Model loading test failed for ${modelId}:`, error)
    }
  }

  const testAllModels = async () => {
    const modelIds = Object.keys(AVAILABLE_MODEL_PATHS)
    
    for (const modelId of modelIds) {
      await testModelLoading(modelId)
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  const generateReport = async () => {
    try {
      setState(prev => ({ ...prev, isValidating: true }))
      
      const report = await tester.generateDiagnosticReport()
      
      // Create downloadable report
      const blob = new Blob([report], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `model-diagnostic-report-${new Date().toISOString().split('T')[0]}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      setState(prev => ({ ...prev, isValidating: false }))
      
    } catch (error) {
      logger.error('Failed to generate diagnostic report:', error)
      setState(prev => ({ ...prev, isValidating: false }))
    }
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-500'
      case 'good': return 'text-blue-500'
      case 'fair': return 'text-yellow-500'
      case 'poor': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'excellent': return '✅'
      case 'good': return '✔️'
      case 'fair': return '⚠️'
      case 'poor': return '❌'
      default: return '❓'
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🐉 Model Validation Dashboard</h1>
          <p className="text-gray-400">
            Real-time validation and testing of the 3D model loading system
          </p>
        </div>

        {/* Control Panel */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Controls</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={runValidation}
              disabled={state.isValidating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition-colors"
            >
              {state.isValidating ? 'Validating...' : 'Run Validation'}
            </button>
            
            <button
              onClick={testAllModels}
              disabled={state.isValidating}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg transition-colors"
            >
              Test All Models
            </button>
            
            <button
              onClick={generateReport}
              disabled={state.isValidating}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg transition-colors"
            >
              Generate Report
            </button>
          </div>
        </div>

        {/* Error Display */}
        {state.error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-8">
            <h3 className="text-red-400 font-semibold mb-2">Validation Error</h3>
            <p className="text-red-300">{state.error}</p>
          </div>
        )}

        {/* Health Summary */}
        {state.validationResult && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">System Health</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`text-3xl font-bold ${getHealthColor(state.validationResult.summary.healthStatus)}`}>
                  {getHealthIcon(state.validationResult.summary.healthStatus)} {state.validationResult.summary.healthScore}%
                </div>
                <div className="text-gray-400 text-sm">Health Score</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {state.validationResult.summary.existing}
                </div>
                <div className="text-gray-400 text-sm">Available Models</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">
                  {state.validationResult.summary.missing}
                </div>
                <div className="text-gray-400 text-sm">Missing Models</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {state.validationResult.summary.total}
                </div>
                <div className="text-gray-400 text-sm">Total Models</div>
              </div>
            </div>
          </div>
        )}

        {/* Missing Models Alert */}
        {state.validationResult && state.validationResult.summary.missingModels.length > 0 && (
          <div className="bg-yellow-900/50 border border-yellow-500 rounded-lg p-4 mb-8">
            <h3 className="text-yellow-400 font-semibold mb-2">Missing Models</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {state.validationResult.summary.missingModels.map(model => (
                <div key={model} className="text-yellow-300 font-mono text-sm bg-yellow-900/30 px-2 py-1 rounded">
                  {model}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Model Details */}
        {state.validationResult && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Model Details</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Model</th>
                    <th className="text-left py-2">Path</th>
                    <th className="text-left py-2">Size</th>
                    <th className="text-left py-2">Expected</th>
                    <th className="text-left py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {state.validationResult.validationResults.map(model => {
                    const testResult = state.modelTests.get(model.name.replace(/\.(glb|gltf|obj|bin)$/, ''))
                    
                    return (
                      <tr key={model.path} className="border-b border-gray-700/50">
                        <td className="py-2">
                          {model.exists ? (
                            <span className="text-green-400">✅</span>
                          ) : (
                            <span className="text-red-400">❌</span>
                          )}
                        </td>
                        <td className="py-2 font-mono">{model.name}</td>
                        <td className="py-2 text-gray-400 font-mono text-xs">{model.path}</td>
                        <td className="py-2">
                          {model.size ? `${Math.round(model.size / 1024)}KB` : '-'}
                        </td>
                        <td className="py-2">
                          {model.isExpected ? (
                            <span className="text-green-400">Yes</span>
                          ) : (
                            <span className="text-gray-400">No</span>
                          )}
                        </td>
                        <td className="py-2">
                          {model.exists && model.isExpected && (
                            <button
                              onClick={() => testModelLoading(model.name.replace(/\.(glb|gltf|obj|bin)$/, ''))}
                              disabled={testResult?.loading}
                              className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded transition-colors"
                            >
                              {testResult?.loading ? 'Testing...' : 'Test Load'}
                            </button>
                          )}
                          {testResult && !testResult.loading && (
                            <span className={`ml-2 text-xs ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                              {testResult.success ? '✅' : '❌'}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Last Validation Info */}
        {state.lastValidation && (
          <div className="text-center text-gray-400 text-sm">
            Last validation: {new Date(state.lastValidation).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  )
}

export default ModelValidationDashboard