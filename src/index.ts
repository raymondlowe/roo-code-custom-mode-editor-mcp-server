#!/usr/bin/env node
console.error("MCP Server Script Started"); // Add log
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ErrorCode,
	ListToolsRequestSchema,
	McpError,
	// ToolDefinitionSchema, // Removed - define tools inline
} from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

console.error("Imports successful"); // Add log

// --- Configuration ---
// Assume .roomodes is in the user's home directory for simplicity
// A more robust solution might check standard config locations
const userHomeDir = os.homedir(); // Add log
console.error(`User home directory: ${userHomeDir}`); // Add log
const ROO_MODES_FILE_PATH = path.join(userHomeDir, '.roomodes');
console.error(`.roomodes path set to: ${ROO_MODES_FILE_PATH}`); // Add log

// --- Types ---
interface RooMode {
	slug: string;
	name: string;
	roleDefinition: string;
	customInstructions: string;
	groups: string[];
}

// Type guard for RooMode array
function isRooModeArray(data: any): data is RooMode[] {
	return (
		Array.isArray(data) &&
		data.every(
			(item) =>
				typeof item === 'object' &&
				item !== null &&
				typeof item.slug === 'string' &&
				typeof item.name === 'string' &&
				typeof item.roleDefinition === 'string' &&
				typeof item.customInstructions === 'string' &&
				Array.isArray(item.groups) &&
				item.groups.every((g: any) => typeof g === 'string')
		)
	);
}

// --- File Operations ---
async function readRooModes(): Promise<RooMode[]> {
	try {
		const data = await fs.readFile(ROO_MODES_FILE_PATH, 'utf-8');
		const parsedData = JSON.parse(data);
		if (!isRooModeArray(parsedData)) {
			console.error('Invalid format in .roomodes file. Returning empty array.');
			// Optionally, could throw an McpError here if strict validation is desired
			return [];
		}
		return parsedData;
	} catch (error: any) {
		if (error.code === 'ENOENT') {
			// File doesn't exist, return empty array
			return [];
		}
		console.error(`Error reading ${ROO_MODES_FILE_PATH}:`, error);
		throw new McpError(
			ErrorCode.InternalError,
			`Failed to read modes file: ${error.message}`
		);
	}
}

async function writeRooModes(modes: RooMode[]): Promise<void> {
	try {
		const data = JSON.stringify(modes, null, 2); // Pretty print JSON
		await fs.writeFile(ROO_MODES_FILE_PATH, data, 'utf-8');
	} catch (error: any) {
		console.error(`Error writing ${ROO_MODES_FILE_PATH}:`, error);
		throw new McpError(
			ErrorCode.InternalError,
			`Failed to write modes file: ${error.message}`
		);
	}
}

// --- Server Implementation ---
// Tool definitions moved inside ListTools handler below
class RooModeEditorServer {
	private server: Server;

