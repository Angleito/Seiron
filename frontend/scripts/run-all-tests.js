#!/usr/bin/env node

/**
 * Master Test Runner Script
 * Orchestrates all test suites for comprehensive validation
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Color helpers
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`,
  dim: (text) => `\x1b[2m${text}\x1b[0m`
};

// Test suites configuration
const testSuites = {
  quick: [
    {
      name: 'Unit Tests',
      command: 'npm',
      args: ['run', 'test', '--', '--passWithNoTests'],
      critical: true
    },
    {
      name: '3D Model Validation',
      command: 'node',
      args: ['scripts/test-3d-models.js'],
      critical: true
    },
    {
      name: 'API Endpoints',
      command: 'node',
      args: ['scripts/test-api-endpoints.js'],
      critical: false
    }
  ],
  
  full: [
    {
      name: 'Type Checking',
      command: 'npm',
      args: ['run', 'type-check'],
      critical: true
    },
    {
      name: 'Linting',
      command: 'npm',
      args: ['run', 'lint'],
      critical: false
    },
    {
      name: 'Unit Tests',
      command: 'npm',
      args: ['run', 'test', '--', '--passWithNoTests'],
      critical: true
    },
    {
      name: 'Integration Tests',
      command: 'npm',
      args: ['run', 'test:integration', '--', '--passWithNoTests'],
      critical: false
    },
    {
      name: '3D Model Validation',
      command: 'node',
      args: ['scripts/test-3d-models.js', '--report'],
      critical: true
    },
    {
      name: 'API Endpoints',
      command: 'node',
      args: ['scripts/test-api-endpoints.js', '--report'],
      critical: true
    },
    {
      name: 'Build Process',
      command: 'npm',
      args: ['run', 'build'],
      critical: true
    },
    {
      name: 'Build Validation',
      command: 'node',
      args: ['scripts/validate-build-models.js'],
      critical: true
    }
  ],
  
  production: [
    {
      name: 'Production Deployment',
      command: 'node',
      args: ['scripts/test-production-deployment.js', '--report'],
      critical: true
    }
  ],
  
  ci: [
    {
      name: 'CI Tests',
      command: 'npm',
      args: ['run', 'test:ci'],
      critical: true
    },
    {
      name: 'CI Integration Tests',
      command: 'npm',
      args: ['run', 'test:integration:ci'],
      critical: false
    },
    {
      name: '3D Model Validation',
      command: 'node',
      args: ['scripts/test-3d-models.js'],
      critical: true
    }
  ]
};

// Test results tracking
const results = {
  passed: [],
  failed: [],
  skipped: [],
  total: 0,
  startTime: Date.now()
};

// Run a single test suite
function runTest(test) {
  return new Promise((resolve) => {
    console.log(`\n${colors.bold(`Running: ${test.name}`)}`);
    console.log(colors.dim('─'.repeat(40)));
    
    const startTime = Date.now();
    const child = spawn(test.command, test.args, {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    
    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      const durationStr = `(${(duration / 1000).toFixed(1)}s)`;
      
      if (code === 0) {
        console.log(colors.green(`\n✓ ${test.name} passed ${durationStr}`));
        results.passed.push({ name: test.name, duration });
        resolve(true);
      } else {
        console.log(colors.red(`\n✗ ${test.name} failed ${durationStr}`));
        results.failed.push({ name: test.name, duration, critical: test.critical });
        resolve(!test.critical); // Continue if not critical
      }
    });
    
    child.on('error', (error) => {
      console.log(colors.red(`\n✗ ${test.name} error: ${error.message}`));
      results.failed.push({ name: test.name, error: error.message, critical: test.critical });
      resolve(!test.critical);
    });
  });
}

// Generate final report
function generateReport() {
  const totalDuration = Date.now() - results.startTime;
  const reportPath = './test-results/master-test-report.json';
  
  // Ensure directory exists
  if (!fs.existsSync('./test-results')) {
    fs.mkdirSync('./test-results', { recursive: true });
  }
  
  const report = {
    timestamp: new Date().toISOString(),
    duration: `${(totalDuration / 1000).toFixed(1)}s`,
    summary: {
      total: results.total,
      passed: results.passed.length,
      failed: results.failed.length,
      skipped: results.skipped.length,
      successRate: `${(results.passed.length / results.total * 100).toFixed(1)}%`
    },
    results: {
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped
    }
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Console summary
  console.log('\n' + '═'.repeat(50));
  console.log(colors.bold('\n📊 FINAL TEST SUMMARY'));
  console.log('─'.repeat(50));
  
  console.log(`\n${colors.dim('Duration:')} ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`${colors.dim('Total Tests:')} ${results.total}`);
  console.log(`${colors.green('Passed:')} ${results.passed.length}`);
  console.log(`${colors.red('Failed:')} ${results.failed.length}`);
  console.log(`${colors.yellow('Skipped:')} ${results.skipped.length}`);
  console.log(`${colors.dim('Success Rate:')} ${(results.passed.length / results.total * 100).toFixed(1)}%`);
  
  if (results.failed.length > 0) {
    console.log(colors.red('\n❌ Failed Tests:'));
    results.failed.forEach(test => {
      const criticalTag = test.critical ? colors.red(' [CRITICAL]') : '';
      console.log(`  - ${test.name}${criticalTag}`);
    });
  }
  
  console.log(colors.blue(`\n📄 Detailed report: ${reportPath}`));
  
  // Recommendations
  if (results.failed.length > 0) {
    console.log(colors.yellow('\n💡 Recommendations:'));
    
    if (results.failed.some(t => t.name.includes('3D Model'))) {
      console.log('  - Run: npm run verify:models');
      console.log('  - Run: npm run optimize:dragon');
    }
    
    if (results.failed.some(t => t.name.includes('API'))) {
      console.log('  - Check backend connectivity');
      console.log('  - Verify environment variables');
    }
    
    if (results.failed.some(t => t.name.includes('Build'))) {
      console.log('  - Clear cache: rm -rf .next dist');
      console.log('  - Reinstall: rm -rf node_modules && npm install');
    }
  }
  
  // Exit status
  const hasCriticalFailures = results.failed.some(t => t.critical);
  const exitCode = hasCriticalFailures ? 1 : 0;
  
  if (exitCode === 0) {
    console.log(colors.green('\n✅ All critical tests passed!'));
  } else {
    console.log(colors.red('\n❌ Critical tests failed!'));
  }
  
  return exitCode;
}

// Main execution
async function main() {
  const mode = process.argv[2] || 'quick';
  const suites = testSuites[mode];
  
  if (!suites) {
    console.log(colors.red(`Unknown test mode: ${mode}`));
    console.log('\nAvailable modes:');
    console.log('  - quick: Fast validation tests');
    console.log('  - full: Comprehensive test suite');
    console.log('  - production: Production deployment tests');
    console.log('  - ci: Continuous integration tests');
    console.log('\nUsage: npm run test:<mode>');
    process.exit(1);
  }
  
  console.log(colors.bold(`\n🧪 Seiron Test Runner - ${mode.toUpperCase()} mode`));
  console.log(colors.blue(`Running ${suites.length} test suites...`));
  console.log('═'.repeat(50));
  
  results.total = suites.length;
  
  // Run tests sequentially
  for (const test of suites) {
    const shouldContinue = await runTest(test);
    if (!shouldContinue) {
      console.log(colors.red('\n⛔ Critical test failed - stopping test run'));
      break;
    }
  }
  
  // Generate report and exit
  const exitCode = generateReport();
  process.exit(exitCode);
}

// Handle interrupts
process.on('SIGINT', () => {
  console.log(colors.yellow('\n\n⚠️  Test run interrupted'));
  generateReport();
  process.exit(1);
});

// Run main
main().catch(error => {
  console.error(colors.red('\n❌ Test runner error:'), error);
  process.exit(1);
});