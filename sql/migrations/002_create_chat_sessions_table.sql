-- Migration: Create Chat Sessions Table
-- Description: Creates the chat_sessions table to organize user conversations
-- Date: 2025-07-05

BEGIN;

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional fields for enhanced functionality
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT chat_sessions_session_name_check CHECK (
        LENGTH(session_name) >= 1 AND LENGTH(session_name) <= 200
    ),
    CONSTRAINT chat_sessions_metadata_check CHECK (
        metadata IS NULL OR jsonb_typeof(metadata) = 'object'
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_is_active ON chat_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_active ON chat_sessions(user_id, is_active);

-- Create partial index for active sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_active_created ON chat_sessions(user_id, created_at DESC) 
WHERE is_active = true;

-- Create GIN index for metadata JSONB queries
CREATE INDEX IF NOT EXISTS idx_chat_sessions_metadata ON chat_sessions USING GIN(metadata);

-- Create trigger for updated_at
CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only access their own chat sessions
CREATE POLICY chat_sessions_own_data ON chat_sessions
    FOR ALL
    TO authenticated
    USING (
        user_id IN (
            SELECT id FROM users 
            WHERE wallet_address = current_setting('app.current_user_wallet', true)
        )
    )
    WITH CHECK (
        user_id IN (
            SELECT id FROM users 
            WHERE wallet_address = current_setting('app.current_user_wallet', true)
        )
    );

-- Create policy for service role (backend operations)
CREATE POLICY chat_sessions_service_role ON chat_sessions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_sessions TO authenticated;
GRANT ALL ON chat_sessions TO service_role;

-- Add comments for documentation
COMMENT ON TABLE chat_sessions IS 'Stores chat session information for organizing user conversations';
COMMENT ON COLUMN chat_sessions.id IS 'UUID primary key for the chat session';
COMMENT ON COLUMN chat_sessions.user_id IS 'Foreign key reference to the user who owns this session';
COMMENT ON COLUMN chat_sessions.session_name IS 'User-defined name for the chat session';
COMMENT ON COLUMN chat_sessions.is_active IS 'Whether the session is currently active';
COMMENT ON COLUMN chat_sessions.metadata IS 'Additional session metadata in JSON format';
COMMENT ON COLUMN chat_sessions.created_at IS 'Timestamp when the session was created';
COMMENT ON COLUMN chat_sessions.updated_at IS 'Timestamp when the session was last updated';

COMMIT;