/**
 * Global Teardown for Supabase Integration Tests  
 * Runs once after all tests in the suite
 */

const { promises: fs } = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🧹 Starting global teardown for Supabase integration tests...');
  
  try {
    // Update test state with completion info
    if (global.__TEST_STATE_FILE__) {
      const stateData = await fs.readFile(global.__TEST_STATE_FILE__, 'utf8');
      const state = JSON.parse(stateData);
      
      state.endTime = new Date().toISOString();
      state.duration = new Date().getTime() - new Date(state.startTime).getTime();
      state.completed = true;
      
      await fs.writeFile(global.__TEST_STATE_FILE__, JSON.stringify(state, null, 2));
      
      console.log(`✅ Test suite completed in ${state.duration}ms`);
    }
    
    // Clean up environment variables
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Clear global variables
    delete global.__TEST_RESULTS_DIR__;
    delete global.__TEST_STATE_FILE__;
    
    console.log('✅ Global teardown complete');
    
  } catch (error) {
    console.error('❌ Error during global teardown:', error);
  }
};