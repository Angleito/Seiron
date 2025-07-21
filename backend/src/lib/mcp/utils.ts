/**
 * MCP Utility Functions
 * Helper functions for MCP client and server operations
 */

import { MCPError, MCPErrorCode, MCPTool, MCPToolParameter } from './types';
import { Logger } from '../utils/logger';

const logger = new Logger('MCPUtils');

/**
 * Validate tool arguments against schema
 */
export function validateToolArguments(
  tool: MCPTool,
  args: Record<string, any>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!tool.inputSchema) {
    return { valid: true, errors: [] };
  }

  const { properties = {}, required = [] } = tool.inputSchema;

  // Check required fields
  for (const field of required) {
    if (!(field in args)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate field types
  for (const [field, value] of Object.entries(args)) {
    const schema = properties[field];
    if (!schema) {
      if (tool.inputSchema.additionalProperties === false) {
        errors.push(`Unknown field: ${field}`);
      }
      continue;
    }

    const typeErrors = validateFieldType(field, value, schema);
    errors.push(...typeErrors);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a single field against its schema
 */
function validateFieldType(
  field: string,
  value: any,
  schema: any
): string[] {
  const errors: string[] = [];
  const expectedType = schema.type;
  const actualType = Array.isArray(value) ? 'array' : typeof value;

  if (expectedType && actualType !== expectedType) {
    errors.push(`Field ${field}: expected ${expectedType}, got ${actualType}`);
    return errors;
  }

  // Additional validations based on type
  switch (expectedType) {
    case 'string':
      if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
        errors.push(`Field ${field}: does not match pattern ${schema.pattern}`);
      }
      if (schema.minLength && value.length < schema.minLength) {
        errors.push(`Field ${field}: length ${value.length} is less than minimum ${schema.minLength}`);
      }
      if (schema.maxLength && value.length > schema.maxLength) {
        errors.push(`Field ${field}: length ${value.length} exceeds maximum ${schema.maxLength}`);
      }
      break;

    case 'number':
    case 'integer':
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push(`Field ${field}: value ${value} is less than minimum ${schema.minimum}`);
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push(`Field ${field}: value ${value} exceeds maximum ${schema.maximum}`);
      }
      if (expectedType === 'integer' && !Number.isInteger(value)) {
        errors.push(`Field ${field}: value ${value} is not an integer`);
      }
      break;

    case 'array':
      if (schema.minItems && value.length < schema.minItems) {
        errors.push(`Field ${field}: array length ${value.length} is less than minimum ${schema.minItems}`);
      }
      if (schema.maxItems && value.length > schema.maxItems) {
        errors.push(`Field ${field}: array length ${value.length} exceeds maximum ${schema.maxItems}`);
      }
      break;

    case 'object':
      if (schema.properties) {
        for (const [subField, subSchema] of Object.entries(schema.properties)) {
          if (value[subField] !== undefined) {
            const subErrors = validateFieldType(
              `${field}.${subField}`,
              value[subField],
              subSchema
            );
            errors.push(...subErrors);
          }
        }
      }
      break;
  }

  // Check enum values
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`Field ${field}: value must be one of ${schema.enum.join(', ')}`);
  }

  return errors;
}

/**
 * Parse tool parameters from schema
 */
export function parseToolParameters(tool: MCPTool): MCPToolParameter[] {
  if (!tool.inputSchema || tool.inputSchema.type !== 'object') {
    return [];
  }

  const parameters: MCPToolParameter[] = [];
  const { properties = {}, required = [] } = tool.inputSchema;

  for (const [name, schema] of Object.entries(properties)) {
    const param: MCPToolParameter = {
      name,
      type: schema.type || 'string',
      description: schema.description,
      required: required.includes(name),
      default: schema.default,
      enum: schema.enum,
      minimum: schema.minimum,
      maximum: schema.maximum,
      pattern: schema.pattern
    };

    parameters.push(param);
  }

  return parameters;
}

/**
 * Format MCP error for user display
 */
export function formatMCPError(error: MCPError): string {
  switch (error.code) {
    case MCPErrorCode.ConnectionFailed:
      return `Failed to connect to server: ${error.message}`;
    case MCPErrorCode.ToolNotFound:
      return `Tool not found: ${error.message}`;
    case MCPErrorCode.ResourceNotFound:
      return `Resource not found: ${error.message}`;
    case MCPErrorCode.InvalidArguments:
      return `Invalid arguments: ${error.message}`;
    case MCPErrorCode.ServerError:
      return `Server error: ${error.message}`;
    case MCPErrorCode.Timeout:
      return `Request timed out: ${error.message}`;
    case MCPErrorCode.PermissionDenied:
      return `Permission denied: ${error.message}`;
    default:
      return error.message;
  }
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    onRetry
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts - 1) {
        const delay = Math.min(
          initialDelay * Math.pow(factor, attempt),
          maxDelay
        );

        onRetry?.(attempt + 1, lastError);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/**
 * Create a timeout promise
 */
export function timeout<T>(
  promise: Promise<T>,
  ms: number,
  message = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    )
  ]);
}

/**
 * Group tools by category
 */
export function groupToolsByCategory(
  tools: MCPTool[]
): Map<string, MCPTool[]> {
  const grouped = new Map<string, MCPTool[]>();

  for (const tool of tools) {
    // Extract category from tool name or description
    const category = extractCategory(tool);
    const existing = grouped.get(category) || [];
    existing.push(tool);
    grouped.set(category, existing);
  }

  return grouped;
}

/**
 * Extract category from tool
 */
function extractCategory(tool: MCPTool): string {
  // Try to extract from name (e.g., "sei_getBalance" -> "sei")
  const nameParts = tool.name.split('_');
  if (nameParts.length > 1) {
    return nameParts[0];
  }

  // Try to extract from description
  if (tool.description) {
    const categoryMatch = tool.description.match(/\[([^\]]+)\]/);
    if (categoryMatch) {
      return categoryMatch[1].toLowerCase();
    }
  }

  return 'general';
}

/**
 * Sanitize tool arguments for logging
 */
export function sanitizeToolArgs(
  args: Record<string, any>
): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(args)) {
    // Redact sensitive fields
    if (isSensitiveField(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeToolArgs(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Check if field name is sensitive
 */
function isSensitiveField(field: string): boolean {
  const sensitivePatterns = [
    /password/i,
    /secret/i,
    /apikey/i,
    /api_key/i,
    /token/i,
    /private/i,
    /credential/i,
    /auth/i
  ];

  return sensitivePatterns.some(pattern => pattern.test(field));
}

/**
 * Create a unique request ID
 */
export function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse connection URL for MCP server
 */
export function parseConnectionUrl(url: string): {
  protocol: 'http' | 'https' | 'ws' | 'wss';
  host: string;
  port?: number;
  path?: string;
} {
  const parsed = new URL(url);
  const protocol = parsed.protocol.slice(0, -1) as any;
  
  return {
    protocol,
    host: parsed.hostname,
    port: parsed.port ? parseInt(parsed.port) : undefined,
    path: parsed.pathname !== '/' ? parsed.pathname : undefined
  };
}

/**
 * Check if MCP server URL is valid
 */
export function isValidMCPUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Convert tool result to readable format
 */
export function formatToolResult(result: any, mimeType?: string): string {
  if (typeof result === 'string') {
    return result;
  }

  if (mimeType === 'application/json' || typeof result === 'object') {
    return JSON.stringify(result, null, 2);
  }

  return String(result);
}