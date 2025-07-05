"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.IntentClassificationError = exports.EntityExtractionError = exports.NLPError = exports.StructuredCommandSchema = exports.IntentClassificationSchema = exports.FinancialEntitySchema = exports.EntityType = exports.DefiIntent = void 0;
exports.isFinancialEntity = isFinancialEntity;
exports.isIntentClassification = isIntentClassification;
exports.isStructuredCommand = isStructuredCommand;
const zod_1 = require("zod");
var DefiIntent;
(function (DefiIntent) {
    DefiIntent["LEND"] = "lend";
    DefiIntent["BORROW"] = "borrow";
    DefiIntent["REPAY"] = "repay";
    DefiIntent["WITHDRAW"] = "withdraw";
    DefiIntent["ADD_LIQUIDITY"] = "add_liquidity";
    DefiIntent["REMOVE_LIQUIDITY"] = "remove_liquidity";
    DefiIntent["SWAP"] = "swap";
    DefiIntent["OPEN_POSITION"] = "open_position";
    DefiIntent["CLOSE_POSITION"] = "close_position";
    DefiIntent["ADJUST_POSITION"] = "adjust_position";
    DefiIntent["ARBITRAGE"] = "arbitrage";
    DefiIntent["CROSS_PROTOCOL_ARBITRAGE"] = "cross_protocol_arbitrage";
    DefiIntent["PORTFOLIO_STATUS"] = "portfolio_status";
    DefiIntent["RISK_ASSESSMENT"] = "risk_assessment";
    DefiIntent["YIELD_OPTIMIZATION"] = "yield_optimization";
    DefiIntent["REBALANCE"] = "rebalance";
    DefiIntent["SHOW_RATES"] = "show_rates";
    DefiIntent["SHOW_POSITIONS"] = "show_positions";
    DefiIntent["COMPARE_PROTOCOLS"] = "compare_protocols";
    DefiIntent["MARKET_ANALYSIS"] = "market_analysis";
    DefiIntent["HELP"] = "help";
    DefiIntent["EXPLAIN"] = "explain";
    DefiIntent["UNKNOWN"] = "unknown";
})(DefiIntent || (exports.DefiIntent = DefiIntent = {}));
var EntityType;
(function (EntityType) {
    EntityType["AMOUNT"] = "amount";
    EntityType["TOKEN"] = "token";
    EntityType["PROTOCOL"] = "protocol";
    EntityType["TIMEFRAME"] = "timeframe";
    EntityType["PERCENTAGE"] = "percentage";
    EntityType["PRICE"] = "price";
    EntityType["LEVERAGE"] = "leverage";
    EntityType["SLIPPAGE"] = "slippage";
    EntityType["RISK_LEVEL"] = "risk_level";
    EntityType["STRATEGY"] = "strategy";
})(EntityType || (exports.EntityType = EntityType = {}));
exports.FinancialEntitySchema = zod_1.z.object({
    type: zod_1.z.nativeEnum(EntityType),
    value: zod_1.z.string(),
    normalized: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
    position: zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()]),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
exports.IntentClassificationSchema = zod_1.z.object({
    intent: zod_1.z.nativeEnum(DefiIntent),
    confidence: zod_1.z.number().min(0).max(1),
    subIntent: zod_1.z.string().optional(),
    entities: zod_1.z.array(exports.FinancialEntitySchema),
    context: zod_1.z.record(zod_1.z.any()).optional()
});
exports.StructuredCommandSchema = zod_1.z.object({
    intent: zod_1.z.nativeEnum(DefiIntent),
    parameters: zod_1.z.record(zod_1.z.any()),
    requiredConfirmation: zod_1.z.boolean(),
    estimatedGas: zod_1.z.number().optional(),
    riskLevel: zod_1.z.enum(['low', 'medium', 'high']),
    protocolsInvolved: zod_1.z.array(zod_1.z.string())
});
function isFinancialEntity(entity) {
    return exports.FinancialEntitySchema.safeParse(entity).success;
}
function isIntentClassification(classification) {
    return exports.IntentClassificationSchema.safeParse(classification).success;
}
function isStructuredCommand(command) {
    return exports.StructuredCommandSchema.safeParse(command).success;
}
class NLPError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'NLPError';
    }
}
exports.NLPError = NLPError;
class EntityExtractionError extends NLPError {
    constructor(message, details) {
        super(message, 'ENTITY_EXTRACTION_ERROR', details);
        this.name = 'EntityExtractionError';
    }
}
exports.EntityExtractionError = EntityExtractionError;
class IntentClassificationError extends NLPError {
    constructor(message, details) {
        super(message, 'INTENT_CLASSIFICATION_ERROR', details);
        this.name = 'IntentClassificationError';
    }
}
exports.IntentClassificationError = IntentClassificationError;
class ValidationError extends NLPError {
    constructor(message, details) {
        super(message, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
//# sourceMappingURL=types.js.map