# Sei Data Collection Configuration System

This directory contains comprehensive configuration files and utilities for the Sei data collection and portfolio optimization system.

## Overview

The configuration system provides:
- **Type-safe configuration loading** with TypeScript definitions
- **JSON schema validation** for all configuration files
- **Environment-specific configurations** (development, staging, production)
- **Hot-reloading capabilities** for development
- **Runtime validation** and error handling
- **Caching and performance optimization**

## Directory Structure

```
config/
├── sei.json                    # Sei network configurations
├── collectors.json             # Data collector settings
├── features.json              # Feature engineering definitions
├── openai.json                # OpenAI training configuration
├── collectors.production.json  # Production-specific collectors config
├── openai.staging.json        # Staging-specific OpenAI config
├── types/
│   └── index.ts               # TypeScript type definitions
├── schemas/
│   ├── sei.schema.json        # Sei configuration schema
│   ├── collectors.schema.json # Collectors configuration schema
│   ├── features.schema.json   # Features configuration schema
│   └── openai.schema.json     # OpenAI configuration schema
├── utils/
│   ├── index.ts               # Main utilities export
│   ├── loader.ts              # Configuration loader and factory
│   └── validator.ts           # Runtime validation utilities
└── README.md                  # This documentation
```

## Configuration Files

### 1. sei.json - Network Configuration

Defines Sei network configurations for different environments:

```json
{
  "networks": {
    "mainnet": {
      "chainId": 1329,
      "name": "pacific-1",
      "rpcUrl": "https://evm-rpc.sei-apis.com",
      "cosmosRpcUrl": "https://rpc.pacific-1.sei.io",
      // ... more network settings
    }
  },
  "defaults": {
    "network": "mainnet",
    "timeout": 30000,
    "retries": 3
  },
  "contracts": {
    "mainnet": {
      "dexFactory": "sei1466nf3zuxpya8q9emxukd7vftaf6h4psr0a07stwfkw0mt2n56wq83akzz",
      // ... contract addresses
    }
  }
}
```

### 2. collectors.json - Data Collection Settings

Configures data collectors for chain, market, and DeFi data:

```json
{
  "chain": {
    "batchSize": 100,
    "maxRetries": 3,
    "blockRange": 1000,
    "eventFilters": ["PortfolioRebalance", "LiquidityEvent"]
  },
  "market": {
    "updateInterval": 60000,
    "priceFeeds": [
      {
        "name": "chainlink",
        "priority": 1,
        "endpoint": "https://api.chainlinklabs.com"
      }
    ],
    "assets": [
      {
        "symbol": "SEI",
        "coingeckoId": "sei-network",
        "decimals": 6
      }
    ]
  },
  "defi": {
    "protocols": [
      {
        "name": "astroport",
        "type": "dex",
        "enabled": true
      }
    ],
    "refreshInterval": 300000,
    "liquidityThreshold": 10000
  }
}
```

### 3. features.json - Feature Engineering

Defines feature engineering parameters and indicators:

```json
{
  "price": {
    "indicators": {
      "rsi": {
        "period": 14,
        "enabled": true
      },
      "macd": {
        "fast": 12,
        "slow": 26,
        "signal": 9,
        "enabled": true
      }
    },
    "metrics": ["returns", "volatility", "sharpe_ratio"],
    "timeframes": ["1m", "5m", "1h", "1d"]
  },
  "features": {
    "engineering": {
      "lag_features": {
        "enabled": true,
        "lags": [1, 2, 3, 5, 10]
      },
      "rolling_features": {
        "enabled": true,
        "windows": [7, 14, 30],
        "functions": ["mean", "std", "min", "max"]
      }
    },
    "selection": {
      "method": "mutual_info",
      "k_best": 50
    }
  }
}
```

### 4. openai.json - AI Configuration

Configures OpenAI training and deployment settings:

```json
{
  "training": {
    "baseModel": "gpt-4",
    "maxTokens": 4096,
    "temperature": 0.1,
    "trainingExamples": 10000,
    "validationSplit": 0.2
  },
  "fineTuning": {
    "learningRate": 0.0001,
    "batchSize": 32,
    "epochs": 3,
    "suffix": "sei-portfolio"
  },
  "models": {
    "portfolioOptimization": {
      "modelId": "ft:gpt-4:sei-portfolio-opt",
      "maxTokens": 2048,
      "temperature": 0.1
    }
  },
  "prompts": {
    "portfolioOptimization": {
      "system": "You are an expert portfolio optimizer...",
      "template": "Given market data: {market_data}..."
    }
  }
}
```

## Usage

### Basic Configuration Loading

