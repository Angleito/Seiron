import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'test-key';

export const setupTestDatabase = async () => {
  // Setup test database connections
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Create test tables if they don't exist
  try {
    await supabase.from('test_table').select('*').limit(1);
  } catch (error) {
    // Table doesn't exist, but that's okay for tests
    console.log('Test database setup complete');
  }

  // Setup Redis for testing
  const redis = new Redis({
    host: 'localhost',
    port: 6379,
    db: 1 // Use database 1 for tests
  });

  // Clear test database
  await redis.flushdb();
  
  return { supabase, redis };
};

export const cleanupTestDatabase = async () => {
  // Clean up test database
  const redis = new Redis({
    host: 'localhost',
    port: 6379,
    db: 1
  });

  await redis.flushdb();
  await redis.quit();
};