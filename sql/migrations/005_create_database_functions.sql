-- Migration: Create Database Utility Functions
-- Description: Creates utility functions for the Seiron crypto DApp
-- Date: 2025-07-05

BEGIN;

-- Create function to set current user wallet for RLS
CREATE OR REPLACE FUNCTION set_current_user_wallet(wallet_addr TEXT)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_wallet', wallet_addr, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user by wallet address
CREATE OR REPLACE FUNCTION get_user_by_wallet(wallet_addr TEXT)
RETURNS TABLE(
    id UUID,
    wallet_address TEXT,
    username TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.wallet_address, u.username, u.created_at, u.updated_at
    FROM users u
    WHERE u.wallet_address = wallet_addr;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get or create user
CREATE OR REPLACE FUNCTION get_or_create_user(wallet_addr TEXT, user_name TEXT DEFAULT NULL)
RETURNS TABLE(
    id UUID,
    wallet_address TEXT,
    username TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    is_new BOOLEAN
) AS $$
DECLARE
    user_record RECORD;
    user_exists BOOLEAN;
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE users.wallet_address = wallet_addr) INTO user_exists;
    
    IF user_exists THEN
        -- Return existing user
        RETURN QUERY
        SELECT u.id, u.wallet_address, u.username, u.created_at, u.updated_at, FALSE as is_new
        FROM users u
        WHERE u.wallet_address = wallet_addr;
    ELSE
        -- Create new user
        INSERT INTO users (wallet_address, username)
        VALUES (wallet_addr, user_name)
        RETURNING users.id, users.wallet_address, users.username, users.created_at, users.updated_at
        INTO user_record;
        
        RETURN QUERY
        SELECT user_record.id, user_record.wallet_address, user_record.username, 
               user_record.created_at, user_record.updated_at, TRUE as is_new;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user's active sessions
CREATE OR REPLACE FUNCTION get_user_active_sessions(wallet_addr TEXT)
RETURNS TABLE(
    id UUID,
    session_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    message_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT cs.id, cs.session_name, cs.created_at, cs.updated_at,
           COUNT(m.id) as message_count
    FROM chat_sessions cs
    JOIN users u ON cs.user_id = u.id
    LEFT JOIN messages m ON cs.id = m.session_id
    WHERE u.wallet_address = wallet_addr
    AND cs.is_active = true
    GROUP BY cs.id, cs.session_name, cs.created_at, cs.updated_at
    ORDER BY cs.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get session messages with pagination
CREATE OR REPLACE FUNCTION get_session_messages(
    session_uuid UUID,
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    role message_role,
    content TEXT,
    crypto_context JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    message_index INTEGER,
    price_snapshots JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.role,
        m.content,
        m.crypto_context,
        m.metadata,
        m.created_at,
        m.message_index,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', ps.id,
                    'token_symbol', ps.token_symbol,
                    'price', ps.price,
                    'price_usd', ps.price_usd,
                    'timestamp', ps.timestamp,
                    'source', ps.source
                )
            ) FILTER (WHERE ps.id IS NOT NULL),
            '[]'::jsonb
        ) as price_snapshots
    FROM messages m
    LEFT JOIN price_snapshots ps ON m.id = ps.message_id
    WHERE m.session_id = session_uuid
    GROUP BY m.id, m.role, m.content, m.crypto_context, m.metadata, m.created_at, m.message_index
    ORDER BY m.message_index ASC
    LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to search messages by content
