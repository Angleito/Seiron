#!/usr/bin/env node

/**
 * Configuration Validation Script
 * 
 * This script validates all configuration files against their JSON schemas
 * and performs runtime validation checks.
 */

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

// Initialize AJV
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Configuration files to validate
const CONFIG_FILES = {
  sei: 'sei.json',
  collectors: 'collectors.json',
  features: 'features.json',
  openai: 'openai.json'
};

// Schema files
const SCHEMA_FILES = {
  sei: 'schemas/sei.schema.json',
  collectors: 'schemas/collectors.schema.json',
  features: 'schemas/features.schema.json',
  openai: 'schemas/openai.schema.json'
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function loadJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load ${filePath}: ${error.message}`);
  }
}

function validateConfig(configName, configData, schema) {
  const validator = ajv.compile(schema);
  const isValid = validator(configData);
  
  if (!isValid) {
    const errors = validator.errors.map(error => ({
      path: error.instancePath || error.schemaPath,
      message: error.message,
      value: error.data
    }));
    return { valid: false, errors };
  }
  
  return { valid: true, errors: [] };
}

function performRuntimeValidation(configs) {
  const errors = [];
  
  // Validate network consistency
  const defaultNetwork = configs.sei.defaults.network;
  if (!configs.sei.networks[defaultNetwork]) {
    errors.push(`Default network '${defaultNetwork}' not found in sei.networks`);
  }
  
  // Validate chain IDs are unique
  const chainIds = Object.values(configs.sei.networks).map(n => n.chainId);
  const uniqueChainIds = new Set(chainIds);
  if (chainIds.length !== uniqueChainIds.size) {
    errors.push('Duplicate chain IDs found in sei.networks');
  }
  
  // Validate price feed priorities are unique
  const priorities = configs.collectors.market.priceFeeds.map(f => f.priority);
  const uniquePriorities = new Set(priorities);
  if (priorities.length !== uniquePriorities.size) {
    errors.push('Duplicate priorities found in collectors.market.priceFeeds');
  }
  
  // Validate asset symbols are unique
  const symbols = configs.collectors.market.assets.map(a => a.symbol);
  const uniqueSymbols = new Set(symbols);
  if (symbols.length !== uniqueSymbols.size) {
    errors.push('Duplicate asset symbols found in collectors.market.assets');
  }
  
  // Validate feature validation splits sum to 1
  const { train, validation, test } = configs.features.validation.splits;
  const sum = train + validation + test;
  if (Math.abs(sum - 1.0) > 0.001) {
    errors.push(`Feature validation splits must sum to 1.0, got ${sum}`);
  }
  
  // Validate OpenAI model IDs format
  Object.entries(configs.openai.models).forEach(([name, model]) => {
    if (!model.modelId.match(/^ft:gpt-[34](-turbo)?:[a-zA-Z0-9-_]+$/)) {
      errors.push(`Invalid model ID format for ${name}: ${model.modelId}`);
    }
  });
  
  return errors;
}

function validateEnvironmentFiles() {
  const envFiles = [];
  const configDir = __dirname;
  
  // Find environment-specific files
  fs.readdirSync(configDir).forEach(file => {
    if (file.match(/\.(production|staging|development)\.json$/)) {
      envFiles.push(file);
    }
  });
  
  log(`\n${colors.bold}Environment-specific files:${colors.reset}`);
  if (envFiles.length === 0) {
    log('  No environment-specific files found', 'yellow');
  } else {
    envFiles.forEach(file => {
      log(`  ✓ ${file}`, 'green');
    });
  }
  
  return envFiles;
}

function main() {
  log(`${colors.bold}${colors.blue}Sei Data Collection Configuration Validator${colors.reset}\n`);
  
  let allValid = true;
  const configs = {};
  
  // Load and validate each configuration file
  for (const [configName, configFile] of Object.entries(CONFIG_FILES)) {
    log(`${colors.bold}Validating ${configName} configuration...${colors.reset}`);
    
    try {
      // Load configuration and schema
      const configPath = path.join(__dirname, configFile);
      const schemaPath = path.join(__dirname, SCHEMA_FILES[configName]);
      
      if (!fs.existsSync(configPath)) {
        log(`  ✗ Configuration file not found: ${configFile}`, 'red');
        allValid = false;
        continue;
      }
      
      if (!fs.existsSync(schemaPath)) {
        log(`  ✗ Schema file not found: ${SCHEMA_FILES[configName]}`, 'red');
        allValid = false;
        continue;
      }
      
      const configData = loadJson(configPath);
      const schema = loadJson(schemaPath);
      
      configs[configName] = configData;
      
      // Validate against schema
      const result = validateConfig(configName, configData, schema);
      
      if (result.valid) {
        log(`  ✓ Schema validation passed`, 'green');
      } else {
        log(`  ✗ Schema validation failed:`, 'red');
        result.errors.forEach(error => {
          log(`    - ${error.path}: ${error.message}`, 'red');
        });
        allValid = false;
      }
      
    } catch (error) {
      log(`  ✗ Error: ${error.message}`, 'red');
      allValid = false;
    }
  }
  
  // Perform runtime validation if all schemas passed
  if (allValid && Object.keys(configs).length === Object.keys(CONFIG_FILES).length) {
    log(`\n${colors.bold}Performing runtime validation...${colors.reset}`);
    
    const runtimeErrors = performRuntimeValidation(configs);
    
    if (runtimeErrors.length === 0) {
      log(`  ✓ Runtime validation passed`, 'green');
    } else {
      log(`  ✗ Runtime validation failed:`, 'red');
      runtimeErrors.forEach(error => {
        log(`    - ${error}`, 'red');
      });
      allValid = false;
    }
  }
  
  // Validate environment files
  validateEnvironmentFiles();
  
  // Summary
  log(`\n${colors.bold}Validation Summary:${colors.reset}`);
  if (allValid) {
    log(`  ✓ All configurations are valid and ready for use!`, 'green');
    process.exit(0);
  } else {
    log(`  ✗ Configuration validation failed. Please fix the errors above.`, 'red');
    process.exit(1);
  }
}

// Run validation if called directly
if (require.main === module) {
  main();
}

module.exports = {
  validateConfig,
  performRuntimeValidation,
  loadJson
};