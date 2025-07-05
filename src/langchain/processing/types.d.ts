import { z } from 'zod';
import type { Result, ReadonlyRecord } from '../../types/index.js';
import { DefiIntent } from '../nlp/types.js';
export interface CommandProcessingResult {
    readonly command: ExecutableCommand | null;
    readonly validationErrors: ReadonlyArray<CommandValidationError>;
    readonly suggestions: ReadonlyArray<CommandSuggestion>;
    readonly requiresDisambiguation: boolean;
    readonly disambiguationOptions?: DisambiguationOptions;
    readonly estimatedGas?: number;
    readonly riskLevel: 'low' | 'medium' | 'high';
}
export interface ExecutableCommand {
    readonly id: string;
    readonly intent: DefiIntent;
    readonly action: string;
    readonly parameters: CommandParameters;
    readonly metadata: CommandMetadata;
    readonly validationStatus: 'valid' | 'warning' | 'error';
    readonly confirmationRequired: boolean;
    readonly estimatedGas?: number;
    readonly riskLevel: 'low' | 'medium' | 'high';
}
export interface CommandParameters {
    readonly primary: PrimaryParameters;
    readonly optional: OptionalParameters;
    readonly derived: DerivedParameters;
}
export interface PrimaryParameters {
    readonly amount?: string;
    readonly token?: string;
    readonly fromToken?: string;
    readonly toToken?: string;
    readonly protocol?: string;
    readonly leverage?: number;
    readonly slippage?: number;
    readonly deadline?: number;
}
export interface OptionalParameters {
    readonly maxSlippage?: number;
    readonly minOutput?: string;
    readonly deadline?: number;
    readonly gasLimit?: number;
    readonly gasPrice?: string;
    readonly recipient?: string;
    readonly referrer?: string;
    readonly route?: string[];
}
export interface DerivedParameters {
    readonly outputAmount?: string;
    readonly priceImpact?: number;
    readonly fees?: Fee[];
    readonly route?: RouteStep[];
    readonly healthFactorAfter?: number;
    readonly liquidationPrice?: string;
    readonly totalCost?: string;
}
export interface CommandMetadata {
    readonly timestamp: number;
    readonly source: 'nlp' | 'direct' | 'suggestion';
    readonly confidence: number;
    readonly processingTime: number;
    readonly requiredApprovals: Approval[];
    readonly protocolsInvolved: string[];
    readonly estimatedDuration: number;
}
export interface Fee {
    readonly type: 'protocol' | 'gas' | 'slippage' | 'arbitrage';
    readonly amount: string;
    readonly token: string;
    readonly percentage?: number;
}
export interface RouteStep {
    readonly protocol: string;
    readonly pool: string;
    readonly fromToken: string;
    readonly toToken: string;
    readonly percentage: number;
}
export interface Approval {
    readonly token: string;
    readonly spender: string;
    readonly amount: string;
    readonly required: boolean;
    readonly gasEstimate: number;
}
export interface CommandValidationError {
    readonly field: string;
    readonly code: string;
    readonly message: string;
    readonly severity: 'error' | 'warning' | 'info';
    readonly suggestion?: string;
    readonly metadata?: ReadonlyRecord<string, any>;
}
export interface CommandSuggestion {
    readonly type: 'alternative' | 'optimization' | 'warning' | 'enhancement';
    readonly title: string;
    readonly description: string;
    readonly action?: string;
    readonly parameters?: Partial<CommandParameters>;
    readonly expectedBenefit?: string;
    readonly riskLevel?: 'low' | 'medium' | 'high';
}
export interface DisambiguationOptions {
    readonly question: string;
    readonly options: ReadonlyArray<DisambiguationOption>;
    readonly defaultOption?: string;
    readonly timeout: number;
}
export interface DisambiguationOption {
    readonly id: string;
    readonly label: string;
    readonly description: string;
    readonly parameters: Partial<CommandParameters>;
    readonly confidence: number;
}
export interface ParameterValidationRule {
    readonly field: string;
    readonly required: boolean;
    readonly type: 'string' | 'number' | 'boolean' | 'token' | 'protocol' | 'address';
    readonly validator: (value: any) => boolean;
    readonly normalizer?: (value: any) => any;
    readonly dependsOn?: string[];
    readonly constraints?: ParameterConstraints;
}
export interface ParameterConstraints {
    readonly min?: number;
    readonly max?: number;
    readonly pattern?: RegExp;
    readonly enum?: ReadonlyArray<string>;
    readonly custom?: (value: any, context: any) => boolean;
}
export interface CommandBuilderConfig {
    readonly defaultSlippage: number;
    readonly defaultDeadline: number;
    readonly maxGasPrice: string;
    readonly riskThresholds: RiskThresholds;
    readonly supportedProtocols: ReadonlyArray<string>;
    readonly supportedTokens: ReadonlyArray<string>;
}
export interface RiskThresholds {
    readonly low: number;
    readonly medium: number;
    readonly high: number;
    readonly liquidation: number;
}
export interface ParsingContext {
    readonly userAddress?: string;
    readonly balances?: ReadonlyRecord<string, string>;
    readonly allowances?: ReadonlyRecord<string, ReadonlyRecord<string, string>>;
    readonly positions?: ReadonlyArray<any>;
    readonly marketData?: ReadonlyRecord<string, any>;
    readonly gasPrice?: string;
    readonly blockNumber?: number;
}
export interface CommandTemplate {
    readonly intent: DefiIntent;
    readonly action: string;
    readonly requiredParameters: ReadonlyArray<string>;
    readonly optionalParameters: ReadonlyArray<string>;
    readonly validationRules: ReadonlyArray<ParameterValidationRule>;
    readonly riskLevel: 'low' | 'medium' | 'high';
    readonly gasEstimate: number;
    readonly examples: ReadonlyArray<string>;
}
export declare const CommandParametersSchema: z.ZodObject<{
    primary: z.ZodObject<{
        amount: z.ZodOptional<z.ZodString>;
        token: z.ZodOptional<z.ZodString>;
        fromToken: z.ZodOptional<z.ZodString>;
        toToken: z.ZodOptional<z.ZodString>;
        protocol: z.ZodOptional<z.ZodString>;
        leverage: z.ZodOptional<z.ZodNumber>;
        slippage: z.ZodOptional<z.ZodNumber>;
        deadline: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        token?: string;
        amount?: string;
        leverage?: number;
        protocol?: string;
        slippage?: number;
        fromToken?: string;
        toToken?: string;
        deadline?: number;
    }, {
        token?: string;
        amount?: string;
        leverage?: number;
        protocol?: string;
        slippage?: number;
        fromToken?: string;
        toToken?: string;
        deadline?: number;
    }>;
    optional: z.ZodObject<{
        maxSlippage: z.ZodOptional<z.ZodNumber>;
        minOutput: z.ZodOptional<z.ZodString>;
        deadline: z.ZodOptional<z.ZodNumber>;
        gasLimit: z.ZodOptional<z.ZodNumber>;
        gasPrice: z.ZodOptional<z.ZodString>;
        recipient: z.ZodOptional<z.ZodString>;
        referrer: z.ZodOptional<z.ZodString>;
        route: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        route?: string[];
        referrer?: string;
        gasLimit?: number;
        gasPrice?: string;
        deadline?: number;
        maxSlippage?: number;
        minOutput?: string;
        recipient?: string;
    }, {
        route?: string[];
        referrer?: string;
        gasLimit?: number;
        gasPrice?: string;
        deadline?: number;
        maxSlippage?: number;
        minOutput?: string;
        recipient?: string;
    }>;
    derived: z.ZodObject<{
        outputAmount: z.ZodOptional<z.ZodString>;
        priceImpact: z.ZodOptional<z.ZodNumber>;
        fees: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        route: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        healthFactorAfter: z.ZodOptional<z.ZodNumber>;
        liquidationPrice: z.ZodOptional<z.ZodString>;
        totalCost: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        route?: any[];
        liquidationPrice?: string;
        fees?: any[];
        outputAmount?: string;
        priceImpact?: number;
        healthFactorAfter?: number;
        totalCost?: string;
    }, {
        route?: any[];
        liquidationPrice?: string;
        fees?: any[];
        outputAmount?: string;
        priceImpact?: number;
        healthFactorAfter?: number;
        totalCost?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    optional?: {
        route?: string[];
        referrer?: string;
        gasLimit?: number;
        gasPrice?: string;
        deadline?: number;
        maxSlippage?: number;
        minOutput?: string;
        recipient?: string;
    };
    primary?: {
        token?: string;
        amount?: string;
        leverage?: number;
        protocol?: string;
        slippage?: number;
        fromToken?: string;
        toToken?: string;
        deadline?: number;
    };
    derived?: {
        route?: any[];
        liquidationPrice?: string;
        fees?: any[];
        outputAmount?: string;
        priceImpact?: number;
        healthFactorAfter?: number;
        totalCost?: string;
    };
}, {
    optional?: {
        route?: string[];
        referrer?: string;
        gasLimit?: number;
        gasPrice?: string;
        deadline?: number;
        maxSlippage?: number;
        minOutput?: string;
        recipient?: string;
    };
    primary?: {
        token?: string;
        amount?: string;
        leverage?: number;
        protocol?: string;
        slippage?: number;
        fromToken?: string;
        toToken?: string;
        deadline?: number;
    };
    derived?: {
        route?: any[];
        liquidationPrice?: string;
        fees?: any[];
        outputAmount?: string;
        priceImpact?: number;
        healthFactorAfter?: number;
        totalCost?: string;
    };
}>;
export declare const ExecutableCommandSchema: z.ZodObject<{
    id: z.ZodString;
    intent: z.ZodNativeEnum<typeof DefiIntent>;
    action: z.ZodString;
    parameters: z.ZodObject<{
        primary: z.ZodObject<{
            amount: z.ZodOptional<z.ZodString>;
            token: z.ZodOptional<z.ZodString>;
            fromToken: z.ZodOptional<z.ZodString>;
            toToken: z.ZodOptional<z.ZodString>;
            protocol: z.ZodOptional<z.ZodString>;
            leverage: z.ZodOptional<z.ZodNumber>;
            slippage: z.ZodOptional<z.ZodNumber>;
            deadline: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            token?: string;
            amount?: string;
            leverage?: number;
            protocol?: string;
            slippage?: number;
            fromToken?: string;
            toToken?: string;
            deadline?: number;
        }, {
            token?: string;
            amount?: string;
            leverage?: number;
            protocol?: string;
            slippage?: number;
            fromToken?: string;
            toToken?: string;
            deadline?: number;
        }>;
        optional: z.ZodObject<{
            maxSlippage: z.ZodOptional<z.ZodNumber>;
            minOutput: z.ZodOptional<z.ZodString>;
            deadline: z.ZodOptional<z.ZodNumber>;
            gasLimit: z.ZodOptional<z.ZodNumber>;
            gasPrice: z.ZodOptional<z.ZodString>;
            recipient: z.ZodOptional<z.ZodString>;
            referrer: z.ZodOptional<z.ZodString>;
            route: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            route?: string[];
            referrer?: string;
            gasLimit?: number;
            gasPrice?: string;
            deadline?: number;
            maxSlippage?: number;
            minOutput?: string;
            recipient?: string;
        }, {
            route?: string[];
            referrer?: string;
            gasLimit?: number;
            gasPrice?: string;
            deadline?: number;
            maxSlippage?: number;
            minOutput?: string;
            recipient?: string;
        }>;
        derived: z.ZodObject<{
            outputAmount: z.ZodOptional<z.ZodString>;
            priceImpact: z.ZodOptional<z.ZodNumber>;
            fees: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
            route: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
            healthFactorAfter: z.ZodOptional<z.ZodNumber>;
            liquidationPrice: z.ZodOptional<z.ZodString>;
            totalCost: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            route?: any[];
            liquidationPrice?: string;
            fees?: any[];
            outputAmount?: string;
            priceImpact?: number;
            healthFactorAfter?: number;
            totalCost?: string;
        }, {
            route?: any[];
            liquidationPrice?: string;
            fees?: any[];
            outputAmount?: string;
            priceImpact?: number;
            healthFactorAfter?: number;
            totalCost?: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        optional?: {
            route?: string[];
            referrer?: string;
            gasLimit?: number;
            gasPrice?: string;
            deadline?: number;
            maxSlippage?: number;
            minOutput?: string;
            recipient?: string;
        };
        primary?: {
            token?: string;
            amount?: string;
            leverage?: number;
            protocol?: string;
            slippage?: number;
            fromToken?: string;
            toToken?: string;
            deadline?: number;
        };
        derived?: {
            route?: any[];
            liquidationPrice?: string;
            fees?: any[];
            outputAmount?: string;
            priceImpact?: number;
            healthFactorAfter?: number;
            totalCost?: string;
        };
    }, {
        optional?: {
            route?: string[];
            referrer?: string;
            gasLimit?: number;
            gasPrice?: string;
            deadline?: number;
            maxSlippage?: number;
            minOutput?: string;
            recipient?: string;
        };
        primary?: {
            token?: string;
            amount?: string;
            leverage?: number;
            protocol?: string;
            slippage?: number;
            fromToken?: string;
            toToken?: string;
            deadline?: number;
        };
        derived?: {
            route?: any[];
            liquidationPrice?: string;
            fees?: any[];
            outputAmount?: string;
            priceImpact?: number;
            healthFactorAfter?: number;
            totalCost?: string;
        };
    }>;
    metadata: z.ZodObject<{
        timestamp: z.ZodNumber;
        source: z.ZodEnum<["nlp", "direct", "suggestion"]>;
        confidence: z.ZodNumber;
        processingTime: z.ZodNumber;
        requiredApprovals: z.ZodArray<z.ZodAny, "many">;
        protocolsInvolved: z.ZodArray<z.ZodString, "many">;
        estimatedDuration: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        timestamp?: number;
        confidence?: number;
        source?: "direct" | "suggestion" | "nlp";
        protocolsInvolved?: string[];
        processingTime?: number;
        requiredApprovals?: any[];
        estimatedDuration?: number;
    }, {
        timestamp?: number;
        confidence?: number;
        source?: "direct" | "suggestion" | "nlp";
        protocolsInvolved?: string[];
        processingTime?: number;
        requiredApprovals?: any[];
        estimatedDuration?: number;
    }>;
    validationStatus: z.ZodEnum<["valid", "warning", "error"]>;
    confirmationRequired: z.ZodBoolean;
    estimatedGas: z.ZodOptional<z.ZodNumber>;
    riskLevel: z.ZodEnum<["low", "medium", "high"]>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    metadata?: {
        timestamp?: number;
        confidence?: number;
        source?: "direct" | "suggestion" | "nlp";
        protocolsInvolved?: string[];
        processingTime?: number;
        requiredApprovals?: any[];
        estimatedDuration?: number;
    };
    action?: string;
    estimatedGas?: number;
    intent?: DefiIntent;
    parameters?: {
        optional?: {
            route?: string[];
            referrer?: string;
            gasLimit?: number;
            gasPrice?: string;
            deadline?: number;
            maxSlippage?: number;
            minOutput?: string;
            recipient?: string;
        };
        primary?: {
            token?: string;
            amount?: string;
            leverage?: number;
            protocol?: string;
            slippage?: number;
            fromToken?: string;
            toToken?: string;
            deadline?: number;
        };
        derived?: {
            route?: any[];
            liquidationPrice?: string;
            fees?: any[];
            outputAmount?: string;
            priceImpact?: number;
            healthFactorAfter?: number;
            totalCost?: string;
        };
    };
    riskLevel?: "low" | "medium" | "high";
    validationStatus?: "warning" | "error" | "valid";
    confirmationRequired?: boolean;
}, {
    id?: string;
    metadata?: {
        timestamp?: number;
        confidence?: number;
        source?: "direct" | "suggestion" | "nlp";
        protocolsInvolved?: string[];
        processingTime?: number;
        requiredApprovals?: any[];
        estimatedDuration?: number;
    };
    action?: string;
    estimatedGas?: number;
    intent?: DefiIntent;
    parameters?: {
        optional?: {
            route?: string[];
            referrer?: string;
            gasLimit?: number;
            gasPrice?: string;
            deadline?: number;
            maxSlippage?: number;
            minOutput?: string;
            recipient?: string;
        };
        primary?: {
            token?: string;
            amount?: string;
            leverage?: number;
            protocol?: string;
            slippage?: number;
            fromToken?: string;
            toToken?: string;
            deadline?: number;
        };
        derived?: {
            route?: any[];
            liquidationPrice?: string;
            fees?: any[];
            outputAmount?: string;
            priceImpact?: number;
            healthFactorAfter?: number;
            totalCost?: string;
        };
    };
    riskLevel?: "low" | "medium" | "high";
    validationStatus?: "warning" | "error" | "valid";
    confirmationRequired?: boolean;
}>;
export declare function isExecutableCommand(command: any): command is ExecutableCommand;
export declare function isCommandParameters(params: any): params is CommandParameters;
export declare class CommandProcessingError extends Error {
    readonly code: string;
    readonly details?: ReadonlyRecord<string, any>;
    constructor(message: string, code: string, details?: ReadonlyRecord<string, any>);
}
export declare class ParameterValidationError extends CommandProcessingError {
    constructor(message: string, details?: ReadonlyRecord<string, any>);
}
export declare class CommandBuildingError extends CommandProcessingError {
    constructor(message: string, details?: ReadonlyRecord<string, any>);
}
export type ParameterValue = string | number | boolean | null | undefined;
export type ValidationResult = Result<ParameterValue, CommandValidationError>;
export type ProcessingMode = 'strict' | 'permissive' | 'guided';
//# sourceMappingURL=types.d.ts.map