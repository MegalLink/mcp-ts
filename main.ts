import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ChromaGateway } from "./gateway/chromadb.js";
import { COLLECTION_NAME } from "./shared/constants.js";
import { tools } from "./tools/index.js";

async function initializeChromaDB() {
  try {
    const chroma = new ChromaGateway({
      host: "chromadb",
      port: 8000,
    });
    await chroma.getOrCreateCollection(COLLECTION_NAME);
    console.log(`Successfully connected to ChromaDB and ensured collection '${COLLECTION_NAME}' exists.`);
  } catch (error) {
    console.error("Failed to initialize ChromaDB:", error);
    // Depending on the desired behavior, you might want to exit the process
    // process.exit(1);
  }
}

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

await initializeChromaDB();
await server.connect(transport);