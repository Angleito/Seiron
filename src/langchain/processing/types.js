"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandBuildingError = exports.ParameterValidationError = exports.CommandProcessingError = exports.ExecutableCommandSchema = exports.CommandParametersSchema = void 0;
exports.isExecutableCommand = isExecutableCommand;
exports.isCommandParameters = isCommandParameters;
const zod_1 = require("zod");
const types_js_1 = require("../nlp/types.js");
exports.CommandParametersSchema = zod_1.z.object({
    primary: zod_1.z.object({
        amount: zod_1.z.string().optional(),
        token: zod_1.z.string().optional(),
        fromToken: zod_1.z.string().optional(),
        toToken: zod_1.z.string().optional(),
        protocol: zod_1.z.string().optional(),
        leverage: zod_1.z.number().optional(),
        slippage: zod_1.z.number().optional(),
        deadline: zod_1.z.number().optional()
    }),
    optional: zod_1.z.object({
        maxSlippage: zod_1.z.number().optional(),
        minOutput: zod_1.z.string().optional(),
        deadline: zod_1.z.number().optional(),
        gasLimit: zod_1.z.number().optional(),
        gasPrice: zod_1.z.string().optional(),
        recipient: zod_1.z.string().optional(),
        referrer: zod_1.z.string().optional(),
        route: zod_1.z.array(zod_1.z.string()).optional()
    }),
    derived: zod_1.z.object({
        outputAmount: zod_1.z.string().optional(),
        priceImpact: zod_1.z.number().optional(),
        fees: zod_1.z.array(zod_1.z.any()).optional(),
        route: zod_1.z.array(zod_1.z.any()).optional(),
        healthFactorAfter: zod_1.z.number().optional(),
        liquidationPrice: zod_1.z.string().optional(),
        totalCost: zod_1.z.string().optional()
    })
});
exports.ExecutableCommandSchema = zod_1.z.object({
    id: zod_1.z.string(),
    intent: zod_1.z.nativeEnum(types_js_1.DefiIntent),
    action: zod_1.z.string(),
    parameters: exports.CommandParametersSchema,
    metadata: zod_1.z.object({
        timestamp: zod_1.z.number(),
        source: zod_1.z.enum(['nlp', 'direct', 'suggestion']),
        confidence: zod_1.z.number(),
        processingTime: zod_1.z.number(),
        requiredApprovals: zod_1.z.array(zod_1.z.any()),
        protocolsInvolved: zod_1.z.array(zod_1.z.string()),
        estimatedDuration: zod_1.z.number()
    }),
    validationStatus: zod_1.z.enum(['valid', 'warning', 'error']),
    confirmationRequired: zod_1.z.boolean(),
    estimatedGas: zod_1.z.number().optional(),
    riskLevel: zod_1.z.enum(['low', 'medium', 'high'])
});
function isExecutableCommand(command) {
    return exports.ExecutableCommandSchema.safeParse(command).success;
}
function isCommandParameters(params) {
    return exports.CommandParametersSchema.safeParse(params).success;
}
class CommandProcessingError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'CommandProcessingError';
    }
}
exports.CommandProcessingError = CommandProcessingError;
class ParameterValidationError extends CommandProcessingError {
    constructor(message, details) {
        super(message, 'PARAMETER_VALIDATION_ERROR', details);
        this.name = 'ParameterValidationError';
    }
}
exports.ParameterValidationError = ParameterValidationError;
class CommandBuildingError extends CommandProcessingError {
    constructor(message, details) {
        super(message, 'COMMAND_BUILDING_ERROR', details);
        this.name = 'CommandBuildingError';
    }
}
exports.CommandBuildingError = CommandBuildingError;
//# sourceMappingURL=types.js.map