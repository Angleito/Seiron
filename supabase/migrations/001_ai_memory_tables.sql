-- Migration: 001_ai_memory_tables.sql
-- Description: Create AI memory persistence tables for Seiron
-- Author: Seiron AI System
-- Date: 2025-01-08

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create user_profiles table for storing user preferences and AI learning
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE, -- References auth.users
    
    -- User preferences
    preferences JSONB DEFAULT '{}' NOT NULL,
    -- Example structure:
    -- {
    --   "voice": {
    --     "enabled": true,
    --     "tts_voice_id": "dragon_voice_123",
    --     "speech_rate": 1.0,
    --     "volume": 0.8
    --   },
    --   "portfolio": {
    --     "risk_tolerance": "moderate",
    --     "preferred_protocols": ["symphony", "takara"],
    --     "notification_preferences": {
    --       "price_alerts": true,
    --       "transaction_confirmations": true
    --     }
    --   },
    --   "ai": {
    --     "communication_style": "technical",
    --     "response_detail_level": "detailed",
    --     "preferred_language": "en"
    --   }
    -- }
    
    -- AI learning data
    ai_learning_data JSONB DEFAULT '{}' NOT NULL,
    -- Example structure:
    -- {
    --   "interaction_patterns": {
    --     "common_queries": ["portfolio balance", "yield optimization"],
    --     "usage_times": ["09:00-11:00", "19:00-21:00"],
    --     "preferred_actions": ["check_yield", "rebalance"]
    --   },
    --   "behavioral_insights": {
    --     "risk_adjustments": [
    --       {"date": "2025-01-05", "from": "moderate", "to": "conservative", "reason": "market_volatility"}
    --     ],
    --     "successful_strategies": ["liquidity_provision", "yield_farming"]
    --   },
    --   "personalization_scores": {
    --     "voice_interaction_preference": 0.85,
    --     "technical_proficiency": 0.72,
    --     "defi_experience": 0.68
    --   }
    -- }
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_interaction_at TIMESTAMPTZ,
    interaction_count INTEGER DEFAULT 0,
    
    -- Constraints
    CONSTRAINT valid_preferences CHECK (jsonb_typeof(preferences) = 'object'),
    CONSTRAINT valid_ai_learning_data CHECK (jsonb_typeof(ai_learning_data) = 'object')
);

-- Create conversation_memory table for session memory persistence
CREATE TABLE IF NOT EXISTS conversation_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Conversation context
    context JSONB DEFAULT '{}' NOT NULL,
    -- Example structure:
    -- {
    --   "current_topic": "yield_optimization",
    --   "entities_mentioned": {
    --     "protocols": ["symphony", "takara"],
    --     "tokens": ["SEI", "USDC"],
    --     "amounts": [{"value": 1000, "token": "USDC"}]
    --   },
    --   "user_goals": ["maximize_yield", "minimize_risk"],
    --   "conversation_state": "discussing_options",
    --   "pending_actions": [
    --     {"type": "liquidity_provision", "protocol": "symphony", "status": "awaiting_confirmation"}
    --   ]
    -- }
    
    -- Short-term memory (current conversation)
    short_term_memory JSONB DEFAULT '[]' NOT NULL,
    -- Array of memory items:
    -- [
    --   {
    --     "timestamp": "2025-01-08T10:30:00Z",
    --     "type": "user_query",
    --     "content": "What's my current yield?",
    --     "intent": "check_yield",
    --     "entities": {"metric": "yield"}
    --   },
    --   {
    --     "timestamp": "2025-01-08T10:30:05Z",
    --     "type": "ai_response",
    --     "content": "Your current yield is 12.5% APY...",
    --     "data_presented": {"yield_apy": 12.5, "protocol": "symphony"}
    --   }
    -- ]
    
    -- Working memory (active task context)
    working_memory JSONB DEFAULT '{}' NOT NULL,
    -- Example structure:
    -- {
    --   "active_task": "portfolio_rebalancing",
    --   "task_progress": 0.6,
    --   "required_data": {
    --     "current_positions": true,
    --     "market_prices": true,
    --     "gas_estimates": false
    --   },
    --   "decisions_made": [
    --     {"action": "reduce_exposure", "asset": "volatile_token", "reason": "risk_management"}
    --   ]
    -- }
    
    -- Conversation metadata
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    message_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Voice interaction data
    voice_interaction_data JSONB DEFAULT '{}',
    -- Example structure:
    -- {
    --   "total_voice_messages": 15,
    --   "average_transcript_confidence": 0.92,
    --   "voice_commands_used": ["check balance", "show yield"],
    --   "tts_playback_count": 12
    -- }
    
    -- Indexes
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    CONSTRAINT valid_context CHECK (jsonb_typeof(context) = 'object'),
    CONSTRAINT valid_short_term_memory CHECK (jsonb_typeof(short_term_memory) = 'array'),
    CONSTRAINT valid_working_memory CHECK (jsonb_typeof(working_memory) = 'object')
);

