# Seiron Centralized Logging System

## Overview

This document describes the comprehensive centralized logging and persistence system for Seiron's Docker containers. The system provides structured logging, log aggregation, monitoring, alerting, and analysis capabilities across all services.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Seiron Logging Architecture                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   Backend   │  │  Frontend   │  │    Redis    │  │ Prometheus  │       │
│  │   Service   │  │   Service   │  │   Service   │  │   Service   │       │
│  │             │  │             │  │             │  │             │       │
│  │ JSON Logs   │  │ JSON Logs   │  │ Text Logs   │  │ JSON Logs   │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│         │                 │                 │                 │           │
│         └─────────────────┼─────────────────┼─────────────────┘           │
│                           │                 │                             │
│                           ▼                 ▼                             │
│                  ┌─────────────────────────────────────────┐               │
│                  │         Fluent Bit Aggregator          │               │
│                  │                                         │               │
│                  │  • Log Collection & Parsing            │               │
│                  │  • Filtering & Transformation          │               │
│                  │  • Routing & Distribution              │               │
│                  │  • Buffer Management                   │               │
│                  └─────────────────────────────────────────┘               │
│                                     │                                     │
│                                     ▼                                     │
│                  ┌─────────────────────────────────────────┐               │
│                  │          Persistent Storage            │               │
│                  │                                         │               │
│                  │  • Service-specific log files          │               │
│                  │  • Aggregated log files               │               │
│                  │  • Error logs                          │               │
│                  │  • Performance metrics                │               │
│                  │  • Backup archives                     │               │
│                  └─────────────────────────────────────────┘               │
│                                     │                                     │
│                                     ▼                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │Log Monitor  │  │Log Backup   │  │Log Analysis │  │  Alerting   │       │
│  │             │  │             │  │             │  │             │       │
│  │• Health     │  │• Archival   │  │• Patterns   │  │• Thresholds │       │
│  │• Retention  │  │• Rotation   │  │• Metrics    │  │• Notifications│     │
│  │• Cleanup    │  │• Compression│  │• Reports    │  │• Escalation │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Features

### 1. Centralized Log Collection
- **Docker JSON Logs**: Automatic collection from all containers
- **Application Logs**: File-based logging with structured JSON format
- **Service-specific Logs**: Individual log streams for each service
- **Real-time Collection**: Fluent Bit aggregation with minimal latency

### 2. Log Persistence & Retention
- **Persistent Storage**: Volume-mounted log directories
- **Automatic Rotation**: Size and time-based log rotation
- **Compression**: Automatic compression of older logs
- **Retention Policies**: Configurable retention periods (default: 30 days)

### 3. Monitoring & Alerting
- **Error Rate Monitoring**: Threshold-based error detection
- **Performance Monitoring**: Response time and resource usage tracking
- **Health Check Monitoring**: Service availability tracking
- **Disk Usage Monitoring**: Storage capacity alerts

### 4. Log Analysis & Reporting
- **Error Pattern Analysis**: Identification of recurring issues
- **Performance Metrics**: Response time and throughput analysis
- **Usage Pattern Analysis**: Traffic and user behavior insights
- **Automated Reports**: Scheduled analysis and summary generation

### 5. Backup & Archival
- **Automated Backups**: Scheduled backup creation
- **Compressed Archives**: Space-efficient storage
- **Backup Verification**: Integrity checking
- **Long-term Retention**: Configurable backup retention policies

## Configuration

### Environment Variables

The logging system is configured through environment variables defined in `.env.logging`:

```bash
# Copy logging configuration to your environment
cp .env.logging .env.local

# Or source it directly
source .env.logging
```

### Key Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Global log level (debug, info, warn, error) |
| `LOG_FORMAT` | `json` | Log output format (json, pretty, simple) |
| `LOG_RETENTION_DAYS` | `30` | Log retention period in days |
| `LOG_ALERT_THRESHOLD` | `100` | Error count threshold for alerts |
| `ENABLE_PERFORMANCE_MONITORING` | `true` | Enable performance metric collection |
| `ENABLE_HEALTH_CHECK_LOGGING` | `true` | Enable health check logging |

## Docker Compose Integration

### Production Environment

```bash
# Start with logging enabled
docker-compose -f docker-compose.yml up -d

# View aggregated logs
docker-compose logs -f log-aggregator

# Monitor log files
docker-compose exec log-monitor tail -f /logs/combined.log
```

### Development Environment

```bash
# Start development environment with enhanced logging
docker-compose -f docker-compose.dev.yml up -d

# Real-time log monitoring
docker-compose -f docker-compose.dev.yml exec log-aggregator tail -f /fluent-bit/logs/combined-dev.log
```

### Testing Environment

```bash
# Run tests with centralized logging
docker-compose -f docker-compose.test.yml up --abort-on-container-exit

# View test logs
docker-compose -f docker-compose.test.yml logs frontend-test backend-test
```

## Log Structure

### JSON Log Format

All services output structured JSON logs with the following fields:

```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "level": "INFO",
  "service": "backend",
  "component": "chat-orchestrator",
  "message": "Processing chat request",
  "metadata": {
    "requestId": "req-123456",
    "sessionId": "sess-789012",
    "walletAddress": "0x...",
    "duration": 150
  },
  "environment": "production",
  "version": "1.0.0"
}
```

### Log Levels

- **DEBUG**: Detailed debugging information
- **INFO**: General operational messages
- **WARN**: Warning conditions that don't affect operation
- **ERROR**: Error conditions that may affect operation
- **FATAL**: Critical errors that cause service failure

## File Organization

