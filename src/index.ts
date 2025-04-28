#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { join } from 'path';
import { homedir } from 'os';

// Try to find .roomodes in current directory or home directory
const findRoomodesPath = (): string => {
  const paths = [
    './.roomodes',
    join(process.cwd(), '.roomodes'),
    join(homedir(), '.roomodes')
  ];
  
  for (const path of paths) {
    try {
      readFileSync(path, 'utf8');
      return path;
    } catch (error) {
      // File not found, try next path
    }
  }
  
  return './.roomodes'; // Default to current directory
};

const roomodesPath = findRoomodesPath();
let roomodesContent: any;

try {
  roomodesContent = JSON.parse(readFileSync(roomodesPath, 'utf8'));
  console.error(`Successfully loaded .roomodes from ${roomodesPath}`);
} catch (error) {
  console.error(`Error reading .roomodes file from ${roomodesPath}:`, error);
  process.exit(1);
}

type CustomMode = {
  slug: string;
  name: string;
  roleDefinition: string;
  customInstructions: string;
  groups: string[];
};

const server = new Server(
  {
    name: "roo-code-custom-mode-editor",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {
        list: true,
        call: true,
      },
      prompts: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_custom_modes",
        description: "List all custom modes",
      },
      {
        name: "create_custom_mode",
        description: "Create a new custom mode",
        inputSchema: {
          type: "object",
          properties: {
            slug: { type: "string" },
            name: { type: "string" },
            roleDefinition: { type: "string" },
            customInstructions: { type: "string" },
            groups: { type: "array", items: { type: "string" } },
          },
          required: ["slug", "name", "roleDefinition", "customInstructions", "groups"],
        },
      },
      {
        name: "get_custom_mode_fields",
        description: "Get the fields of a custom mode",
        inputSchema: {
          type: "object",
          properties: {
            slug: { type: "string" },
          },
          required: ["slug"],
        },
      },
      {
        name: "put_custom_mode_fields",
        description: "Put and overwrite any one or more fields of a custom mode",
        inputSchema: {
          type: "object",
          properties: {
            slug: { type: "string" },
            fields: {
              type: "object",
              properties: {
                name: { type: "string" },
                roleDefinition: { type: "string" },
                customInstructions: { type: "string" },
                groups: { type: "array", items: { type: "string" } },
              },
            },
          },
          required: ["slug", "fields"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "list_custom_modes":
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(roomodesContent.customModes, null, 2),
          },
        ],
      };

    case "create_custom_mode": {
      const newMode: CustomMode = request.params.arguments as CustomMode;
      roomodesContent.customModes.push(newMode);
      writeFileSync(roomodesPath, JSON.stringify(roomodesContent, null, 2));
      return {
        content: [
          {
            type: "text",
            text: `Created custom mode ${newMode.slug}`,
          },
        ],
      };
    }

    case "get_custom_mode_fields": {
      const slug = request.params.arguments?.slug as string;
      const mode = roomodesContent.customModes.find((mode: CustomMode) => mode.slug === slug);
      if (!mode) {
        throw new Error(`Custom mode ${slug} not found`);
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(mode, null, 2),
          },
        ],
      };
    }

    case "put_custom_mode_fields": {
      const slug = request.params.arguments?.slug as string;
      const fields = request.params.arguments?.fields as Partial<CustomMode>;
      const modeIndex = roomodesContent.customModes.findIndex((mode: CustomMode) => mode.slug === slug);
      if (modeIndex === -1) {
        throw new Error(`Custom mode ${slug} not found`);
      }
      roomodesContent.customModes[modeIndex] = { ...roomodesContent.customModes[modeIndex], ...fields };
      writeFileSync(roomodesPath, JSON.stringify(roomodesContent, null, 2));
      return {
        content: [
          {
            type: "text",
            text: `Updated custom mode ${slug}`,
          },
        ],
      };
    }

    default:
      throw new Error("Unknown tool");
  }
});

async function main() {
  console.error("Starting roo-code-custom-mode-editor MCP server...");
  
  // Set up error handling for the process
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
  });
  
  // Connect to the transport
  const transport = new StdioServerTransport();
  console.error("Connecting to StdioServerTransport...");
  await server.connect(transport);
  console.error("MCP server running and waiting for commands on stdin/stdout");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
