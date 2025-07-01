import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';

// Configuration schema
const ConfigSchema = z.object({
  networks: z.record(z.object({
    chainId: z.number(),
    rpcUrl: z.string().url(),
    wsUrl: z.string().url().optional(),
    contracts: z.record(z.string()).optional(),
    blockTime: z.number().optional()
  })),
  marketData: z.object({
    providers: z.array(z.string()),
    assets: z.array(z.string()),
    apiKeys: z.record(z.string()).optional()
  }).optional(),
  collectors: z.object({
    rateLimit: z.number().default(10),
    timeout: z.number().default(30000),
    retryAttempts: z.number().default(3)
  }).optional(),
  features: z.object({
    default: z.array(z.string()),
    rsiPeriod: z.number().default(14),
    macdPeriods: z.tuple([z.number(), z.number(), z.number()]).default([12, 26, 9]),
    volatilityWindow: z.number().default(20)
  }).optional()
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Load configuration from file
 */
export const loadConfiguration = async (configPath: string): Promise<Config> => {
  try {
    const configData = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);
    return ConfigSchema.parse(config);
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      throw new Error(`Configuration file not found: ${configPath}`);
    }
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid configuration: ${error.message}`);
    }
    throw error;
  }
};

/**
 * Load environment-specific configuration
 */
export const loadEnvConfig = async (): Promise<Partial<Config>> => {
  const env = process.env.NODE_ENV || 'development';
  const configPath = path.join(process.cwd(), 'config', `${env}.json`);
  
  try {
    return await loadConfiguration(configPath);
  } catch {
    // Return empty config if env-specific file doesn't exist
    return {};
  }
};

/**
 * Merge configurations with priority
 */
export const mergeConfigs = (...configs: Partial<Config>[]): Config => {
  const merged = configs.reduce((acc, config) => ({
    ...acc,
    ...config,
    networks: { ...acc.networks, ...config.networks },
    marketData: { ...acc.marketData, ...config.marketData },
    collectors: { ...acc.collectors, ...config.collectors },
    features: { ...acc.features, ...config.features }
  }), {} as Partial<Config>);

  return ConfigSchema.parse(merged);
};