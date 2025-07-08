-- Migration: 002_enhance_messages_table.sql
-- Description: Enhance existing messages table with AI memory and NLP fields
-- Author: Seiron AI System
-- Date: 2025-01-08

-- Add new columns to the messages table for AI memory persistence
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS intent_classification JSONB DEFAULT '{}',
-- Example structure:
-- {
--   "primary_intent": "check_portfolio_balance",
--   "confidence": 0.92,
--   "secondary_intents": [
--     {"intent": "check_yield", "confidence": 0.65},
--     {"intent": "view_positions", "confidence": 0.58}
--   ],
--   "intent_category": "information_seeking",
--   "requires_authentication": true,
--   "requires_wallet_connection": true
-- }

ADD COLUMN IF NOT EXISTS entities_extracted JSONB DEFAULT '{}',
-- Example structure:
-- {
--   "protocols": [
--     {"name": "Symphony", "type": "liquidity_protocol", "confidence": 0.95}
--   ],
--   "tokens": [
--     {"symbol": "SEI", "type": "native_token", "confidence": 0.98},
--     {"symbol": "USDC", "type": "stablecoin", "confidence": 0.97}
--   ],
--   "amounts": [
--     {"value": 1000, "token": "USDC", "type": "investment_amount", "confidence": 0.90}
--   ],
--   "actions": [
--     {"action": "provide_liquidity", "target": "symphony", "confidence": 0.88}
--   ],
--   "time_references": [
--     {"text": "next week", "parsed": "2025-01-15", "type": "future_date"}
--   ],
--   "wallet_addresses": [],
--   "percentages": [
--     {"value": 50, "context": "portfolio_allocation", "confidence": 0.85}
--   ]
-- }

ADD COLUMN IF NOT EXISTS sentiment_score NUMERIC(3,2) DEFAULT 0.0,
-- Range: -1.0 (very negative) to 1.0 (very positive)
-- 0.0 is neutral
-- Used for understanding user satisfaction and adjusting response tone

ADD COLUMN IF NOT EXISTS conversation_id UUID,
-- Links to conversation_memory table for session context

ADD COLUMN IF NOT EXISTS ai_metadata JSONB DEFAULT '{}',
-- Additional AI-related metadata
-- Example structure:
-- {
--   "response_strategy": "detailed_explanation",
--   "personalization_applied": ["technical_user", "risk_averse"],
--   "context_from_memory": true,
--   "memory_retrieval_ids": ["snapshot_123", "snapshot_456"],
--   "nlp_processing_time_ms": 145,
--   "model_version": "seiron-nlp-v2",
--   "disambiguation_attempted": false,
--   "follow_up_suggestions": [
--     "Would you like to see a detailed breakdown?",
--     "Should I help you execute this transaction?"
--   ]
-- }

ADD COLUMN IF NOT EXISTS voice_metadata JSONB DEFAULT '{}';
-- Voice interaction specific metadata
-- Example structure:
-- {
--   "is_voice_message": true,
--   "transcript_confidence": 0.94,
--   "speech_duration_ms": 3250,
--   "tts_generated": true,
--   "tts_voice_id": "dragon_voice_123",
--   "audio_url": "https://storage.../audio_123.mp3",
--   "speech_characteristics": {
--     "pace": "moderate",
--     "volume": "normal",
--     "emotion_detected": "curious"
--   }
-- }

-- Add constraints for the new columns
ALTER TABLE messages
ADD CONSTRAINT valid_intent_classification 
    CHECK (intent_classification IS NULL OR jsonb_typeof(intent_classification) = 'object'),
ADD CONSTRAINT valid_entities_extracted 
    CHECK (entities_extracted IS NULL OR jsonb_typeof(entities_extracted) = 'object'),
ADD CONSTRAINT valid_sentiment_score 
    CHECK (sentiment_score IS NULL OR (sentiment_score >= -1.0 AND sentiment_score <= 1.0)),
ADD CONSTRAINT valid_ai_metadata 
    CHECK (ai_metadata IS NULL OR jsonb_typeof(ai_metadata) = 'object'),
ADD CONSTRAINT valid_voice_metadata 
    CHECK (voice_metadata IS NULL OR jsonb_typeof(voice_metadata) = 'object');

-- Add foreign key constraint for conversation_id
ALTER TABLE messages
ADD CONSTRAINT fk_conversation_id 
    FOREIGN KEY (conversation_id) 
    REFERENCES conversation_memory(id) 
    ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
    ON messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_sentiment 
    ON messages(sentiment_score) 
    WHERE sentiment_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_intent 
    ON messages((intent_classification->>'primary_intent')) 
    WHERE intent_classification IS NOT NULL;

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_intent_classification_gin 
    ON messages USING GIN (intent_classification);

CREATE INDEX IF NOT EXISTS idx_entities_extracted_gin 
    ON messages USING GIN (entities_extracted);

