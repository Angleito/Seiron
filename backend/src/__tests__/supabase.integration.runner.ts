/**
 * Supabase Integration Test Runner
 * Orchestrates all Supabase integration tests with proper setup and teardown
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

interface TestSuite {
  name: string;
  file: string;
  description: string;
  dependencies: string[];
}

const TEST_SUITES: TestSuite[] = [
  {
    name: 'SupabaseService',
    file: 'SupabaseService.integration.test.ts',
    description: 'Core Supabase service functionality',
    dependencies: []
  },
  {
    name: 'ChatSupabase',
    file: '../routes/__tests__/chat.supabase.integration.test.ts',
    description: 'Chat API with Supabase integration',
    dependencies: ['SupabaseService']
  },
  {
    name: 'RealtimeSupabase',
    file: 'realtime.supabase.integration.test.ts',
    description: 'Real-time subscriptions and WebSocket functionality',
    dependencies: ['SupabaseService']
  },
  {
    name: 'SecuritySupabase',
    file: 'security.supabase.integration.test.ts',
    description: 'Security, RLS policies, and access controls',
    dependencies: ['SupabaseService']
  },
  {
    name: 'ErrorHandlingSupabase',
    file: 'error-handling.supabase.integration.test.ts',
    description: 'Error handling and edge cases',
    dependencies: ['SupabaseService']
  }
];

class SupabaseIntegrationTestRunner {
  private results: Map<string, any> = new Map();
  private startTime: number = 0;

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Supabase Integration Test Suite');
    console.log('===============================================\n');
    
    this.startTime = Date.now();
    
    try {
      await this.setupTestEnvironment();
      await this.runTestSuites();
      await this.generateReport();
    } catch (error) {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  private async setupTestEnvironment(): Promise<void> {
    console.log('🔧 Setting up test environment...');
    
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    
    // Create test output directory
    const outputDir = path.join(process.cwd(), 'test-results', 'supabase-integration');
    await fs.mkdir(outputDir, { recursive: true });
    
    console.log('✅ Test environment ready\n');
  }

  private async runTestSuites(): Promise<void> {
    console.log('🧪 Running test suites...\n');
    
    for (const suite of TEST_SUITES) {
      await this.runTestSuite(suite);
    }
  }

  private async runTestSuite(suite: TestSuite): Promise<void> {
    console.log(`📋 Running ${suite.name}: ${suite.description}`);
    
    const startTime = Date.now();
    
    try {
      const result = await this.executeJestTest(suite.file);
      const duration = Date.now() - startTime;
      
      this.results.set(suite.name, {
        ...result,
        duration,
        success: result.exitCode === 0
      });
      
      if (result.exitCode === 0) {
        console.log(`✅ ${suite.name} passed (${duration}ms)`);
      } else {
        console.log(`❌ ${suite.name} failed (${duration}ms)`);
        console.log(`   Error: ${result.stderr}`);
      }
    } catch (error) {
      console.log(`💥 ${suite.name} crashed: ${error}`);
      this.results.set(suite.name, {
        success: false,
        error: (error as Error).message,
        duration: Date.now() - startTime
      });
    }
    
    console.log(''); // Empty line for readability
  }

  private executeJestTest(testFile: string): Promise<any> {
    return new Promise((resolve) => {
      const testPath = path.join(__dirname, testFile);
      const jest = spawn('npx', ['jest', testPath, '--verbose', '--json'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });
      
      let stdout = '';
      let stderr = '';
      
      jest.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      jest.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      jest.on('close', (exitCode) => {
        let jsonOutput = null;
        
        try {
          // Extract JSON from Jest output
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonOutput = JSON.parse(jsonMatch[0]);
          }
        } catch (error) {
          // Fallback if JSON parsing fails
        }
        
        resolve({
          exitCode,
          stdout,
          stderr,
          jsonOutput
        });
      });
    });
  }

  private async generateReport(): Promise<void> {
    console.log('📊 Generating test report...\n');
    
    const totalDuration = Date.now() - this.startTime;
    const totalTests = this.results.size;
    const passedTests = Array.from(this.results.values()).filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    // Console report
    console.log('🏆 SUPABASE INTEGRATION TEST RESULTS');
    console.log('=====================================');
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Total Suites: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);
    
    // Detailed results
    console.log('📋 DETAILED RESULTS');
    console.log('===================');
    
    for (const [suiteName, result] of this.results.entries()) {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${suiteName}: ${result.duration}ms`);
      
      if (!result.success && result.jsonOutput) {
        const failedTests = result.jsonOutput.testResults?.[0]?.assertionResults?.filter(
          (test: any) => test.status === 'failed'
        ) || [];
        
        failedTests.forEach((test: any) => {
          console.log(`   └─ ${test.title}: ${test.failureMessages?.[0] || 'Unknown error'}`);
        });
      }
    }
    
    // Generate JSON report
    const jsonReport = {
      summary: {
        totalDuration,
        totalTests,
        passedTests,
        failedTests,
        successRate: (passedTests / totalTests) * 100,
        timestamp: new Date().toISOString()
      },
      suites: Object.fromEntries(this.results.entries()),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        supabaseUrl: process.env.SUPABASE_URL,
        testRunner: 'Jest',
        platform: process.platform
      }
    };
    
    const reportPath = path.join(process.cwd(), 'test-results', 'supabase-integration', 'report.json');
    await fs.writeFile(reportPath, JSON.stringify(jsonReport, null, 2));
    
    console.log(`\n📄 JSON report saved: ${reportPath}`);
    
    // Generate HTML report if possible
    try {
      await this.generateHtmlReport(jsonReport);
    } catch (error) {
      console.log('⚠️  Could not generate HTML report:', (error as Error).message);
    }
  }

  private async generateHtmlReport(jsonReport: any): Promise<void> {
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Supabase Integration Test Report</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0; 
            padding: 20px; 
            background: #f5f5f5; 
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 8px; 
            padding: 30px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
        }
        .header { 
            border-bottom: 2px solid #e1e5e9; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
        }
        .summary { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            margin: 20px 0; 
        }
        .metric { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 6px; 
            text-align: center; 
        }
        .metric-value { 
            font-size: 2em; 
            font-weight: bold; 
            color: #28a745; 
        }
        .metric-value.failed { 
            color: #dc3545; 
        }
        .suite { 
            border: 1px solid #e1e5e9; 
            border-radius: 6px; 
            margin: 10px 0; 
            padding: 15px; 
        }
        .suite.passed { 
            border-left: 4px solid #28a745; 
        }
        .suite.failed { 
            border-left: 4px solid #dc3545; 
        }
        .suite-header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
        }
        .status { 
            padding: 4px 8px; 
            border-radius: 4px; 
            font-size: 0.8em; 
            font-weight: bold; 
        }
        .status.passed { 
            background: #d4edda; 
            color: #155724; 
        }
        .status.failed { 
            background: #f8d7da; 
            color: #721c24; 
        }
        .timestamp { 
            color: #6c757d; 
            font-size: 0.9em; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🗄️ Supabase Integration Test Report</h1>
            <p class="timestamp">Generated: ${jsonReport.summary.timestamp}</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <div class="metric-value">${jsonReport.summary.totalTests}</div>
                <div>Total Suites</div>
            </div>
            <div class="metric">
                <div class="metric-value">${jsonReport.summary.passedTests}</div>
                <div>Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value failed">${jsonReport.summary.failedTests}</div>
                <div>Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${jsonReport.summary.successRate.toFixed(1)}%</div>
                <div>Success Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value">${jsonReport.summary.totalDuration}ms</div>
                <div>Total Duration</div>
            </div>
        </div>
        
        <h2>📋 Test Suites</h2>
        ${Object.entries(jsonReport.suites).map(([name, result]: [string, any]) => `
            <div class="suite ${result.success ? 'passed' : 'failed'}">
                <div class="suite-header">
                    <h3>${name}</h3>
                    <div>
                        <span class="status ${result.success ? 'passed' : 'failed'}">
                            ${result.success ? 'PASSED' : 'FAILED'}
                        </span>
                        <span style="margin-left: 10px; color: #6c757d;">${result.duration}ms</span>
                    </div>
                </div>
                ${result.error ? `<p style="color: #dc3545; margin-top: 10px;">Error: ${result.error}</p>` : ''}
            </div>
        `).join('')}
        
        <h2>🔧 Environment</h2>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; font-family: monospace;">
            <div>Node Environment: ${jsonReport.environment.nodeEnv}</div>
            <div>Supabase URL: ${jsonReport.environment.supabaseUrl}</div>
            <div>Test Runner: ${jsonReport.environment.testRunner}</div>
            <div>Platform: ${jsonReport.environment.platform}</div>
        </div>
    </div>
</body>
</html>`;
    
    const htmlPath = path.join(process.cwd(), 'test-results', 'supabase-integration', 'report.html');
    await fs.writeFile(htmlPath, htmlTemplate);
    
    console.log(`📄 HTML report saved: ${htmlPath}`);
  }

  private async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up...');
    
    // Reset environment variables
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('✅ Cleanup complete');
  }
}

// CLI interface
if (require.main === module) {
  const runner = new SupabaseIntegrationTestRunner();
  runner.runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { SupabaseIntegrationTestRunner, TEST_SUITES };