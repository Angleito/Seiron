import { MCPServerConfig } from './types';
import HiveIntelligenceMCPConfig from './hive-intelligence';

/**
 * MCP Server Registry
 * 
 * Central registry for all MCP server configurations
 */
export const MCPServers: Record<string, MCPServerConfig> = {
  'hive-intelligence': HiveIntelligenceMCPConfig,
};

/**
 * Get MCP server configuration by name
 */
export const getMCPServerConfig = (serverName: string): MCPServerConfig | undefined => {
  return MCPServers[serverName];
};

/**
 * Get all available MCP servers
 */
export const getAvailableMCPServers = (): string[] => {
  return Object.keys(MCPServers);
};

/**
 * Validate MCP server configuration
 */
export const validateMCPServerConfig = (config: MCPServerConfig): boolean => {
  // Basic validation
  if (!config.name || !config.version || !config.connection || !config.tools) {
    return false;
  }

  // Validate connection
  if (!config.connection.endpoint || typeof config.connection.port !== 'number') {
    return false;
  }

  // Validate tools
  if (!Array.isArray(config.tools) || config.tools.length === 0) {
    return false;
  }

  for (const tool of config.tools) {
    if (!tool.name || !tool.parameters || !tool.responseSchema) {
      return false;
    }
  }

  return true;
};

export * from './types';
export { HiveIntelligenceMCPConfig } from './hive-intelligence';