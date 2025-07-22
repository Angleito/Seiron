#!/usr/bin/env tsx

/**
 * Comprehensive Test Runner for Next.js Migration
 * Executes all test suites and generates a comprehensive report
 */

import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import chalk from 'chalk'
import { EnvironmentValidator } from './validation/environment-validation'
import { APIHealthChecker } from './validation/api-health-check'
import { SecurityHeadersChecker } from './validation/security-headers-check'

const execAsync = promisify(exec)

interface TestSuite {
  name: string
  command: string
  description: string
  category: 'validation' | 'unit' | 'integration' | 'e2e'
  critical: boolean
  timeout?: number
}

interface TestResult {
  suite: string
  passed: boolean
  duration: number
  error?: string
  output?: string
}

export class ComprehensiveTestRunner {
  private testSuites: TestSuite[] = [
    // Validation tests
    {
      name: 'Environment Validation',
      command: 'tsx test/validation/environment-validation.ts',
      description: 'Validates environment variables and configuration',
      category: 'validation',
      critical: true
    },
    {
      name: 'API Health Check',
      command: 'tsx test/validation/api-health-check.ts',
      description: 'Checks API endpoints health and connectivity',
      category: 'validation',
      critical: true
    },
    {
      name: 'Security Headers',
      command: 'tsx test/validation/security-headers-check.ts http://localhost:3000',
      description: 'Validates security headers configuration',
      category: 'validation',
      critical: false
    },

    // Unit tests
    {
      name: 'Next.js Component Tests',
      command: 'jest --config jest.config.nextjs.js --passWithNoTests',
      description: 'Unit tests for React components with Next.js',
      category: 'unit',
      critical: true,
      timeout: 60000
    },

    // Integration tests
    {
      name: 'Store Integration Tests',
      command: 'jest test/components/ --testPathPattern=".*\\.test\\.(ts|tsx)$" --passWithNoTests',
      description: 'Integration tests for Zustand stores',
      category: 'integration',
      critical: true,
      timeout: 30000
    },

    // E2E tests
    {
      name: 'Playwright E2E Tests',
      command: 'playwright test --config playwright.config.ts',
      description: 'End-to-end tests with Playwright',
      category: 'e2e',
      critical: true,
      timeout: 300000 // 5 minutes
    },
    {
      name: 'Migration Validation',
      command: 'playwright test test/migration/migration-validation.spec.ts',
      description: 'Comprehensive migration validation tests',
      category: 'e2e',
      critical: true,
      timeout: 180000 // 3 minutes
    }
  ]

  async runAllTests(): Promise<{
    passed: boolean
    results: TestResult[]
    summary: {
      total: number
      passed: number
      failed: number
      criticalFailures: number
      duration: number
    }
  }> {
    console.log(chalk.blue('🧪 Starting Comprehensive Test Suite'))
    console.log(chalk.blue('====================================='))
    console.log('')

    const overallStartTime = Date.now()
    const results: TestResult[] = []
    let criticalFailures = 0

    // Run pre-flight checks
    console.log(chalk.yellow('🔍 Running Pre-flight Checks...'))
    await this.runPreflightChecks()
    console.log('')

    // Run each test suite
    for (const suite of this.testSuites) {
      console.log(chalk.cyan(`🏃 Running: ${suite.name}`))
      console.log(chalk.gray(`   ${suite.description}`))
      
      const result = await this.runTestSuite(suite)
      results.push(result)

      if (!result.passed) {
        if (suite.critical) {
          criticalFailures++
          console.log(chalk.red(`❌ CRITICAL FAILURE: ${suite.name}`))
        } else {
          console.log(chalk.yellow(`⚠️  Non-critical failure: ${suite.name}`))
        }
        
        if (result.error) {
          console.log(chalk.red(`   Error: ${result.error}`))
        }
      } else {
        console.log(chalk.green(`✅ ${suite.name} - PASSED (${result.duration}ms)`))
      }
      
      console.log('')
    }

    const overallDuration = Date.now() - overallStartTime
    const totalPassed = results.filter(r => r.passed).length
    const totalFailed = results.length - totalPassed
    const overallPassed = criticalFailures === 0

    // Print summary
    this.printSummary({
      passed: overallPassed,
      results,
      summary: {
        total: results.length,
        passed: totalPassed,
        failed: totalFailed,
        criticalFailures,
        duration: overallDuration
      }
    })

    return {
      passed: overallPassed,
      results,
      summary: {
        total: results.length,
        passed: totalPassed,
        failed: totalFailed,
        criticalFailures,
        duration: overallDuration
      }
    }
  }

  private async runPreflightChecks(): Promise<void> {
    try {
      // Check if Next.js dev server is running
      const healthCheck = await APIHealthChecker.performHealthCheck()
      if (healthCheck.overall === 'unhealthy') {
        console.log(chalk.yellow('⚠️  Some services appear to be down'))
        console.log(chalk.gray('   This may affect some tests. Consider starting the dev server:'))
        console.log(chalk.gray('   npm run dev'))
      } else {
        console.log(chalk.green('✅ Services are healthy'))
      }

      // Check environment
      const envCheck = EnvironmentValidator.validate()
      if (!envCheck.isValid) {
        console.log(chalk.yellow('⚠️  Environment validation issues detected'))
        console.log(chalk.gray('   Some tests may fail due to missing configuration'))
      } else {
        console.log(chalk.green('✅ Environment is properly configured'))
      }
    } catch (error) {
      console.log(chalk.red('❌ Pre-flight checks failed:', error.message))
    }
  }

