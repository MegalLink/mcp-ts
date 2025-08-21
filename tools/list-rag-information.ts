import { RagService } from "../services/rag.service.js";
import { z } from "zod";
import { ToolHandler } from "./types.js";

const ListRagSchema = {
  groupBy: z
    .enum(["libraryName", "sourceType", "all"])
    .default("all")
    .describe("Group results by 'libraryName', 'sourceType', or show 'all' documents"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .describe("Maximum number of items to return"),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .describe("Number of items to skip for pagination"),
};

const ListRagInput = z.object(ListRagSchema);

export const listRagInformationTool: ToolHandler<z.infer<typeof ListRagInput>> = {
  name: "list-rag-information",
  description: "List all indexed information in the RAG system, optionally grouped by library or source type",
  schema: ListRagSchema,
  handler: async ({ groupBy = "all", limit = 20, offset = 0 }) => {
    try {
      const ragService = new RagService();
      
      // Get total document count
      const totalCount = await ragService.getDocumentCount();
      
      // If no documents, return early
      if (totalCount === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No documents found in the RAG system.",
            },
          ],
          _meta: {
            totalCount: 0,
            groupBy,
          },
        };
      }

      // Get all documents with metadata
      const result = await ragService.getDocuments({
        limit,
        offset,
      });

      // Define types for better type safety
      interface DocumentItem {
        id: string;
        content: string;
        metadata: Record<string, any>;
      }

      interface GroupedResult {
        count: number;
        items: DocumentItem[];
      }

      const groupedResults: Record<string, GroupedResult> = {};
      
      // Process all documents
      const items: DocumentItem[] = [];
      
      // First, process all items for the flat list
      result.ids.forEach((id, index) => {
        const doc = result.documents?.[index] || '';
        const metadata = result.metadatas?.[index] || {};
        const content = doc.substring(0, 200) + (doc.length > 200 ? '...' : '');
        
        // Add to items array
        items.push({ id, content, metadata });
        
        // If we're grouping, also add to grouped results
        if (groupBy !== 'all') {
          const groupKey = (metadata && typeof metadata === 'object' && groupBy in metadata) 
            ? String(metadata[groupBy])
            : 'Unknown';
          
          if (!groupedResults[groupKey]) {
            groupedResults[groupKey] = {
              count: 0,
              items: [],
            };
          }
          
          groupedResults[groupKey].count++;
          groupedResults[groupKey].items.push({
            id,
            content,
            metadata,
          });
        }
      });

      // Format the response
      const content: any[] = [
        {
          type: "text" as const,
          text: `Found ${totalCount} documents in the RAG system${groupBy !== 'all' ? `, grouped by ${groupBy}` : ''}`,
        },
      ];

      if (groupBy === "all") {
        content.push({
          type: "list" as const,
          items: items.map(item => ({
            id: item.id,
            title: item.metadata?.libraryName || 'Unknown',
            description: item.metadata?.sourceURI || 'No source URI',
            content: item.content,
            metadata: item.metadata,
          })),
        });
      } else {
        Object.entries(groupedResults).forEach(([group, data]: [string, any]) => {
          content.push({
            type: "section" as const,
            title: `${group} (${data.count} items)`,
            content: {
              type: "list" as const,
              items: data.items.map((item: any) => ({
                id: item.id,
                title: item.metadata?.libraryName || 'Unknown',
                description: item.metadata?.sourceURI || 'No source URI',
                content: item.content,
                metadata: item.metadata,
              })),
            },
          });
        });
      }

      return {
        content,
        _meta: {
          totalCount,
          groupBy,
          count: groupBy === 'all' ? items.length : Object.keys(groupedResults).length,
          hasMore: totalCount > offset + limit,
          offset,
          limit,
        },
      };
    } catch (error) {
      console.error("Error listing RAG information:", error);
      return {
        content: [
          {
            type: "text" as const,
            text: `Error listing RAG information: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
};

export default listRagInformationTool;
