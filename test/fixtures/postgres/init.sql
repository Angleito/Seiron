-- Initialize test database schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Portfolio tables
CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_address VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portfolio_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    protocol VARCHAR(100) NOT NULL,
    position_type VARCHAR(50) NOT NULL,
    asset_address VARCHAR(255) NOT NULL,
    amount DECIMAL(38,18) NOT NULL,
    value_usd DECIMAL(38,18) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Protocol interaction logs
CREATE TABLE IF NOT EXISTS protocol_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_address VARCHAR(255) NOT NULL,
    protocol VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    tx_hash VARCHAR(255) UNIQUE,
    block_number BIGINT,
    gas_used BIGINT,
    gas_price DECIMAL(38,18),
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent decision logs
CREATE TABLE IF NOT EXISTS agent_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_type VARCHAR(100) NOT NULL,
    user_address VARCHAR(255) NOT NULL,
    decision_type VARCHAR(100) NOT NULL,
    input_data JSONB NOT NULL,
    decision_output JSONB NOT NULL,
    confidence_score DECIMAL(5,4),
    execution_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type VARCHAR(100) NOT NULL,
    protocol VARCHAR(100),
    value DECIMAL(38,18) NOT NULL,
    unit VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Test data
CREATE TABLE IF NOT EXISTS test_scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    scenario_type VARCHAR(100) NOT NULL,
    input_data JSONB NOT NULL,
    expected_output JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_portfolios_user_address ON portfolios(user_address);
CREATE INDEX IF NOT EXISTS idx_portfolio_positions_portfolio_id ON portfolio_positions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_protocol_interactions_user_address ON protocol_interactions(user_address);
CREATE INDEX IF NOT EXISTS idx_protocol_interactions_protocol ON protocol_interactions(protocol);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_agent_type ON agent_decisions(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_user_address ON agent_decisions(user_address);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_protocol ON performance_metrics(protocol);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);

-- Insert test data
INSERT INTO portfolios (user_address, name, description) VALUES
    ('sei1test1address', 'Test Portfolio 1', 'Portfolio for integration testing'),
    ('sei1test2address', 'Test Portfolio 2', 'Portfolio for performance testing'),
    ('sei1test3address', 'Test Portfolio 3', 'Portfolio for stress testing');

INSERT INTO test_scenarios (name, description, scenario_type, input_data, expected_output) VALUES
    ('Basic Swap', 'Simple token swap via Symphony', 'swap', 
     '{"tokenIn": "sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2", "tokenOut": "sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6", "amountIn": "1000000"}',
     '{"success": true, "outputAmount": "500000"}'),
    ('Multi-hop Swap', 'Token swap through multiple protocols', 'swap',
     '{"tokenIn": "sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2", "tokenOut": "sei1weth7z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6", "amountIn": "2000000"}',
     '{"success": true, "outputAmount": "0.0008"}'),
    ('Lending Supply', 'Supply assets to lending protocol', 'lending',
     '{"protocol": "takara", "action": "supply", "asset": "sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6", "amount": "10000000"}',
     '{"success": true, "healthFactor": 999999}'),
    ('Leveraged Position', 'Create leveraged position across protocols', 'complex',
     '{"collateral": "sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6", "borrow": "sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2", "leverage": 2.0}',
     '{"success": true, "healthFactor": 1.5}'),
    ('Arbitrage Opportunity', 'Cross-protocol arbitrage execution', 'arbitrage',
     '{"protocol1": "symphony", "protocol2": "takara", "asset": "sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6", "amount": "50000000"}',
     '{"success": true, "profit": "5000"}');

-- Create functions for test helpers
CREATE OR REPLACE FUNCTION cleanup_test_data() RETURNS VOID AS $$
BEGIN
    DELETE FROM performance_metrics WHERE timestamp < NOW() - INTERVAL '1 hour';
    DELETE FROM agent_decisions WHERE created_at < NOW() - INTERVAL '1 hour';
    DELETE FROM protocol_interactions WHERE created_at < NOW() - INTERVAL '1 hour';
    DELETE FROM portfolio_positions WHERE updated_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_test_scenario(scenario_name VARCHAR) RETURNS JSONB AS $$
DECLARE
    scenario JSONB;
BEGIN
    SELECT input_data INTO scenario FROM test_scenarios WHERE name = scenario_name;
    RETURN scenario;
END;
$$ LANGUAGE plpgsql;