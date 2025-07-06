import { Either } from 'fp-ts/Either';

/**
 * Environment types for configuration
 */
export type Environment = 'development' | 'test' | 'staging' | 'production';

/**
 * Server configuration interface
 */
export interface ServerConfig {
  readonly port: number;
  readonly host: string;
  readonly nodeEnv: Environment;
  readonly corsOrigins: readonly string[];
  readonly rateLimit: {
    readonly windowMs: number;
    readonly max: number;
  };
}

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  readonly redis: {
    readonly host: string;
    readonly port: number;
    readonly password?: string;
    readonly db: number;
    readonly maxRetriesPerRequest: number;
    readonly retryDelayOnFailover: number;
  };
  readonly supabase: {
    readonly url: string;
    readonly anonKey: string;
    readonly serviceRoleKey?: string;
  };
}

/**
 * Blockchain configuration interface
 */
export interface BlockchainConfig {
  readonly sei: {
    readonly rpcUrl: string;
    readonly chainId: number;
    readonly blockTime: number;
  };
  readonly providers: {
    readonly dragonSwap: {
      readonly apiUrl: string;
      readonly timeout: number;
    };
    readonly yeiFinance: {
      readonly apiUrl: string;
      readonly timeout: number;
    };
  };
}

/**
 * AI service configuration interface
 */
export interface AIConfig {
  readonly openai: {
    readonly apiKey: string;
    readonly model: string;
    readonly maxTokens: number;
    readonly temperature: number;
  };
}

/**
 * Security configuration interface
 */
export interface SecurityConfig {
  readonly jwt: {
    readonly secret: string;
    readonly expiresIn: string;
  };
  readonly encryption: {
    readonly algorithm: string;
    readonly keyLength: number;
  };
}

/**
 * Logging configuration interface
 */
export interface LoggingConfig {
  readonly level: string;
  readonly format: string;
  readonly transports: readonly string[];
  readonly file: {
    readonly enabled: boolean;
    readonly filename: string;
    readonly maxSize: string;
    readonly maxFiles: number;
  };
}

/**
 * Complete application configuration
 */
export interface AppConfig {
  readonly server: ServerConfig;
  readonly database: DatabaseConfig;
  readonly blockchain: BlockchainConfig;
  readonly ai: AIConfig;
  readonly security: SecurityConfig;
  readonly logging: LoggingConfig;
}

/**
 * Configuration validation errors
 */
export interface ConfigError {
  readonly field: string;
  readonly message: string;
  readonly value?: unknown;
}

/**
 * Configuration validation result
 */
export type ConfigResult<T> = Either<readonly ConfigError[], T>;
