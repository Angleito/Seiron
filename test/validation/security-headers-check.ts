import axios from 'axios'
import { URL } from 'url'

export interface SecurityHeader {
  name: string
  required: boolean
  expectedValue?: string | RegExp
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

export interface SecurityCheckResult {
  header: string
  status: 'pass' | 'fail' | 'warning' | 'missing'
  expected?: string
  actual?: string
  severity: SecurityHeader['severity']
  description: string
  recommendation?: string
}

export interface SecuritySummary {
  url: string
  overall: 'secure' | 'insecure' | 'needs_attention'
  score: number
  maxScore: number
  results: SecurityCheckResult[]
  summary: {
    passed: number
    failed: number
    warnings: number
    missing: number
  }
}

export class SecurityHeadersChecker {
  private readonly securityHeaders: SecurityHeader[] = [
    {
      name: 'Strict-Transport-Security',
      required: true,
      expectedValue: /max-age=\d+/,
      description: 'Enforces HTTPS connections',
      severity: 'critical'
    },
    {
      name: 'Content-Security-Policy',
      required: true,
      expectedValue: /default-src/,
      description: 'Prevents XSS and data injection attacks',
      severity: 'critical'
    },
    {
      name: 'X-Frame-Options',
      required: true,
      expectedValue: /^(DENY|SAMEORIGIN)$/,
      description: 'Prevents clickjacking attacks',
      severity: 'high'
    },
    {
      name: 'X-Content-Type-Options',
      required: true,
      expectedValue: 'nosniff',
      description: 'Prevents MIME type sniffing',
      severity: 'medium'
    },
    {
      name: 'Referrer-Policy',
      required: true,
      expectedValue: /^(strict-origin-when-cross-origin|strict-origin|same-origin|no-referrer)$/,
      description: 'Controls referrer information',
      severity: 'medium'
    },
    {
      name: 'X-XSS-Protection',
      required: false, // Deprecated but still good to have
      expectedValue: '1; mode=block',
      description: 'Legacy XSS protection (deprecated)',
      severity: 'low'
    },
    {
      name: 'Permissions-Policy',
      required: false,
      description: 'Controls browser features and APIs',
      severity: 'medium'
    },
    {
      name: 'X-DNS-Prefetch-Control',
      required: false,
      expectedValue: 'on',
      description: 'Controls DNS prefetching',
      severity: 'low'
    }
  ]

