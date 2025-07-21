/**
 * Frontend MCP Utility Functions
 * Helper functions for MCP client operations in the browser
 */

import { MCPError, MCPErrorCode, MCPTool, MCPToolParameter, MCPToolUI } from './types';

/**
 * Format tool for UI display
 */
export function formatToolForUI(tool: MCPTool): MCPToolUI {
  const category = extractToolCategory(tool);
  const icon = getToolIcon(category);
  const parameters = parseToolParameters(tool);
  const examples = generateToolExamples(tool);

  return {
    ...tool,
    category,
    icon,
    parameters,
    examples
  };
}

/**
 * Extract category from tool name or description
 */
function extractToolCategory(tool: MCPTool): string {
  // Check for category in name (e.g., "blockchain_getBalance")
  const nameParts = tool.name.split('_');
  if (nameParts.length > 1) {
    return nameParts[0];
  }

  // Check for category in description
  if (tool.description) {
    const categoryMatch = tool.description.match(/\[([^\]]+)\]/);
    if (categoryMatch) {
      return categoryMatch[1].toLowerCase();
    }
  }

  // Categorize by keywords
  const name = tool.name.toLowerCase();
  const desc = (tool.description || '').toLowerCase();
  const combined = `${name} ${desc}`;

  if (combined.includes('blockchain') || combined.includes('sei') || combined.includes('wallet')) {
    return 'blockchain';
  } else if (combined.includes('market') || combined.includes('price') || combined.includes('trade')) {
    return 'market';
  } else if (combined.includes('portfolio') || combined.includes('balance')) {
    return 'portfolio';
  } else if (combined.includes('ai') || combined.includes('analyze')) {
    return 'intelligence';
  } else if (combined.includes('defi') || combined.includes('swap') || combined.includes('liquidity')) {
    return 'defi';
  }

  return 'general';
}

/**
 * Get icon for tool category
 */
function getToolIcon(category: string): string {
  const iconMap: Record<string, string> = {
    blockchain: '⛓️',
    market: '📊',
    portfolio: '💼',
    intelligence: '🧠',
    defi: '🏦',
    general: '🔧'
  };

  return iconMap[category] || iconMap.general;
}

/**
 * Parse tool parameters from schema
 */
function parseToolParameters(tool: MCPTool): MCPToolParameter[] {
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
 * Generate example calls for a tool
 */
function generateToolExamples(tool: MCPTool): Array<{ name: string; params: Record<string, any> }> {
  const examples: Array<{ name: string; params: Record<string, any> }> = [];

  // Generate based on tool name and parameters
  switch (tool.name) {
    case 'blockchain_getBalance':
      examples.push({
        name: 'Check SEI balance',
        params: { address: '0x1234...', token: 'SEI' }
      });
      break;

    case 'market_getPrice':
      examples.push({
        name: 'Get SEI price',
        params: { symbol: 'SEI' }
      });
      break;

    case 'portfolio_analyze':
      examples.push({
        name: 'Analyze portfolio',
        params: { includeMetrics: true }
      });
      break;

    default:
      // Generate generic example from parameters
      if (tool.inputSchema?.properties) {
        const params: Record<string, any> = {};
        for (const [name, schema] of Object.entries(tool.inputSchema.properties)) {
          params[name] = generateExampleValue(schema);
        }
        examples.push({
          name: 'Example call',
          params
        });
      }
  }

  return examples;
}

/**
 * Generate example value for a parameter
 */
function generateExampleValue(schema: any): any {
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum) return schema.enum[0];

  switch (schema.type) {
    case 'string':
      if (schema.format === 'date') return '2024-01-01';
      if (schema.format === 'date-time') return '2024-01-01T00:00:00Z';
      if (schema.format === 'email') return 'user@example.com';
      if (schema.format === 'uri') return 'https://example.com';
      return 'example';

    case 'number':
    case 'integer':
      if (schema.minimum !== undefined) return schema.minimum;
      return 0;

    case 'boolean':
      return true;

    case 'array':
      return [];

    case 'object':
      return {};

    default:
      return null;
  }
}

