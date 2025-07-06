# Seiron Crypto DApp Database Migrations

This directory contains SQL migration files for the Seiron crypto DApp database schema. The migrations are designed for PostgreSQL with modern features and best practices for crypto applications.

## Migration Files

### 001_create_users_table.sql
Creates the `users` table with:
- UUID primary key
- Wallet address validation (Ethereum and Sei formats)
- Username constraints
- Row Level Security (RLS) policies
- Automatic updated_at triggers

### 002_create_chat_sessions_table.sql
Creates the `chat_sessions` table with:
- User session organization
- Metadata storage in JSONB format
- Active session tracking
- Performance indexes
- RLS policies for user data isolation

### 003_create_messages_table.sql
Creates the `messages` table with:
- Message threading support
- Crypto context storage
- Full-text search capabilities
- Automatic message indexing
- Token usage tracking for AI responses

### 004_create_price_snapshots_table.sql
Creates the `price_snapshots` table with:
- Historical price data storage
- Market data (volume, market cap, etc.)
- Data source tracking
- Automatic price change calculations
- Optimized indexes for time-series queries

### 005_create_database_functions.sql
Creates utility functions for:
- User management (get_or_create_user)
- Session management
- Message retrieval with pagination
- Portfolio summary generation
- Data cleanup routines

### 006_create_indexes_and_optimization.sql
Creates additional optimizations:
- Composite indexes for common query patterns
- Materialized views for frequently accessed data
- Database maintenance functions
- Performance monitoring utilities

## Features

### Security Features
- **Row Level Security (RLS)**: Users can only access their own data
- **Wallet Address Validation**: Ensures valid Ethereum and Sei addresses
- **SQL Injection Protection**: All functions use parameterized queries
- **Service Role Separation**: Different permissions for application vs. user access

### Performance Features
- **Optimized Indexes**: Covering common query patterns
- **Materialized Views**: For frequently accessed aggregated data
- **Partial Indexes**: For commonly filtered data
- **GIN Indexes**: For JSONB and full-text search
- **Automatic Maintenance**: Functions for routine database upkeep

### Crypto DApp Specific Features
- **Multi-Network Support**: Ethereum and Sei address formats
- **Price History Tracking**: Time-series data for token prices
- **Context Storage**: Crypto-specific metadata in JSONB
- **Transaction Correlation**: Link messages to price snapshots
- **Portfolio Analytics**: Built-in functions for portfolio analysis

## Usage

### Running Migrations
```bash
# Run all migrations in order
psql -d seiron_db -f 001_create_users_table.sql
psql -d seiron_db -f 002_create_chat_sessions_table.sql
psql -d seiron_db -f 003_create_messages_table.sql
psql -d seiron_db -f 004_create_price_snapshots_table.sql
psql -d seiron_db -f 005_create_database_functions.sql
psql -d seiron_db -f 006_create_indexes_and_optimization.sql
```

### Setting Up User Context
```sql
-- Set current user for RLS policies
SELECT set_current_user_wallet('0x742d35Cc6634C0532925a3b8D5c9FE48fce2A6E9');

-- Create or get user
SELECT * FROM get_or_create_user('0x742d35Cc6634C0532925a3b8D5c9FE48fce2A6E9', 'DragonTrader');
```

### Example Queries
```sql
-- Get user's active sessions
SELECT * FROM get_user_active_sessions('0x742d35Cc6634C0532925a3b8D5c9FE48fce2A6E9');

-- Get session messages with price data
SELECT * FROM get_session_messages('session-uuid-here', 50, 0);

-- Search messages
SELECT * FROM search_messages('0x742d35Cc6634C0532925a3b8D5c9FE48fce2A6E9', 'bitcoin price');

-- Get latest token prices
SELECT * FROM mv_latest_prices WHERE token_symbol IN ('BTC', 'ETH', 'SEI');

-- Get portfolio summary
SELECT * FROM get_portfolio_summary('0x742d35Cc6634C0532925a3b8D5c9FE48fce2A6E9', 30);
```

## Database Roles

### authenticated
- Can read/write their own data
- Subject to RLS policies
- Used for user-facing operations

### service_role
- Full access to all data
- Used for backend operations
- Can execute maintenance functions

## Maintenance

### Regular Maintenance
```sql
-- Refresh materialized views
SELECT refresh_materialized_views();

-- Perform database maintenance
SELECT * FROM perform_database_maintenance();

-- Clean up old data (older than 90 days)
SELECT cleanup_old_data(90);
```

### Performance Monitoring
```sql
-- Get query performance stats
SELECT * FROM get_query_performance_stats();

-- Get index usage stats
SELECT * FROM get_index_usage_stats();

-- Detect slow queries
SELECT * FROM detect_slow_queries(1000); -- queries > 1000ms
```

## Best Practices

1. **Always use RLS**: Set user context before operations
2. **Use prepared statements**: Prevent SQL injection
3. **Monitor performance**: Regular analysis of query patterns
4. **Regular maintenance**: Schedule cleanup and optimization
5. **Backup strategy**: Implement regular backups
6. **Security audits**: Regular review of access patterns

## Environment Variables

Ensure these environment variables are set:
- `DATABASE_URL`: PostgreSQL connection string
- `SUPABASE_SERVICE_ROLE_KEY`: For service role operations
- `SUPABASE_ANON_KEY`: For authenticated user operations

## Extensions Required

The migrations assume these PostgreSQL extensions are available:
- `uuid-ossp` or `pgcrypto` for UUID generation
- `pg_stat_statements` for query performance monitoring (optional)

## Data Retention

The database includes configurable data retention:
- Default: 90 days for messages and price snapshots
- Configurable via `cleanup_old_data()` function
- Automatic cleanup can be scheduled via cron jobs

## Support

For questions or issues with the database schema, please refer to the project documentation or create an issue in the repository.