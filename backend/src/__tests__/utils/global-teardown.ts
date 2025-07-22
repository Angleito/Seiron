/**
 * Global Test Teardown
 * Cleans up resources after all tests complete
 */

export default async function globalTeardown() {
  // Clean up any persistent connections
  console.log('Global test teardown starting');
  
  // Give time for any pending async operations to complete
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  console.log('Global test teardown completed');
}