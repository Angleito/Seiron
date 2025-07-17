-- Test Database Initialization Script
-- This script sets up the test database with necessary tables, functions, and test data

BEGIN;

-- ============================================
-- Database Configuration for Testing
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Set up test-specific configurations
-- Note: ALTER SYSTEM commands removed as they cannot run inside transaction blocks
-- These settings are not essential for test database functionality

-- ============================================
-- Create Test Users and Roles
-- ============================================

-- Create service role for backend operations
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role LOGIN PASSWORD 'service_test_password';
    END IF;
END
$$;

-- Create authenticated role for user operations
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated LOGIN PASSWORD 'auth_test_password';
    END IF;
END
$$;

-- Grant necessary permissions
GRANT CONNECT ON DATABASE seiron_test TO service_role;
GRANT CONNECT ON DATABASE seiron_test TO authenticated;

-- ============================================
-- Create Test Schema and Tables
-- ============================================

-- Create test schema for isolated test data
CREATE SCHEMA IF NOT EXISTS test_data;
GRANT USAGE ON SCHEMA test_data TO service_role, authenticated;
GRANT CREATE ON SCHEMA test_data TO service_role;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'image')),
    audio_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    confidence_score FLOAT DEFAULT 1.0
);

-- Create ai_memory table
CREATE TABLE IF NOT EXISTS ai_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    memory_type TEXT NOT NULL CHECK (memory_type IN ('user_preference', 'conversation_context', 'trading_history', 'fact', 'interaction')),
    content JSONB NOT NULL,
    context TEXT,
    importance_score FLOAT DEFAULT 0.5 CHECK (importance_score >= 0 AND importance_score <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create test configuration table
CREATE TABLE IF NOT EXISTS test_data.test_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated ON chat_sessions(updated_at);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
CREATE INDEX IF NOT EXISTS idx_ai_memory_user ON ai_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_memory_type ON ai_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_ai_memory_importance ON ai_memory(importance_score);
CREATE INDEX IF NOT EXISTS idx_ai_memory_expires ON ai_memory(expires_at);

-- Grant permissions on tables
GRANT ALL ON users TO service_role;
GRANT ALL ON chat_sessions TO service_role;
GRANT ALL ON messages TO service_role;
GRANT ALL ON ai_memory TO service_role;
GRANT ALL ON test_data.test_config TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_memory TO authenticated;

-- ============================================
-- Test Utility Functions
-- ============================================

-- Function to clear all test data
CREATE OR REPLACE FUNCTION test_data.clear_all_test_data()
RETURNS void AS $$
BEGIN
    -- Disable triggers to avoid cascading issues
    SET session_replication_role = replica;
    
    -- Clear all tables in dependency order
    TRUNCATE TABLE messages CASCADE;
    TRUNCATE TABLE chat_sessions CASCADE;
    TRUNCATE TABLE ai_memory CASCADE;
    TRUNCATE TABLE users CASCADE;
    
    -- Re-enable triggers
    SET session_replication_role = DEFAULT;
    
    RAISE NOTICE 'All test data cleared successfully';
END;
$$ LANGUAGE plpgsql;

-- Function to seed test data
CREATE OR REPLACE FUNCTION test_data.seed_test_data()
RETURNS void AS $$
DECLARE
    test_user_id UUID;
    test_session_id UUID;
BEGIN
    -- Insert test users
    INSERT INTO users (id, wallet_address, username, created_at)
    VALUES 
        (gen_random_uuid(), '0x1234567890123456789012345678901234567890', 'test_user_1', NOW() - INTERVAL '1 day'),
        (gen_random_uuid(), '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', 'test_user_2', NOW() - INTERVAL '2 hours'),
        (gen_random_uuid(), 'sei1testaddress123456789012345678901234567', 'test_user_sei', NOW() - INTERVAL '30 minutes');

    -- Get the first test user ID for sessions
    SELECT id INTO test_user_id FROM users WHERE username = 'test_user_1' LIMIT 1;

    -- Insert test chat sessions
    INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at)
    VALUES 
        (gen_random_uuid(), test_user_id, 'Voice Chat Test Session', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '30 minutes'),
        (gen_random_uuid(), test_user_id, 'AI Memory Test Session', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour');

    -- Get the first test session ID for messages
    SELECT id INTO test_session_id FROM chat_sessions WHERE user_id = test_user_id LIMIT 1;

    -- Insert test messages
    INSERT INTO messages (id, session_id, content, role, created_at, message_type, audio_url)
    VALUES 
        (gen_random_uuid(), test_session_id, 'Hello, I would like to test voice chat functionality', 'user', NOW() - INTERVAL '30 minutes', 'voice', 'http://audio-simulator:8888/test-audio/user-hello.wav'),
        (gen_random_uuid(), test_session_id, 'Welcome to Seiron! I can help you with portfolio management and trading. How can I assist you today?', 'assistant', NOW() - INTERVAL '29 minutes', 'voice', 'http://audio-simulator:8888/test-audio/assistant-welcome.wav'),
        (gen_random_uuid(), test_session_id, 'Can you show me my portfolio balance?', 'user', NOW() - INTERVAL '25 minutes', 'voice', 'http://audio-simulator:8888/test-audio/user-portfolio.wav'),
        (gen_random_uuid(), test_session_id, 'I can help you check your portfolio balance. Let me fetch that information for you.', 'assistant', NOW() - INTERVAL '24 minutes', 'voice', 'http://audio-simulator:8888/test-audio/assistant-portfolio.wav');

    -- Insert test AI memory entries
    INSERT INTO ai_memory (id, user_id, memory_type, content, context, importance_score, created_at, updated_at)
    VALUES 
        (gen_random_uuid(), test_user_id, 'user_preference', '{"trading_style": "conservative", "risk_tolerance": "low", "preferred_assets": ["SEI", "ETH"]}', 'Portfolio preferences from voice conversation', 0.8, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 hour'),
        (gen_random_uuid(), test_user_id, 'conversation_context', '{"last_topic": "portfolio_balance", "session_count": 5, "preferred_communication": "voice"}', 'User communication patterns', 0.6, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '30 minutes'),
        (gen_random_uuid(), test_user_id, 'trading_history', '{"last_trade": "2024-01-15", "trade_type": "buy", "asset": "SEI", "amount": 1000}', 'Recent trading activity for context', 0.7, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day');

    RAISE NOTICE 'Test data seeded successfully';
END;
$$ LANGUAGE plpgsql;

-- Note: Test isolation functions removed due to transaction control limitations
-- SAVEPOINT and ROLLBACK TO SAVEPOINT cannot be used within PL/pgSQL functions
-- These functions would need to be implemented at the application level

-- ============================================
-- Performance Testing Setup
-- ============================================

-- Function to generate load test data
CREATE OR REPLACE FUNCTION test_data.generate_load_test_data(user_count INTEGER DEFAULT 100, session_count INTEGER DEFAULT 500)
RETURNS void AS $$
DECLARE
    i INTEGER;
    j INTEGER;
    test_user_id UUID;
    test_session_id UUID;
BEGIN
    -- Generate test users
    FOR i IN 1..user_count LOOP
        INSERT INTO users (id, wallet_address, username, created_at)
        VALUES (
            gen_random_uuid(),
            '0x' || lpad(to_hex(i), 40, '0'),
            'load_test_user_' || i,
            NOW() - (random() * INTERVAL '30 days')
        );
    END LOOP;

    -- Generate test sessions and messages
    FOR i IN 1..session_count LOOP
        -- Get random user
        SELECT id INTO test_user_id FROM users ORDER BY random() LIMIT 1;
        
        -- Create session
        INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            test_user_id,
            'Load Test Session ' || i,
            NOW() - (random() * INTERVAL '7 days'),
            NOW() - (random() * INTERVAL '1 day')
        ) RETURNING id INTO test_session_id;

        -- Create messages for this session
        FOR j IN 1..(1 + floor(random() * 10)::INTEGER) LOOP
            INSERT INTO messages (id, session_id, content, role, created_at, message_type)
            VALUES (
                gen_random_uuid(),
                test_session_id,
                'Load test message ' || j || ' for session ' || i,
                CASE WHEN j % 2 = 1 THEN 'user' ELSE 'assistant' END,
                NOW() - (random() * INTERVAL '7 days'),
                CASE WHEN random() > 0.5 THEN 'voice' ELSE 'text' END
            );
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Load test data generated: % users, % sessions', user_count, session_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Grant Permissions to Test Functions
-- ============================================

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA test_data TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA test_data TO authenticated;

-- ============================================
-- Initialize Test Environment
-- ============================================

-- Run initial test data seeding
SELECT test_data.seed_test_data();

-- Create test indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_users_wallet ON users(wallet_address) WHERE username LIKE 'test_%' OR username LIKE 'load_test_%';
CREATE INDEX IF NOT EXISTS idx_test_sessions_user ON chat_sessions(user_id) WHERE title LIKE '%Test%';
CREATE INDEX IF NOT EXISTS idx_test_messages_session ON messages(session_id, created_at) WHERE content LIKE '%test%';

-- Set up test configuration
INSERT INTO test_data.test_config (key, value) 
VALUES 
    ('environment', 'docker_test'),
    ('database_version', '15'),
    ('initialized_at', NOW()::text),
    ('test_data_version', '1.0')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

COMMIT;

-- Final status
DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Test database initialization completed successfully!';
    RAISE NOTICE 'Environment: Docker Test';
    RAISE NOTICE 'Database: seiron_test';
    RAISE NOTICE 'Test functions available in test_data schema';
    RAISE NOTICE '================================================';
END;
$$;