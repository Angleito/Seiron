/**
 * Dragon Test Results Processor
 * Custom processor for dragon component test results
 */

const fs = require('fs')
const path = require('path')

module.exports = (results) => {
  // Process dragon-specific test results
  const dragonResults = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: results.numTotalTests,
      passedTests: results.numPassedTests,
      failedTests: results.numFailedTests,
      pendingTests: results.numPendingTests,
      runtime: results.testResults.reduce((acc, test) => acc + test.perfStats.runtime, 0)
    },
    components: {},
    hooks: {},
    performance: {},
    coverage: {},
    visual: {}
  }

  // Categorize test results by dragon component type
  results.testResults.forEach(testResult => {
    const testPath = testResult.testFilePath
    const fileName = path.basename(testPath)
    
    if (fileName.includes('Dragon3D')) {
      dragonResults.components.dragon3D = processComponentResults(testResult)
    } else if (fileName.includes('ASCIIDragon')) {
      dragonResults.components.asciiDragon = processComponentResults(testResult)
    } else if (fileName.includes('DragonRenderer')) {
      dragonResults.components.dragonRenderer = processComponentResults(testResult)
    } else if (fileName.includes('useDragon3D')) {
      dragonResults.hooks.dragon3D = processHookResults(testResult)
    } else if (fileName.includes('useASCIIDragon')) {
      dragonResults.hooks.asciiDragon = processHookResults(testResult)
    } else if (fileName.includes('performance')) {
      dragonResults.performance = processPerformanceResults(testResult)
    } else if (fileName.includes('visual')) {
      dragonResults.visual = processVisualResults(testResult)
    }
  })

  // Extract coverage information
  if (results.coverageMap) {
    dragonResults.coverage = processCoverageResults(results.coverageMap)
  }

  // Generate performance metrics
  dragonResults.performanceMetrics = generatePerformanceMetrics(dragonResults)

  // Generate recommendations
  dragonResults.recommendations = generateRecommendations(dragonResults)

  // Write detailed results to file
  const outputDir = path.join(process.cwd(), 'coverage', 'dragon')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const outputFile = path.join(outputDir, 'dragon-test-report.json')
  fs.writeFileSync(outputFile, JSON.stringify(dragonResults, null, 2))

  // Generate HTML report
  generateHTMLReport(dragonResults, outputDir)

  // Console summary
  logSummary(dragonResults)

  return results
}

function processComponentResults(testResult) {
  return {
    testPath: testResult.testFilePath,
    runtime: testResult.perfStats.runtime,
    tests: testResult.testResults.map(test => ({
      title: test.title,
      status: test.status,
      duration: test.duration,
      ancestorTitles: test.ancestorTitles
    })),
    stats: {
      total: testResult.numPassingTests + testResult.numFailingTests + testResult.numPendingTests,
      passed: testResult.numPassingTests,
      failed: testResult.numFailingTests,
      pending: testResult.numPendingTests
    }
  }
}

function processHookResults(testResult) {
  return {
    testPath: testResult.testFilePath,
    runtime: testResult.perfStats.runtime,
    tests: testResult.testResults.map(test => ({
      title: test.title,
      status: test.status,
      duration: test.duration,
      ancestorTitles: test.ancestorTitles
    })),
    stats: {
      total: testResult.numPassingTests + testResult.numFailingTests + testResult.numPendingTests,
      passed: testResult.numPassingTests,
      failed: testResult.numFailingTests,
      pending: testResult.numPendingTests
    }
  }
}

function processPerformanceResults(testResult) {
  const performanceTests = testResult.testResults.filter(test => 
    test.ancestorTitles.some(title => title.toLowerCase().includes('performance'))
  )

  return {
    testPath: testResult.testFilePath,
    runtime: testResult.perfStats.runtime,
    benchmarks: performanceTests.map(test => ({
      name: test.title,
      duration: test.duration,
      status: test.status
    })),
    stats: {
      total: performanceTests.length,
      passed: performanceTests.filter(t => t.status === 'passed').length,
      failed: performanceTests.filter(t => t.status === 'failed').length
    }
  }
}

function processVisualResults(testResult) {
  const visualTests = testResult.testResults.filter(test => 
    test.ancestorTitles.some(title => title.toLowerCase().includes('visual'))
  )

  return {
    testPath: testResult.testFilePath,
    runtime: testResult.perfStats.runtime,
    snapshots: visualTests.map(test => ({
      name: test.title,
      status: test.status,
      duration: test.duration
    })),
    stats: {
      total: visualTests.length,
      passed: visualTests.filter(t => t.status === 'passed').length,
      failed: visualTests.filter(t => t.status === 'failed').length
    }
  }
}

