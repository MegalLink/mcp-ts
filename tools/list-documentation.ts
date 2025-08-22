import { RagService } from "../services/rag.service.js";
import { z } from "zod";
import { ToolHandler } from "./types.js";
import { GROUP_BY_OPTIONS } from "../shared/constants.js";
import { GroupByOption } from "../shared/types.js";
import { buildUrlDocumentWhere } from "../shared/query-helpers.js";

interface ListDocsParams {
  groupBy: GroupByOption;
  libraryName?: string;
  limit: number;
  offset: number;
}

export const listDocumentationTool: ToolHandler<ListDocsParams> = {
  name: "list-documentation",
  description: "List indexed documentation URLs grouped by library, category, or show all documents",
  schema: {
    groupBy: z
      .enum([GROUP_BY_OPTIONS.ALL, GROUP_BY_OPTIONS.LIBRARY, GROUP_BY_OPTIONS.CATEGORY])
      .default(GROUP_BY_OPTIONS.ALL)
      .describe("How to group the results: all (simple list), library (grouped by library), category (grouped by category)"),
    libraryName: z
      .string()
      .optional()
      .describe("Filter by specific library name (e.g., 'tailwindcss')"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20)
      .describe("Maximum number of URLs to return"),
    offset: z
      .number()
      .int()
      .min(0)
      .default(0)
      .describe("Number of items to skip for pagination"),
  },
  handler: async ({ groupBy = GROUP_BY_OPTIONS.ALL, libraryName, limit = 20, offset = 0 }) => {
    try {
      const ragService = new RagService();
      
      // Build where clause
      const where = buildUrlDocumentWhere({ libraryName });
      
      // Get documents
      const results = await ragService.getDocuments({
        where,
        limit,
        offset,
      });

      if (results.ids.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `📋 **No hay documentación indexada**

${libraryName ? `**Librería:** ${libraryName}` : '**Filtro:** Todos'}
**Agrupación:** ${groupBy}

💡 Usa \`bulk-add-urls\` para indexar documentación primero.`
            }
          ],
          _meta: {
            groupBy,
            libraryName,
            totalCount: 0,
            offset,
            limit
          }
        };
      }

      // Format results
      const docs = results.ids.map((id, index) => {
        const metadata = results.metadatas[index] || {};
        return {
          id,
          url: metadata.url || 'N/A',
          title: metadata.title || 'Sin título',
          libraryName: metadata.libraryName || 'N/A',
          version: metadata.version || 'N/A',
          category: metadata.category || 'N/A',
          keywords: typeof metadata.keywords === 'string' ? metadata.keywords : '',
          addedAt: metadata.addedAt || 'N/A'
        };
      });

      let content = '';
      
      if (groupBy === GROUP_BY_OPTIONS.LIBRARY) {
        // Group by library
        const grouped = docs.reduce((acc, doc) => {
          const key = `${doc.libraryName} v${doc.version}`;
          if (!acc[key]) acc[key] = [];
          acc[key].push(doc);
          return acc;
        }, {} as Record<string, typeof docs>);
        
        content = Object.entries(grouped).map(([library, docs]) => 
          `**📚 ${library}** (${docs.length} URLs)\n` +
          docs.map(doc => `• ${doc.title} - ${doc.url}`).join('\n')
        ).join('\n\n');
        
      } else if (groupBy === GROUP_BY_OPTIONS.CATEGORY) {
        // Group by category  
        const grouped = docs.reduce((acc, doc) => {
          const key = doc.category;
          if (!acc[key]) acc[key] = [];
          acc[key].push(doc);
          return acc;
        }, {} as Record<string, typeof docs>);
        
        content = Object.entries(grouped).map(([category, docs]) => 
          `**📂 ${category}** (${docs.length} URLs)\n` +
          docs.map(doc => `• ${doc.title} - ${doc.libraryName} - ${doc.url}`).join('\n')
        ).join('\n\n');
        
      } else {
        // Show all
        content = docs.map((doc, idx) => 
          `**${offset + idx + 1}. ${doc.title}**\n` +
          `🔗 ${doc.url}\n` +
          `📚 ${doc.libraryName} v${doc.version}\n` +
          `📂 ${doc.category}\n` +
          `📅 ${doc.addedAt}`
        ).join('\n\n');
      }

      const totalCount = await ragService.getDocumentCount();

      return {
        content: [
          {
            type: "text",
            text: `📋 **Documentación indexada**

**Total en base:** ${totalCount} documentos
**Mostrados:** ${docs.length} (desde ${offset + 1})
**Agrupación:** ${groupBy}
${libraryName ? `**Librería:** ${libraryName}` : ''}

${content}

---
*Consultado: ${new Date().toISOString()}*`
          }
        ],
        _meta: {
          groupBy,
          libraryName,
          totalCount,
          shownCount: docs.length,
          offset,
          limit,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error("Error listing documentation:", error);
      return {
        content: [
          {
            type: "text",
            text: `❌ **Error al listar documentación**

Error: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  },
};