/**
 * Validate tool arguments in the browser
 */
export function validateToolArgs(
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
    if (args[field] === undefined || args[field] === null || args[field] === '') {
      errors.push(`${field} is required`);
    }
  }

  // Validate field types and constraints
  for (const [field, value] of Object.entries(args)) {
    const schema = properties[field];
    if (!schema) continue;

    const fieldErrors = validateField(field, value, schema);
    errors.push(...fieldErrors);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a single field
 */
function validateField(field: string, value: any, schema: any): string[] {
  const errors: string[] = [];

  // Type validation
  const expectedType = schema.type;
  const actualType = Array.isArray(value) ? 'array' : typeof value;

  if (expectedType && actualType !== expectedType && value !== null) {
    errors.push(`${field} must be a ${expectedType}`);
    return errors;
  }

  // Additional validations
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${field} must be one of: ${schema.enum.join(', ')}`);
  }

  if (schema.pattern && typeof value === 'string' && !new RegExp(schema.pattern).test(value)) {
    errors.push(`${field} format is invalid`);
  }

  if (schema.minimum !== undefined && typeof value === 'number' && value < schema.minimum) {
    errors.push(`${field} must be at least ${schema.minimum}`);
  }

  if (schema.maximum !== undefined && typeof value === 'number' && value > schema.maximum) {
    errors.push(`${field} must be at most ${schema.maximum}`);
  }

  return errors;
}

/**
 * Format MCP error for user display
 */
export function formatMCPErrorForUI(error: MCPError | Error): {
  title: string;
  message: string;
  action?: string;
} {
  if (error instanceof MCPError) {
    switch (error.code) {
      case MCPErrorCode.ConnectionFailed:
        return {
          title: 'Connection Failed',
          message: 'Unable to connect to the server. Please check your internet connection.',
          action: 'Retry'
        };

      case MCPErrorCode.ToolNotFound:
        return {
          title: 'Tool Not Found',
          message: 'The requested tool is not available on this server.',
          action: 'Refresh'
        };

      case MCPErrorCode.InvalidArguments:
        return {
          title: 'Invalid Input',
          message: error.message,
          action: 'Fix'
        };

      case MCPErrorCode.Timeout:
        return {
          title: 'Request Timeout',
          message: 'The operation took too long to complete.',
          action: 'Retry'
        };

      case MCPErrorCode.AuthenticationError:
        return {
          title: 'Authentication Required',
          message: 'Please sign in to access this feature.',
          action: 'Sign In'
        };

      default:
        return {
          title: 'Error',
          message: error.message
        };
    }
  }

  return {
    title: 'Unexpected Error',
    message: error.message || 'An unexpected error occurred'
  };
}

/**
 * Debounce function for UI interactions
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Format tool result for display
 */
export function formatToolResultForUI(result: any): {
  type: 'text' | 'json' | 'table' | 'error';
  content: any;
} {
  if (result.isError) {
    return {
      type: 'error',
      content: result.content
    };
  }

  const content = result.content;

  // Check if it's tabular data
  if (Array.isArray(content) && content.length > 0 && typeof content[0] === 'object') {
    return {
      type: 'table',
      content
    };
  }

  // Check if it's JSON
  if (typeof content === 'object' && content !== null) {
    return {
      type: 'json',
      content
    };
  }

  // Default to text
  return {
    type: 'text',
    content: String(content)
  };
}

/**
 * Get connection status color
 */
export function getConnectionStatusColor(connected: boolean): string {
  return connected ? 'green' : 'red';
}

/**
 * Get connection status text
 */
export function getConnectionStatusText(connected: boolean): string {
  return connected ? 'Connected' : 'Disconnected';
}

/**
 * Create a shareable tool link
 */
export function createToolLink(serverName: string, toolName: string, args?: Record<string, any>): string {
  const params = new URLSearchParams({
    server: serverName,
    tool: toolName
  });

  if (args) {
    params.set('args', JSON.stringify(args));
  }

  return `${window.location.origin}/mcp/tools?${params.toString()}`;
}