function processCoverageResults(coverageMap) {
  const coverage = {
    overall: {
      statements: { pct: 0, covered: 0, total: 0 },
      branches: { pct: 0, covered: 0, total: 0 },
      functions: { pct: 0, covered: 0, total: 0 },
      lines: { pct: 0, covered: 0, total: 0 }
    },
    files: {}
  }

  const summary = coverageMap.getCoverageSummary()
  
  coverage.overall.statements = {
    pct: summary.statements.pct,
    covered: summary.statements.covered,
    total: summary.statements.total
  }
  
  coverage.overall.branches = {
    pct: summary.branches.pct,
    covered: summary.branches.covered,
    total: summary.branches.total
  }
  
  coverage.overall.functions = {
    pct: summary.functions.pct,
    covered: summary.functions.covered,
    total: summary.functions.total
  }
  
  coverage.overall.lines = {
    pct: summary.lines.pct,
    covered: summary.lines.covered,
    total: summary.lines.total
  }

  // Process individual file coverage
  coverageMap.files().forEach(file => {
    if (file.includes('dragon') || file.includes('Dragon')) {
      const fileCoverage = coverageMap.fileCoverageFor(file)
      const fileSummary = fileCoverage.getSummary()
      
      coverage.files[file] = {
        statements: fileSummary.statements.pct,
        branches: fileSummary.branches.pct,
        functions: fileSummary.functions.pct,
        lines: fileSummary.lines.pct
      }
    }
  })

  return coverage
}

function generatePerformanceMetrics(results) {
  const metrics = {
    averageTestRuntime: 0,
    slowestComponent: null,
    fastestComponent: null,
    performanceIssues: []
  }

  const componentTimes = []
  
  Object.entries(results.components).forEach(([name, data]) => {
    componentTimes.push({ name, runtime: data.runtime })
  })

  Object.entries(results.hooks).forEach(([name, data]) => {
    componentTimes.push({ name: `${name}-hook`, runtime: data.runtime })
  })

  if (componentTimes.length > 0) {
    metrics.averageTestRuntime = componentTimes.reduce((sum, item) => sum + item.runtime, 0) / componentTimes.length
    metrics.slowestComponent = componentTimes.reduce((max, item) => item.runtime > max.runtime ? item : max)
    metrics.fastestComponent = componentTimes.reduce((min, item) => item.runtime < min.runtime ? item : min)
    
    // Identify performance issues
    componentTimes.forEach(item => {
      if (item.runtime > metrics.averageTestRuntime * 2) {
        metrics.performanceIssues.push({
          component: item.name,
          runtime: item.runtime,
          issue: 'Slow test execution'
        })
      }
    })
  }

  return metrics
}

function generateRecommendations(results) {
  const recommendations = []

  // Coverage recommendations
  if (results.coverage.overall && results.coverage.overall.statements.pct < 85) {
    recommendations.push({
      type: 'coverage',
      priority: 'high',
      message: `Statement coverage is ${results.coverage.overall.statements.pct.toFixed(1)}%. Target is 85%+`
    })
  }

  // Performance recommendations
  if (results.performanceMetrics.performanceIssues.length > 0) {
    recommendations.push({
      type: 'performance',
      priority: 'medium',
      message: `${results.performanceMetrics.performanceIssues.length} components have slow test execution`
    })
  }

  // Test failure recommendations
  const totalFailed = results.summary.failedTests
  if (totalFailed > 0) {
    recommendations.push({
      type: 'reliability',
      priority: 'high',
      message: `${totalFailed} tests are failing. Address failing tests immediately.`
    })
  }

  // Visual test recommendations
  if (results.visual.stats && results.visual.stats.failed > 0) {
    recommendations.push({
      type: 'visual',
      priority: 'medium',
      message: `${results.visual.stats.failed} visual regression tests are failing`
    })
  }

  return recommendations
}