-- Create ai_memory_snapshots table for long-term memory storage
CREATE TABLE IF NOT EXISTS ai_memory_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    
    -- Snapshot type and version
    snapshot_type VARCHAR(50) NOT NULL,
    -- Types: 'daily', 'weekly', 'milestone', 'manual'
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Long-term memory data
    memory_data JSONB NOT NULL,
    -- Example structure:
    -- {
    --   "user_profile_evolution": {
    --     "risk_profile_changes": [...],
    --     "skill_progression": {
    --       "defi_knowledge": [
    --         {"date": "2025-01-01", "level": 0.5},
    --         {"date": "2025-01-08", "level": 0.7}
    --       ]
    --     }
    --   },
    --   "interaction_summary": {
    --     "total_sessions": 45,
    --     "average_session_duration": 720, -- seconds
    --     "most_used_features": ["portfolio_view", "yield_check", "rebalancing"],
    --     "successful_transactions": 28,
    --     "total_value_managed": 50000
    --   },
    --   "learned_patterns": {
    --     "trading_behavior": "conservative_accumulator",
    --     "information_seeking": "detail_oriented",
    --     "decision_making": "data_driven"
    --   },
    --   "personalization_model": {
    --     "preferred_explanations": "technical_with_examples",
    --     "optimal_response_length": "medium",
    --     "engagement_triggers": ["market_opportunities", "risk_alerts"]
    --   },
    --   "protocol_experience": {
    --     "symphony": {"familiarity": 0.8, "success_rate": 0.85},
    --     "takara": {"familiarity": 0.6, "success_rate": 0.75}
    --   }
    -- }
    
    -- Embeddings for semantic search (optional, for future ML features)
    embeddings vector(1536),
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_to TIMESTAMPTZ,
    is_current BOOLEAN DEFAULT true,
    
    -- Snapshot metadata
    metadata JSONB DEFAULT '{}',
    -- Example:
    -- {
    --   "trigger": "scheduled",
    --   "conversation_count": 5,
    --   "significant_events": ["first_large_transaction", "risk_preference_change"],
    --   "compression_ratio": 0.85
    -- }
    
    -- Constraints
    CONSTRAINT fk_user_id_snapshot FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    CONSTRAINT valid_snapshot_type CHECK (snapshot_type IN ('daily', 'weekly', 'milestone', 'manual')),
    CONSTRAINT valid_memory_data CHECK (jsonb_typeof(memory_data) = 'object')
);

-- Create indexes for performance
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_last_interaction ON user_profiles(last_interaction_at DESC);
CREATE INDEX idx_conversation_memory_session_id ON conversation_memory(session_id);
CREATE INDEX idx_conversation_memory_user_id ON conversation_memory(user_id);
CREATE INDEX idx_conversation_memory_active ON conversation_memory(is_active, last_activity_at DESC);
CREATE INDEX idx_ai_memory_snapshots_user_id ON ai_memory_snapshots(user_id);
CREATE INDEX idx_ai_memory_snapshots_current ON ai_memory_snapshots(user_id, is_current) WHERE is_current = true;
CREATE INDEX idx_ai_memory_snapshots_type ON ai_memory_snapshots(snapshot_type, created_at DESC);

