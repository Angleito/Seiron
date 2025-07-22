import axios, { AxiosResponse } from 'axios'

export interface HealthCheckResult {
  service: string
  url: string
  status: 'healthy' | 'unhealthy' | 'warning'
  responseTime: number
  statusCode?: number
  error?: string
  details?: Record<string, any>
}

export interface HealthCheckSummary {
  overall: 'healthy' | 'unhealthy' | 'degraded'
  results: HealthCheckResult[]
  summary: {
    total: number
    healthy: number
    unhealthy: number
    warnings: number
  }
}

export class APIHealthChecker {
  private readonly timeout: number
  private readonly maxRetries: number

  constructor(timeout = 10000, maxRetries = 2) {
    this.timeout = timeout
    this.maxRetries = maxRetries
  }

  async checkAll(): Promise<HealthCheckSummary> {
    const services = this.getServices()
    const results = await Promise.all(
      services.map(service => this.checkService(service))
    )

    const summary = {
      total: results.length,
      healthy: results.filter(r => r.status === 'healthy').length,
      unhealthy: results.filter(r => r.status === 'unhealthy').length,
      warnings: results.filter(r => r.status === 'warning').length,
    }

    let overall: 'healthy' | 'unhealthy' | 'degraded'
    if (summary.unhealthy === 0) {
      overall = summary.warnings > 0 ? 'degraded' : 'healthy'
    } else {
      overall = 'unhealthy'
    }

    return {
      overall,
      results,
      summary
    }
  }

  private getServices() {
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'
    
    return [
      {
        name: 'Backend API Health',
        url: `${baseUrl}/api/health`,
        critical: true
      },
      {
        name: 'Backend Auth Service',
        url: `${baseUrl}/api/auth/session`,
        critical: true
      },
      {
        name: 'Portfolio Service',
        url: `${baseUrl}/api/portfolio`,
        critical: true,
        requiresAuth: true
      },
      {
        name: 'Chat Service',
        url: `${baseUrl}/api/chat/sessions`,
        critical: true,
        requiresAuth: true
      },
      {
        name: 'Voice Service',
        url: `${baseUrl}/api/voice/synthesize`,
        critical: false,
        method: 'POST',
        data: { text: 'test' }
      },
      {
        name: 'Supabase Connection',
        url: process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/',
        critical: true,
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        }
      },
      {
        name: 'ElevenLabs API',
        url: 'https://api.elevenlabs.io/v1/voices',
        critical: false,
        headers: {
          'xi-api-key': process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
        }
      }
    ]
  }

  private async checkService(service: {
    name: string
    url: string
    critical: boolean
    method?: string
    headers?: Record<string, any>
    data?: any
    requiresAuth?: boolean
  }): Promise<HealthCheckResult> {
    const startTime = Date.now()
    const method = service.method || 'GET'

    try {
      let response: AxiosResponse

      const config = {
        timeout: this.timeout,
        headers: service.headers || {},
        validateStatus: (status: number) => status < 500 // Accept 4xx as valid responses
      }

      if (method === 'POST') {
        response = await axios.post(service.url, service.data, config)
      } else {
        response = await axios.get(service.url, config)
      }

      const responseTime = Date.now() - startTime
      const isHealthy = response.status >= 200 && response.status < 300
      const isClientError = response.status >= 400 && response.status < 500

      let status: 'healthy' | 'unhealthy' | 'warning'
      
      if (isHealthy) {
        status = responseTime > 5000 ? 'warning' : 'healthy'
      } else if (isClientError && (service.requiresAuth || service.name.includes('Auth'))) {
        // 4xx errors are expected for services requiring auth when not authenticated
        status = 'warning'
      } else {
        status = 'unhealthy'
      }

      return {
        service: service.name,
        url: service.url,
        status,
        responseTime,
        statusCode: response.status,
        details: this.extractResponseDetails(response)
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime

      // Network timeouts or connection refused might not be critical for optional services
      const isNetworkError = error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT'
      const status = service.critical ? 'unhealthy' : (isNetworkError ? 'warning' : 'unhealthy')

      return {
        service: service.name,
        url: service.url,
        status,
        responseTime,
        error: error.message,
        details: {
          code: error.code,
          type: error.name
        }
      }
    }
  }

  private extractResponseDetails(response: AxiosResponse): Record<string, any> {
    const details: Record<string, any> = {}

    // Extract useful information from response
    if (response.headers['content-type']?.includes('application/json')) {
      try {
        const data = response.data
        if (data?.status) details.serviceStatus = data.status
        if (data?.version) details.version = data.version
        if (data?.services) details.dependencies = data.services
      } catch {
        // Ignore JSON parsing errors
      }
    }

    // Add response metadata
    details.contentType = response.headers['content-type']
    details.server = response.headers['server']
    
    return details
  }

  static async performHealthCheck(): Promise<HealthCheckSummary> {
    const checker = new APIHealthChecker()
    return await checker.checkAll()
  }

  static printResults(summary: HealthCheckSummary) {
    console.log('🏥 API Health Check Results')
    console.log('===========================')
    
    const statusIcon = {
      healthy: '✅',
      unhealthy: '❌',
      warning: '⚠️'
    }

    console.log(`Overall Status: ${statusIcon[summary.overall]} ${summary.overall.toUpperCase()}`)
    
    console.log(`\n📊 Summary:`)
    console.log(`   Total services: ${summary.summary.total}`)
    console.log(`   Healthy: ${summary.summary.healthy}`)
    console.log(`   Unhealthy: ${summary.summary.unhealthy}`)
    console.log(`   Warnings: ${summary.summary.warnings}`)

    console.log('\n🔍 Service Details:')
    console.log('-------------------')

    for (const result of summary.results) {
      const icon = statusIcon[result.status]
      const status = result.status.toUpperCase().padEnd(9)
      const time = `${result.responseTime}ms`.padEnd(8)
      const code = result.statusCode ? `[${result.statusCode}]`.padEnd(6) : ''.padEnd(6)
      
      console.log(`${icon} ${status} ${time} ${code} ${result.service}`)
      
      if (result.error) {
        console.log(`    Error: ${result.error}`)
      }
      
      if (result.details?.serviceStatus) {
        console.log(`    Service Status: ${result.details.serviceStatus}`)
      }
      
      if (result.details?.version) {
        console.log(`    Version: ${result.details.version}`)
      }
    }

    // Show recommendations
    console.log('\n💡 Recommendations:')
    console.log('-------------------')

    const unhealthyServices = summary.results.filter(r => r.status === 'unhealthy')
    const slowServices = summary.results.filter(r => r.responseTime > 5000)

    if (unhealthyServices.length > 0) {
      console.log('❌ Critical services are down:')
      unhealthyServices.forEach(service => {
        console.log(`   - ${service.service}: ${service.error || 'Service unavailable'}`)
      })
    }

    if (slowServices.length > 0) {
      console.log('⚠️  Slow response times detected:')
      slowServices.forEach(service => {
        console.log(`   - ${service.service}: ${service.responseTime}ms`)
      })
    }

    if (summary.overall === 'healthy') {
      console.log('✅ All services are operating normally!')
    }

    console.log('')
  }
}

