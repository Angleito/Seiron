/**
 * Jest global teardown
 * Runs once after all tests
 */

export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');
  
  // Close test server if it exists
  const httpServer = (global as any).__TEST_SERVER__;
  const io = (global as any).__TEST_IO__;
  
  if (io) {
    await new Promise<void>((resolve) => {
      io.close(() => {
        console.log('📡 Test Socket.IO server closed');
        resolve();
      });
    });
  }
  
  if (httpServer) {
    await new Promise<void>((resolve) => {
      httpServer.close(() => {
        console.log('🌐 Test HTTP server closed');
        resolve();
      });
    });
  }
  
  // Clean up global variables
  delete (global as any).__TEST_SERVER__;
  delete (global as any).__TEST_IO__;
  delete (global as any).__TEST_PORT__;
  
  console.log('✅ Test environment cleanup complete');
}