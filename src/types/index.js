"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVALUATION_METRICS = exports.COMMON_FEATURES = exports.DEFAULT_SYSTEM_CONFIG = exports.isMLExperimentConfig = exports.isExchangeConfig = exports.isDatabaseConfig = exports.mergeConfigs = exports.createDefaultConfig = exports.FreeM = exports.StateM = exports.Parsers = exports.composeLens = exports.lens = exports.memoize = exports.partial = exports.curry = exports.pipe = exports.compose = exports.AsyncUtils = exports.EitherM = exports.Maybe = void 0;
var utils_js_1 = require("./utils.js");
Object.defineProperty(exports, "Maybe", { enumerable: true, get: function () { return utils_js_1.Maybe; } });
Object.defineProperty(exports, "EitherM", { enumerable: true, get: function () { return utils_js_1.EitherM; } });
Object.defineProperty(exports, "AsyncUtils", { enumerable: true, get: function () { return utils_js_1.AsyncUtils; } });
Object.defineProperty(exports, "compose", { enumerable: true, get: function () { return utils_js_1.compose; } });
Object.defineProperty(exports, "pipe", { enumerable: true, get: function () { return utils_js_1.pipe; } });
Object.defineProperty(exports, "curry", { enumerable: true, get: function () { return utils_js_1.curry; } });
Object.defineProperty(exports, "partial", { enumerable: true, get: function () { return utils_js_1.partial; } });
Object.defineProperty(exports, "memoize", { enumerable: true, get: function () { return utils_js_1.memoize; } });
Object.defineProperty(exports, "lens", { enumerable: true, get: function () { return utils_js_1.lens; } });
Object.defineProperty(exports, "composeLens", { enumerable: true, get: function () { return utils_js_1.composeLens; } });
Object.defineProperty(exports, "Parsers", { enumerable: true, get: function () { return utils_js_1.Parsers; } });
Object.defineProperty(exports, "StateM", { enumerable: true, get: function () { return utils_js_1.StateM; } });
Object.defineProperty(exports, "FreeM", { enumerable: true, get: function () { return utils_js_1.FreeM; } });
var config_js_1 = require("./config.js");
Object.defineProperty(exports, "createDefaultConfig", { enumerable: true, get: function () { return config_js_1.createDefaultConfig; } });
Object.defineProperty(exports, "mergeConfigs", { enumerable: true, get: function () { return config_js_1.mergeConfigs; } });
Object.defineProperty(exports, "isDatabaseConfig", { enumerable: true, get: function () { return config_js_1.isDatabaseConfig; } });
Object.defineProperty(exports, "isExchangeConfig", { enumerable: true, get: function () { return config_js_1.isExchangeConfig; } });
Object.defineProperty(exports, "isMLExperimentConfig", { enumerable: true, get: function () { return config_js_1.isMLExperimentConfig; } });
exports.DEFAULT_SYSTEM_CONFIG = {
    BATCH_SIZE: 1000,
    TIMEOUT_MS: 30000,
    RETRY_ATTEMPTS: 3,
    CACHE_TTL_SECONDS: 3600,
    FEATURE_PIPELINE_VERSION: '1.0.0',
    MODEL_CHECKPOINT_INTERVAL: 100,
    DATA_RETENTION_DAYS: 90
};
exports.COMMON_FEATURES = {
    PRICE: 'price',
    VOLUME: 'volume',
    TIMESTAMP: 'timestamp',
    VOLATILITY: 'volatility',
    RSI: 'rsi',
    MACD: 'macd',
    BOLLINGER_BANDS: 'bollinger_bands',
    MOVING_AVERAGE: 'moving_average'
};
exports.EVALUATION_METRICS = {
    ACCURACY: 'accuracy',
    PRECISION: 'precision',
    RECALL: 'recall',
    F1_SCORE: 'f1_score',
    AUC_ROC: 'auc_roc',
    RMSE: 'rmse',
    MAE: 'mae',
    SHARPE_RATIO: 'sharpe_ratio'
};
//# sourceMappingURL=index.js.map