  async checkSecurity(url: string): Promise<SecuritySummary> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        maxRedirects: 0, // Don't follow redirects to check initial response
        validateStatus: () => true // Accept all status codes
      })

      const results = this.analyzeHeaders(response.headers)
      const summary = this.calculateSummary(results)
      const score = this.calculateSecurityScore(results)

      return {
        url,
        overall: this.determineOverallSecurity(score, results),
        score: score.current,
        maxScore: score.max,
        results,
        summary
      }
    } catch (error: any) {
      throw new Error(`Failed to check security headers for ${url}: ${error.message}`)
    }
  }

  private analyzeHeaders(headers: Record<string, string>): SecurityCheckResult[] {
    return this.securityHeaders.map(headerConfig => {
      const headerValue = headers[headerConfig.name.toLowerCase()]
      
      if (!headerValue) {
        return {
          header: headerConfig.name,
          status: headerConfig.required ? 'missing' : 'warning',
          severity: headerConfig.severity,
          description: headerConfig.description,
          recommendation: `Add ${headerConfig.name} header`
        }
      }

      // Check if header value meets expectations
      if (headerConfig.expectedValue) {
        const isValid = this.validateHeaderValue(headerValue, headerConfig.expectedValue)
        
        return {
          header: headerConfig.name,
          status: isValid ? 'pass' : 'fail',
          expected: typeof headerConfig.expectedValue === 'string' 
            ? headerConfig.expectedValue 
            : headerConfig.expectedValue.toString(),
          actual: headerValue,
          severity: headerConfig.severity,
          description: headerConfig.description,
          recommendation: isValid ? undefined : `Update ${headerConfig.name} header value`
        }
      }

      return {
        header: headerConfig.name,
        status: 'pass',
        actual: headerValue,
        severity: headerConfig.severity,
        description: headerConfig.description
      }
    })
  }

  private validateHeaderValue(value: string, expected: string | RegExp): boolean {
    if (typeof expected === 'string') {
      return value === expected
    }
    return expected.test(value)
  }

  private calculateSummary(results: SecurityCheckResult[]) {
    return {
      passed: results.filter(r => r.status === 'pass').length,
      failed: results.filter(r => r.status === 'fail').length,
      warnings: results.filter(r => r.status === 'warning').length,
      missing: results.filter(r => r.status === 'missing').length
    }
  }

  private calculateSecurityScore(results: SecurityCheckResult[]): { current: number; max: number } {
    const scoreMap = {
      critical: 30,
      high: 20,
      medium: 10,
      low: 5
    }

    let currentScore = 0
    let maxScore = 0

    for (const result of results) {
      const points = scoreMap[result.severity]
      maxScore += points
      
      if (result.status === 'pass') {
        currentScore += points
      } else if (result.status === 'warning' && result.severity === 'low') {
        currentScore += points * 0.5 // Half points for non-critical warnings
      }
    }

    return { current: Math.round(currentScore), max: maxScore }
  }

  private determineOverallSecurity(
    score: { current: number; max: number }, 
    results: SecurityCheckResult[]
  ): 'secure' | 'insecure' | 'needs_attention' {
    const scorePercentage = (score.current / score.max) * 100
    const criticalIssues = results.filter(r => 
      r.severity === 'critical' && (r.status === 'fail' || r.status === 'missing')
    )

    if (criticalIssues.length > 0 || scorePercentage < 60) {
      return 'insecure'
    } else if (scorePercentage < 85) {
      return 'needs_attention'
    } else {
      return 'secure'
    }
  }

  // Check multiple URLs (development, staging, production)
  async checkMultipleEnvironments(): Promise<SecuritySummary[]> {
    const urls = [
      'http://localhost:3000', // Development
      'https://sei-portfolio-ai.vercel.app', // Production (example)
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
      process.env.NEXT_PUBLIC_APP_URL
    ].filter(Boolean) as string[]

    const results = []
    
    for (const url of urls) {
      try {
        console.log(`Checking security headers for: ${url}`)
        const result = await this.checkSecurity(url)
        results.push(result)
      } catch (error) {
        console.warn(`Failed to check ${url}:`, error.message)
      }
    }

    return results
  }

  static async performSecurityCheck(url?: string): Promise<SecuritySummary | SecuritySummary[]> {
    const checker = new SecurityHeadersChecker()
    
    if (url) {
      return await checker.checkSecurity(url)
    } else {
      return await checker.checkMultipleEnvironments()
    }
  }

  static printResults(summary: SecuritySummary | SecuritySummary[]) {
    console.log('🔒 Security Headers Check Results')
    console.log('==================================')

    const summaries = Array.isArray(summary) ? summary : [summary]

    for (const result of summaries) {
      console.log(`\n🌐 URL: ${result.url}`)
      
      const statusIcon = {
        secure: '✅',
        insecure: '❌',
        needs_attention: '⚠️'
      }

      console.log(`Overall Security: ${statusIcon[result.overall]} ${result.overall.replace('_', ' ').toUpperCase()}`)
      console.log(`Security Score: ${result.score}/${result.maxScore} (${Math.round((result.score/result.maxScore)*100)}%)`)
      
      console.log(`\n📊 Summary:`)
      console.log(`   Passed: ${result.summary.passed}`)
      console.log(`   Failed: ${result.summary.failed}`)
      console.log(`   Warnings: ${result.summary.warnings}`)
      console.log(`   Missing: ${result.summary.missing}`)

      console.log('\n🔍 Header Details:')
      console.log('------------------')

      const statusIcons = {
        pass: '✅',
        fail: '❌',
        warning: '⚠️',
        missing: '🚫'
      }

      for (const headerResult of result.results) {
        const icon = statusIcons[headerResult.status]
        const severity = headerResult.severity.toUpperCase().padEnd(8)
        
        console.log(`${icon} ${severity} ${headerResult.header}`)
        console.log(`    ${headerResult.description}`)
        
        if (headerResult.expected && headerResult.actual) {
          console.log(`    Expected: ${headerResult.expected}`)
          console.log(`    Actual: ${headerResult.actual}`)
        } else if (headerResult.actual) {
          console.log(`    Value: ${headerResult.actual}`)
        }
        
        if (headerResult.recommendation) {
          console.log(`    💡 Recommendation: ${headerResult.recommendation}`)
        }
        console.log('')
      }

      // Show critical issues
      const criticalIssues = result.results.filter(r => 
        r.severity === 'critical' && r.status !== 'pass'
      )

      if (criticalIssues.length > 0) {
        console.log('🚨 Critical Security Issues:')
        criticalIssues.forEach(issue => {
          console.log(`   - ${issue.header}: ${issue.recommendation || 'Needs attention'}`)
        })
      }
    }

    // Overall recommendations
    console.log('\n💡 Security Recommendations:')
    console.log('-----------------------------')
    console.log('1. Ensure HTTPS is enforced with HSTS headers')
    console.log('2. Implement Content Security Policy to prevent XSS')
    console.log('3. Use X-Frame-Options or frame-ancestors in CSP')
    console.log('4. Set X-Content-Type-Options to prevent MIME sniffing')
    console.log('5. Configure appropriate Referrer-Policy')
    console.log('6. Consider implementing Permissions-Policy for feature control')
    console.log('')
  }
}

