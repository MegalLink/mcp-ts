import { RagService } from "../services/rag.service.js";
import { z } from "zod";
import { ToolHandler } from "./types.js";

const QueryRagSchema = {
  query: z.string().describe("The search query text"),
  sourceType: z
    .enum(["documentation", "source_code", "web_page"])
    .optional()
    .describe("Filter by source type"),
  libraryName: z
    .string()
    .toLowerCase()
    .optional()
    .describe("Filter by library name (e.g., 'react', 'tailwindcss')"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .default(5)
    .describe("Maximum number of results to return"),
};

const QueryRagInput = z.object(QueryRagSchema);

export const queryRagInformationTool: ToolHandler<z.infer<typeof QueryRagInput>> = {
  name: "query-rag-information",
  description: "Query the RAG system for relevant information",
  schema: QueryRagSchema,
  handler: async ({ query, sourceType, libraryName, limit = 5 }) => {
    try {
      const ragService = new RagService();
      
      // Build the where clause if filters are provided
      const where: Record<string, any> = {};
      if (sourceType) where.sourceType = sourceType;
      if (libraryName) where.libraryName = libraryName.toLowerCase();

      // Execute the query
      const results = await ragService.query({
        queryTexts: [query],
        nResults: limit,
        where: Object.keys(where).length > 0 ? where : undefined,
      });

      // Format the results
      const formattedResults = results.ids.map((id, index) => ({
        id,
        content: results.documents[index] || "",
        metadata: results.metadatas[index] || {},
        score: results.distances ? 1 - (results.distances[index] || 0) : undefined,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: `Found ${formattedResults.length} results for query: ${query}`,
          },
          ...formattedResults.map((result, idx) => ({
            type: "resource" as const,
            resource: {
              text: result.content,
              uri: result.metadata.sourceURI || `#${result.id}`,
              mimeType: "text/plain",
              metadata: {
                ...result.metadata,
                score: result.score,
              },
            },
          })),
        ],
        _meta: {
          query,
          resultCount: formattedResults.length,
        },
      };
    } catch (error) {
      console.error("Error querying RAG system:", error);
      return {
        content: [
          {
            type: "text" as const,
            text: `Error querying RAG system: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
};

export default queryRagInformationTool;
