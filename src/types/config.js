"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMLExperimentConfig = exports.isExchangeConfig = exports.isDatabaseConfig = exports.mergeConfigs = exports.createDefaultConfig = void 0;
const createDefaultConfig = (environment) => ({
    environment,
    debug_mode: environment === 'development',
    log_level: environment === 'production' ? 'info' : 'debug',
    enabled: true,
    version: '1.0.0',
    created_at: Date.now(),
    updated_at: Date.now(),
    tags: [],
    metadata: {}
});
exports.createDefaultConfig = createDefaultConfig;
const mergeConfigs = (base, override) => ({
    ...base,
    ...override,
    updated_at: Date.now()
});
exports.mergeConfigs = mergeConfigs;
const isDatabaseConfig = (config) => typeof config === 'object' &&
    config !== null &&
    'type' in config &&
    'connection' in config;
exports.isDatabaseConfig = isDatabaseConfig;
const isExchangeConfig = (config) => typeof config === 'object' &&
    config !== null &&
    'exchange_id' in config &&
    'api' in config;
exports.isExchangeConfig = isExchangeConfig;
const isMLExperimentConfig = (config) => typeof config === 'object' &&
    config !== null &&
    'experiment_id' in config &&
    'dataset_config' in config;
exports.isMLExperimentConfig = isMLExperimentConfig;
//# sourceMappingURL=config.js.map