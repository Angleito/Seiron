// Minimal build entry point for TypeScript compilation test
export const VERSION = '1.0.0';

// Basic types
export * from './types/config';
export * from './types/data';
export * from './types/utils';

// Configuration
export { loadConfiguration } from './config';

// Utilities  
export * from './utils/math';