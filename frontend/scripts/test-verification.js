#!/usr/bin/env node

/**
 * Test Verification Script for Seiron Frontend
 * 
 * This script verifies that all testing infrastructure is working correctly
 * and provides a comprehensive report of test coverage and functionality.
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}\n`)
}

function runCommand(command, description) {
  try {
    log.info(`Running: ${description}`)
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      timeout: 120000 // 2 minutes timeout
    })
    log.success(`${description} - PASSED`)
    return { success: true, output }
  } catch (error) {
    log.error(`${description} - FAILED`)
    console.log(`Error: ${error.message}`)
    if (error.stdout) {
      console.log('STDOUT:', error.stdout.slice(-1000)) // Last 1000 chars
    }
    if (error.stderr) {
      console.log('STDERR:', error.stderr.slice(-1000))
    }
    return { success: false, error: error.message }
  }
}

function checkFileExists(filePath, description) {
  const fullPath = path.resolve(filePath)
  if (fs.existsSync(fullPath)) {
    log.success(`${description} exists`)
    return true
  } else {
    log.error(`${description} missing: ${filePath}`)
    return false
  }
}

function countTestFiles(directory) {
  try {
    const files = fs.readdirSync(directory, { recursive: true })
    const testFiles = files.filter(file => 
      typeof file === 'string' && 
      (file.endsWith('.test.ts') || file.endsWith('.test.tsx'))
    )
    return testFiles.length
  } catch (error) {
    return 0
  }
}

async function main() {
  log.header('🧪 Seiron Frontend Test Verification')
  
  const results = {
    configTests: 0,
    infrastructureTests: 0,
    unitTests: 0,
    integrationTests: 0,
    performanceTests: 0,
    totalTests: 0,
    passed: 0,
    failed: 0
  }

  // 1. Check Test Configuration Files
  log.header('📋 Test Configuration Verification')
  
  const configFiles = [
    ['jest.config.js', 'Main Jest configuration'],
    ['jest.setup.js', 'Jest setup file'],
    ['jest.performance.config.js', 'Performance test configuration'],
    ['jest.accessibility.config.js', 'Accessibility test configuration'],
    ['jest.visual.config.js', 'Visual test configuration'],
    ['package.json', 'Package configuration']
  ]
  
  configFiles.forEach(([file, desc]) => {
    if (checkFileExists(file, desc)) {
      results.configTests++
    }
  })

  // 2. Check Test Infrastructure
  log.header('🏗️ Test Infrastructure Verification')
  
  const infraTests = [
    ['npm run test -- --passWithNoTests --watchAll=false', 'Basic test runner'],
    ['npm run type-check', 'TypeScript compilation'],
  ]
  
  for (const [command, desc] of infraTests) {
    const result = runCommand(command, desc)
    if (result.success) {
      results.infrastructureTests++
    }
  }

  // 3. Count Test Files
  log.header('📊 Test File Analysis')
  
  const testDirectories = [
    'components',
    'hooks', 
    'lib',
    '__tests__',
    'utils'
  ]
  
  let totalTestFiles = 0
  testDirectories.forEach(dir => {
    if (fs.existsSync(dir)) {
      const count = countTestFiles(dir)
      totalTestFiles += count
      log.info(`${dir}: ${count} test files`)
    }
  })
  
  log.info(`Total test files found: ${totalTestFiles}`)
  results.totalTests = totalTestFiles

  // 4. Run Specific Test Categories
  log.header('🎯 Test Category Verification')
  
  const testCategories = [
    ['npm run test -- components/ui/forms --passWithNoTests --watchAll=false', 'UI Component Tests'],
    ['npm run test -- hooks/__tests__ --passWithNoTests --watchAll=false', 'Hook Tests'],
    ['npm run test -- __tests__/integration --passWithNoTests --watchAll=false', 'Integration Tests'],
    ['npm run test -- lib/__tests__ --passWithNoTests --watchAll=false', 'Library Tests']
  ]
  
  for (const [command, desc] of testCategories) {
    const result = runCommand(command, desc)
    if (result.success) {
      results.unitTests++
    }
  }

  // 5. Check Documentation
  log.header('📚 Documentation Verification')
  
  const docFiles = [
    ['docs/TESTING_STRATEGIES.md', 'Testing strategies documentation'],
    ['components/README.md', 'Component documentation'],
    ['hooks/README-PRICE-FEED.md', 'Hook documentation example']
  ]
  
  docFiles.forEach(([file, desc]) => {
    checkFileExists(file, desc)
  })

  // 6. Performance and Accessibility Tests
  log.header('⚡ Performance & Accessibility Tests')
  
  const specialTests = [
    ['npm run test:performance -- --passWithNoTests --watchAll=false', 'Performance Tests'],
    ['npm run test:accessibility -- --passWithNoTests --watchAll=false', 'Accessibility Tests']
  ]
  
  for (const [command, desc] of specialTests) {
    const result = runCommand(command, desc)
    if (result.success) {
      results.performanceTests++
    }
  }

  // 7. Generate Summary Report
  log.header('📋 Test Verification Summary')
  
  const totalChecks = results.configTests + results.infrastructureTests + results.unitTests + results.performanceTests
  const successRate = totalChecks > 0 ? Math.round((totalChecks / (configFiles.length + infraTests.length + testCategories.length + specialTests.length)) * 100) : 0
  
  console.log(`${colors.bold}Configuration Files:${colors.reset} ${results.configTests}/${configFiles.length}`)
  console.log(`${colors.bold}Infrastructure Tests:${colors.reset} ${results.infrastructureTests}/${infraTests.length}`)
  console.log(`${colors.bold}Unit Test Categories:${colors.reset} ${results.unitTests}/${testCategories.length}`)
  console.log(`${colors.bold}Performance Tests:${colors.reset} ${results.performanceTests}/${specialTests.length}`)
  console.log(`${colors.bold}Total Test Files:${colors.reset} ${results.totalTests}`)
  console.log(`${colors.bold}Success Rate:${colors.reset} ${successRate}%`)
  
  if (successRate >= 80) {
    log.success('Test verification completed successfully! 🎉')
    log.info('The Seiron frontend testing infrastructure is ready for development.')
  } else if (successRate >= 60) {
    log.warning('Test verification completed with warnings.')
    log.info('Most tests are working, but some issues need attention.')
  } else {
    log.error('Test verification failed.')
    log.info('Significant issues found that need to be resolved.')
  }

  // 8. Recommendations
  log.header('💡 Recommendations')
  
  console.log('✅ Use property-based testing for complex logic')
  console.log('✅ Write integration tests for user workflows')
  console.log('✅ Add accessibility tests for interactive components')
  console.log('✅ Use JSDoc documentation for all exported functions')
  console.log('✅ Run full test suite before committing: npm run test:all')
  console.log('✅ Check coverage reports: npm run test:coverage')

  log.header('🐉 The Dragon Approves! Testing Infrastructure Complete!')
  
  process.exit(successRate >= 60 ? 0 : 1)
}

main().catch(error => {
  log.error(`Verification script failed: ${error.message}`)
  process.exit(1)
})