	constructor() {
		this.server = new Server(
			{
				name: 'roo-code-custom-mode-editor', // Match README/package.json if needed
				version: '0.1.0', // Update as needed
			},
			{
				capabilities: {
					resources: {}, // No resources defined for now
					tools: {},
				},
			}
		);

		this.setupToolHandlers();

		// Error handling
		this.server.onerror = (error) => console.error('[MCP Error]', error);
		process.on('SIGINT', async () => {
			await this.server.close();
			process.exit(0);
		});
        process.on('uncaughtException', (err) => {
            console.error('Uncaught Exception:', err);
            // Optionally close server gracefully here before exiting
            process.exit(1);
        });
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            // Optionally close server gracefully here before exiting
            process.exit(1);
        });
	}

	private setupToolHandlers() {
		// List Tools Handler
		this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
	           tools: [ // Define tools directly here
	               {
	                   name: 'list_custom_modes',
	                   description: 'Lists all custom modes in the .roomodes file.',
	                   inputSchema: { type: 'object', properties: {}, additionalProperties: false },
	               },
	               {
	                   name: 'create_custom_mode',
	                   description: 'Creates a new custom mode with the specified fields.',
	                   inputSchema: {
	                       type: 'object',
	                       properties: {
	                           slug: { type: 'string', description: 'Unique identifier for the mode' },
	                           name: { type: 'string', description: 'Display name for the mode' },
	                           roleDefinition: { type: 'string', description: 'System prompt/role definition' },
	                           customInstructions: { type: 'string', description: 'User-specific instructions' },
	                           groups: { type: 'array', items: { type: 'string' }, description: 'Groups the mode belongs to' },
	                       },
	                       required: ['slug', 'name', 'roleDefinition', 'customInstructions', 'groups'],
	                       additionalProperties: false,
	                   },
	               },
	               {
	                   name: 'get_custom_mode_fields',
	                   description: 'Gets the fields of a specific custom mode by its slug.',
	                   inputSchema: {
	                       type: 'object',
	                       properties: {
	                           slug: { type: 'string', description: 'The slug of the mode to retrieve' },
	                       },
	                       required: ['slug'],
	                       additionalProperties: false,
	                   },
	               },
	               // { // Removed put_custom_mode_fields
	               //     name: 'put_custom_mode_fields',
	               //     description: 'Updates one or more fields of a specific custom mode by its slug.',
	               //     inputSchema: { /* ... */ },
	               // },
	                  { // Added update_custom_mode_field
	                      name: 'update_custom_mode_field',
	                      description: 'Updates a single field of a specific custom mode by its slug.',
	                      inputSchema: {
	                          type: 'object',
	                          properties: {
	                              slug: { type: 'string', description: 'The slug of the mode to update' },
	                              fieldName: {
	                                  type: 'string',
	                                  description: 'The name of the field to update',
	                                  enum: ['name', 'roleDefinition', 'customInstructions', 'groups'] // Allowed field names
	                              },
	                              fieldValue: {
	                                  // Can be string or array of strings, validation done in handler
	                                  description: 'The new value for the field (string, or array of strings for groups)'
	                              }
	                          },
	                          required: ['slug', 'fieldName', 'fieldValue'],
	                          additionalProperties: false,
	                      },
	                  },
	           ]
	        }));

		// Call Tool Handler
		this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
			const { name, arguments: args } = request.params;

			try {
                const modes = await readRooModes();

				switch (name) {
					case 'list_custom_modes':
						return { content: [{ type: 'text', text: JSON.stringify(modes, null, 2) }] };

					case 'create_custom_mode': {
						// Basic validation (more specific checks could be added)
						if (!args || typeof args !== 'object') throw new McpError(ErrorCode.InvalidParams, 'Invalid arguments');
                        const { slug, name: modeName, roleDefinition, customInstructions, groups: modeGroups } = args as Partial<RooMode>;

                        if (!slug || !modeName || !roleDefinition || !customInstructions || !modeGroups || !Array.isArray(modeGroups)) {
                            throw new McpError(ErrorCode.InvalidParams, 'Missing required fields for create_custom_mode');
                        }
                        if (modes.some(m => m.slug === slug)) {
                            throw new McpError(ErrorCode.InvalidRequest, `Mode with slug '${slug}' already exists.`);
                        }

						const newMode: RooMode = { slug, name: modeName, roleDefinition, customInstructions, groups: modeGroups };
						const updatedModes = [...modes, newMode];
						await writeRooModes(updatedModes);
						return { content: [{ type: 'text', text: `Mode '${slug}' created successfully.` }] };
                    }

					case 'get_custom_mode_fields': {
                        if (!args || typeof args !== 'object' || typeof args.slug !== 'string') {
                            throw new McpError(ErrorCode.InvalidParams, 'Invalid arguments: slug (string) is required.');
                        }
						const { slug } = args;
						const mode = modes.find((m) => m.slug === slug);
						if (!mode) {
							// Use InvalidRequest as NotFound is not available
							throw new McpError(ErrorCode.InvalidRequest, `Mode with slug '${slug}' not found.`);
						}
						return { content: [{ type: 'text', text: JSON.stringify(mode, null, 2) }] };
                    }

					// case 'put_custom_mode_fields': { /* Removed */ }

					               case 'update_custom_mode_field': {
					                   // Validate arguments
					                   if (!args || typeof args !== 'object' || typeof args.slug !== 'string' || typeof args.fieldName !== 'string' || args.fieldValue === undefined) {
					                       throw new McpError(ErrorCode.InvalidParams, 'Invalid arguments: slug (string), fieldName (string), and fieldValue are required.');
					                   }
					                   const { slug, fieldName, fieldValue } = args as { slug: string; fieldName: string; fieldValue: any };

					                   // Find the mode
					                   const modeIndex = modes.findIndex((m) => m.slug === slug);
					                   if (modeIndex === -1) {
					                       throw new McpError(ErrorCode.InvalidRequest, `Mode with slug '${slug}' not found.`);
					                   }

					                   // Validate field name and value type
					                   const allowedFields: (keyof RooMode)[] = ['name', 'roleDefinition', 'customInstructions', 'groups'];
					                   if (!allowedFields.includes(fieldName as keyof RooMode)) {
					                       throw new McpError(ErrorCode.InvalidParams, `Invalid fieldName '${fieldName}'. Allowed fields are: ${allowedFields.join(', ')}`);
					                   }
					                   if (fieldName === 'slug') {
					                        throw new McpError(ErrorCode.InvalidRequest, `Updating the 'slug' field is not allowed.`);
					                   }

					                   // Type validation for the value
					                   if (fieldName === 'groups') {
					                       if (!Array.isArray(fieldValue) || !fieldValue.every(item => typeof item === 'string')) {
					                           throw new McpError(ErrorCode.InvalidParams, `Invalid fieldValue for 'groups'. Expected an array of strings.`);
					                       }
					                   } else { // name, roleDefinition, customInstructions
					                       if (typeof fieldValue !== 'string') {
					                           throw new McpError(ErrorCode.InvalidParams, `Invalid fieldValue for '${fieldName}'. Expected a string.`);
					                       }
					                   }

					                   // Update the mode
					                   const updatedModes = [...modes];
					                   const modeToUpdate = { ...updatedModes[modeIndex] };
					                   (modeToUpdate as any)[fieldName] = fieldValue; // Update the specific field
					                   updatedModes[modeIndex] = modeToUpdate;

					                   await writeRooModes(updatedModes);
					                   return { content: [{ type: 'text', text: `Mode '${slug}', field '${fieldName}' updated successfully.` }] };
					               }

					default:
						throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
				}
			} catch (error) {
				if (error instanceof McpError) {
					throw error; // Re-throw known MCP errors
				}
				// Log unexpected errors and return a generic internal error
				console.error(`Unexpected error calling tool '${name}':`, error);
				throw new McpError(
					ErrorCode.InternalError,
					`An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`
				);
			}
		});
	}

	async run() {
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
		console.error('Roo Mode Editor MCP server running on stdio'); // Use console.error for logs to avoid interfering with stdout JSON communication
	}
}

// --- Start Server ---
console.error("Creating RooModeEditorServer instance..."); // Add log
const server = new RooModeEditorServer();
console.error("Calling server.run()..."); // Add log
server.run().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});
