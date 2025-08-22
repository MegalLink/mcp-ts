import { z } from "zod";
import { ToolHandler } from "./types.js";
import { RagService } from "../services/rag.service.js";
import { ScraperService } from "../services/scraper.service.js";
import { UrlDocumentInput } from "../shared/types.js";

interface BulkUrlsParams {
  baseUrl: string;
  libraryName: string;
  version: string;
  defaultCategory: string;
  extractContent: boolean;
  docMode: boolean;
}

// Helper function to extract section from URL
function extractSectionFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname
      .split("/")
      .filter((part) => part.length > 0);

    // Look for common documentation patterns
    const docIndex = pathParts.findIndex((part) => /^docs?$/i.test(part));
    if (docIndex >= 0 && docIndex < pathParts.length - 1) {
      return pathParts[docIndex + 1];
    }

    // Fall back to last path segment
    return pathParts[pathParts.length - 1] || "general";
  } catch {
    return "general";
  }
}

export const bulkAddUrlsTool: ToolHandler<BulkUrlsParams> = {
  name: "bulk-add-urls",
  description:
    "Extract URLs from a documentation site and bulk add them to the RAG system",
  schema: {
    baseUrl: z
      .string()
      .url()
      .describe("Base URL to extract documentation URLs from"),
    libraryName: z
      .string()
      .describe('Name of the library (e.g., "tailwindcss", "react")'),
    version: z.string().describe('Version of the library (e.g., "3.4.1")'),
    defaultCategory: z
      .string()
      .describe('Default category for all URLs (e.g., "documentation", "api")'),
    extractContent: z
      .boolean()
      .default(false)
      .describe("Whether to extract actual content from each URL"),
    docMode: z
      .boolean()
      .default(true)
      .describe("Use documentation-specific URL filtering"),
  },
  handler: async ({
    baseUrl,
    libraryName,
    version,
    defaultCategory,
    extractContent,
    docMode,
  }) => {
    try {
      const scraperService = new ScraperService();
      const ragService = new RagService();

      // Extract URLs from the base page
      let urlsResult;
      if (docMode) {
        urlsResult = await scraperService.extractDocumentationUrls(baseUrl);
      } else {
        urlsResult = await scraperService.extractUrls(baseUrl);
      }

      const urlsToProcess = urlsResult.extractedUrls;

      if (urlsToProcess.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `⚠️ **No URLs found**

Base URL: ${baseUrl}
Doc Mode: ${docMode}

No se encontraron URLs para procesar. Verifica la URL base.`,
            },
          ],
        };
      }

      const results = {
        successful: [] as string[],
        failed: [] as { url: string; error: string }[],
      };

      // Process each URL
      for (const extractedUrl of urlsToProcess) {
        try {
          // Generate metadata for this URL
          const metadata: UrlDocumentInput = {
            url: extractedUrl.url,
            title: extractedUrl.title || extractedUrl.text || "Sin título",
            libraryName: libraryName.toLowerCase(),
            version,
            category: defaultCategory.toLowerCase(),
            keywords: [
              libraryName.toLowerCase(),
              version,
              defaultCategory.toLowerCase(),
              ...extractedUrl.text
                .toLowerCase()
                .split(/\s+/)
                .filter((word) => word.length > 2),
            ].filter((value, index, self) => self.indexOf(value) === index), // Remove duplicates
            description:
              extractedUrl.description || `${libraryName} documentation page`,
            section: extractSectionFromUrl(extractedUrl.url),
            lastUpdated: new Date().toISOString(),
          };

          const docId = await ragService.addUrlDocument(
            metadata,
            extractContent
          );
          results.successful.push(extractedUrl.url);

          // Add small delay to avoid overwhelming the server
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to process URL ${extractedUrl.url}:`, error);
          results.failed.push({
            url: extractedUrl.url,
            error: error instanceof Error ? error.message : "Error desconocido",
          });
        }
      }

      const successRate = Math.round(
        (results.successful.length / urlsToProcess.length) * 100
      );

      return {
        content: [
          {
            type: "text",
            text: `🎯 **Bulk Add URLs - Completado**

📊 **Resumen:**
• URLs encontradas: ${urlsToProcess.length}
• URLs procesadas exitosamente: ${results.successful.length}
• URLs fallidas: ${results.failed.length}
• Tasa de éxito: ${successRate}%

📚 **Detalles de la librería:**
• Nombre: ${libraryName}
• Versión: ${version}
• Categoría: ${defaultCategory}
• Contenido extraído: ${extractContent ? "Sí" : "No"}

${
  results.successful.length > 0
    ? `✅ **URLs agregadas exitosamente:**
${results.successful
  .slice(0, 10)
  .map((url, i) => `${i + 1}. ${url}`)
  .join("\n")}
${
  results.successful.length > 10
    ? `... y ${results.successful.length - 10} más`
    : ""
}`
    : ""
}

${
  results.failed.length > 0
    ? `❌ **URLs fallidas:**
${results.failed
  .slice(0, 5)
  .map((fail, i) => `${i + 1}. ${fail.url} - ${fail.error}`)
  .join("\n")}
${results.failed.length > 5 ? `... y ${results.failed.length - 5} más` : ""}`
    : ""
}

---
*Proceso completado en: ${new Date().toISOString()}*`,
          },
        ],
        _meta: {
          baseUrl,
          libraryName,
          version,
          totalUrls: urlsToProcess.length,
          successful: results.successful.length,
          failed: results.failed.length,
          successRate,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      console.error("Error in bulk add URLs:", error);
      return {
        content: [
          {
            type: "text",
            text: `❌ **Error en Bulk Add URLs**

Base URL: ${baseUrl}
Error: ${error.message || "Error desconocido"}

Verifica la URL base y la conectividad de red.`,
          },
        ],
        isError: true,
      };
    }
  },
};
