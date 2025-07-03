/**
 * High-Performance Load Generator for Sei Agent Kit
 * Supports multiple testing patterns optimized for DeFi protocols
 */

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs').promises;
const path = require('path');

const LoadTestRunner = require('./load-test-runner');
const ProtocolTestRunner = require('./protocol-test-runner');
const PerformanceMetrics = require('./performance-metrics');
const ReportGenerator = require('./report-generator');
const { validateConfig, getDefaultConfig } = require('./config');

const program = new Command();

program
  .name('sei-load-generator')
  .description('High-performance load generator for Sei Agent Kit')
  .version('1.0.0');

program
  .command('load')
  .description('Run comprehensive load tests')
  .option('-c, --config <file>', 'Configuration file path')
  .option('-u, --url <url>', 'Target URL', 'http://localhost:8080')
  .option('--users <number>', 'Concurrent users', '100')
  .option('--duration <seconds>', 'Test duration in seconds', '300')
  .option('--rampup <seconds>', 'Ramp-up time in seconds', '60')
  .option('--scenario <name>', 'Test scenario', 'mixed_workload')
  .option('--output <dir>', 'Output directory', './results')
  .action(async (options) => {
    const spinner = ora('Initializing load tests...').start();
    
    try {
      const config = await loadConfig(options);
      const runner = new LoadTestRunner(config);
      const metrics = new PerformanceMetrics(config);
      
      spinner.text = 'Starting load test execution...';
      
      const results = await runner.runLoadTest({
        scenario: options.scenario,
        duration: parseInt(options.duration),
        users: parseInt(options.users),
        rampUp: parseInt(options.rampup)
      });
      
      spinner.text = 'Generating performance report...';
      
      const report = await new ReportGenerator(config).generate(results);
      await saveResults(options.output, 'load-test', results, report);
      
      spinner.succeed(chalk.green('Load test completed successfully!'));
      
      console.log(chalk.cyan('\n📊 Test Results Summary:'));
      console.log(`   Requests: ${results.totalRequests}`);
      console.log(`   Success Rate: ${(results.successRate * 100).toFixed(2)}%`);
      console.log(`   Average Response Time: ${results.avgResponseTime.toFixed(2)}ms`);
      console.log(`   Throughput: ${results.throughput.toFixed(2)} req/s`);
      console.log(`   95th Percentile: ${results.p95ResponseTime.toFixed(2)}ms`);
      
    } catch (error) {
      spinner.fail(chalk.red('Load test failed!'));
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('stress')
  .description('Run stress tests with increasing load')
  .option('-c, --config <file>', 'Configuration file path')
  .option('-u, --url <url>', 'Target URL', 'http://localhost:8080')
  .option('--max-users <number>', 'Maximum concurrent users', '1000')
  .option('--duration <seconds>', 'Test duration per step', '180')
  .option('--steps <number>', 'Number of load steps', '10')
  .option('--output <dir>', 'Output directory', './results')
  .action(async (options) => {
    const spinner = ora('Initializing stress tests...').start();
    
    try {
      const config = await loadConfig(options);
      const runner = new LoadTestRunner(config);
      
      const stressTest = {
        maxUsers: parseInt(options.maxUsers),
        duration: parseInt(options.duration),
        steps: parseInt(options.steps)
      };
      
      spinner.text = 'Running stress test scenarios...';
      
      const results = await runner.runStressTest(stressTest);
      const report = await new ReportGenerator(config).generate(results);
      
      await saveResults(options.output, 'stress-test', results, report);
      
      spinner.succeed(chalk.green('Stress test completed!'));
      
      // Display stress test results
      console.log(chalk.cyan('\n🔥 Stress Test Results:'));
      results.steps.forEach((step, index) => {
        console.log(`   Step ${index + 1} (${step.users} users):`);
        console.log(`     Success Rate: ${(step.successRate * 100).toFixed(2)}%`);
        console.log(`     Avg Response: ${step.avgResponseTime.toFixed(2)}ms`);
        console.log(`     Throughput: ${step.throughput.toFixed(2)} req/s`);
      });
      
    } catch (error) {
      spinner.fail(chalk.red('Stress test failed!'));
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('protocol')
  .description('Run protocol-specific performance tests')
  .option('-c, --config <file>', 'Configuration file path')
  .option('-u, --url <url>', 'Target URL', 'http://localhost:8080')
  .option('-p, --protocol <name>', 'Protocol to test (symphony|dragonswap|yeifinance|all)', 'all')
  .option('--users <number>', 'Concurrent users', '50')
  .option('--duration <seconds>', 'Test duration', '300')
  .option('--output <dir>', 'Output directory', './results')
  .action(async (options) => {
    const spinner = ora('Initializing protocol tests...').start();
    
    try {
      const config = await loadConfig(options);
      const runner = new ProtocolTestRunner(config);
      
      spinner.text = `Testing ${options.protocol} protocol performance...`;
      
      const results = await runner.runProtocolTest({
        protocol: options.protocol,
        users: parseInt(options.users),
        duration: parseInt(options.duration)
      });
      
      const report = await new ReportGenerator(config).generate(results);
      await saveResults(options.output, `protocol-${options.protocol}`, results, report);
      
      spinner.succeed(chalk.green(`Protocol test for ${options.protocol} completed!`));
      
      // Display protocol-specific results
      console.log(chalk.cyan(`\n⚡ ${options.protocol.toUpperCase()} Protocol Results:`));
      if (results.protocols) {
        Object.entries(results.protocols).forEach(([protocol, metrics]) => {
          console.log(`   ${protocol}:`);
          console.log(`     Response Time: ${metrics.avgResponseTime.toFixed(2)}ms`);
          console.log(`     Success Rate: ${(metrics.successRate * 100).toFixed(2)}%`);
          console.log(`     Throughput: ${metrics.throughput.toFixed(2)} req/s`);
        });
      }
      
    } catch (error) {
      spinner.fail(chalk.red('Protocol test failed!'));
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('endurance')
  .description('Run long-duration endurance tests')
  .option('-c, --config <file>', 'Configuration file path')
  .option('-u, --url <url>', 'Target URL', 'http://localhost:8080')
  .option('--users <number>', 'Concurrent users', '100')
  .option('--duration <hours>', 'Test duration in hours', '2')
  .option('--memory-threshold <mb>', 'Memory leak threshold in MB', '1024')
  .option('--output <dir>', 'Output directory', './results')
  .action(async (options) => {
    const spinner = ora('Initializing endurance test...').start();
    
    try {
      const config = await loadConfig(options);
      const runner = new LoadTestRunner(config);
      
      const enduranceTest = {
        users: parseInt(options.users),
        duration: parseInt(options.duration) * 3600, // Convert to seconds
        memoryThreshold: parseInt(options.memoryThreshold)
      };
      
      spinner.text = 'Running endurance test (this may take several hours)...';
      
      const results = await runner.runEnduranceTest(enduranceTest);
      const report = await new ReportGenerator(config).generate(results);
      
      await saveResults(options.output, 'endurance-test', results, report);
      
      spinner.succeed(chalk.green('Endurance test completed!'));
      
      console.log(chalk.cyan('\n⏱️  Endurance Test Results:'));
      console.log(`   Duration: ${(results.duration / 3600).toFixed(2)} hours`);
      console.log(`   Memory Stability: ${results.memoryStable ? 'STABLE' : 'UNSTABLE'}`);
      console.log(`   Performance Degradation: ${(results.performanceDegradation * 100).toFixed(2)}%`);
      
    } catch (error) {
      spinner.fail(chalk.red('Endurance test failed!'));
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('spike')
  .description('Run spike tests with sudden load increases')
  .option('-c, --config <file>', 'Configuration file path')
  .option('-u, --url <url>', 'Target URL', 'http://localhost:8080')
  .option('--baseline <number>', 'Baseline users', '50')
  .option('--spike <number>', 'Spike users', '500')
  .option('--spike-duration <seconds>', 'Spike duration', '60')
  .option('--total-duration <seconds>', 'Total test duration', '600')
  .option('--output <dir>', 'Output directory', './results')
  .action(async (options) => {
    const spinner = ora('Initializing spike test...').start();
    
    try {
      const config = await loadConfig(options);
      const runner = new LoadTestRunner(config);
      
      const spikeTest = {
        baseline: parseInt(options.baseline),
        spike: parseInt(options.spike),
        spikeDuration: parseInt(options.spikeDuration),
        totalDuration: parseInt(options.totalDuration)
      };
      
      spinner.text = 'Running spike test scenario...';
      
      const results = await runner.runSpikeTest(spikeTest);
      const report = await new ReportGenerator(config).generate(results);
      
      await saveResults(options.output, 'spike-test', results, report);
      
      spinner.succeed(chalk.green('Spike test completed!'));
      
      console.log(chalk.cyan('\n📈 Spike Test Results:'));
      console.log(`   Baseline Performance: ${results.baseline.avgResponseTime.toFixed(2)}ms`);
      console.log(`   Spike Performance: ${results.spike.avgResponseTime.toFixed(2)}ms`);
      console.log(`   Recovery Time: ${results.recoveryTime.toFixed(2)}s`);
      console.log(`   System Stability: ${results.stable ? 'STABLE' : 'UNSTABLE'}`);
      
    } catch (error) {
      spinner.fail(chalk.red('Spike test failed!'));
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('benchmark')
  .description('Run comprehensive performance benchmarks')
  .option('-c, --config <file>', 'Configuration file path')
  .option('-u, --url <url>', 'Target URL', 'http://localhost:8080')
  .option('--suite <name>', 'Benchmark suite (basic|comprehensive|full)', 'comprehensive')
  .option('--output <dir>', 'Output directory', './results')
  .action(async (options) => {
    const spinner = ora('Initializing benchmark suite...').start();
    
    try {
      const config = await loadConfig(options);
      const benchmarkRunner = new LoadTestRunner(config);
      
      spinner.text = 'Running benchmark suite...';
      
      const benchmarks = await benchmarkRunner.runBenchmarkSuite(options.suite);
      const report = await new ReportGenerator(config).generateBenchmarkReport(benchmarks);
      
      await saveResults(options.output, `benchmark-${options.suite}`, benchmarks, report);
      
      spinner.succeed(chalk.green('Benchmark suite completed!'));
      
      console.log(chalk.cyan('\n🏆 Benchmark Results:'));
      Object.entries(benchmarks.results).forEach(([test, results]) => {
        console.log(`   ${test}:`);
        console.log(`     Score: ${results.score.toFixed(2)}`);
        console.log(`     Performance: ${results.performance}`);
      });
      
    } catch (error) {
      spinner.fail(chalk.red('Benchmark failed!'));
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Utility functions
async function loadConfig(options) {
  let config = getDefaultConfig();
  
  if (options.config) {
    try {
      const configFile = await fs.readFile(options.config, 'utf8');
      const userConfig = JSON.parse(configFile);
      config = { ...config, ...userConfig };
    } catch (error) {
      throw new Error(`Failed to load config file: ${error.message}`);
    }
  }
  
  // Override with command line options
  if (options.url) config.target.baseUrl = options.url;
  
  return validateConfig(config);
}

async function saveResults(outputDir, testType, results, report) {
  try {
    await fs.mkdir(outputDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFilename = `${testType}-${timestamp}`;
    
    // Save raw results as JSON
    await fs.writeFile(
      path.join(outputDir, `${baseFilename}-results.json`),
      JSON.stringify(results, null, 2)
    );
    
    // Save formatted report as HTML
    await fs.writeFile(
      path.join(outputDir, `${baseFilename}-report.html`),
      report.html
    );
    
    // Save CSV summary for analysis
    if (report.csv) {
      await fs.writeFile(
        path.join(outputDir, `${baseFilename}-summary.csv`),
        report.csv
      );
    }
    
    console.log(chalk.dim(`\n📁 Results saved to: ${outputDir}`));
    
  } catch (error) {
    console.warn(chalk.yellow(`Warning: Failed to save results: ${error.message}`));
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}