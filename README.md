# roo-code-custom-mode-editor-mcp-server

An MCP server that knows how to edit the Roo Code custom modes file

Avoids having to overwrite the `.roomodes` file using file writes or edit the json with unreliable diffs.

The MCP server exposes tools to:

* List all custom modes
* Create a new custom mode
* Get the fields of a custom mode ( "slug","name",  "roleDefinition", "customInstructions", "groups")
* Update a single field of a custom mode.

Fields are:

- slug : short string
- name : short string
- roleDefinition : long string
- customInstructions : long string
- groups : array of short strings

## Installation and Usage

1.  **Clone the repository:**
    Choose a location on your computer and clone the repository:
    ```bash
    git clone https://github.com/raymondlowe/roo-code-custom-mode-editor-mcp-server.git
    cd roo-code-custom-mode-editor-mcp-server
    ```

2.  **Install dependencies and build:**
    ```bash
    npm install
    npm run build
    ```
    This compiles the TypeScript code into JavaScript in the `build` directory.

## MCP Configuration

To use with Roo Code, add the following server configuration to your MCP settings file (e.g., `/home/rcl/.config/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json`). Make sure to replace `/path/to/your/clone` with the actual absolute path where you cloned the repository.

```json
{
  "mcpServers": {
    "roo-code-custom-mode-editor": {
      "command": "node",
      "args": [
        "/path/to/your/clone/roo-code-custom-mode-editor-mcp-server/build/index.js"
      ],
      "disabled": false,
      "alwaysAllow": []
    }
    // ... other servers
  }
}
```
After adding this configuration, restart Roo Code or reload the MCP servers for the changes to take effect.

## Development

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.

## Tools

### list_custom_modes
Lists all custom modes in the specified `.roomodes` file.

Parameters:
- rooModesFilePath: string (Absolute path to the `.roomodes` file)

### create_custom_mode
Creates a new custom mode with the specified fields.

Parameters:
- rooModesFilePath: string (Absolute path to the `.roomodes` file)
- slug: string
- name: string
- roleDefinition: string
- customInstructions: string
- groups: string[]

### get_custom_mode_fields
Gets the fields of a custom mode.

Parameters:
- rooModesFilePath: string (Absolute path to the `.roomodes` file)
- slug: string

### update_custom_mode_field
Updates a single field of a specific custom mode by its slug.

Parameters:
- rooModesFilePath: string (Absolute path to the `.roomodes` file)
- slug: string (The slug of the mode to update)
- fieldName: string (The name of the field to update: "name", "roleDefinition", "customInstructions", or "groups")
- fieldValue: string | string[] (The new value for the field. Must be an array of strings if fieldName is "groups", otherwise a string)