```typescript
import { loadConfig, loadComponentConfig } from './config/utils';

// Load complete application configuration
const appConfig = loadConfig();

// Load specific component configuration
const seiConfig = loadComponentConfig('sei');
const collectorsConfig = loadComponentConfig('collectors');
```

### Configuration Factory

```typescript
import { ConfigFactory } from './config/utils';

const configFactory = ConfigFactory.getInstance();

// Create application configuration with environment merging
const config = configFactory.createAppConfig();

// Enable hot reloading for development
configFactory.enableHotReload();

// Validate all configurations
const isValid = configFactory.validateAllConfigs();
```

### Environment-Specific Configuration

```typescript
// Set environment before loading
process.env.NODE_ENV = 'production';

// Configuration will automatically load environment-specific overrides
const config = loadConfig();

// Manually merge with environment variables
import { EnvironmentConfigMerger } from './config/utils';
const mergedConfig = EnvironmentConfigMerger.mergeWithEnvironment(baseConfig);
```

### Runtime Validation

```typescript
import { ConfigValidator } from './config/utils';

try {
  // Validate specific configuration
  ConfigValidator.validateSeiConfig(seiConfig);
  
  // Validate all configurations
  ConfigValidator.validateAll({
    sei: seiConfig,
    collectors: collectorsConfig,
    features: featuresConfig,
    openai: openaiConfig
  });
} catch (error) {
  console.error('Configuration validation failed:', error);
}
```

### Hot Reloading

```typescript
import { configWatcher } from './config/utils';

// Watch for configuration changes
configWatcher.watch('sei', (newConfig) => {
  console.log('Sei configuration updated:', newConfig);
  // Reinitialize components with new configuration
});

// Stop watching
configWatcher.unwatch('sei');
```

## Environment Variables

The configuration system supports environment variable overrides:

```bash
# General
NODE_ENV=production
APP_VERSION=1.0.0

# Sei Network
SEI_NETWORK=mainnet
SEI_TIMEOUT=30000

# Data Collection
BATCH_SIZE=50
UPDATE_INTERVAL=30000

# OpenAI
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=4096
```

## Environment-Specific Files

Create environment-specific configuration files by adding the environment suffix:

- `collectors.production.json` - Production-specific collectors config
- `openai.staging.json` - Staging-specific OpenAI config
- `sei.development.json` - Development-specific Sei config

These files will automatically override base configurations when the corresponding environment is active.

## Validation

### JSON Schema Validation

All configuration files are validated against JSON schemas located in the `schemas/` directory. The schemas enforce:

- Required fields
- Data types and formats
- Value ranges and constraints
- Pattern matching for addresses and URLs

### Runtime Validation

The `ConfigValidator` class provides additional runtime validation:

- Cross-field validation
- Business logic constraints
- Environment-specific requirements
- Data consistency checks

## Error Handling

The configuration system provides detailed error messages for:

- Missing required fields
- Invalid data types or formats
- Failed validation constraints
- File loading errors
- Environment-specific requirement violations

## Performance Features

### Caching

- Configurations are cached after first load
- Cache can be cleared or selectively reloaded
- Supports hot reloading in development

### Lazy Loading

- Configurations are loaded on-demand
- Component-specific loading for better performance
- Validation occurs only when needed

## Best Practices

1. **Use Type-Safe Loading**: Always use the TypeScript interfaces for configuration access
2. **Validate Early**: Validate configurations at application startup
3. **Environment Separation**: Use environment-specific files for different deployment stages
4. **Monitor Changes**: Use hot reloading in development, file watchers in production
5. **Security**: Never commit sensitive values; use environment variables instead
6. **Documentation**: Keep configuration documentation up-to-date with schema changes

## Configuration Constants

```typescript
import { CONFIG_CONSTANTS } from './config/utils';

// Access default values
const defaultTimeout = CONFIG_CONSTANTS.DEFAULTS.TIMEOUT;
const maxBatchSize = CONFIG_CONSTANTS.VALIDATION.MAX_BATCH_SIZE;
```

## Troubleshooting

### Common Issues

1. **Validation Errors**: Check JSON schema compliance and data types
2. **Missing Files**: Ensure all required configuration files exist
3. **Environment Issues**: Verify NODE_ENV is set correctly
4. **Type Errors**: Check TypeScript interface compatibility
5. **Hot Reload Issues**: Ensure file watchers have proper permissions

### Debug Mode

Enable debug logging to troubleshoot configuration issues:

```typescript
process.env.CONFIG_DEBUG = 'true';
const config = loadConfig();
```

This will output detailed loading and validation information to help identify issues.