function generateHTMLReport(results, outputDir) {
  const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <title>Dragon Component Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #e8f4f8; padding: 15px; border-radius: 5px; flex: 1; }
        .metric h3 { margin: 0 0 10px 0; }
        .section { margin: 20px 0; }
        .recommendations { background: #fff3cd; padding: 15px; border-radius: 5px; }
        .recommendation { margin: 10px 0; padding: 10px; background: white; border-radius: 3px; }
        .high { border-left: 4px solid #dc3545; }
        .medium { border-left: 4px solid #ffc107; }
        .low { border-left: 4px solid #28a745; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
        .pass { color: #28a745; }
        .fail { color: #dc3545; }
        .pending { color: #ffc107; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🐉 Dragon Component Test Report</h1>
        <p>Generated: ${results.timestamp}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Total Tests</h3>
            <div style="font-size: 24px; font-weight: bold;">${results.summary.totalTests}</div>
        </div>
        <div class="metric">
            <h3>Passed</h3>
            <div style="font-size: 24px; font-weight: bold; color: #28a745;">${results.summary.passedTests}</div>
        </div>
        <div class="metric">
            <h3>Failed</h3>
            <div style="font-size: 24px; font-weight: bold; color: #dc3545;">${results.summary.failedTests}</div>
        </div>
        <div class="metric">
            <h3>Runtime</h3>
            <div style="font-size: 24px; font-weight: bold;">${(results.summary.runtime / 1000).toFixed(2)}s</div>
        </div>
    </div>

    ${results.recommendations.length > 0 ? `
    <div class="section">
        <h2>📋 Recommendations</h2>
        <div class="recommendations">
            ${results.recommendations.map(rec => `
                <div class="recommendation ${rec.priority}">
                    <strong>${rec.type.toUpperCase()}</strong>: ${rec.message}
                </div>
            `).join('')}
        </div>
    </div>
    ` : ''}

    <div class="section">
        <h2>🧩 Component Test Results</h2>
        <table>
            <tr>
                <th>Component</th>
                <th>Tests</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Runtime (ms)</th>
            </tr>
            ${Object.entries(results.components).map(([name, data]) => `
                <tr>
                    <td>${name}</td>
                    <td>${data.stats.total}</td>
                    <td class="pass">${data.stats.passed}</td>
                    <td class="fail">${data.stats.failed}</td>
                    <td>${data.runtime}</td>
                </tr>
            `).join('')}
        </table>
    </div>

    <div class="section">
        <h2>🎣 Hook Test Results</h2>
        <table>
            <tr>
                <th>Hook</th>
                <th>Tests</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Runtime (ms)</th>
            </tr>
            ${Object.entries(results.hooks).map(([name, data]) => `
                <tr>
                    <td>${name}</td>
                    <td>${data.stats.total}</td>
                    <td class="pass">${data.stats.passed}</td>
                    <td class="fail">${data.stats.failed}</td>
                    <td>${data.runtime}</td>
                </tr>
            `).join('')}
        </table>
    </div>

    ${results.coverage.overall ? `
    <div class="section">
        <h2>📊 Coverage Report</h2>
        <div class="summary">
            <div class="metric">
                <h3>Statements</h3>
                <div style="font-size: 20px; font-weight: bold;">${results.coverage.overall.statements.pct.toFixed(1)}%</div>
            </div>
            <div class="metric">
                <h3>Branches</h3>
                <div style="font-size: 20px; font-weight: bold;">${results.coverage.overall.branches.pct.toFixed(1)}%</div>
            </div>
            <div class="metric">
                <h3>Functions</h3>
                <div style="font-size: 20px; font-weight: bold;">${results.coverage.overall.functions.pct.toFixed(1)}%</div>
            </div>
            <div class="metric">
                <h3>Lines</h3>
                <div style="font-size: 20px; font-weight: bold;">${results.coverage.overall.lines.pct.toFixed(1)}%</div>
            </div>
        </div>
    </div>
    ` : ''}

    ${results.performanceMetrics ? `
    <div class="section">
        <h2>⚡ Performance Metrics</h2>
        <p><strong>Average Test Runtime:</strong> ${results.performanceMetrics.averageTestRuntime.toFixed(2)}ms</p>
        ${results.performanceMetrics.slowestComponent ? `
            <p><strong>Slowest Component:</strong> ${results.performanceMetrics.slowestComponent.name} (${results.performanceMetrics.slowestComponent.runtime}ms)</p>
        ` : ''}
        ${results.performanceMetrics.fastestComponent ? `
            <p><strong>Fastest Component:</strong> ${results.performanceMetrics.fastestComponent.name} (${results.performanceMetrics.fastestComponent.runtime}ms)</p>
        ` : ''}
    </div>
    ` : ''}

</body>
</html>
  `

  const htmlFile = path.join(outputDir, 'dragon-test-report.html')
  fs.writeFileSync(htmlFile, htmlTemplate)
}

function logSummary(results) {
  console.log('\n🐉 Dragon Component Test Summary')
  console.log('================================')
  console.log(`Total Tests: ${results.summary.totalTests}`)
  console.log(`Passed: ${results.summary.passedTests}`)
  console.log(`Failed: ${results.summary.failedTests}`)
  console.log(`Runtime: ${(results.summary.runtime / 1000).toFixed(2)}s`)
  
  if (results.coverage.overall) {
    console.log(`\n📊 Coverage: ${results.coverage.overall.statements.pct.toFixed(1)}% statements`)
  }
  
  if (results.recommendations.length > 0) {
    console.log('\n📋 Recommendations:')
    results.recommendations.forEach(rec => {
      console.log(`  ${rec.priority.toUpperCase()}: ${rec.message}`)
    })
  }
  
  console.log('\n📄 Detailed report: coverage/dragon/dragon-test-report.html')
  console.log('================================\n')
}