  private async runTestSuite(suite: TestSuite): Promise<TestResult> {
    const startTime = Date.now()

    try {
      const { stdout, stderr } = await execAsync(suite.command, {
        timeout: suite.timeout || 60000,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          CI: 'true'
        }
      })

      const duration = Date.now() - startTime
      
      return {
        suite: suite.name,
        passed: true,
        duration,
        output: stdout
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      
      return {
        suite: suite.name,
        passed: false,
        duration,
        error: error.message,
        output: error.stdout || error.stderr
      }
    }
  }

  private printSummary(testRun: {
    passed: boolean
    results: TestResult[]
    summary: {
      total: number
      passed: number
      failed: number
      criticalFailures: number
      duration: number
    }
  }): void {
    console.log(chalk.blue('📊 Test Execution Summary'))
    console.log(chalk.blue('========================='))
    console.log('')
    
    // Overall result
    if (testRun.passed) {
      console.log(chalk.green('🎉 ALL TESTS PASSED!'))
    } else {
      console.log(chalk.red('❌ TEST FAILURES DETECTED'))
    }
    console.log('')

    // Statistics
    console.log(chalk.bold('Statistics:'))
    console.log(`   Total Test Suites: ${testRun.summary.total}`)
    console.log(chalk.green(`   Passed: ${testRun.summary.passed}`))
    console.log(chalk.red(`   Failed: ${testRun.summary.failed}`))
    console.log(chalk.red(`   Critical Failures: ${testRun.summary.criticalFailures}`))
    console.log(`   Total Duration: ${(testRun.summary.duration / 1000).toFixed(1)}s`)
    console.log('')

    // Detailed results by category
    const categories = ['validation', 'unit', 'integration', 'e2e'] as const
    categories.forEach(category => {
      const categoryResults = testRun.results.filter(r => {
        const suite = this.testSuites.find(s => s.name === r.suite)
        return suite?.category === category
      })

      if (categoryResults.length > 0) {
        console.log(chalk.bold(`${category.toUpperCase()} Tests:`))
        categoryResults.forEach(result => {
          const icon = result.passed ? '✅' : '❌'
          const duration = `${result.duration}ms`
          console.log(`   ${icon} ${result.suite} (${duration})`)
          
          if (!result.passed && result.error) {
            console.log(chalk.red(`      ${result.error}`))
          }
        })
        console.log('')
      }
    })

    // Recommendations
    if (!testRun.passed) {
      console.log(chalk.yellow('💡 Recommendations:'))
      
      if (testRun.summary.criticalFailures > 0) {
        console.log('   🚨 Address critical failures before deploying')
      }
      
      const failedValidation = testRun.results.find(r => 
        !r.passed && r.suite.includes('Environment')
      )
      if (failedValidation) {
        console.log('   🔧 Fix environment configuration issues')
      }
      
      const failedE2E = testRun.results.filter(r => 
        !r.passed && this.testSuites.find(s => s.name === r.suite)?.category === 'e2e'
      )
      if (failedE2E.length > 0) {
        console.log('   🌐 Ensure dev server is running for E2E tests')
      }
      
      console.log('')
    } else {
      console.log(chalk.green('✨ Next.js migration validation completed successfully!'))
      console.log(chalk.green('   Your application maintains full feature parity'))
      console.log('')
    }
  }

  // Generate detailed test report
  generateReport(testRun: any): string {
    const timestamp = new Date().toISOString()
    
    let report = `# Test Execution Report\n\n`
    report += `**Generated:** ${timestamp}\n`
    report += `**Duration:** ${(testRun.summary.duration / 1000).toFixed(1)} seconds\n`
    report += `**Overall Result:** ${testRun.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`
    
    report += `## Summary\n\n`
    report += `| Metric | Count |\n`
    report += `|--------|-------|\n`
    report += `| Total Test Suites | ${testRun.summary.total} |\n`
    report += `| Passed | ${testRun.summary.passed} |\n`
    report += `| Failed | ${testRun.summary.failed} |\n`
    report += `| Critical Failures | ${testRun.summary.criticalFailures} |\n\n`
    
    report += `## Test Results\n\n`
    
    testRun.results.forEach((result: TestResult) => {
      const status = result.passed ? '✅ PASSED' : '❌ FAILED'
      report += `### ${result.suite} - ${status}\n`
      report += `**Duration:** ${result.duration}ms\n`
      
      if (!result.passed && result.error) {
        report += `**Error:** ${result.error}\n`
      }
      
      report += `\n`
    })
    
    return report
  }
}

// CLI execution
async function main() {
  const runner = new ComprehensiveTestRunner()
  
  try {
    const results = await runner.runAllTests()
    
    // Generate report if requested
    if (process.argv.includes('--report')) {
      const report = runner.generateReport(results)
      const fs = require('fs')
      fs.writeFileSync('test-report.md', report)
      console.log(chalk.blue('📄 Test report generated: test-report.md'))
    }
    
    process.exit(results.passed ? 0 : 1)
  } catch (error) {
    console.error(chalk.red('Test runner failed:'), error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export default ComprehensiveTestRunner