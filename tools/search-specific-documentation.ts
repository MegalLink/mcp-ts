import { z } from "zod";
import { ToolHandler } from "./types.js";
import { ScraperService } from "../services/scraper.service.js";

interface SearchSpecificDocsParams {
  urls: string[];
  includeMetadata: boolean;
  maxContentLength: number;
}

export const searchSpecificDocumentationTool: ToolHandler<SearchSpecificDocsParams> = {
  name: "search-specific-documentation",
  description: "Scrape specific documentation URLs and return clean text content without HTML tags or irrelevant data",
  schema: {
    urls: z
      .array(z.string().url())
      .min(1)
      .max(10)
      .describe("Array of documentation URLs to scrape (max 10 URLs)"),
    includeMetadata: z
      .boolean()
      .default(true)
      .describe("Whether to include metadata like title, description, etc. in the response"),
    maxContentLength: z
      .number()
      .int()
      .min(100)
      .max(50000)
      .default(10000)
      .describe("Maximum content length per URL in characters (to avoid overwhelming responses)"),
  },
  handler: async ({ urls, includeMetadata = true, maxContentLength = 10000 }) => {
    try {
      const scraperService = new ScraperService();
      const results = {
        successful: [] as Array<{
          url: string;
          title: string;
          content: string;
          contentLength: number;
          originalLength: number;
          scrapedAt: string;
          hasImages: boolean;
          hasLinks: boolean;
        }>,
        failed: [] as Array<{
          url: string;
          error: string;
        }>,
      };

      // Process each URL
      for (const url of urls) {
        try {
          console.log(`Scraping URL: ${url}`);
          
          const scrapedData = await scraperService.scrapeUrl(url);
          
          // Clean and truncate content if necessary
          let cleanContent = scrapedData.content.trim();
          let wasTruncated = false;
          
          if (cleanContent.length > maxContentLength) {
            cleanContent = cleanContent.substring(0, maxContentLength).trim();
            // Try to end at a complete sentence or word
            const lastSentence = cleanContent.lastIndexOf('.');
            const lastWord = cleanContent.lastIndexOf(' ');
            
            if (lastSentence > maxContentLength * 0.8) {
              cleanContent = cleanContent.substring(0, lastSentence + 1);
            } else if (lastWord > maxContentLength * 0.9) {
              cleanContent = cleanContent.substring(0, lastWord);
            }
            
            wasTruncated = true;
          }

          results.successful.push({
            url: url,
            title: scrapedData.title || 'Sin título',
            content: wasTruncated ? `${cleanContent}\n\n[CONTENIDO TRUNCADO - Original: ${scrapedData.content.length} caracteres]` : cleanContent,
            contentLength: cleanContent.length,
            originalLength: scrapedData.content.length,
            scrapedAt: new Date().toISOString(),
            hasImages: scrapedData.metadata.hasImages,
            hasLinks: scrapedData.metadata.hasLinks,
          });

          // Add small delay between requests to be respectful
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`Failed to scrape URL ${url}:`, error);
          results.failed.push({
            url: url,
            error: error instanceof Error ? error.message : 'Error desconocido',
          });
        }
      }

      // Build response content
      const successCount = results.successful.length;
      const failCount = results.failed.length;
      const totalUrls = urls.length;

      if (successCount === 0) {
        return {
          content: [
            {
              type: "text",
              text: `❌ **No se pudo obtener contenido de ninguna URL**

**URLs intentadas:** ${totalUrls}
**URLs fallidas:** ${failCount}

**Errores:**
${results.failed.map((fail, i) => `${i + 1}. ${fail.url}\n   Error: ${fail.error}`).join('\n\n')}

💡 **Sugerencias:**
• Verifica que las URLs sean accesibles
• Algunas páginas pueden tener protección anti-scraping
• Intenta con URLs más específicas de documentación`
            }
          ],
          isError: true
        };
      }

      // Format successful results
      const contentSections = results.successful.map((result, index) => {
        const metadata = includeMetadata ? 
          `**📄 ${index + 1}. ${result.title}**
🔗 **URL:** ${result.url}
� **Longitud:** ${result.originalLength.toLocaleString()} caracteres (mostrados: ${result.contentLength.toLocaleString()})
🖼️ **Imágenes:** ${result.hasImages ? 'Sí' : 'No'}
🔗 **Enlaces:** ${result.hasLinks ? 'Sí' : 'No'}
⏰ **Extraído:** ${new Date(result.scrapedAt).toLocaleString()}

---

` : `**📄 ${index + 1}. Contenido de: ${result.url}**

---

`;

        return `${metadata}${result.content}`;
      }).join('\n\n' + '='.repeat(80) + '\n\n');

      const summary = `🎯 **Contenido de documentación extraído**

📊 **Resumen:**
• URLs procesadas exitosamente: ${successCount}/${totalUrls}
• URLs fallidas: ${failCount}
• Contenido total extraído: ${results.successful.reduce((sum, r) => sum + r.originalLength, 0).toLocaleString()} caracteres

${failCount > 0 ? `❌ **URLs fallidas:**
${results.failed.map((fail, i) => `${i + 1}. ${fail.url} - ${fail.error}`).join('\n')}

` : ''}${'='.repeat(80)}

`;

      return {
        content: [
          {
            type: "text",
            text: `${summary}${contentSections}

---
*Scraping completado: ${new Date().toISOString()}*`
          }
        ],
        _meta: {
          urlsProcessed: totalUrls,
          successfulUrls: successCount,
          failedUrls: failCount,
          totalContentLength: results.successful.reduce((sum, r) => sum + r.originalLength, 0),
          results: results.successful.map(r => ({
            url: r.url,
            title: r.title,
            contentLength: r.contentLength,
            originalLength: r.originalLength,
            scrapedAt: r.scrapedAt
          })),
          errors: results.failed,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error("Error in search-specific-documentation:", error);
      return {
        content: [
          {
            type: "text",
            text: `❌ **Error general en el scraping**

**Error:** ${error instanceof Error ? error.message : String(error)}

Verifica las URLs y la conectividad de red.`
          }
        ],
        isError: true
      };
    }
  },
};
