/**
 * Model Validation Test Utility
 * 
 * This utility provides comprehensive testing for model availability and validation:
 * - Tests all model paths for 404 errors
 * - Validates fallback chains
 * - Performance testing for validation system
 * - Integration testing with the model loading system
 */

import { ModelExistenceValidator, AVAILABLE_MODEL_PATHS } from './modelExistenceValidator'
import { EnhancedModelLoader } from './enhancedModelLoader'
import { logger } from '@lib/logger'

export interface ModelValidationTestResult {
  modelId: string
  primaryPath: string
  primaryExists: boolean
  fallbackPaths: string[]
  fallbackResults: Array<{ path: string; exists: boolean }>
  hasValidFallback: boolean
  validationTime: number
  error?: string
}

export interface SystemValidationResult {
  totalModels: number
  validModels: number
  modelsWithIssues: number
  totalValidationTime: number
  worstPerformingModel: string | null
  validationResults: ModelValidationTestResult[]
  systemHealth: 'excellent' | 'good' | 'fair' | 'poor'
}

export class ModelValidationTester {
  private static instance: ModelValidationTester
  private validator: ModelExistenceValidator
  private loader: EnhancedModelLoader

  static getInstance(): ModelValidationTester {
    if (!ModelValidationTester.instance) {
      ModelValidationTester.instance = new ModelValidationTester()
    }
    return ModelValidationTester.instance
  }

  constructor() {
    this.validator = ModelExistenceValidator.getInstance()
    this.loader = EnhancedModelLoader.getInstance()
  }

  /**
   * Run comprehensive validation tests on all models
   */
  async runFullValidationSuite(): Promise<SystemValidationResult> {
    logger.info('Starting comprehensive model validation suite')
    const startTime = Date.now()
    
    const validationResults: ModelValidationTestResult[] = []
    let validModels = 0
    let modelsWithIssues = 0
    let worstPerformingModel: string | null = null
    let worstTime = 0

    // Test each model configuration
    for (const [modelId, config] of Object.entries(AVAILABLE_MODEL_PATHS)) {
      try {
        const result = await this.validateSingleModel(modelId, config)
        validationResults.push(result)

        if (result.primaryExists || result.hasValidFallback) {
          validModels++
        } else {
          modelsWithIssues++
        }

        // Track worst performing model
        if (result.validationTime > worstTime) {
          worstTime = result.validationTime
          worstPerformingModel = modelId
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`Validation failed for model ${modelId}:`, error)
        
        validationResults.push({
          modelId,
          primaryPath: config.path,
          primaryExists: false,
          fallbackPaths: config.fallbackPaths,
          fallbackResults: [],
          hasValidFallback: false,
          validationTime: 0,
          error: errorMessage
        })
        
        modelsWithIssues++
      }
    }

    const totalValidationTime = Date.now() - startTime
    const totalModels = validationResults.length

    // Determine system health
    let systemHealth: 'excellent' | 'good' | 'fair' | 'poor'
    const healthScore = validModels / totalModels
    
    if (healthScore >= 0.95) {
      systemHealth = 'excellent'
    } else if (healthScore >= 0.8) {
      systemHealth = 'good'
    } else if (healthScore >= 0.6) {
      systemHealth = 'fair'
    } else {
      systemHealth = 'poor'
    }

    const result: SystemValidationResult = {
      totalModels,
      validModels,
      modelsWithIssues,
      totalValidationTime,
      worstPerformingModel,
      validationResults,
      systemHealth
    }

    this.logValidationSummary(result)
    return result
  }

  /**
   * Test for 404 errors specifically
   */
  async test404Errors(): Promise<Array<{ path: string; status: number; error?: string }>> {
    logger.info('Testing for 404 errors across all model paths')
    
    const allPaths = new Set<string>()
    
    // Collect all unique paths
    Object.values(AVAILABLE_MODEL_PATHS).forEach(config => {
      allPaths.add(config.path)
      config.fallbackPaths.forEach(path => allPaths.add(path))
    })

    const results: Array<{ path: string; status: number; error?: string }> = []

    for (const path of allPaths) {
      try {
        const response = await fetch(path, { method: 'HEAD' })
        results.push({
          path,
          status: response.status,
          error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
        })
      } catch (error) {
        results.push({
          path,
          status: 0,
          error: error instanceof Error ? error.message : 'Network error'
        })
      }
    }

    // Log 404 errors
    const errorPaths = results.filter(r => r.status === 404 || r.status === 0)
    if (errorPaths.length > 0) {
      logger.error(`Found ${errorPaths.length} 404 errors:`, errorPaths)
    } else {
      logger.info('No 404 errors found - all model paths are accessible')
    }

    return results
  }

