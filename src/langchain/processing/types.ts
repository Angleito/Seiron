/**
 * @fileoverview Command Processing Types
 * Types for natural language to structured command conversion
 */

import { z } from 'zod';
import type { Option, Result, ReadonlyRecord } from '../../types/index.js';
import { DefiIntent, FinancialEntity } from '../nlp/types.js';

/**
 * Command Processing Result
 */
export interface CommandProcessingResult {
  readonly command: ExecutableCommand | null;
  readonly validationErrors: ReadonlyArray<CommandValidationError>;
  readonly suggestions: ReadonlyArray<CommandSuggestion>;
  readonly requiresDisambiguation: boolean;
  readonly disambiguationOptions?: DisambiguationOptions;
  readonly estimatedGas?: number;
  readonly riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Executable Command
 */
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

/**
 * Command Parameters
 */
export interface CommandParameters {
  readonly primary: PrimaryParameters;
  readonly optional: OptionalParameters;
  readonly derived: DerivedParameters;
}

/**
 * Primary Parameters (required)
 */
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

/**
 * Optional Parameters
 */
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

/**
 * Derived Parameters (calculated)
 */
export interface DerivedParameters {
  readonly outputAmount?: string;
  readonly priceImpact?: number;
  readonly fees?: Fee[];
  readonly route?: RouteStep[];
  readonly healthFactorAfter?: number;
  readonly liquidationPrice?: string;
  readonly totalCost?: string;
}

/**
 * Command Metadata
 */
export interface CommandMetadata {
  readonly timestamp: number;
  readonly source: 'nlp' | 'direct' | 'suggestion';
  readonly confidence: number;
  readonly processingTime: number;
  readonly requiredApprovals: Approval[];
  readonly protocolsInvolved: string[];
  readonly estimatedDuration: number;
}

/**
 * Fee Information
 */
export interface Fee {
  readonly type: 'protocol' | 'gas' | 'slippage' | 'arbitrage';
  readonly amount: string;
  readonly token: string;
  readonly percentage?: number;
}

/**
 * Route Step
 */
export interface RouteStep {
  readonly protocol: string;
  readonly pool: string;
  readonly fromToken: string;
  readonly toToken: string;
  readonly percentage: number;
}

/**
 * Approval Information
 */
export interface Approval {
  readonly token: string;
  readonly spender: string;
  readonly amount: string;
  readonly required: boolean;
  readonly gasEstimate: number;
}

/**
 * Command Validation Error
 */
export interface CommandValidationError {
  readonly field: string;
  readonly code: string;
  readonly message: string;
  readonly severity: 'error' | 'warning' | 'info';
  readonly suggestion?: string;
  readonly metadata?: ReadonlyRecord<string, any>;
}

/**
 * Command Suggestion
 */
export interface CommandSuggestion {
  readonly type: 'alternative' | 'optimization' | 'warning' | 'enhancement';
  readonly title: string;
  readonly description: string;
  readonly action?: string;
  readonly parameters?: Partial<CommandParameters>;
  readonly expectedBenefit?: string;
  readonly riskLevel?: 'low' | 'medium' | 'high';
}

/**
 * Disambiguation Options
 */
export interface DisambiguationOptions {
  readonly question: string;
  readonly options: ReadonlyArray<DisambiguationOption>;
  readonly defaultOption?: string;
  readonly timeout: number;
}

/**
 * Disambiguation Option
 */
export interface DisambiguationOption {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly parameters: Partial<CommandParameters>;
  readonly confidence: number;
}

/**
 * Parameter Validation Rule
 */
export interface ParameterValidationRule {
  readonly field: string;
  readonly required: boolean;
  readonly type: 'string' | 'number' | 'boolean' | 'token' | 'protocol' | 'address';
  readonly validator: (value: any) => boolean;
  readonly normalizer?: (value: any) => any;
  readonly dependsOn?: string[];
  readonly constraints?: ParameterConstraints;
}

/**
 * Parameter Constraints
 */
export interface ParameterConstraints {
  readonly min?: number;
  readonly max?: number;
  readonly pattern?: RegExp;
  readonly enum?: ReadonlyArray<string>;
  readonly custom?: (value: any, context: any) => boolean;
}

/**
 * Command Builder Configuration
 */
export interface CommandBuilderConfig {
  readonly defaultSlippage: number;
  readonly defaultDeadline: number;
  readonly maxGasPrice: string;
  readonly riskThresholds: RiskThresholds;
  readonly supportedProtocols: ReadonlyArray<string>;
  readonly supportedTokens: ReadonlyArray<string>;
}

/**
 * Risk Thresholds
 */
export interface RiskThresholds {
  readonly low: number;
  readonly medium: number;
  readonly high: number;
  readonly liquidation: number;
}

/**
 * Parsing Context
 */
export interface ParsingContext {
  readonly userAddress?: string;
  readonly balances?: ReadonlyRecord<string, string>;
  readonly allowances?: ReadonlyRecord<string, ReadonlyRecord<string, string>>;
  readonly positions?: ReadonlyArray<any>;
  readonly marketData?: ReadonlyRecord<string, any>;
  readonly gasPrice?: string;
  readonly blockNumber?: number;
}

/**
 * Command Template
 */
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

/**
 * Zod Schemas
 */
export const CommandParametersSchema = z.object({
  primary: z.object({
    amount: z.string().optional(),
    token: z.string().optional(),
    fromToken: z.string().optional(),
    toToken: z.string().optional(),
    protocol: z.string().optional(),
    leverage: z.number().optional(),
    slippage: z.number().optional(),
    deadline: z.number().optional()
  }),
  optional: z.object({
    maxSlippage: z.number().optional(),
    minOutput: z.string().optional(),
    deadline: z.number().optional(),
    gasLimit: z.number().optional(),
    gasPrice: z.string().optional(),
    recipient: z.string().optional(),
    referrer: z.string().optional(),
    route: z.array(z.string()).optional()
  }),
  derived: z.object({
    outputAmount: z.string().optional(),
    priceImpact: z.number().optional(),
    fees: z.array(z.any()).optional(),
    route: z.array(z.any()).optional(),
    healthFactorAfter: z.number().optional(),
    liquidationPrice: z.string().optional(),
    totalCost: z.string().optional()
  })
});

export const ExecutableCommandSchema = z.object({
  id: z.string(),
  intent: z.nativeEnum(DefiIntent),
  action: z.string(),
  parameters: CommandParametersSchema,
  metadata: z.object({
    timestamp: z.number(),
    source: z.enum(['nlp', 'direct', 'suggestion']),
    confidence: z.number(),
    processingTime: z.number(),
    requiredApprovals: z.array(z.any()),
    protocolsInvolved: z.array(z.string()),
    estimatedDuration: z.number()
  }),
  validationStatus: z.enum(['valid', 'warning', 'error']),
  confirmationRequired: z.boolean(),
  estimatedGas: z.number().optional(),
  riskLevel: z.enum(['low', 'medium', 'high'])
});

/**
 * Type Guards
 */
export function isExecutableCommand(command: any): command is ExecutableCommand {
  return ExecutableCommandSchema.safeParse(command).success;
}

export function isCommandParameters(params: any): params is CommandParameters {
  return CommandParametersSchema.safeParse(params).success;
}

/**
 * Command Processing Errors
 */
export class CommandProcessingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: ReadonlyRecord<string, any>
  ) {
    super(message);
    this.name = 'CommandProcessingError';
  }
}

export class ParameterValidationError extends CommandProcessingError {
  constructor(message: string, details?: ReadonlyRecord<string, any>) {
    super(message, 'PARAMETER_VALIDATION_ERROR', details);
    this.name = 'ParameterValidationError';
  }
}

export class CommandBuildingError extends CommandProcessingError {
  constructor(message: string, details?: ReadonlyRecord<string, any>) {
    super(message, 'COMMAND_BUILDING_ERROR', details);
    this.name = 'CommandBuildingError';
  }
}

/**
 * Utility Types
 */
export type ParameterValue = string | number | boolean | null | undefined;
export type ValidationResult = Result<ParameterValue, CommandValidationError>;
export type ProcessingMode = 'strict' | 'permissive' | 'guided';