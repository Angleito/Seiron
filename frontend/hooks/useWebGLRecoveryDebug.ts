import { useCallback, useEffect, useState } from 'react';
import { webGLRecoveryManager } from '../utils/webglRecovery';
import { webglDiagnostics } from '../utils/webglDiagnostics';
import { 
  webGLRecoveryTester, 
  testWebGLRecovery, 
  stressTestWebGLRecovery,
  generateWebGLTestReport,
  WebGLRecoveryTestResults
} from '../utils/webglRecoveryTest';

export interface WebGLRecoveryDebugState {
  isTestRunning: boolean;
  testResults: WebGLRecoveryTestResults[];
  diagnostics: ReturnType<typeof webglDiagnostics.getContextLossStats>;
  lastTestReport: string;
}

/**
 * Debug hook for WebGL recovery testing and monitoring
 */
export function useWebGLRecoveryDebug() {
  const [state, setState] = useState<WebGLRecoveryDebugState>({
    isTestRunning: false,
    testResults: [],
    diagnostics: {
      totalLosses: 0,
      recoveredLosses: 0,
      recoveryRate: 0,
      averageRecoveryTime: 0,
      recentLosses: []
    },
    lastTestReport: ''
  });

  // Update diagnostics periodically
  useEffect(() => {
    const updateDiagnostics = () => {
      try {
        const diagnostics = webglDiagnostics.getContextLossStats();
        setState(prev => ({ ...prev, diagnostics }));
      } catch (error) {
        console.warn('Failed to update WebGL diagnostics:', error);
      }
    };

    updateDiagnostics();
    const interval = setInterval(updateDiagnostics, 5000);

    return () => clearInterval(interval);
  }, []);

  // Simulate context loss for testing
  const simulateContextLoss = useCallback(() => {
    console.log('🔴 Simulating WebGL context loss...');
    webGLRecoveryManager.simulateContextLoss();
  }, []);

  // Run single recovery test
  const runTest = useCallback(async (timeoutMs: number = 10000) => {
    if (state.isTestRunning) return;
    
    setState(prev => ({ ...prev, isTestRunning: true }));
    
    try {
      console.log('🧪 Running WebGL recovery test...');
      const result = await testWebGLRecovery(timeoutMs);
      
      setState(prev => ({
        ...prev,
        isTestRunning: false,
        testResults: [...prev.testResults, result],
        lastTestReport: generateWebGLTestReport([result])
      }));
      
      return result;
    } catch (error) {
      console.error('Test failed:', error);
      setState(prev => ({ ...prev, isTestRunning: false }));
      throw error;
    }
  }, [state.isTestRunning]);

  // Run stress test
  const runStressTest = useCallback(async (iterations: number = 5) => {
    if (state.isTestRunning) return;
    
    setState(prev => ({ ...prev, isTestRunning: true }));
    
    try {
      console.log(`🏃 Running WebGL stress test with ${iterations} iterations...`);
      const results = await stressTestWebGLRecovery(iterations);
      
      setState(prev => ({
        ...prev,
        isTestRunning: false,
        testResults: [...prev.testResults, ...results],
        lastTestReport: generateWebGLTestReport(results)
      }));
      
      return results;
    } catch (error) {
      console.error('Stress test failed:', error);
      setState(prev => ({ ...prev, isTestRunning: false }));
      throw error;
    }
  }, [state.isTestRunning]);

  // Clear test results
  const clearTestResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      testResults: [],
      lastTestReport: ''
    }));
  }, []);

  // Reset diagnostics
  const resetDiagnostics = useCallback(() => {
    webglDiagnostics.reset();
    webGLRecoveryManager.resetDiagnostics();
    setState(prev => ({
      ...prev,
      diagnostics: {
        totalLosses: 0,
        recoveredLosses: 0,
        recoveryRate: 0,
        averageRecoveryTime: 0,
        recentLosses: []
      }
    }));
  }, []);

  // Get full diagnostic report
  const getDiagnosticReport = useCallback(() => {
    return webglDiagnostics.generateReport();
  }, []);

  // Development utilities (only available in development mode)
  const devUtils = process.env.NODE_ENV === 'development' ? {
    // Add debug methods to window for console testing
    exposeToWindow: () => {
      (window as any).webglDebug = {
        simulateContextLoss,
        runTest,
        runStressTest,
        clearTestResults,
        resetDiagnostics,
        getDiagnosticReport,
        getState: () => state
      };
      console.log('🔧 WebGL debug utilities exposed to window.webglDebug');
    },
    
    // Auto-run tests on page load
    autoTest: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('🚀 Auto-running WebGL recovery test...');
      await runTest();
    }
  } : {};

  return {
    ...state,
    simulateContextLoss,
    runTest,
    runStressTest,
    clearTestResults,
    resetDiagnostics,
    getDiagnosticReport,
    ...devUtils
  };
}

// Auto-expose debug utilities in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Expose utilities after a short delay to ensure everything is loaded
  setTimeout(() => {
    const debug = {
      simulateContextLoss: () => webGLRecoveryManager.simulateContextLoss(),
      runTest: () => testWebGLRecovery(),
      runStressTest: (iterations = 5) => stressTestWebGLRecovery(iterations),
      getDiagnostics: () => webglDiagnostics.getContextLossStats(),
      getReport: () => webglDiagnostics.generateReport(),
      reset: () => {
        webglDiagnostics.reset();
        webGLRecoveryManager.resetDiagnostics();
      }
    };
    
    (window as any).webglDebug = debug;
    console.log('🔧 WebGL debug utilities available at window.webglDebug');
    console.log('Available methods:', Object.keys(debug));
  }, 2000);
}