// Content Security Policy analyzer
export class CSPAnalyzer {
  static analyzeCSP(cspHeader: string): {
    directives: Record<string, string[]>
    issues: Array<{ type: 'error' | 'warning' | 'info', message: string }>
    score: number
  } {
    const directives: Record<string, string[]> = {}
    const issues: Array<{ type: 'error' | 'warning' | 'info', message: string }> = []
    
    // Parse CSP directives
    cspHeader.split(';').forEach(directive => {
      const [key, ...values] = directive.trim().split(/\s+/)
      if (key) {
        directives[key] = values
      }
    })

    // Analyze for security issues
    if (!directives['default-src']) {
      issues.push({
        type: 'error',
        message: 'Missing default-src directive'
      })
    }

    if (directives['script-src']?.includes("'unsafe-eval'")) {
      issues.push({
        type: 'warning',
        message: 'unsafe-eval in script-src can allow code injection'
      })
    }

    if (directives['script-src']?.includes("'unsafe-inline'")) {
      issues.push({
        type: 'warning',
        message: 'unsafe-inline in script-src can allow XSS attacks'
      })
    }

    if (!directives['object-src'] && !directives['default-src']?.includes("'none'")) {
      issues.push({
        type: 'info',
        message: 'Consider setting object-src to none for better security'
      })
    }

    // Calculate score
    let score = 100
    issues.forEach(issue => {
      if (issue.type === 'error') score -= 20
      else if (issue.type === 'warning') score -= 10
      else score -= 2
    })

    return { directives, issues, score: Math.max(0, score) }
  }
}

// CLI usage
if (require.main === module) {
  const runSecurityCheck = async () => {
    try {
      const url = process.argv[2] // Allow URL as command line argument
      const results = await SecurityHeadersChecker.performSecurityCheck(url)
      SecurityHeadersChecker.printResults(results)
      
      const summaries = Array.isArray(results) ? results : [results]
      const hasInsecure = summaries.some(s => s.overall === 'insecure')
      
      process.exit(hasInsecure ? 1 : 0)
    } catch (error) {
      console.error('Security check failed:', error.message)
      process.exit(1)
    }
  }

  runSecurityCheck()
}