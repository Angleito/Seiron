"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfirmationHandler = void 0;
const tslib_1 = require("tslib");
const E = tslib_1.__importStar(require("fp-ts/Either"));
const O = tslib_1.__importStar(require("fp-ts/Option"));
const uuid_1 = require("uuid");
const types_js_1 = require("./types.js");
class ConfirmationHandler {
    config;
    pendingConfirmations;
    riskAnalyzer;
    summaryGenerator;
    constructor(config) {
        this.config = config;
        this.pendingConfirmations = new Map();
        this.riskAnalyzer = new RiskAnalyzer();
        this.summaryGenerator = new SummaryGenerator();
    }
    async createConfirmationRequest(command, session) {
        try {
            const confirmationType = this.determineConfirmationType(command);
            const risks = await this.riskAnalyzer.analyzeRisks(command, session);
            const summary = await this.summaryGenerator.generateSummary(command, session);
            const options = this.generateConfirmationOptions(confirmationType, command, risks);
            const request = {
                id: (0, uuid_1.v4)(),
                type: confirmationType,
                command,
                risks,
                summary,
                options,
                timeout: this.config.timeout,
                createdAt: Date.now()
            };
            this.pendingConfirmations.set(request.id, {
                request,
                expiresAt: Date.now() + this.config.timeout,
                retryCount: 0
            });
            return E.right(request);
        }
        catch (error) {
            return E.left(new types_js_1.ConversationError('Failed to create confirmation request', 'CONFIRMATION_ERROR', { originalError: error, command: command.id }));
        }
    }
    async processConfirmationResponse(requestId, response, session) {
        try {
            const pending = this.pendingConfirmations.get(requestId);
            if (!pending) {
                return E.left(new types_js_1.ConversationError('Confirmation request not found or expired', 'REQUEST_NOT_FOUND', { requestId }));
            }
            if (Date.now() > pending.expiresAt) {
                this.pendingConfirmations.delete(requestId);
                return E.left(new types_js_1.ConversationError('Confirmation request has expired', 'REQUEST_EXPIRED', { requestId, expiresAt: pending.expiresAt }));
            }
            const selectedOption = this.parseUserResponse(response, pending.request.options);
            if (O.isNone(selectedOption)) {
                const updatedPending = {
                    ...pending,
                    retryCount: pending.retryCount + 1
                };
                if (updatedPending.retryCount >= this.config.retryCount) {
                    this.pendingConfirmations.delete(requestId);
                    return E.left(new types_js_1.ConversationError('Too many unclear responses, confirmation cancelled', 'MAX_RETRIES_REACHED', { requestId, retryCount: updatedPending.retryCount }));
                }
                this.pendingConfirmations.set(requestId, updatedPending);
                return E.left(new types_js_1.ConversationError('Response unclear, please clarify your choice', 'UNCLEAR_RESPONSE', { requestId, availableOptions: pending.request.options.map(o => o.label) }));
            }
            const option = selectedOption.value;
            const result = await this.processConfirmationOption(option, pending.request, response, session);
            this.pendingConfirmations.delete(requestId);
            return E.right(result);
        }
        catch (error) {
            return E.left(new types_js_1.ConversationError('Failed to process confirmation response', 'PROCESSING_ERROR', { originalError: error, requestId, response }));
        }
    }
    getConfirmationStatus(requestId) {
        const pending = this.pendingConfirmations.get(requestId);
        if (!pending) {
            return O.none;
        }
        const timeRemaining = Math.max(0, pending.expiresAt - Date.now());
        return O.some({
            request: pending.request,
            timeRemaining,
            retryCount: pending.retryCount
        });
    }
    async cancelConfirmation(requestId, reason) {
        try {
            const pending = this.pendingConfirmations.get(requestId);
            if (!pending) {
                return E.left(new types_js_1.ConversationError('Confirmation request not found', 'REQUEST_NOT_FOUND', { requestId }));
            }
            this.pendingConfirmations.delete(requestId);
            return E.right(true);
        }
        catch (error) {
            return E.left(new types_js_1.ConversationError('Failed to cancel confirmation', 'CANCELLATION_ERROR', { originalError: error, requestId, reason }));
        }
    }
    async cleanupExpiredConfirmations() {
        let cleanedCount = 0;
        const now = Date.now();
        for (const [requestId, pending] of this.pendingConfirmations.entries()) {
            if (now > pending.expiresAt) {
                this.pendingConfirmations.delete(requestId);
                cleanedCount++;
            }
        }
        return cleanedCount;
    }
    determineConfirmationType(command) {
        if (command.riskLevel === 'high') {
            return types_js_1.ConfirmationType.HIGH_RISK;
        }
        const amount = parseFloat(command.parameters.primary.amount || '0');
        if (amount > 50000) {
            return types_js_1.ConfirmationType.LARGE_AMOUNT;
        }
        if (command.parameters.primary.leverage && command.parameters.primary.leverage > 2) {
            return types_js_1.ConfirmationType.LEVERAGE;
        }
        if (command.action === 'batch') {
            return types_js_1.ConfirmationType.BATCH_OPERATION;
        }
        return types_js_1.ConfirmationType.TRANSACTION;
    }
    generateConfirmationOptions(type, command, risks) {
        const baseOptions = [
            {
                id: 'confirm',
                label: 'Confirm',
                description: 'Proceed with the operation as specified',
                action: 'confirm',
                isDefault: false
            },
            {
                id: 'cancel',
                label: 'Cancel',
                description: 'Cancel this operation',
                action: 'cancel',
                isDefault: false
            }
        ];
        switch (type) {
            case types_js_1.ConfirmationType.HIGH_RISK:
                baseOptions.splice(1, 0, {
                    id: 'reduce_risk',
                    label: 'Reduce Risk',
                    description: 'Modify the operation to reduce risk',
                    action: 'modify',
                    isDefault: true
                });
                break;
            case types_js_1.ConfirmationType.LARGE_AMOUNT:
                baseOptions.splice(1, 0, {
                    id: 'reduce_amount',
                    label: 'Use Smaller Amount',
                    description: 'Proceed with a smaller amount',
                    action: 'modify',
                    isDefault: true
                });
                break;
            case types_js_1.ConfirmationType.LEVERAGE:
                baseOptions.splice(1, 0, {
                    id: 'reduce_leverage',
                    label: 'Lower Leverage',
                    description: 'Use lower leverage for safety',
                    action: 'modify',
                    isDefault: true
                });
                break;
            case types_js_1.ConfirmationType.BATCH_OPERATION:
                baseOptions.splice(1, 0, {
                    id: 'review_individually',
                    label: 'Review Each Step',
                    description: 'Review each operation individually',
                    action: 'modify',
                    isDefault: false
                });
                break;
        }
        const hasHighRisk = risks.some(risk => risk.severity === 'high' || risk.severity === 'critical');
        if (hasHighRisk) {
            baseOptions.forEach(option => {
                option.isDefault = option.action === 'cancel';
            });
        }
        else {
            baseOptions.forEach(option => {
                option.isDefault = option.action === 'confirm';
            });
        }
        return baseOptions;
    }
    parseUserResponse(response, options) {
        const lowerResponse = response.toLowerCase().trim();
        for (const option of options) {
            if (lowerResponse === option.id.toLowerCase() ||
                lowerResponse === option.label.toLowerCase()) {
                return O.some(option);
            }
        }
        const keywordMap = {
            'yes': 'confirm',
            'y': 'confirm',
            'ok': 'confirm',
            'proceed': 'confirm',
            'go ahead': 'confirm',
            'no': 'cancel',
            'n': 'cancel',
            'cancel': 'cancel',
            'stop': 'cancel',
            'abort': 'cancel',
            'modify': 'reduce_risk',
            'change': 'reduce_risk',
            'adjust': 'reduce_risk'
        };
        for (const [keyword, optionId] of Object.entries(keywordMap)) {
            if (lowerResponse.includes(keyword)) {
                const option = options.find(o => o.id === optionId);
                if (option) {
                    return O.some(option);
                }
            }
        }
        return O.none;
    }
    async processConfirmationOption(option, request, userResponse, session) {
        const timestamp = Date.now();
        switch (option.action) {
            case 'confirm':
                return {
                    confirmed: true,
                    selectedOption: option.id,
                    timestamp
                };
            case 'cancel':
                return {
                    confirmed: false,
                    selectedOption: option.id,
                    timestamp
                };
            case 'modify':
                const modifiedCommand = await this.generateModifiedCommand(request.command, option.id, session);
                return {
                    confirmed: false,
                    selectedOption: option.id,
                    modifiedCommand,
                    userNotes: userResponse,
                    timestamp
                };
            default:
                return {
                    confirmed: false,
                    selectedOption: option.id,
                    timestamp
                };
        }
    }
    async generateModifiedCommand(originalCommand, modificationId, session) {
        const modified = { ...originalCommand };
        switch (modificationId) {
            case 'reduce_risk':
                if (modified.parameters.primary.leverage && modified.parameters.primary.leverage > 1) {
                    modified.parameters.primary.leverage = Math.max(1, modified.parameters.primary.leverage / 2);
                }
                if (modified.parameters.optional.maxSlippage) {
                    modified.parameters.optional.maxSlippage *= 1.5;
                }
                modified.riskLevel = modified.riskLevel === 'high' ? 'medium' : 'low';
                break;
            case 'reduce_amount':
                const currentAmount = parseFloat(modified.parameters.primary.amount || '0');
                const reducedAmount = currentAmount * 0.5;
                modified.parameters.primary.amount = reducedAmount.toString();
                break;
            case 'reduce_leverage':
                if (modified.parameters.primary.leverage) {
                    modified.parameters.primary.leverage = Math.max(1, modified.parameters.primary.leverage / 2);
                    modified.riskLevel = 'medium';
                }
                break;
        }
        modified.id = `${originalCommand.id}_modified_${Date.now()}`;
        return modified;
    }
    formatConfirmationRequest(request) {
        const lines = [
            `🔍 **Operation Confirmation Required**`,
            '',
            `**Summary:**`,
            `Action: ${request.summary.action}`,
            `Amount: ${request.summary.amount || 'N/A'} ${request.summary.token || ''}`,
            `Protocol: ${request.summary.protocol}`,
            `Estimated Gas: ${request.summary.estimatedGas}`,
            `Estimated Cost: ${request.summary.estimatedCost}`,
            '',
            `**Expected Outcome:**`,
            request.summary.expectedOutcome
        ];
        if (request.risks.length > 0) {
            lines.push('', '⚠️ **Risk Warnings:**');
            request.risks.forEach(risk => {
                const icon = this.getRiskIcon(risk.severity);
                lines.push(`${icon} ${risk.message}`);
                if (risk.mitigation) {
                    lines.push(`   💡 ${risk.mitigation}`);
                }
            });
        }
        lines.push('', '**Options:**');
        request.options.forEach((option, index) => {
            const prefix = option.isDefault ? '👉' : `${index + 1}.`;
            lines.push(`${prefix} **${option.label}** - ${option.description}`);
        });
        lines.push('', `⏱️ You have ${Math.floor(request.timeout / 1000)} seconds to respond.`);
        return lines.join('\n');
    }
    getRiskIcon(severity) {
        switch (severity) {
            case 'critical':
                return '🚨';
            case 'high':
                return '⚠️';
            case 'medium':
                return '⚡';
            case 'low':
                return 'ℹ️';
            default:
                return '•';
        }
    }
}
exports.ConfirmationHandler = ConfirmationHandler;
class RiskAnalyzer {
    async analyzeRisks(command, session) {
        const risks = [];
        const amount = parseFloat(command.parameters.primary.amount || '0');
        if (amount > 100000) {
            risks.push({
                severity: 'high',
                type: 'large_amount',
                message: 'Very large transaction amount',
                impact: 'High financial exposure',
                mitigation: 'Consider splitting into smaller transactions'
            });
        }
        else if (amount > 10000) {
            risks.push({
                severity: 'medium',
                type: 'medium_amount',
                message: 'Significant transaction amount',
                impact: 'Notable financial exposure'
            });
        }
        const leverage = command.parameters.primary.leverage;
        if (leverage && leverage > 5) {
            risks.push({
                severity: 'critical',
                type: 'high_leverage',
                message: 'Very high leverage ratio',
                impact: 'High liquidation risk',
                mitigation: 'Use lower leverage or add more collateral'
            });
        }
        else if (leverage && leverage > 2) {
            risks.push({
                severity: 'high',
                type: 'medium_leverage',
                message: 'High leverage ratio',
                impact: 'Increased liquidation risk',
                mitigation: 'Monitor position closely and consider lower leverage'
            });
        }
        const protocol = command.parameters.primary.protocol;
        if (protocol === 'experimental_protocol') {
            risks.push({
                severity: 'high',
                type: 'experimental_protocol',
                message: 'Using experimental protocol',
                impact: 'Unaudited smart contract risks'
            });
        }
        if (command.parameters.derived?.priceImpact && command.parameters.derived.priceImpact > 5) {
            risks.push({
                severity: 'medium',
                type: 'high_price_impact',
                message: 'High price impact detected',
                impact: 'Unfavorable execution price',
                mitigation: 'Consider smaller amount or different timing'
            });
        }
        if (command.estimatedGas && command.estimatedGas > 1000000) {
            risks.push({
                severity: 'medium',
                type: 'high_gas',
                message: 'High gas consumption expected',
                impact: 'Expensive transaction fees'
            });
        }
        return risks;
    }
}
class SummaryGenerator {
    async generateSummary(command, session) {
        const amount = command.parameters.primary.amount || 'N/A';
        const token = command.parameters.primary.token ||
            command.parameters.primary.fromToken || 'N/A';
        const protocol = command.parameters.primary.protocol || 'Default';
        const action = this.generateActionDescription(command);
        const estimatedCost = this.calculateEstimatedCost(command);
        const expectedOutcome = this.generateExpectedOutcome(command);
        const risks = this.extractRiskSummary(command);
        return {
            action,
            amount,
            token,
            protocol,
            estimatedGas: command.estimatedGas || 0,
            estimatedCost,
            expectedOutcome,
            risks
        };
    }
    generateActionDescription(command) {
        switch (command.intent) {
            case 'lend':
                return `Supply ${command.parameters.primary.amount} ${command.parameters.primary.token} for lending`;
            case 'borrow':
                return `Borrow ${command.parameters.primary.amount} ${command.parameters.primary.token}`;
            case 'swap':
                return `Swap ${command.parameters.primary.amount} ${command.parameters.primary.fromToken} to ${command.parameters.primary.toToken}`;
            default:
                return `Execute ${command.action} operation`;
        }
    }
    calculateEstimatedCost(command) {
        const gasPrice = 20;
        const gasCost = (command.estimatedGas || 0) * gasPrice * 0.000000001;
        const protocolFee = parseFloat(command.parameters.primary.amount || '0') * 0.003;
        const totalCost = gasCost + protocolFee;
        return `$${totalCost.toFixed(2)}`;
    }
    generateExpectedOutcome(command) {
        switch (command.intent) {
            case 'lend':
                return `Start earning interest on your ${command.parameters.primary.token}`;
            case 'borrow':
                return `Receive ${command.parameters.primary.amount} ${command.parameters.primary.token} in your wallet`;
            case 'swap':
                return `Receive approximately ${command.parameters.derived?.outputAmount || 'calculated'} ${command.parameters.primary.toToken}`;
            default:
                return 'Operation will be executed as specified';
        }
    }
    extractRiskSummary(command) {
        const risks = [];
        if (command.riskLevel === 'high') {
            risks.push('High risk operation');
        }
        if (command.parameters.primary.leverage && command.parameters.primary.leverage > 2) {
            risks.push('Leveraged position');
        }
        if (command.parameters.derived?.priceImpact && command.parameters.derived.priceImpact > 3) {
            risks.push('High price impact');
        }
        return risks;
    }
}
//# sourceMappingURL=ConfirmationHandler.js.map