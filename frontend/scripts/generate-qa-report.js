#!/usr/bin/env node

/**
 * QA Report Generator for Dragon Component
 * Aggregates test results and generates comprehensive reports
 */

const fs = require('fs')
const path = require('path')

class QAReportGenerator {
  constructor(artifactsPath) {
    this.artifactsPath = artifactsPath
    this.report = {
      generated: new Date().toISOString(),
      summary: {},
      details: {},
      recommendations: []
    }
  }

  async generateReport() {
    console.log('🐉 Generating Dragon Component QA Report...')
    
    try {
      await this.analyzeUnitTests()
      await this.analyzePerformanceTests()
      await this.analyzeAccessibilityTests()
      await this.analyzeVisualTests()
      await this.analyzeLighthouseResults()
      await this.analyzeCrossBrowserTests()
      
      this.generateRecommendations()
      this.calculateOverallScore()
      
      await this.writeReports()
      
      console.log('✅ QA Report generated successfully!')
      console.log(`📊 Overall Score: ${this.report.summary.overallScore}/100`)
      
    } catch (error) {
      console.error('❌ Error generating QA report:', error.message)
      process.exit(1)
    }
  }

  async analyzeUnitTests() {
    console.log('📋 Analyzing unit test results...')
    
    const unitTestPath = path.join(this.artifactsPath, 'unit-test-results')
    if (!fs.existsSync(unitTestPath)) {
      this.report.summary.unitTests = { status: 'missing', coverage: 0 }
      return
    }

    try {
      // Parse Jest coverage report
      const coveragePath = path.join(unitTestPath, 'coverage', 'coverage-summary.json')
      let coverage = { total: { lines: { pct: 0 }, statements: { pct: 0 }, functions: { pct: 0 }, branches: { pct: 0 } } }
      
      if (fs.existsSync(coveragePath)) {
        coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'))
      }

      // Parse test results
      const testResultsPath = path.join(unitTestPath, 'test-results.xml')
      let testsPassed = true
      let testsTotal = 0
      let testsFailed = 0

      if (fs.existsSync(testResultsPath)) {
        const testResults = fs.readFileSync(testResultsPath, 'utf8')
        const passedMatch = testResults.match(/tests="(\d+)"/)
        const failedMatch = testResults.match(/failures="(\d+)"/)
        
        testsTotal = passedMatch ? parseInt(passedMatch[1]) : 0
        testsFailed = failedMatch ? parseInt(failedMatch[1]) : 0
        testsPassed = testsFailed === 0
      }

      this.report.summary.unitTests = {
        status: testsPassed ? 'passed' : 'failed',
        coverage: Math.round(coverage.total.lines.pct),
        testsTotal,
        testsFailed,
        details: {
          lineCoverage: coverage.total.lines.pct,
          statementCoverage: coverage.total.statements.pct,
          functionCoverage: coverage.total.functions.pct,
          branchCoverage: coverage.total.branches.pct
        }
      }

      console.log(`   ✓ Tests: ${testsTotal - testsFailed}/${testsTotal} passed`)
      console.log(`   ✓ Coverage: ${coverage.total.lines.pct}%`)

    } catch (error) {
      console.error('   ❌ Error parsing unit test results:', error.message)
      this.report.summary.unitTests = { status: 'error', coverage: 0 }
    }
  }

