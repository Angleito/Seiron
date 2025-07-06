-- Migration: Create Price Snapshots Table
-- Description: Creates the price_snapshots table to store historical price data
-- Date: 2025-07-05

BEGIN;

-- Create price_snapshots table
CREATE TABLE IF NOT EXISTS price_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    token_symbol TEXT NOT NULL,
    price DECIMAL(20,8) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional fields for enhanced functionality
    price_usd DECIMAL(20,8),
    market_cap DECIMAL(20,2),
    volume_24h DECIMAL(20,2),
    price_change_24h DECIMAL(10,4),
    price_change_percentage_24h DECIMAL(6,4),
    
    -- Data source information
    source TEXT NOT NULL DEFAULT 'unknown',
    source_data JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT price_snapshots_token_symbol_check CHECK (
        LENGTH(token_symbol) >= 1 AND LENGTH(token_symbol) <= 20 AND
        token_symbol ~ '^[A-Z0-9-]+$'
    ),
    CONSTRAINT price_snapshots_price_check CHECK (price > 0),
    CONSTRAINT price_snapshots_price_usd_check CHECK (price_usd IS NULL OR price_usd > 0),
    CONSTRAINT price_snapshots_market_cap_check CHECK (market_cap IS NULL OR market_cap >= 0),
    CONSTRAINT price_snapshots_volume_24h_check CHECK (volume_24h IS NULL OR volume_24h >= 0),
    CONSTRAINT price_snapshots_source_check CHECK (LENGTH(source) >= 1),
    CONSTRAINT price_snapshots_source_data_check CHECK (
        source_data IS NULL OR jsonb_typeof(source_data) = 'object'
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_price_snapshots_message_id ON price_snapshots(message_id);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_token_symbol ON price_snapshots(token_symbol);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_timestamp ON price_snapshots(timestamp);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_source ON price_snapshots(source);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_price_snapshots_token_timestamp ON price_snapshots(token_symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_message_token ON price_snapshots(message_id, token_symbol);

-- Create GIN index for source_data JSONB queries
CREATE INDEX IF NOT EXISTS idx_price_snapshots_source_data ON price_snapshots USING GIN(source_data);

-- Create partial index for recent prices (last 30 days)
CREATE INDEX IF NOT EXISTS idx_price_snapshots_recent ON price_snapshots(token_symbol, timestamp DESC, price)
WHERE timestamp > (CURRENT_TIMESTAMP - INTERVAL '30 days');

-- Create unique index to prevent duplicate price entries for the same message and token
CREATE UNIQUE INDEX IF NOT EXISTS idx_price_snapshots_unique_message_token 
ON price_snapshots(message_id, token_symbol);

-- Enable Row Level Security
ALTER TABLE price_snapshots ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only access price snapshots from their own messages
CREATE POLICY price_snapshots_own_data ON price_snapshots
    FOR ALL
    TO authenticated
    USING (
        message_id IN (
            SELECT m.id FROM messages m
            JOIN chat_sessions cs ON m.session_id = cs.id
            JOIN users u ON cs.user_id = u.id
            WHERE u.wallet_address = current_setting('app.current_user_wallet', true)
        )
    )
    WITH CHECK (
        message_id IN (
            SELECT m.id FROM messages m
            JOIN chat_sessions cs ON m.session_id = cs.id
            JOIN users u ON cs.user_id = u.id
            WHERE u.wallet_address = current_setting('app.current_user_wallet', true)
        )
    );

-- Create policy for service role (backend operations)
CREATE POLICY price_snapshots_service_role ON price_snapshots
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON price_snapshots TO authenticated;
GRANT ALL ON price_snapshots TO service_role;

-- Create function to get latest price for a token
CREATE OR REPLACE FUNCTION get_latest_price(token_symbol_param TEXT)
RETURNS TABLE(
    token_symbol TEXT,
    price DECIMAL(20,8),
    price_usd DECIMAL(20,8),
    timestamp TIMESTAMP WITH TIME ZONE,
    source TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT ps.token_symbol, ps.price, ps.price_usd, ps.timestamp, ps.source
    FROM price_snapshots ps
    WHERE ps.token_symbol = token_symbol_param
    ORDER BY ps.timestamp DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get price history for a token
CREATE OR REPLACE FUNCTION get_price_history(
    token_symbol_param TEXT,
    hours_back INTEGER DEFAULT 24
)
RETURNS TABLE(
    token_symbol TEXT,
    price DECIMAL(20,8),
    price_usd DECIMAL(20,8),
    timestamp TIMESTAMP WITH TIME ZONE,
    source TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT ps.token_symbol, ps.price, ps.price_usd, ps.timestamp, ps.source
    FROM price_snapshots ps
    WHERE ps.token_symbol = token_symbol_param
    AND ps.timestamp > (CURRENT_TIMESTAMP - INTERVAL '1 hour' * hours_back)
    ORDER BY ps.timestamp ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to calculate price change percentage
CREATE OR REPLACE FUNCTION calculate_price_change_percentage(
    current_price DECIMAL(20,8),
    previous_price DECIMAL(20,8)
)
RETURNS DECIMAL(6,4) AS $$
BEGIN
    IF previous_price IS NULL OR previous_price = 0 THEN
        RETURN NULL;
    END IF;
    
    RETURN ROUND(((current_price - previous_price) / previous_price * 100)::DECIMAL(6,4), 4);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create trigger to automatically calculate price change percentage
CREATE OR REPLACE FUNCTION update_price_change_percentage()
RETURNS TRIGGER AS $$
DECLARE
    prev_price DECIMAL(20,8);
BEGIN
    -- Get the previous price for the same token
    SELECT price INTO prev_price
    FROM price_snapshots
    WHERE token_symbol = NEW.token_symbol
    AND timestamp < NEW.timestamp
    ORDER BY timestamp DESC
    LIMIT 1;
    
    -- Calculate and set the price change percentage
    NEW.price_change_percentage_24h = calculate_price_change_percentage(NEW.price, prev_price);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for price change calculation
CREATE TRIGGER update_price_change_trigger
    BEFORE INSERT OR UPDATE ON price_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION update_price_change_percentage();

-- Add comments for documentation
COMMENT ON TABLE price_snapshots IS 'Stores historical price data for cryptocurrency tokens';
COMMENT ON COLUMN price_snapshots.id IS 'UUID primary key for the price snapshot';
COMMENT ON COLUMN price_snapshots.message_id IS 'Foreign key reference to the message this price relates to';
COMMENT ON COLUMN price_snapshots.token_symbol IS 'Symbol of the cryptocurrency token (e.g., BTC, ETH, SEI)';
COMMENT ON COLUMN price_snapshots.price IS 'Price of the token in its base currency';
COMMENT ON COLUMN price_snapshots.price_usd IS 'Price of the token in USD';
COMMENT ON COLUMN price_snapshots.timestamp IS 'Timestamp when the price was recorded';
COMMENT ON COLUMN price_snapshots.market_cap IS 'Market capitalization of the token';
COMMENT ON COLUMN price_snapshots.volume_24h IS '24-hour trading volume';
COMMENT ON COLUMN price_snapshots.price_change_24h IS 'Absolute price change in the last 24 hours';
COMMENT ON COLUMN price_snapshots.price_change_percentage_24h IS 'Percentage price change in the last 24 hours';
COMMENT ON COLUMN price_snapshots.source IS 'Data source for the price information';
COMMENT ON COLUMN price_snapshots.source_data IS 'Additional data from the source in JSON format';

COMMIT;