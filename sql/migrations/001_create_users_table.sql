-- Migration: Create Users Table
-- Description: Creates the users table with wallet address as primary identifier
-- Date: 2025-07-05

BEGIN;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL UNIQUE,
    username TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT users_wallet_address_check CHECK (
        wallet_address ~ '^0x[a-fA-F0-9]{40}$' OR  -- Ethereum-style address
        wallet_address ~ '^sei[a-z0-9]{39}$'       -- Sei network address
    ),
    CONSTRAINT users_username_check CHECK (
        username IS NULL OR 
        (LENGTH(username) >= 3 AND LENGTH(username) <= 50 AND username ~ '^[a-zA-Z0-9_-]+$')
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only access their own data
CREATE POLICY users_own_data ON users
    FOR ALL
    TO authenticated
    USING (wallet_address = current_setting('app.current_user_wallet', true))
    WITH CHECK (wallet_address = current_setting('app.current_user_wallet', true));

-- Create policy for service role (backend operations)
CREATE POLICY users_service_role ON users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT ALL ON users TO service_role;

-- Add comments for documentation
COMMENT ON TABLE users IS 'Stores user information with wallet address as primary identifier';
COMMENT ON COLUMN users.id IS 'UUID primary key for internal references';
COMMENT ON COLUMN users.wallet_address IS 'Blockchain wallet address (Ethereum or Sei format)';
COMMENT ON COLUMN users.username IS 'Optional display name for the user';
COMMENT ON COLUMN users.created_at IS 'Timestamp when the user was created';
COMMENT ON COLUMN users.updated_at IS 'Timestamp when the user was last updated';

COMMIT;