  async analyzePerformanceTests() {
    console.log('⚡ Analyzing performance test results...')
    
    const perfTestPath = path.join(this.artifactsPath, 'performance-test-results')
    if (!fs.existsSync(perfTestPath)) {
      this.report.summary.performance = { status: 'missing', averageScore: 0 }
      return
    }

    try {
      // Look for benchmark results
      const benchmarkFiles = fs.readdirSync(perfTestPath)
        .filter(file => file.includes('benchmark') && file.endsWith('.json'))

      let benchmarks = {}
      let performanceScore = 100

      for (const file of benchmarkFiles) {
        const benchmarkData = JSON.parse(
          fs.readFileSync(path.join(perfTestPath, file), 'utf8')
        )
        benchmarks[file.replace('.json', '')] = benchmarkData
      }

      // Calculate performance score based on benchmarks
      if (benchmarks['initial-render']) {
        const renderTime = benchmarks['initial-render'].average
        if (renderTime > 16) performanceScore -= Math.min(30, (renderTime - 16) * 2)
      }

      if (benchmarks['state-transition']) {
        const transitionTime = benchmarks['state-transition'].average
        if (transitionTime > 8) performanceScore -= Math.min(20, (transitionTime - 8) * 3)
      }

      this.report.summary.performance = {
        status: performanceScore >= 70 ? 'passed' : 'failed',
        averageScore: Math.round(performanceScore),
        benchmarks,
        details: {
          renderPerformance: benchmarks['initial-render']?.average || 0,
          transitionPerformance: benchmarks['state-transition']?.average || 0,
          interactionPerformance: benchmarks['interaction-response']?.average || 0
        }
      }

      console.log(`   ✓ Performance Score: ${Math.round(performanceScore)}/100`)

    } catch (error) {
      console.error('   ❌ Error parsing performance results:', error.message)
      this.report.summary.performance = { status: 'error', averageScore: 0 }
    }
  }

  async analyzeAccessibilityTests() {
    console.log('♿ Analyzing accessibility test results...')
    
    const a11yTestPath = path.join(this.artifactsPath, 'accessibility-test-results')
    if (!fs.existsSync(a11yTestPath)) {
      this.report.summary.accessibility = { status: 'missing', violations: 999 }
      return
    }

    try {
      // Look for axe reports
      const axeReportPath = path.join(a11yTestPath, 'axe-reports')
      let totalViolations = 0
      let accessibilityScore = 100

      if (fs.existsSync(axeReportPath)) {
        const axeFiles = fs.readdirSync(axeReportPath)
          .filter(file => file.endsWith('.json'))

        for (const file of axeFiles) {
          const axeData = JSON.parse(
            fs.readFileSync(path.join(axeReportPath, file), 'utf8')
          )
          
          if (axeData.violations) {
            totalViolations += axeData.violations.length
            
            // Deduct points based on violation severity
            axeData.violations.forEach(violation => {
              switch (violation.impact) {
                case 'critical': accessibilityScore -= 20; break
                case 'serious': accessibilityScore -= 10; break
                case 'moderate': accessibilityScore -= 5; break
                case 'minor': accessibilityScore -= 2; break
              }
            })
          }
        }
      }

      this.report.summary.accessibility = {
        status: totalViolations === 0 ? 'passed' : 'failed',
        violations: totalViolations,
        score: Math.max(0, Math.round(accessibilityScore)),
        wcagLevel: totalViolations === 0 ? 'AA' : 'Non-compliant'
      }

      console.log(`   ✓ Violations: ${totalViolations}`)
      console.log(`   ✓ WCAG Level: ${totalViolations === 0 ? 'AA' : 'Non-compliant'}`)

    } catch (error) {
      console.error('   ❌ Error parsing accessibility results:', error.message)
      this.report.summary.accessibility = { status: 'error', violations: 999 }
    }
  }

  async analyzeVisualTests() {
    console.log('👁️ Analyzing visual regression test results...')
    
    const visualTestPath = path.join(this.artifactsPath, 'visual-test-results')
    if (!fs.existsSync(visualTestPath)) {
      this.report.summary.visual = { status: 'missing', changedFiles: 0 }
      return
    }

    try {
      // Count visual differences
      const diffPath = path.join(visualTestPath, '__visual_tests__', 'diff')
      let changedFiles = 0
      
      if (fs.existsSync(diffPath)) {
        changedFiles = fs.readdirSync(diffPath).filter(file => file.endsWith('.png')).length
      }

      // Look for visual test results
      const visualReportPath = path.join(visualTestPath, 'visual-diff-reports')
      let visualScore = 100

      if (fs.existsSync(visualReportPath)) {
        const reportFiles = fs.readdirSync(visualReportPath)
          .filter(file => file.endsWith('.json'))

        for (const file of reportFiles) {
          try {
            const reportData = JSON.parse(
              fs.readFileSync(path.join(visualReportPath, file), 'utf8')
            )
            
            if (reportData.changes && reportData.changes.length > 0) {
              changedFiles += reportData.changes.length
              visualScore -= reportData.changes.length * 5 // 5 points per change
            }
          } catch (parseError) {
            // Skip malformed reports
          }
        }
      }

      this.report.summary.visual = {
        status: changedFiles === 0 ? 'passed' : 'review-required',
        changedFiles,
        score: Math.max(0, Math.round(visualScore))
      }

      console.log(`   ✓ Visual Changes: ${changedFiles} files`)

    } catch (error) {
      console.error('   ❌ Error parsing visual test results:', error.message)
      this.report.summary.visual = { status: 'error', changedFiles: 999 }
    }
  }