CREATE OR REPLACE FUNCTION search_messages(
    wallet_addr TEXT,
    search_query TEXT,
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE(
    id UUID,
    session_id UUID,
    session_name TEXT,
    role message_role,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.session_id,
        cs.session_name,
        m.role,
        m.content,
        m.created_at,
        ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', search_query)) as rank
    FROM messages m
    JOIN chat_sessions cs ON m.session_id = cs.id
    JOIN users u ON cs.user_id = u.id
    WHERE u.wallet_address = wallet_addr
    AND to_tsvector('english', m.content) @@ plainto_tsquery('english', search_query)
    ORDER BY rank DESC, m.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get portfolio summary from messages
CREATE OR REPLACE FUNCTION get_portfolio_summary(
    wallet_addr TEXT,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
    token_symbol TEXT,
    latest_price DECIMAL(20,8),
    price_change_24h DECIMAL(6,4),
    first_mentioned TIMESTAMP WITH TIME ZONE,
    mention_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH token_mentions AS (
        SELECT 
            ps.token_symbol,
            ps.price,
            ps.timestamp,
            m.created_at,
            ROW_NUMBER() OVER (PARTITION BY ps.token_symbol ORDER BY ps.timestamp DESC) as rn
        FROM price_snapshots ps
        JOIN messages m ON ps.message_id = m.id
        JOIN chat_sessions cs ON m.session_id = cs.id
        JOIN users u ON cs.user_id = u.id
        WHERE u.wallet_address = wallet_addr
        AND m.created_at > (CURRENT_TIMESTAMP - INTERVAL '1 day' * days_back)
    )
    SELECT 
        tm.token_symbol,
        tm.price as latest_price,
        calculate_price_change_percentage(
            tm.price,
            LAG(tm.price, 1) OVER (PARTITION BY tm.token_symbol ORDER BY tm.timestamp)
        ) as price_change_24h,
        MIN(tm.created_at) as first_mentioned,
        COUNT(*)::BIGINT as mention_count
    FROM token_mentions tm
    WHERE tm.rn = 1
    GROUP BY tm.token_symbol, tm.price, tm.timestamp
    ORDER BY mention_count DESC, tm.timestamp DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_data(
    days_to_keep INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete old price snapshots first (due to foreign key constraints)
    DELETE FROM price_snapshots
    WHERE timestamp < (CURRENT_TIMESTAMP - INTERVAL '1 day' * days_to_keep);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete old messages
    DELETE FROM messages
    WHERE created_at < (CURRENT_TIMESTAMP - INTERVAL '1 day' * days_to_keep);
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    -- Delete empty chat sessions
    DELETE FROM chat_sessions
    WHERE created_at < (CURRENT_TIMESTAMP - INTERVAL '1 day' * days_to_keep)
    AND id NOT IN (SELECT DISTINCT session_id FROM messages);
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get database statistics
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS TABLE(
    table_name TEXT,
    row_count BIGINT,
    size_bytes BIGINT,
    last_vacuum TIMESTAMP WITH TIME ZONE,
    last_analyze TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        n_tup_ins + n_tup_upd - n_tup_del as row_count,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
        last_vacuum,
        last_analyze
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY size_bytes DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to appropriate roles
GRANT EXECUTE ON FUNCTION set_current_user_wallet(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_by_wallet(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_or_create_user(TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_active_sessions(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_session_messages(UUID, INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION search_messages(TEXT, TEXT, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_portfolio_summary(TEXT, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_data(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_database_stats() TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION set_current_user_wallet(TEXT) IS 'Sets the current user wallet address for RLS policies';
COMMENT ON FUNCTION get_user_by_wallet(TEXT) IS 'Retrieves user information by wallet address';
COMMENT ON FUNCTION get_or_create_user(TEXT, TEXT) IS 'Gets existing user or creates new one by wallet address';
COMMENT ON FUNCTION get_user_active_sessions(TEXT) IS 'Retrieves active chat sessions for a user';
COMMENT ON FUNCTION get_session_messages(UUID, INTEGER, INTEGER) IS 'Retrieves messages for a session with pagination';
COMMENT ON FUNCTION search_messages(TEXT, TEXT, INTEGER) IS 'Searches messages by content using full-text search';
COMMENT ON FUNCTION get_portfolio_summary(TEXT, INTEGER) IS 'Generates portfolio summary from user messages';
COMMENT ON FUNCTION cleanup_old_data(INTEGER) IS 'Removes old data beyond retention period';
COMMENT ON FUNCTION get_database_stats() IS 'Provides database statistics for monitoring';

COMMIT;