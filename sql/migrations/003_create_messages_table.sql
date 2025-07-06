-- Migration: Create Messages Table
-- Description: Creates the messages table to store individual chat messages
-- Date: 2025-07-05

BEGIN;

-- Create message role enum
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role message_role NOT NULL,
    content TEXT NOT NULL,
    crypto_context JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional fields for enhanced functionality
    parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    message_index INTEGER NOT NULL DEFAULT 0,
    is_edited BOOLEAN DEFAULT false,
    original_content TEXT,
    
    -- Token usage tracking for AI responses
    token_usage JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT messages_content_check CHECK (LENGTH(content) >= 1),
    CONSTRAINT messages_crypto_context_check CHECK (
        crypto_context IS NULL OR jsonb_typeof(crypto_context) = 'object'
    ),
    CONSTRAINT messages_metadata_check CHECK (
        metadata IS NULL OR jsonb_typeof(metadata) = 'object'
    ),
    CONSTRAINT messages_token_usage_check CHECK (
        token_usage IS NULL OR jsonb_typeof(token_usage) = 'object'
    ),
    CONSTRAINT messages_session_user_consistency CHECK (
        session_id IN (
            SELECT id FROM chat_sessions cs WHERE cs.user_id = messages.user_id
        )
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_session_created ON messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_parent_message_id ON messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_message_index ON messages(session_id, message_index);

-- Create GIN indexes for JSONB queries
CREATE INDEX IF NOT EXISTS idx_messages_crypto_context ON messages USING GIN(crypto_context);
CREATE INDEX IF NOT EXISTS idx_messages_metadata ON messages USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_messages_token_usage ON messages USING GIN(token_usage);

-- Create full-text search index on content
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON messages USING GIN(to_tsvector('english', content));

-- Create composite index for efficient session message retrieval
CREATE INDEX IF NOT EXISTS idx_messages_session_order ON messages(session_id, message_index, created_at);

-- Create function to automatically set message_index
CREATE OR REPLACE FUNCTION set_message_index()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.message_index = 0 THEN
        SELECT COALESCE(MAX(message_index), 0) + 1
        INTO NEW.message_index
        FROM messages
        WHERE session_id = NEW.session_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for message_index
CREATE TRIGGER set_message_index_trigger
    BEFORE INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION set_message_index();

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only access messages in their own sessions
CREATE POLICY messages_own_data ON messages
    FOR ALL
    TO authenticated
    USING (
        session_id IN (
            SELECT cs.id FROM chat_sessions cs
            JOIN users u ON cs.user_id = u.id
            WHERE u.wallet_address = current_setting('app.current_user_wallet', true)
        )
    )
    WITH CHECK (
        session_id IN (
            SELECT cs.id FROM chat_sessions cs
            JOIN users u ON cs.user_id = u.id
            WHERE u.wallet_address = current_setting('app.current_user_wallet', true)
        )
    );

-- Create policy for service role (backend operations)
CREATE POLICY messages_service_role ON messages
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;
GRANT ALL ON messages TO service_role;

-- Create function to get message thread
CREATE OR REPLACE FUNCTION get_message_thread(message_uuid UUID)
RETURNS TABLE(
    id UUID,
    session_id UUID,
    user_id UUID,
    role message_role,
    content TEXT,
    crypto_context JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    parent_message_id UUID,
    message_index INTEGER,
    depth INTEGER
) AS $$
WITH RECURSIVE message_thread AS (
    -- Base case: start with the specified message
    SELECT m.id, m.session_id, m.user_id, m.role, m.content, m.crypto_context, 
           m.metadata, m.created_at, m.parent_message_id, m.message_index, 0 as depth
    FROM messages m
    WHERE m.id = message_uuid
    
    UNION ALL
    
    -- Recursive case: find parent messages
    SELECT m.id, m.session_id, m.user_id, m.role, m.content, m.crypto_context,
           m.metadata, m.created_at, m.parent_message_id, m.message_index, mt.depth + 1
    FROM messages m
    JOIN message_thread mt ON m.id = mt.parent_message_id
)
SELECT * FROM message_thread ORDER BY depth DESC, message_index;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE messages IS 'Stores individual chat messages with crypto context and metadata';
COMMENT ON COLUMN messages.id IS 'UUID primary key for the message';
COMMENT ON COLUMN messages.session_id IS 'Foreign key reference to the chat session';
COMMENT ON COLUMN messages.user_id IS 'Foreign key reference to the user who owns this message';
COMMENT ON COLUMN messages.role IS 'Role of the message sender (user, assistant, system)';
COMMENT ON COLUMN messages.content IS 'The actual message content';
COMMENT ON COLUMN messages.crypto_context IS 'Cryptocurrency-related context data in JSON format';
COMMENT ON COLUMN messages.metadata IS 'Additional message metadata in JSON format';
COMMENT ON COLUMN messages.created_at IS 'Timestamp when the message was created';
COMMENT ON COLUMN messages.parent_message_id IS 'Reference to parent message for threading';
COMMENT ON COLUMN messages.message_index IS 'Sequential index within the session';
COMMENT ON COLUMN messages.is_edited IS 'Whether the message has been edited';
COMMENT ON COLUMN messages.original_content IS 'Original content before editing';
COMMENT ON COLUMN messages.token_usage IS 'Token usage statistics for AI responses';

COMMIT;