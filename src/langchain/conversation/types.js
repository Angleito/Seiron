"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextError = exports.FlowError = exports.ConversationError = exports.ConversationTurnSchema = exports.ConversationSessionSchema = exports.ConfirmationType = exports.OperationStatus = exports.FlowType = exports.FlowStage = exports.ConversationState = void 0;
exports.isConversationSession = isConversationSession;
exports.isConversationTurn = isConversationTurn;
const zod_1 = require("zod");
const types_js_1 = require("../nlp/types.js");
var ConversationState;
(function (ConversationState) {
    ConversationState["INITIAL"] = "initial";
    ConversationState["EXPLORING"] = "exploring";
    ConversationState["CLARIFYING"] = "clarifying";
    ConversationState["CONFIRMING"] = "confirming";
    ConversationState["EXECUTING"] = "executing";
    ConversationState["COMPLETED"] = "completed";
    ConversationState["FAILED"] = "failed";
    ConversationState["WAITING_INPUT"] = "waiting_input";
})(ConversationState || (exports.ConversationState = ConversationState = {}));
var FlowStage;
(function (FlowStage) {
    FlowStage["DISCOVERY"] = "discovery";
    FlowStage["PARAMETER_GATHERING"] = "parameter_gathering";
    FlowStage["VALIDATION"] = "validation";
    FlowStage["RISK_ASSESSMENT"] = "risk_assessment";
    FlowStage["CONFIRMATION"] = "confirmation";
    FlowStage["EXECUTION"] = "execution";
    FlowStage["FOLLOW_UP"] = "follow_up";
})(FlowStage || (exports.FlowStage = FlowStage = {}));
var FlowType;
(function (FlowType) {
    FlowType["COMMAND_EXECUTION"] = "command_execution";
    FlowType["PARAMETER_COLLECTION"] = "parameter_collection";
    FlowType["DISAMBIGUATION"] = "disambiguation";
    FlowType["RISK_ASSESSMENT"] = "risk_assessment";
    FlowType["ONBOARDING"] = "onboarding";
    FlowType["PORTFOLIO_REVIEW"] = "portfolio_review";
    FlowType["YIELD_OPTIMIZATION"] = "yield_optimization";
})(FlowType || (exports.FlowType = FlowType = {}));
var OperationStatus;
(function (OperationStatus) {
    OperationStatus["PENDING"] = "pending";
    OperationStatus["IN_PROGRESS"] = "in_progress";
    OperationStatus["COMPLETED"] = "completed";
    OperationStatus["FAILED"] = "failed";
    OperationStatus["CANCELLED"] = "cancelled";
})(OperationStatus || (exports.OperationStatus = OperationStatus = {}));
var ConfirmationType;
(function (ConfirmationType) {
    ConfirmationType["TRANSACTION"] = "transaction";
    ConfirmationType["HIGH_RISK"] = "high_risk";
    ConfirmationType["LARGE_AMOUNT"] = "large_amount";
    ConfirmationType["NEW_PROTOCOL"] = "new_protocol";
    ConfirmationType["LEVERAGE"] = "leverage";
    ConfirmationType["BATCH_OPERATION"] = "batch_operation";
})(ConfirmationType || (exports.ConfirmationType = ConfirmationType = {}));
exports.ConversationSessionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    userId: zod_1.z.string().optional(),
    state: zod_1.z.nativeEnum(ConversationState),
    stage: zod_1.z.nativeEnum(FlowStage),
    turns: zod_1.z.array(zod_1.z.any()),
    context: zod_1.z.any(),
    activeFlow: zod_1.z.any().optional(),
    metadata: zod_1.z.any(),
    startTime: zod_1.z.number(),
    lastActivity: zod_1.z.number()
});
exports.ConversationTurnSchema = zod_1.z.object({
    id: zod_1.z.string(),
    sessionId: zod_1.z.string(),
    type: zod_1.z.enum(['user', 'assistant', 'system']),
    content: zod_1.z.string(),
    timestamp: zod_1.z.number(),
    intent: zod_1.z.nativeEnum(types_js_1.DefiIntent).optional(),
    entities: zod_1.z.array(zod_1.z.any()).optional(),
    command: zod_1.z.any().optional(),
    metadata: zod_1.z.any()
});
function isConversationSession(session) {
    return exports.ConversationSessionSchema.safeParse(session).success;
}
function isConversationTurn(turn) {
    return exports.ConversationTurnSchema.safeParse(turn).success;
}
class ConversationError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'ConversationError';
    }
}
exports.ConversationError = ConversationError;
class FlowError extends ConversationError {
    constructor(message, details) {
        super(message, 'FLOW_ERROR', details);
        this.name = 'FlowError';
    }
}
exports.FlowError = FlowError;
class ContextError extends ConversationError {
    constructor(message, details) {
        super(message, 'CONTEXT_ERROR', details);
        this.name = 'ContextError';
    }
}
exports.ContextError = ContextError;
//# sourceMappingURL=types.js.map