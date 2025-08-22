import { RagService } from "../services/rag.service.js";
import { z } from "zod";
import { ToolHandler } from "./types.js";
import { SEARCH_TYPES } from "../shared/constants.js";
import { SearchType } from "../shared/types.js";
import { buildUrlDocumentWhere } from "../shared/query-helpers.js";

interface SearchDocsParams {
  query: string;
  searchType: SearchType;
  libraryName?: string;
  version?: string;
  category?: string;
  keywords?: string[];
  limit: number;
}

export const searchDocumentationTool: ToolHandler<SearchDocsParams> = {
  name: "search-documentation",
  description: "Search documentation URLs by query, library, category or keywords and return matching URLs with metadata",
  schema: {
    query: z.string().describe("Search query text to find relevant documentation"),
    searchType: z
      .enum([SEARCH_TYPES.GENERAL, SEARCH_TYPES.LIBRARY, SEARCH_TYPES.CATEGORY, SEARCH_TYPES.KEYWORDS])
      .default(SEARCH_TYPES.GENERAL)
      .describe("Search strategy: general (semantic search), library (by library name), category (by doc category), keywords (by specific keywords)"),
    libraryName: z
      .string()
      .optional()
      .describe("Filter by library name (e.g., 'tailwindcss', 'react')"),
    version: z
      .string()
      .optional()
      .describe("Filter by specific library version (e.g., '3.4.1')"),
    category: z
      .string()
      .optional()
      .describe("Filter by documentation category (e.g., 'components', 'utilities', 'layout')"),
    keywords: z
      .array(z.string())
      .optional()
      .describe("Array of specific keywords to search for"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10)
      .describe("Maximum number of URLs to return"),
  },
  handler: async ({ query, searchType = SEARCH_TYPES.GENERAL, libraryName, version, category, keywords, limit = 10 }) => {
    try {
      const ragService = new RagService();
      let results;

      // Execute search based on type
      switch (searchType) {
        case SEARCH_TYPES.LIBRARY:
          if (!libraryName) {
            throw new Error("libraryName is required for library search");
          }
          results = await ragService.searchByLibrary(libraryName, version, limit);
          break;
          
        case SEARCH_TYPES.CATEGORY:
          if (!category) {
            throw new Error("category is required for category search");
          }
          results = await ragService.searchByCategory(category, libraryName, limit);
          break;
          
        case SEARCH_TYPES.KEYWORDS:
          if (!keywords || keywords.length === 0) {
            throw new Error("keywords are required for keyword search");
          }
          results = await ragService.searchByKeywords(keywords, limit);
          break;
          
        default: // SEARCH_TYPES.GENERAL
          const where = buildUrlDocumentWhere({ libraryName, version, category });

          results = await ragService.query({
            queryTexts: [query],
            nResults: limit,
            where,
          });
      }

      // Format results
      const formattedResults = results.ids.map((id, index) => {
        const metadata = results.metadatas[index] || {};
        const score = results.distances ? 1 - (results.distances[index] || 0) : undefined;
        
        return {
          id,
          url: metadata.url || 'N/A',
          title: metadata.title || 'Sin título',
          libraryName: metadata.libraryName || 'N/A',
          version: metadata.version || 'N/A',
          category: metadata.category || 'N/A',
          keywords: typeof metadata.keywords === 'string' ? metadata.keywords.split(', ') : [],
          description: metadata.description || '',
          section: metadata.section || '',
          score: score ? Math.round(score * 100) / 100 : undefined,
          addedAt: metadata.addedAt || 'N/A'
        };
      });

      if (formattedResults.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `🔍 **No se encontraron resultados**

**Query:** "${query}"
**Tipo de búsqueda:** ${searchType}
${libraryName ? `**Librería:** ${libraryName}` : ''}
${version ? `**Versión:** ${version}` : ''}
${category ? `**Categoría:** ${category}` : ''}
${keywords ? `**Keywords:** ${keywords.join(', ')}` : ''}

💡 **Sugerencias:**
• Intenta con términos de búsqueda más generales
• Verifica que la librería esté indexada
• Prueba con un tipo de búsqueda diferente`
            }
          ],
          _meta: {
            query,
            searchType,
            resultCount: 0,
            filters: { libraryName, version, category, keywords }
          }
        };
      }

      const resultsList = formattedResults.map((result, idx) => 
        `**${idx + 1}. ${result.title}**
🔗 **URL:** ${result.url}
📚 **Librería:** ${result.libraryName} v${result.version}
📂 **Categoría:** ${result.category}
🏷️ **Keywords:** ${result.keywords.join(', ') || 'N/A'}
📝 **Descripción:** ${result.description || 'N/A'}
📊 **Score:** ${result.score || 'N/A'}
📅 **Agregado:** ${result.addedAt}`
      ).join('\n\n');

      return {
        content: [
          {
            type: "text",
            text: `🎯 **Documentación encontrada**

**Query:** "${query}"
**Tipo de búsqueda:** ${searchType}
**Resultados:** ${formattedResults.length} de máximo ${limit}

${resultsList}

---
*Búsqueda completada: ${new Date().toISOString()}*`
          }
        ],
        _meta: {
          query,
          searchType,
          resultCount: formattedResults.length,
          results: formattedResults.map(r => ({ url: r.url, title: r.title, score: r.score })),
          filters: { libraryName, version, category, keywords },
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error("Error searching documentation:", error);
      return {
        content: [
          {
            type: "text",
            text: `❌ **Error en búsqueda**

**Query:** "${query}"
**Error:** ${error instanceof Error ? error.message : String(error)}

Verifica los parámetros de búsqueda e intenta nuevamente.`
          }
        ],
        isError: true
      };
    }
  },
};