-- GIN indexes for JSONB queries
CREATE INDEX idx_user_preferences_gin ON user_profiles USING GIN (preferences);
CREATE INDEX idx_ai_learning_data_gin ON user_profiles USING GIN (ai_learning_data);
CREATE INDEX idx_conversation_context_gin ON conversation_memory USING GIN (context);
CREATE INDEX idx_memory_data_gin ON ai_memory_snapshots USING GIN (memory_data);

-- Create update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update timestamp triggers
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_memory_snapshots ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Conversation memory policies
CREATE POLICY "Users can view own conversations" ON conversation_memory
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" ON conversation_memory
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON conversation_memory
    FOR UPDATE USING (auth.uid() = user_id);

-- AI memory snapshots policies
CREATE POLICY "Users can view own snapshots" ON ai_memory_snapshots
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create snapshots" ON ai_memory_snapshots
    FOR INSERT WITH CHECK (true); -- Controlled by service role

CREATE POLICY "System can update snapshots" ON ai_memory_snapshots
    FOR UPDATE USING (true); -- Controlled by service role

-- Create helper functions for memory management
CREATE OR REPLACE FUNCTION get_active_conversation_memory(p_session_id UUID)
RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT jsonb_build_object(
            'context', context,
            'short_term_memory', short_term_memory,
            'working_memory', working_memory,
            'message_count', message_count
        )
        FROM conversation_memory
        WHERE session_id = p_session_id AND is_active = true
        ORDER BY last_activity_at DESC
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION archive_old_conversations()
RETURNS void AS $$
BEGIN
    UPDATE conversation_memory
    SET is_active = false
    WHERE is_active = true
    AND last_activity_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to merge conversation memories into snapshots
CREATE OR REPLACE FUNCTION create_memory_snapshot(
    p_user_id UUID,
    p_snapshot_type VARCHAR(50)
)
RETURNS UUID AS $$
DECLARE
    v_snapshot_id UUID;
    v_memory_data JSONB;
BEGIN
    -- Aggregate memory data from recent conversations
    SELECT jsonb_build_object(
        'recent_conversations', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'session_id', session_id,
                    'context', context,
                    'message_count', message_count,
                    'duration', EXTRACT(EPOCH FROM (last_activity_at - started_at))
                )
            )
            FROM conversation_memory
            WHERE user_id = p_user_id
            AND last_activity_at > NOW() - INTERVAL '7 days'
        ),
        'aggregated_patterns', (
            SELECT jsonb_build_object(
                'total_messages', SUM(message_count),
                'total_sessions', COUNT(*),
                'avg_session_duration', AVG(EXTRACT(EPOCH FROM (last_activity_at - started_at)))
            )
            FROM conversation_memory
            WHERE user_id = p_user_id
        )
    ) INTO v_memory_data;
    
    -- Create the snapshot
    INSERT INTO ai_memory_snapshots (
        user_id,
        snapshot_type,
        memory_data
    ) VALUES (
        p_user_id,
        p_snapshot_type,
        v_memory_data
    ) RETURNING id INTO v_snapshot_id;
    
    -- Mark previous snapshots as not current
    UPDATE ai_memory_snapshots
    SET is_current = false, valid_to = NOW()
    WHERE user_id = p_user_id
    AND id != v_snapshot_id
    AND is_current = true;
    
    RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON conversation_memory TO authenticated;
GRANT SELECT ON ai_memory_snapshots TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_conversation_memory TO authenticated;
GRANT EXECUTE ON FUNCTION archive_old_conversations TO service_role;
GRANT EXECUTE ON FUNCTION create_memory_snapshot TO service_role;