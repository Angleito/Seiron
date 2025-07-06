-- Migration: Create Additional Indexes and Optimization
-- Description: Creates additional indexes and optimizations for the Seiron crypto DApp
-- Date: 2025-07-05

BEGIN;

-- Create additional composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_messages_user_role_created ON messages(user_id, role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_session_role_created ON messages(session_id, role, created_at DESC);

-- Create index for crypto context queries
CREATE INDEX IF NOT EXISTS idx_messages_crypto_context_token ON messages 
USING GIN((crypto_context -> 'tokens'));

-- Create index for metadata queries
CREATE INDEX IF NOT EXISTS idx_messages_metadata_transaction ON messages 
USING GIN((metadata -> 'transaction'));

-- Create index for price snapshots by date ranges
CREATE INDEX IF NOT EXISTS idx_price_snapshots_date_range ON price_snapshots(timestamp)
WHERE timestamp > (CURRENT_TIMESTAMP - INTERVAL '1 year');

-- Create index for active sessions with recent activity
CREATE INDEX IF NOT EXISTS idx_chat_sessions_recent_activity ON chat_sessions(user_id, updated_at DESC)
WHERE is_active = true AND updated_at > (CURRENT_TIMESTAMP - INTERVAL '30 days');

-- Create materialized view for frequently accessed price data
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_latest_prices AS
SELECT DISTINCT ON (token_symbol) 
    token_symbol,
    price,
    price_usd,
    timestamp,
    source,
    price_change_percentage_24h
FROM price_snapshots
ORDER BY token_symbol, timestamp DESC;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_latest_prices_token ON mv_latest_prices(token_symbol);

-- Create materialized view for user activity summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_activity_summary AS
SELECT 
    u.id as user_id,
    u.wallet_address,
    u.username,
    COUNT(DISTINCT cs.id) as total_sessions,
    COUNT(DISTINCT CASE WHEN cs.is_active THEN cs.id END) as active_sessions,
    COUNT(m.id) as total_messages,
    COUNT(DISTINCT ps.token_symbol) as unique_tokens_tracked,
    MAX(m.created_at) as last_message_at,
    MAX(cs.updated_at) as last_session_update
FROM users u
LEFT JOIN chat_sessions cs ON u.id = cs.user_id
LEFT JOIN messages m ON cs.id = m.session_id
LEFT JOIN price_snapshots ps ON m.id = ps.message_id
GROUP BY u.id, u.wallet_address, u.username;

-- Create indexes on user activity summary
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_activity_summary_user_id ON mv_user_activity_summary(user_id);
CREATE INDEX IF NOT EXISTS idx_mv_user_activity_summary_wallet ON mv_user_activity_summary(wallet_address);
CREATE INDEX IF NOT EXISTS idx_mv_user_activity_summary_last_activity ON mv_user_activity_summary(last_message_at DESC);

-- Create function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_latest_prices;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_activity_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to auto-refresh materialized views
CREATE OR REPLACE FUNCTION auto_refresh_materialized_views()
RETURNS TRIGGER AS $$
BEGIN
    -- Only refresh if enough time has passed (5 minutes)
    IF NOT EXISTS (
        SELECT 1 FROM pg_stat_user_tables 
        WHERE schemaname = 'public' 
        AND relname = 'mv_latest_prices'
        AND last_vacuum > (CURRENT_TIMESTAMP - INTERVAL '5 minutes')
    ) THEN
        PERFORM refresh_materialized_views();
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic materialized view refresh
CREATE TRIGGER trigger_refresh_mv_on_price_insert
    AFTER INSERT ON price_snapshots
    FOR EACH STATEMENT
    EXECUTE FUNCTION auto_refresh_materialized_views();

CREATE TRIGGER trigger_refresh_mv_on_message_insert
    AFTER INSERT ON messages
    FOR EACH STATEMENT
    EXECUTE FUNCTION auto_refresh_materialized_views();

-- Create function for database maintenance
CREATE OR REPLACE FUNCTION perform_database_maintenance()
RETURNS TABLE(
    operation TEXT,
    table_name TEXT,
    result TEXT,
    duration INTERVAL
) AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    rec RECORD;
BEGIN
    -- Analyze all tables
    FOR rec IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        start_time := clock_timestamp();
        EXECUTE 'ANALYZE ' || rec.tablename;
        end_time := clock_timestamp();
        
        RETURN QUERY SELECT 
            'ANALYZE'::TEXT,
            rec.tablename::TEXT,
            'SUCCESS'::TEXT,
            (end_time - start_time)::INTERVAL;
    END LOOP;
    
    -- Refresh materialized views
    start_time := clock_timestamp();
    PERFORM refresh_materialized_views();
    end_time := clock_timestamp();
    
    RETURN QUERY SELECT 
        'REFRESH_MATERIALIZED_VIEWS'::TEXT,
        'ALL'::TEXT,
        'SUCCESS'::TEXT,
        (end_time - start_time)::INTERVAL;
    
    -- Vacuum analyze for better performance
    FOR rec IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        start_time := clock_timestamp();
        EXECUTE 'VACUUM ANALYZE ' || rec.tablename;
        end_time := clock_timestamp();
        
        RETURN QUERY SELECT 
            'VACUUM_ANALYZE'::TEXT,
            rec.tablename::TEXT,
            'SUCCESS'::TEXT,
            (end_time - start_time)::INTERVAL;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get query performance statistics
CREATE OR REPLACE FUNCTION get_query_performance_stats()
RETURNS TABLE(
    query_text TEXT,
    calls BIGINT,
    total_time DOUBLE PRECISION,
    mean_time DOUBLE PRECISION,
    rows BIGINT,
    shared_blks_hit BIGINT,
    shared_blks_read BIGINT,
    shared_blks_dirtied BIGINT,
    shared_blks_written BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pss.query,
        pss.calls,
        pss.total_exec_time,
        pss.mean_exec_time,
        pss.rows,
        pss.shared_blks_hit,
        pss.shared_blks_read,
        pss.shared_blks_dirtied,
        pss.shared_blks_written
    FROM pg_stat_statements pss
    WHERE pss.query LIKE '%users%' 
       OR pss.query LIKE '%chat_sessions%'
       OR pss.query LIKE '%messages%'
       OR pss.query LIKE '%price_snapshots%'
    ORDER BY pss.mean_exec_time DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get index usage statistics
CREATE OR REPLACE FUNCTION get_index_usage_stats()
RETURNS TABLE(
    schema_name TEXT,
    table_name TEXT,
    index_name TEXT,
    index_scans BIGINT,
    tuples_read BIGINT,
    tuples_fetched BIGINT,
    index_size_bytes BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname::TEXT,
        tablename::TEXT,
        indexname::TEXT,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch,
        pg_relation_size(indexrelid)
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    ORDER BY idx_scan DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to detect slow queries
CREATE OR REPLACE FUNCTION detect_slow_queries(
    min_duration_ms INTEGER DEFAULT 1000
)
RETURNS TABLE(
    query_text TEXT,
    calls BIGINT,
    total_time_ms DOUBLE PRECISION,
    mean_time_ms DOUBLE PRECISION,
    max_time_ms DOUBLE PRECISION,
    stddev_time_ms DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pss.query,
        pss.calls,
        pss.total_exec_time,
        pss.mean_exec_time,
        pss.max_exec_time,
        pss.stddev_exec_time
    FROM pg_stat_statements pss
    WHERE pss.mean_exec_time > min_duration_ms
    ORDER BY pss.mean_exec_time DESC
    LIMIT 25;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION refresh_materialized_views() TO service_role;
GRANT EXECUTE ON FUNCTION perform_database_maintenance() TO service_role;
GRANT EXECUTE ON FUNCTION get_query_performance_stats() TO service_role;
GRANT EXECUTE ON FUNCTION get_index_usage_stats() TO service_role;
GRANT EXECUTE ON FUNCTION detect_slow_queries(INTEGER) TO service_role;

-- Grant select permissions on materialized views
GRANT SELECT ON mv_latest_prices TO authenticated, service_role;
GRANT SELECT ON mv_user_activity_summary TO authenticated, service_role;

-- Add comments for documentation
COMMENT ON MATERIALIZED VIEW mv_latest_prices IS 'Materialized view containing the latest price for each token';
COMMENT ON MATERIALIZED VIEW mv_user_activity_summary IS 'Materialized view containing user activity statistics';
COMMENT ON FUNCTION refresh_materialized_views() IS 'Refreshes all materialized views';
COMMENT ON FUNCTION perform_database_maintenance() IS 'Performs routine database maintenance tasks';
COMMENT ON FUNCTION get_query_performance_stats() IS 'Returns query performance statistics';
COMMENT ON FUNCTION get_index_usage_stats() IS 'Returns index usage statistics';
COMMENT ON FUNCTION detect_slow_queries(INTEGER) IS 'Detects slow queries above specified duration';

COMMIT;