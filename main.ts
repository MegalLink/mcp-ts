import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { tools } from "./tools/index.js";

const server = new McpServer({
  name: "mcp-aws-ts",
  version: "1.0.0",
});

// Registrar todas las herramientas desde el módulo de herramientas
tools.forEach(tool => {
  server.tool(
    tool.name,
    tool.description,
    tool.schema,
    tool.handler
  );
});

const transport = new StdioServerTransport();

await server.connect(transport);