import { webGLRecoveryManager } from './webglRecovery';
import { webglDiagnostics } from './webglDiagnostics';

export interface WebGLRecoveryTestResults {
  contextLossSimulated: boolean;
  contextRestored: boolean;
  recoveryTime: number;
  errorCount: number;
  fallbackTriggered: boolean;
  testPassed: boolean;
  error?: string;
}

export class WebGLRecoveryTester {
  private testResults: WebGLRecoveryTestResults = {
    contextLossSimulated: false,
    contextRestored: false,
    recoveryTime: 0,
    errorCount: 0,
    fallbackTriggered: false,
    testPassed: false
  };

  private testStartTime: number = 0;
  private testCanvas: HTMLCanvasElement | null = null;
  private testTimeout: NodeJS.Timeout | null = null;

  /**
   * Run a comprehensive WebGL recovery test
   */
  public async runRecoveryTest(timeoutMs: number = 10000): Promise<WebGLRecoveryTestResults> {
    console.log('[WebGLRecoveryTester] Starting WebGL recovery test...');
    
    // Reset test results
    this.testResults = {
      contextLossSimulated: false,
      contextRestored: false,
      recoveryTime: 0,
      errorCount: 0,
      fallbackTriggered: false,
      testPassed: false
    };

    try {
      // Create test canvas
      this.testCanvas = document.createElement('canvas');
      this.testCanvas.width = 256;
      this.testCanvas.height = 256;
      this.testCanvas.style.position = 'absolute';
      this.testCanvas.style.top = '-9999px';
      this.testCanvas.style.left = '-9999px';
      document.body.appendChild(this.testCanvas);

      // Initialize recovery system
      webGLRecoveryManager.initializeRecovery(this.testCanvas);

      // Setup event listeners
      this.setupTestEventListeners();

      // Start test timer
      this.testStartTime = Date.now();

      // Set test timeout
      this.testTimeout = setTimeout(() => {
        this.testResults.error = 'Test timeout reached';
        this.finishTest();
      }, timeoutMs);

      // Simulate context loss
      await this.simulateContextLoss();

      // Wait for test completion
      return new Promise<WebGLRecoveryTestResults>((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.testResults.testPassed || this.testResults.error) {
            clearInterval(checkInterval);
            resolve(this.testResults);
          }
        }, 100);
      });

    } catch (error) {
      this.testResults.error = error instanceof Error ? error.message : 'Unknown error';
      this.finishTest();
      return this.testResults;
    }
  }

  /**
   * Setup event listeners for test
   */
  private setupTestEventListeners(): void {
    webGLRecoveryManager.on('contextLost', () => {
      console.log('[WebGLRecoveryTester] Context lost event received');
      this.testResults.contextLossSimulated = true;
    });

    webGLRecoveryManager.on('contextRestored', () => {
      console.log('[WebGLRecoveryTester] Context restored event received');
      this.testResults.contextRestored = true;
      this.testResults.recoveryTime = Date.now() - this.testStartTime;
      this.testResults.testPassed = true;
      this.finishTest();
    });

    webGLRecoveryManager.on('recoveryFailed', () => {
      console.log('[WebGLRecoveryTester] Recovery failed event received');
      this.testResults.error = 'Recovery failed';
      this.finishTest();
    });

    webGLRecoveryManager.on('fallback', () => {
      console.log('[WebGLRecoveryTester] Fallback event received');
      this.testResults.fallbackTriggered = true;
      this.finishTest();
    });
  }

  /**
   * Simulate WebGL context loss
   */
  private async simulateContextLoss(): Promise<void> {
    try {
      console.log('[WebGLRecoveryTester] Simulating context loss...');
      
      // Wait a bit to ensure everything is initialized
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Simulate context loss
      webGLRecoveryManager.simulateContextLoss();
      
      console.log('[WebGLRecoveryTester] Context loss simulation triggered');
      
    } catch (error) {
      this.testResults.error = `Failed to simulate context loss: ${error}`;
      this.finishTest();
    }
  }

  /**
   * Finish test and cleanup
   */
  private finishTest(): void {
    // Clear timeout
    if (this.testTimeout) {
      clearTimeout(this.testTimeout);
      this.testTimeout = null;
    }

    // Get final diagnostics
    const diagnostics = webGLRecoveryManager.getDiagnostics();
    this.testResults.errorCount = diagnostics.failedRecoveries;

    // Cleanup test canvas
    if (this.testCanvas && this.testCanvas.parentNode) {
      this.testCanvas.parentNode.removeChild(this.testCanvas);
      this.testCanvas = null;
    }

    // Remove event listeners
    webGLRecoveryManager.removeAllListeners();

    console.log('[WebGLRecoveryTester] Test completed:', this.testResults);
  }

  /**
   * Run a stress test with multiple context losses
   */
  public async runStressTest(iterations: number = 5): Promise<WebGLRecoveryTestResults[]> {
    console.log(`[WebGLRecoveryTester] Starting stress test with ${iterations} iterations...`);
    
    const results: WebGLRecoveryTestResults[] = [];
    
    for (let i = 0; i < iterations; i++) {
      console.log(`[WebGLRecoveryTester] Stress test iteration ${i + 1}/${iterations}`);
      
      // Wait between iterations
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const result = await this.runRecoveryTest(5000);
      results.push(result);
      
      // Stop if test fails
      if (!result.testPassed && !result.fallbackTriggered) {
        break;
      }
    }
    
    return results;
  }

  /**
   * Generate test report
   */
  public generateTestReport(results: WebGLRecoveryTestResults[]): string {
    const passedTests = results.filter(r => r.testPassed).length;
    const failedTests = results.filter(r => r.error && !r.fallbackTriggered).length;
    const fallbackTests = results.filter(r => r.fallbackTriggered).length;
    
    const averageRecoveryTime = results
      .filter(r => r.testPassed && r.recoveryTime > 0)
      .reduce((sum, r) => sum + r.recoveryTime, 0) / Math.max(passedTests, 1);
    
    const diagnostics = webglDiagnostics.getContextLossStats();
    
    return `
WebGL Recovery Test Report
=========================
Generated: ${new Date().toISOString()}

Test Summary:
- Total Tests: ${results.length}
- Passed: ${passedTests}
- Failed: ${failedTests}
- Fallback Triggered: ${fallbackTests}
- Success Rate: ${((passedTests / results.length) * 100).toFixed(1)}%

Performance Metrics:
- Average Recovery Time: ${averageRecoveryTime.toFixed(2)}ms
- Context Loss Count: ${diagnostics.totalLosses}
- Recovery Rate: ${(diagnostics.recoveryRate * 100).toFixed(1)}%

Individual Test Results:
${results.map((result, index) => `
Test ${index + 1}:
  - Context Loss Simulated: ${result.contextLossSimulated ? '✅' : '❌'}
  - Context Restored: ${result.contextRestored ? '✅' : '❌'}
  - Recovery Time: ${result.recoveryTime}ms
  - Fallback Triggered: ${result.fallbackTriggered ? '⚠️' : '✅'}
  - Error: ${result.error || 'None'}
`).join('')}

Diagnostics:
${webglDiagnostics.generateReport()}
`;
  }
}

// Export singleton instance
export const webGLRecoveryTester = new WebGLRecoveryTester();

// Utility functions for testing
export const testWebGLRecovery = async (timeoutMs?: number): Promise<WebGLRecoveryTestResults> => {
  return webGLRecoveryTester.runRecoveryTest(timeoutMs);
};

export const stressTestWebGLRecovery = async (iterations?: number): Promise<WebGLRecoveryTestResults[]> => {
  return webGLRecoveryTester.runStressTest(iterations);
};

export const generateWebGLTestReport = (results: WebGLRecoveryTestResults[]): string => {
  return webGLRecoveryTester.generateTestReport(results);
};