/**
 * Supabase Integration Test Results Processor
 * Post-processes test results for enhanced reporting
 */

const path = require('path');
const { promises: fs } = require('fs');

module.exports = async (results) => {
  try {
    console.log('📊 Processing Supabase integration test results...');
    
    // Extract key metrics
    const summary = {
      testSuite: 'Supabase Integration Tests',
      timestamp: new Date().toISOString(),
      numTotalTests: results.numTotalTests,
      numPassedTests: results.numPassedTests,
      numFailedTests: results.numFailedTests,
      numPendingTests: results.numPendingTests,
      testResults: results.testResults.map(testFile => ({
        testFilePath: testFile.testFilePath,
        numPassingTests: testFile.numPassingTests,
        numFailingTests: testFile.numFailingTests,
        numPendingTests: testFile.numPendingTests,
        numTodoTests: testFile.numTodoTests,
        perfStats: testFile.perfStats,
        failureMessage: testFile.failureMessage,
        testResults: testFile.assertionResults?.map(assertion => ({
          ancestorTitles: assertion.ancestorTitles,
          title: assertion.title,
          status: assertion.status,
          duration: assertion.duration,
          failureMessages: assertion.failureMessages,
          location: assertion.location
        })) || []
      })),
      coverageMap: results.coverageMap,
      success: results.success,
      startTime: results.startTime,
      endTime: Date.now(),
      runTime: Date.now() - results.startTime
    };
    
    // Calculate additional metrics
    summary.successRate = summary.numTotalTests > 0 
      ? (summary.numPassedTests / summary.numTotalTests * 100).toFixed(2)
      : 0;
    
    // Categorize test files by Supabase functionality
    summary.categoryStats = {
      serviceTests: 0,
      apiTests: 0,
      realtimeTests: 0,
      securityTests: 0,
      errorHandlingTests: 0
    };
    
    summary.testResults.forEach(testFile => {
      const fileName = path.basename(testFile.testFilePath);
      if (fileName.includes('SupabaseService')) {
        summary.categoryStats.serviceTests += testFile.numPassingTests;
      } else if (fileName.includes('chat.supabase')) {
        summary.categoryStats.apiTests += testFile.numPassingTests;
      } else if (fileName.includes('realtime')) {
        summary.categoryStats.realtimeTests += testFile.numPassingTests;
      } else if (fileName.includes('security')) {
        summary.categoryStats.securityTests += testFile.numPassingTests;
      } else if (fileName.includes('error-handling')) {
        summary.categoryStats.errorHandlingTests += testFile.numPassingTests;
      }
    });
    
    // Save detailed results
    const resultsDir = path.join(process.cwd(), 'test-results', 'supabase-integration');
    await fs.mkdir(resultsDir, { recursive: true });
    
    const detailedResultsPath = path.join(resultsDir, 'detailed-results.json');
    await fs.writeFile(detailedResultsPath, JSON.stringify(summary, null, 2));
    
    // Generate summary report
    const summaryPath = path.join(resultsDir, 'summary.json');
    const briefSummary = {
      testSuite: summary.testSuite,
      timestamp: summary.timestamp,
      totalTests: summary.numTotalTests,
      passed: summary.numPassedTests,
      failed: summary.numFailedTests,
      pending: summary.numPendingTests,
      successRate: summary.successRate,
      runTime: summary.runTime,
      categories: summary.categoryStats,
      success: summary.success
    };
    
    await fs.writeFile(summaryPath, JSON.stringify(briefSummary, null, 2));
    
    // Console output
    console.log('\n🏆 SUPABASE INTEGRATION TEST RESULTS');
    console.log('====================================');
    console.log(`Total Tests: ${summary.numTotalTests}`);
    console.log(`Passed: ${summary.numPassedTests} ✅`);
    console.log(`Failed: ${summary.numFailedTests} ❌`);
    console.log(`Pending: ${summary.numPendingTests} ⏳`);
    console.log(`Success Rate: ${summary.successRate}%`);
    console.log(`Runtime: ${summary.runTime}ms`);
    
    console.log('\n📋 BY CATEGORY');
    console.log('===============');
    console.log(`Service Tests: ${summary.categoryStats.serviceTests}`);
    console.log(`API Tests: ${summary.categoryStats.apiTests}`);
    console.log(`Real-time Tests: ${summary.categoryStats.realtimeTests}`);
    console.log(`Security Tests: ${summary.categoryStats.securityTests}`);
    console.log(`Error Handling Tests: ${summary.categoryStats.errorHandlingTests}`);
    
    if (summary.numFailedTests > 0) {
      console.log('\n❌ FAILED TESTS');
      console.log('================');
      summary.testResults.forEach(testFile => {
        const failedTests = testFile.testResults.filter(test => test.status === 'failed');
        if (failedTests.length > 0) {
          console.log(`\n📁 ${path.basename(testFile.testFilePath)}`);
          failedTests.forEach(test => {
            console.log(`   ❌ ${test.ancestorTitles.join(' › ')} › ${test.title}`);
            if (test.failureMessages && test.failureMessages[0]) {
              const shortMessage = test.failureMessages[0].split('\n')[0];
              console.log(`      └─ ${shortMessage}`);
            }
          });
        }
      });
    }
    
    console.log(`\n📄 Detailed results saved to: ${detailedResultsPath}`);
    console.log(`📄 Summary saved to: ${summaryPath}`);
    
  } catch (error) {
    console.error('❌ Error processing test results:', error);
  }
  
  return results;
};