// Performance benchmarking
export class APIPerformanceBenchmark {
  static async runBenchmark(iterations = 10): Promise<{
    averageResponseTime: number
    minResponseTime: number
    maxResponseTime: number
    successRate: number
    results: Array<{ iteration: number; responseTime: number; success: boolean }>
  }> {
    const checker = new APIHealthChecker(5000, 1) // Shorter timeout for benchmarks
    const results = []

    console.log(`🏃 Running API performance benchmark (${iterations} iterations)...`)

    for (let i = 1; i <= iterations; i++) {
      const startTime = Date.now()
      try {
        const summary = await checker.checkAll()
        const responseTime = Date.now() - startTime
        const success = summary.overall !== 'unhealthy'
        
        results.push({ iteration: i, responseTime, success })
        
        process.stdout.write(`\r   Iteration ${i}/${iterations} - ${responseTime}ms - ${success ? '✅' : '❌'}`)
      } catch (error) {
        const responseTime = Date.now() - startTime
        results.push({ iteration: i, responseTime, success: false })
        process.stdout.write(`\r   Iteration ${i}/${iterations} - ${responseTime}ms - ❌`)
      }
    }

    console.log('\n')

    const responseTimes = results.map(r => r.responseTime)
    const successCount = results.filter(r => r.success).length

    return {
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      successRate: (successCount / iterations) * 100,
      results
    }
  }
}

// CLI usage
if (require.main === module) {
  const runHealthCheck = async () => {
    try {
      const summary = await APIHealthChecker.performHealthCheck()
      APIHealthChecker.printResults(summary)
      
      // Run benchmark if requested
      if (process.argv.includes('--benchmark')) {
        const benchmark = await APIPerformanceBenchmark.runBenchmark(5)
        console.log('📈 Performance Benchmark Results:')
        console.log(`   Average Response Time: ${benchmark.averageResponseTime.toFixed(2)}ms`)
        console.log(`   Min/Max Response Time: ${benchmark.minResponseTime}ms / ${benchmark.maxResponseTime}ms`)
        console.log(`   Success Rate: ${benchmark.successRate.toFixed(1)}%`)
      }
      
      process.exit(summary.overall === 'unhealthy' ? 1 : 0)
    } catch (error) {
      console.error('Health check failed:', error)
      process.exit(1)
    }
  }

  runHealthCheck()
}