```
logs/
├── backend/
│   ├── backend-aggregated.log      # Aggregated backend logs
│   ├── backend-dev.log             # Development logs
│   ├── backend-error.log           # Error-only logs
│   └── backend-performance.log     # Performance metrics
├── frontend/
│   ├── frontend-aggregated.log     # Aggregated frontend logs
│   ├── frontend-dev.log            # Development logs
│   └── frontend-error.log          # Error-only logs
├── redis/
│   ├── redis-aggregated.log        # Redis logs
│   └── redis.log                   # Raw Redis logs
├── prometheus/
│   └── prometheus.log              # Prometheus metrics logs
├── grafana/
│   └── grafana.log                 # Grafana dashboard logs
├── combined.log                    # All services combined
├── errors.log                      # All errors combined
├── docker-containers.log          # Docker container logs
├── alerts/                         # Alert notifications
├── analysis/                       # Log analysis reports
├── summary/                        # Log summaries
├── performance/                    # Performance metrics
└── backups/                        # Compressed backups
```

## Monitoring Scripts

### Log Monitor

Continuously monitors log files for errors and performance issues:

```bash
# Run manually
./scripts/log-monitor.sh

# View monitoring status
docker-compose logs log-monitor
```

### Log Backup

Creates compressed backups of log files:

```bash
# Create backup manually
./scripts/log-backup.sh

# Schedule automatic backups (add to cron)
0 2 * * * /path/to/scripts/log-backup.sh
```

### Log Analysis

Analyzes log patterns and generates reports:

```bash
# Run analysis manually
./scripts/log-analysis.sh

# View analysis results
ls -la logs/analysis/
```

## Monitoring & Alerting

### Error Rate Monitoring

The system monitors error rates and generates alerts when thresholds are exceeded:

- **Threshold**: 100 errors per monitoring period (configurable)
- **Window**: 5-minute sliding window
- **Action**: Creates alert files in `logs/alerts/`

### Performance Monitoring

Tracks performance metrics across all services:

- **Response Times**: Average, min, max response times
- **Slow Requests**: Requests exceeding 5-second threshold
- **Memory Usage**: Peak and average memory consumption
- **Disk Usage**: Storage capacity monitoring

### Health Check Monitoring

Monitors service health and availability:

- **Service Status**: Up/down status for each service
- **Health Check Failures**: Failed health check attempts
- **Recovery Tracking**: Service recovery times

## Grafana Dashboard Integration

The logging system integrates with Grafana for visual monitoring:

### Available Dashboards

1. **Service Overview**: Overall system health and performance
2. **Error Analysis**: Error patterns and trends
3. **Performance Metrics**: Response times and throughput
4. **Resource Usage**: CPU, memory, and disk usage
5. **User Activity**: Traffic patterns and user behavior

### Accessing Dashboards

```bash
# Start Grafana
docker-compose up -d grafana

# Access dashboard
open http://localhost:3030

# Login credentials
Username: admin
Password: admin
```

## Troubleshooting

### Common Issues

#### 1. Log Files Not Appearing

**Problem**: Log files are not being created or populated.

**Solution**:
```bash
# Check log directory permissions
ls -la logs/

# Verify Fluent Bit is running
docker-compose ps log-aggregator

# Check Fluent Bit logs
docker-compose logs log-aggregator
```

#### 2. High Disk Usage

**Problem**: Log files consuming too much disk space.

**Solution**:
```bash
# Check disk usage
df -h logs/

# Run manual cleanup
./scripts/log-monitor.sh

# Adjust retention settings
export LOG_RETENTION_DAYS=7
```

#### 3. Missing Performance Metrics

**Problem**: Performance metrics not being collected.

**Solution**:
```bash
# Enable performance monitoring
export ENABLE_PERFORMANCE_MONITORING=true

# Check service logs for performance data
grep -r "duration" logs/backend/
```

### Log Debugging

#### Enable Debug Logging

```bash
# Set debug level
export LOG_LEVEL=debug

# Enable detailed debugging
export DEBUG=seiron:*

# Restart services
docker-compose restart
```

#### Validate Log Format

```bash
# Check log format
jq . logs/backend/backend-aggregated.log

# Validate JSON structure
jsonlint logs/backend/backend-aggregated.log
```

## Best Practices

### 1. Log Message Design

- Use structured logging with consistent field names
- Include contextual information (requestId, sessionId)
- Avoid logging sensitive information (private keys, passwords)
- Use appropriate log levels

### 2. Performance Optimization

- Set appropriate log levels for each environment
- Use log sampling for high-volume events
- Implement log rotation to prevent disk issues
- Monitor log aggregation performance

### 3. Security Considerations

- Sanitize log messages to remove sensitive data
- Implement proper file permissions for log files
- Use encrypted storage for sensitive logs
- Regularly rotate log files

### 4. Monitoring Strategy

- Set up alerts for critical error thresholds
- Monitor log aggregation health
- Track log processing latency
- Implement backup verification

## Maintenance

### Regular Tasks

1. **Daily**: Check error rates and alerts
2. **Weekly**: Review performance metrics and trends
3. **Monthly**: Verify backup integrity and retention
4. **Quarterly**: Analyze log patterns and optimize configuration

### Automated Tasks

- Log rotation and compression
- Error rate monitoring and alerting
- Performance metric collection
- Backup creation and verification
- Old log cleanup

## Support

For issues with the logging system:

1. Check the troubleshooting section above
2. Review service logs for error messages
3. Verify configuration settings
4. Check disk space and permissions
5. Consult the Fluent Bit documentation for advanced configuration

## References

- [Fluent Bit Documentation](https://docs.fluentbit.io/)
- [Docker Logging Driver](https://docs.docker.com/config/containers/logging/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Monitoring](https://prometheus.io/docs/)