CREATE INDEX IF NOT EXISTS idx_ai_metadata_gin 
    ON messages USING GIN (ai_metadata);

CREATE INDEX IF NOT EXISTS idx_voice_metadata_gin 
    ON messages USING GIN (voice_metadata);

-- Partial index for voice messages
CREATE INDEX IF NOT EXISTS idx_voice_messages 
    ON messages(session_id, created_at) 
    WHERE (voice_metadata->>'is_voice_message')::boolean = true;

-- Create helper functions for AI memory queries

-- Function to get message context with AI enhancements
CREATE OR REPLACE FUNCTION get_enhanced_message_context(
    p_session_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    message_id UUID,
    role TEXT,
    content TEXT,
    intent TEXT,
    entities JSONB,
    sentiment NUMERIC,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.role,
        m.content,
        m.intent_classification->>'primary_intent' as intent,
        m.entities_extracted,
        m.sentiment_score,
        m.created_at
    FROM messages m
    WHERE m.session_id = p_session_id
    ORDER BY m.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to analyze conversation patterns
CREATE OR REPLACE FUNCTION analyze_conversation_patterns(
    p_user_id UUID,
    p_days INTEGER DEFAULT 7
)
RETURNS JSONB AS $$
DECLARE
    v_analysis JSONB;
BEGIN
    WITH conversation_stats AS (
        SELECT 
            COUNT(DISTINCT m.session_id) as session_count,
            COUNT(*) as message_count,
            AVG(m.sentiment_score) as avg_sentiment,
            jsonb_agg(DISTINCT m.intent_classification->>'primary_intent') as unique_intents,
            jsonb_agg(DISTINCT e.value) as mentioned_entities
        FROM messages m
        LEFT JOIN LATERAL jsonb_array_elements(
            m.entities_extracted->'protocols' || 
            m.entities_extracted->'tokens'
        ) e ON true
        JOIN chat_sessions cs ON m.session_id = cs.id
        WHERE cs.user_id = p_user_id
        AND m.created_at > NOW() - (p_days || ' days')::INTERVAL
    )
    SELECT jsonb_build_object(
        'period_days', p_days,
        'session_count', session_count,
        'message_count', message_count,
        'average_sentiment', ROUND(avg_sentiment::numeric, 2),
        'unique_intents', unique_intents,
        'mentioned_entities', mentioned_entities,
        'analysis_timestamp', NOW()
    ) INTO v_analysis
    FROM conversation_stats;
    
    RETURN v_analysis;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get entity frequency across conversations
CREATE OR REPLACE FUNCTION get_entity_frequency(
    p_user_id UUID,
    p_entity_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    entity_name TEXT,
    entity_type TEXT,
    frequency INTEGER,
    last_mentioned TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH entity_mentions AS (
        SELECT 
            (e->>'name') as entity_name,
            (e->>'type') as entity_type,
            m.created_at
        FROM messages m
        JOIN chat_sessions cs ON m.session_id = cs.id
        LEFT JOIN LATERAL jsonb_array_elements(
            CASE 
                WHEN p_entity_type IS NULL THEN 
                    m.entities_extracted->'protocols' || 
                    m.entities_extracted->'tokens' ||
                    m.entities_extracted->'actions'
                WHEN p_entity_type = 'protocols' THEN m.entities_extracted->'protocols'
                WHEN p_entity_type = 'tokens' THEN m.entities_extracted->'tokens'
                WHEN p_entity_type = 'actions' THEN m.entities_extracted->'actions'
                ELSE '[]'::jsonb
            END
        ) e ON true
        WHERE cs.user_id = p_user_id
        AND e IS NOT NULL
    )
    SELECT 
        entity_name,
        entity_type,
        COUNT(*)::INTEGER as frequency,
        MAX(created_at) as last_mentioned
    FROM entity_mentions
    WHERE entity_name IS NOT NULL
    GROUP BY entity_name, entity_type
    ORDER BY frequency DESC, last_mentioned DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to include new AI functions
GRANT EXECUTE ON FUNCTION get_enhanced_message_context TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_conversation_patterns TO authenticated;
GRANT EXECUTE ON FUNCTION get_entity_frequency TO authenticated;

-- Add comment documentation
COMMENT ON COLUMN messages.intent_classification IS 'NLP-derived intent classification with confidence scores';
COMMENT ON COLUMN messages.entities_extracted IS 'Named entities extracted from the message (protocols, tokens, amounts, etc.)';
COMMENT ON COLUMN messages.sentiment_score IS 'Sentiment analysis score from -1.0 (negative) to 1.0 (positive)';
COMMENT ON COLUMN messages.conversation_id IS 'Reference to the conversation memory for this session';
COMMENT ON COLUMN messages.ai_metadata IS 'Additional AI processing metadata and context';
COMMENT ON COLUMN messages.voice_metadata IS 'Voice interaction specific metadata including transcription confidence';