  /**
   * Test fallback chain integrity
   */
  async testFallbackChains(): Promise<Map<string, { chain: string[]; validCount: number }>> {
    logger.info('Testing fallback chain integrity')
    
    const results = new Map<string, { chain: string[]; validCount: number }>()

    for (const modelId of Object.keys(AVAILABLE_MODEL_PATHS)) {
      try {
        const chain = await this.validator.createFallbackChain(modelId)
        let validCount = 0

        for (const path of chain) {
          const validation = await this.validator.validateModel(path)
          if (validation.exists) {
            validCount++
          }
        }

        results.set(modelId, { chain, validCount })

        if (validCount === 0) {
          logger.error(`Model ${modelId} has no valid fallback options`)
        } else if (validCount < chain.length / 2) {
          logger.warn(`Model ${modelId} has limited fallback options: ${validCount}/${chain.length}`)
        }

      } catch (error) {
        logger.error(`Failed to test fallback chain for ${modelId}:`, error)
        results.set(modelId, { chain: [], validCount: 0 })
      }
    }

    return results
  }

  /**
   * Performance test for validation system
   */
  async testValidationPerformance(): Promise<{
    averageValidationTime: number
    slowestModel: string | null
    fastestModel: string | null
    throughput: number
  }> {
    logger.info('Testing validation system performance')
    
    const results: Array<{ modelId: string; time: number }> = []
    const allModels = Object.keys(AVAILABLE_MODEL_PATHS)

    // Clear cache to ensure fair testing
    this.validator.clearCache()

    for (const modelId of allModels) {
      const config = AVAILABLE_MODEL_PATHS[modelId]!
      const startTime = Date.now()
      
      try {
        await this.validator.validateModel(config.path)
      } catch (error) {
        // Continue even if validation fails
      }
      
      const validationTime = Date.now() - startTime
      results.push({ modelId, time: validationTime })
    }

    const times = results.map(r => r.time)
    const averageValidationTime = times.reduce((a, b) => a + b, 0) / times.length
    
    const slowestResult = results.reduce((a, b) => a.time > b.time ? a : b)
    const fastestResult = results.reduce((a, b) => a.time < b.time ? a : b)
    
    const throughput = allModels.length / (averageValidationTime / 1000) // models per second

    const performanceResult = {
      averageValidationTime,
      slowestModel: slowestResult.modelId,
      fastestModel: fastestResult.modelId,
      throughput
    }

    logger.info('Validation performance test completed:', performanceResult)
    return performanceResult
  }

  /**
   * Integration test with model loader
   */
  async testLoaderIntegration(): Promise<Map<string, { loadSuccess: boolean; fallbackUsed: boolean; loadTime: number }>> {
    logger.info('Testing integration with enhanced model loader')
    
    const results = new Map<string, { loadSuccess: boolean; fallbackUsed: boolean; loadTime: number }>()
    const modelIds = Object.keys(AVAILABLE_MODEL_PATHS).slice(0, 3) // Test first 3 models

    for (const modelId of modelIds) {
      try {
        const loadResult = await this.loader.loadModel(modelId, {
          strategy: 'immediate',
          timeout: 5000,
          maxFallbackDepth: 2
        })

        results.set(modelId, {
          loadSuccess: loadResult.success,
          fallbackUsed: loadResult.fallbackUsed,
          loadTime: loadResult.loadTime
        })

      } catch (error) {
        logger.error(`Loader integration test failed for ${modelId}:`, error)
        results.set(modelId, {
          loadSuccess: false,
          fallbackUsed: false,
          loadTime: 0
        })
      }
    }

    return results
  }

  /**
   * Generate diagnostic report
   */
  async generateDiagnosticReport(): Promise<string> {
    logger.info('Generating comprehensive diagnostic report')
    
    const [
      systemValidation,
      errorTest,
      fallbackTest,
      performanceTest,
      integrationTest
    ] = await Promise.all([
      this.runFullValidationSuite(),
      this.test404Errors(),
      this.testFallbackChains(),
      this.testValidationPerformance(),
      this.testLoaderIntegration()
    ])

    const report = `
# Model Validation Diagnostic Report
Generated: ${new Date().toISOString()}

## System Health: ${systemValidation.systemHealth.toUpperCase()}

### Overview
- Total Models: ${systemValidation.totalModels}
- Valid Models: ${systemValidation.validModels}
- Models with Issues: ${systemValidation.modelsWithIssues}
- System Health Score: ${((systemValidation.validModels / systemValidation.totalModels) * 100).toFixed(1)}%

### 404 Error Analysis
- Total Paths Tested: ${errorTest.length}
- Paths with Errors: ${errorTest.filter(r => r.status === 404 || r.status === 0).length}
- Error Rate: ${((errorTest.filter(r => r.status === 404 || r.status === 0).length / errorTest.length) * 100).toFixed(1)}%

### Fallback Chain Analysis
${Array.from(fallbackTest.entries()).map(([modelId, data]) => 
  `- ${modelId}: ${data.validCount}/${data.chain.length} valid fallbacks`
).join('\n')}

### Performance Metrics
- Average Validation Time: ${performanceTest.averageValidationTime.toFixed(1)}ms
- Throughput: ${performanceTest.throughput.toFixed(1)} validations/second
- Slowest Model: ${performanceTest.slowestModel}
- Fastest Model: ${performanceTest.fastestModel}

### Integration Test Results
${Array.from(integrationTest.entries()).map(([modelId, result]) => 
  `- ${modelId}: ${result.loadSuccess ? 'SUCCESS' : 'FAILED'} (${result.loadTime}ms)${result.fallbackUsed ? ' [FALLBACK USED]' : ''}`
).join('\n')}

### Detailed Model Analysis
${systemValidation.validationResults.map(result => `
#### ${result.modelId}
- Primary Path: ${result.primaryPath} (${result.primaryExists ? 'EXISTS' : 'MISSING'})
- Fallback Paths: ${result.fallbackPaths.length}
- Valid Fallbacks: ${result.fallbackResults.filter(f => f.exists).length}
- Validation Time: ${result.validationTime}ms
${result.error ? `- Error: ${result.error}` : ''}
`).join('')}

### Recommendations
${this.generateRecommendations(systemValidation, errorTest, fallbackTest)}
`

    return report
  }