  async analyzeLighthouseResults() {
    console.log('🔍 Analyzing Lighthouse audit results...')
    
    const lighthousePath = path.join(this.artifactsPath, 'lighthouse-results')
    if (!fs.existsSync(lighthousePath)) {
      this.report.summary.lighthouse = { performance: 0, accessibility: 0, bestPractices: 0 }
      return
    }

    try {
      const reportPath = path.join(lighthousePath, 'lighthouse-report.json')
      
      if (fs.existsSync(reportPath)) {
        const lighthouse = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
        
        this.report.summary.lighthouse = {
          performance: Math.round(lighthouse.categories.performance.score * 100),
          accessibility: Math.round(lighthouse.categories.accessibility.score * 100),
          bestPractices: Math.round((lighthouse.categories['best-practices']?.score || 0) * 100),
          url: lighthouse.finalUrl,
          fetchTime: lighthouse.fetchTime
        }

        console.log(`   ✓ Performance: ${this.report.summary.lighthouse.performance}/100`)
        console.log(`   ✓ Accessibility: ${this.report.summary.lighthouse.accessibility}/100`)
      }

    } catch (error) {
      console.error('   ❌ Error parsing Lighthouse results:', error.message)
      this.report.summary.lighthouse = { performance: 0, accessibility: 0, bestPractices: 0 }
    }
  }

  async analyzeCrossBrowserTests() {
    console.log('🌐 Analyzing cross-browser test results...')
    
    const browserResults = {}
    const browsers = ['chromium', 'firefox', 'webkit']
    
    for (const browser of browsers) {
      const browserTestPath = path.join(this.artifactsPath, `browser-test-results-${browser}`)
      
      if (fs.existsSync(browserTestPath)) {
        try {
          // Look for Playwright results
          const resultFiles = fs.readdirSync(browserTestPath)
            .filter(file => file.includes('results') && file.endsWith('.json'))
          
          let passed = true
          let testCount = 0
          
          for (const file of resultFiles) {
            const results = JSON.parse(
              fs.readFileSync(path.join(browserTestPath, file), 'utf8')
            )
            
            if (results.stats) {
              testCount += results.stats.expected || 0
              if (results.stats.unexpected > 0) passed = false
            }
          }
          
          browserResults[browser] = {
            status: passed ? 'passed' : 'failed',
            testCount
          }
        } catch (error) {
          browserResults[browser] = { status: 'error', testCount: 0 }
        }
      } else {
        browserResults[browser] = { status: 'missing', testCount: 0 }
      }
    }

    this.report.summary.crossBrowser = browserResults
    
    const passedBrowsers = Object.values(browserResults)
      .filter(result => result.status === 'passed').length
      
    console.log(`   ✓ Browser Compatibility: ${passedBrowsers}/${browsers.length} browsers passed`)
  }

