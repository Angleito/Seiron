import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

export interface MCPServerConfig {
  name: string;
  version: string;
  description: string;
  tools: MCPTool[];
  formatAsText?: boolean; // Option to format responses as natural language
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: z.ZodSchema<any>;
  handler: (args: any) => Promise<any>;
  textFormatter?: (result: any) => string; // Optional custom text formatter
}

export abstract class EnhancedBaseMCPServer {
  protected server: Server;
  protected config: MCPServerConfig;

  constructor(config: MCPServerConfig) {
    this.config = config;
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.config.tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: {
            type: 'object',
            properties: this.getZodSchemaProperties(tool.inputSchema),
            required: this.getZodSchemaRequired(tool.inputSchema),
          },
        })),
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const tool = this.config.tools.find(t => t.name === request.params.name);
      
      if (!tool) {
        throw new Error(`Tool not found: ${request.params.name}`);
      }

      try {
        // Validate input
        const validatedArgs = tool.inputSchema.parse(request.params.arguments);
        
        // Execute tool
        const result = await tool.handler(validatedArgs);
        
        // Format response as text if configured
        let responseText: string;
        if (this.config.formatAsText !== false) {
          if (tool.textFormatter) {
            responseText = tool.textFormatter(result);
          } else {
            responseText = this.defaultTextFormatter(tool.name, result);
          }
        } else {
          responseText = JSON.stringify(result, null, 2);
        }
        
        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(`Invalid arguments: ${error.message}`);
        }
        throw error;
      }
    });
  }

  protected defaultTextFormatter(toolName: string, result: any): string {
    // Override this method in subclasses for better formatting
    return JSON.stringify(result, null, 2);
  }

  private getZodSchemaProperties(schema: z.ZodSchema<any>): Record<string, any> {
    // Simplified schema extraction - in production, use a proper Zod to JSON Schema converter
    if (schema instanceof z.ZodObject) {
      const shape = schema.shape;
      const properties: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(shape)) {
        if (value instanceof z.ZodString) {
          properties[key] = { type: 'string' };
        } else if (value instanceof z.ZodNumber) {
          properties[key] = { type: 'number' };
        } else if (value instanceof z.ZodBoolean) {
          properties[key] = { type: 'boolean' };
        } else if (value instanceof z.ZodArray) {
          properties[key] = { type: 'array', items: { type: 'string' } };
        } else {
          properties[key] = { type: 'object' };
        }
      }
      
      return properties;
    }
    
    return {};
  }

  private getZodSchemaRequired(schema: z.ZodSchema<any>): string[] {
    // Extract required fields
    if (schema instanceof z.ZodObject) {
      const shape = schema.shape;
      const required: string[] = [];
      
      for (const [key, value] of Object.entries(shape)) {
        if (!value.isOptional()) {
          required.push(key);
        }
      }
      
      return required;
    }
    
    return [];
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`${this.config.name} MCP server started`);
  }
}