  private async validateSingleModel(
    modelId: string, 
    config: typeof AVAILABLE_MODEL_PATHS[string]
  ): Promise<ModelValidationTestResult> {
    const startTime = Date.now()

    // Validate primary path
    const primaryValidation = await this.validator.validateModel(config.path)
    
    // Validate fallback paths
    const fallbackResults: Array<{ path: string; exists: boolean }> = []
    for (const fallbackPath of config.fallbackPaths) {
      const fallbackValidation = await this.validator.validateModel(fallbackPath)
      fallbackResults.push({
        path: fallbackPath,
        exists: fallbackValidation.exists
      })
    }

    const hasValidFallback = fallbackResults.some(f => f.exists)
    const validationTime = Date.now() - startTime

    return {
      modelId,
      primaryPath: config.path,
      primaryExists: primaryValidation.exists,
      fallbackPaths: config.fallbackPaths,
      fallbackResults,
      hasValidFallback,
      validationTime,
      error: primaryValidation.error
    }
  }

  private logValidationSummary(result: SystemValidationResult): void {
    logger.info('Model validation suite completed', {
      systemHealth: result.systemHealth,
      validModels: result.validModels,
      totalModels: result.totalModels,
      validationTime: result.totalValidationTime,
      worstPerformingModel: result.worstPerformingModel
    })

    if (result.systemHealth === 'poor' || result.systemHealth === 'fair') {
      logger.error('Model system health is below acceptable levels', {
        modelsWithIssues: result.modelsWithIssues,
        issueRate: (result.modelsWithIssues / result.totalModels * 100).toFixed(1) + '%'
      })
    }
  }

  private generateRecommendations(
    systemValidation: SystemValidationResult,
    errorTest: Array<{ path: string; status: number; error?: string }>,
    fallbackTest: Map<string, { chain: string[]; validCount: number }>
  ): string {
    const recommendations: string[] = []

    // Health-based recommendations
    if (systemValidation.systemHealth === 'poor') {
      recommendations.push('🚨 CRITICAL: System health is poor. Immediate action required.')
      recommendations.push('• Review and fix missing model files')
      recommendations.push('• Implement emergency fallback systems')
    } else if (systemValidation.systemHealth === 'fair') {
      recommendations.push('⚠️ WARNING: System health needs improvement')
      recommendations.push('• Address missing model files')
      recommendations.push('• Strengthen fallback chains')
    }

    // 404 error recommendations
    const errorCount = errorTest.filter(r => r.status === 404 || r.status === 0).length
    if (errorCount > 0) {
      recommendations.push(`• Fix ${errorCount} missing model files`)
      recommendations.push('• Verify model deployment and serving configuration')
    }

    // Fallback recommendations
    const weakFallbacks = Array.from(fallbackTest.entries()).filter(([_, data]) => data.validCount < 2)
    if (weakFallbacks.length > 0) {
      recommendations.push(`• Strengthen fallback chains for ${weakFallbacks.length} models`)
      recommendations.push('• Add more fallback options for critical models')
    }

    // Performance recommendations
    if (systemValidation.worstPerformingModel) {
      recommendations.push(`• Optimize validation performance for ${systemValidation.worstPerformingModel}`)
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ System is healthy. Continue monitoring.')
    }

    return recommendations.join('\n')
  }
}

// Utility functions for easy testing
export const runFullValidation = () => 
  ModelValidationTester.getInstance().runFullValidationSuite()

export const test404Errors = () => 
  ModelValidationTester.getInstance().test404Errors()

export const testFallbackChains = () => 
  ModelValidationTester.getInstance().testFallbackChains()

export const generateDiagnosticReport = () => 
  ModelValidationTester.getInstance().generateDiagnosticReport()

// Default export
export default ModelValidationTester