  generateRecommendations() {
    console.log('💡 Generating recommendations...')
    
    const recommendations = []

    // Performance recommendations
    if (this.report.summary.performance.averageScore < 80) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        title: 'Improve Animation Performance',
        description: 'Dragon animations are not meeting performance targets. Consider reducing particle count or enabling performance mode.',
        impact: 'User experience may be degraded on slower devices'
      })
    }

    // Accessibility recommendations
    if (this.report.summary.accessibility.violations > 0) {
      recommendations.push({
        type: 'accessibility',
        priority: 'high',
        title: 'Fix Accessibility Violations',
        description: `${this.report.summary.accessibility.violations} accessibility violations found. Review axe-core reports for details.`,
        impact: 'Component may not be usable by users with disabilities'
      })
    }

    // Coverage recommendations
    if (this.report.summary.unitTests.coverage < 95) {
      recommendations.push({
        type: 'testing',
        priority: 'medium',
        title: 'Increase Test Coverage',
        description: `Test coverage is ${this.report.summary.unitTests.coverage}%. Aim for 95%+ coverage.`,
        impact: 'Potential bugs may not be caught by automated testing'
      })
    }

    // Visual regression recommendations
    if (this.report.summary.visual.changedFiles > 0) {
      recommendations.push({
        type: 'visual',
        priority: 'medium',
        title: 'Review Visual Changes',
        description: `${this.report.summary.visual.changedFiles} visual changes detected. Verify these are intentional.`,
        impact: 'Unintended visual changes may affect user experience'
      })
    }

    // Browser compatibility recommendations
    const failedBrowsers = Object.entries(this.report.summary.crossBrowser)
      .filter(([browser, result]) => result.status === 'failed')
    
    if (failedBrowsers.length > 0) {
      recommendations.push({
        type: 'compatibility',
        priority: 'medium',
        title: 'Fix Browser Compatibility Issues',
        description: `Tests failed in ${failedBrowsers.map(([browser]) => browser).join(', ')}`,
        impact: 'Component may not work correctly in all supported browsers'
      })
    }

    this.report.recommendations = recommendations
    console.log(`   ✓ Generated ${recommendations.length} recommendations`)
  }

  calculateOverallScore() {
    const weights = {
      unitTests: 0.25,
      performance: 0.25,
      accessibility: 0.20,
      visual: 0.15,
      lighthouse: 0.15
    }

    let score = 0
    let totalWeight = 0

    // Unit tests score
    if (this.report.summary.unitTests.status === 'passed') {
      score += (this.report.summary.unitTests.coverage / 100) * 100 * weights.unitTests
      totalWeight += weights.unitTests
    }

    // Performance score
    if (this.report.summary.performance.averageScore > 0) {
      score += this.report.summary.performance.averageScore * weights.performance
      totalWeight += weights.performance
    }

    // Accessibility score
    if (this.report.summary.accessibility.score !== undefined) {
      score += this.report.summary.accessibility.score * weights.accessibility
      totalWeight += weights.accessibility
    }

    // Visual score
    if (this.report.summary.visual.score !== undefined) {
      score += this.report.summary.visual.score * weights.visual
      totalWeight += weights.visual
    }

    // Lighthouse score
    if (this.report.summary.lighthouse.performance > 0) {
      const lighthouseAvg = (
        this.report.summary.lighthouse.performance +
        this.report.summary.lighthouse.accessibility
      ) / 2
      score += lighthouseAvg * weights.lighthouse
      totalWeight += weights.lighthouse
    }

    this.report.summary.overallScore = totalWeight > 0 ? Math.round(score / totalWeight) : 0
  }

  async writeReports() {
    // Write JSON summary for CI
    const summaryPath = 'qa-summary.json'
    fs.writeFileSync(summaryPath, JSON.stringify({
      overallScore: this.report.summary.overallScore,
      unitTests: this.report.summary.unitTests,
      performance: this.report.summary.performance,
      accessibility: this.report.summary.accessibility,
      visual: this.report.summary.visual,
      lighthouse: this.report.summary.lighthouse,
      recommendations: this.report.recommendations,
      reportUrl: 'qa-report.html'
    }, null, 2))

    // Write detailed HTML report
    const htmlReport = this.generateHTMLReport()
    fs.writeFileSync('qa-report.html', htmlReport)

    // Write full JSON report
    fs.writeFileSync('qa-report-full.json', JSON.stringify(this.report, null, 2))

    console.log('📄 Reports written:')
    console.log('   - qa-summary.json (CI summary)')
    console.log('   - qa-report.html (detailed report)')
    console.log('   - qa-report-full.json (complete data)')
  }

  generateHTMLReport() {
    const { summary, recommendations } = this.report
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dragon Component QA Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .score { font-size: 3em; font-weight: bold; color: ${summary.overallScore >= 80 ? '#22c55e' : summary.overallScore >= 60 ? '#f59e0b' : '#ef4444'}; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .card { border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px; }
        .card h3 { margin-top: 0; color: #1f2937; }
        .status { padding: 4px 12px; border-radius: 4px; font-size: 0.875em; font-weight: 500; }
        .status.passed { background: #dcfce7; color: #166534; }
        .status.failed { background: #fef2f2; color: #dc2626; }
        .status.missing { background: #fef3c7; color: #d97706; }
        .recommendations { margin-top: 40px; }
        .recommendation { border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 15px; background: #f8fafc; }
        .recommendation.high { border-color: #ef4444; }
        .recommendation.medium { border-color: #f59e0b; }
        .metric { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .metric-value { font-weight: 600; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🐉 Dragon Component QA Report</h1>
            <div class="score">${summary.overallScore}/100</div>
            <p>Generated on ${new Date(this.report.generated).toLocaleString()}</p>
        </div>

        <div class="grid">
            <div class="card">
                <h3>Unit Tests</h3>
                <span class="status ${summary.unitTests.status}">${summary.unitTests.status}</span>
                <div class="metric">
                    <span>Coverage:</span>
                    <span class="metric-value">${summary.unitTests.coverage}%</span>
                </div>
                <div class="metric">
                    <span>Tests Passed:</span>
                    <span class="metric-value">${(summary.unitTests.testsTotal || 0) - (summary.unitTests.testsFailed || 0)}/${summary.unitTests.testsTotal || 0}</span>
                </div>
            </div>

            <div class="card">
                <h3>Performance</h3>
                <span class="status ${summary.performance.status}">${summary.performance.status}</span>
                <div class="metric">
                    <span>Score:</span>
                    <span class="metric-value">${summary.performance.averageScore}/100</span>
                </div>
                <div class="metric">
                    <span>Render Time:</span>
                    <span class="metric-value">${summary.performance.details?.renderPerformance?.toFixed(2) || 'N/A'}ms</span>
                </div>
            </div>

            <div class="card">
                <h3>Accessibility</h3>
                <span class="status ${summary.accessibility.status}">${summary.accessibility.status}</span>
                <div class="metric">
                    <span>Violations:</span>
                    <span class="metric-value">${summary.accessibility.violations}</span>
                </div>
                <div class="metric">
                    <span>WCAG Level:</span>
                    <span class="metric-value">${summary.accessibility.wcagLevel || 'Unknown'}</span>
                </div>
            </div>

            <div class="card">
                <h3>Visual Regression</h3>
                <span class="status ${summary.visual.status}">${summary.visual.status}</span>
                <div class="metric">
                    <span>Changed Files:</span>
                    <span class="metric-value">${summary.visual.changedFiles}</span>
                </div>
            </div>

            <div class="card">
                <h3>Lighthouse</h3>
                <div class="metric">
                    <span>Performance:</span>
                    <span class="metric-value">${summary.lighthouse.performance || 0}/100</span>
                </div>
                <div class="metric">
                    <span>Accessibility:</span>
                    <span class="metric-value">${summary.lighthouse.accessibility || 0}/100</span>
                </div>
            </div>

            <div class="card">
                <h3>Cross-Browser</h3>
                ${Object.entries(summary.crossBrowser || {}).map(([browser, result]) => 
                  `<div class="metric">
                    <span>${browser}:</span>
                    <span class="status ${result.status}">${result.status}</span>
                  </div>`
                ).join('')}
            </div>
        </div>

        ${recommendations.length > 0 ? `
        <div class="recommendations">
            <h2>Recommendations</h2>
            ${recommendations.map(rec => `
                <div class="recommendation ${rec.priority}">
                    <h4>${rec.title}</h4>
                    <p><strong>Type:</strong> ${rec.type} | <strong>Priority:</strong> ${rec.priority}</p>
                    <p>${rec.description}</p>
                    <p><em>Impact:</em> ${rec.impact}</p>
                </div>
            `).join('')}
        </div>
        ` : ''}
    </div>
</body>
</html>
    `
  }
}

// CLI execution
if (require.main === module) {
  const artifactsPath = process.argv[2] || './test-artifacts'
  const generator = new QAReportGenerator(artifactsPath)
  generator.generateReport().catch(console.error)
}

module.exports = QAReportGenerator