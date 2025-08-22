import { z } from 'zod';
import { ToolHandler } from './types.js';
import { ScraperService } from '../services/scraper.service.js';

interface GetUrlsFromUrlParams {
  url: string;
  docMode?: boolean;
  maxUrls?: number;
}

export const getUrlsFromUrlTool: ToolHandler<GetUrlsFromUrlParams> = {
  name: 'get-urls-from-url',
  description: 'Extract all URLs from a given webpage and return them as an array',
  schema: {
    url: z.string().url().describe('URL to extract links from'),
    docMode: z.boolean().optional().default(false).describe('Whether to filter for documentation URLs only'),
    maxUrls: z.number().optional().default(100).describe('Maximum number of URLs to return')
  },
  handler: async ({ url, docMode = false, maxUrls = 100 }) => {
    try {
      const scraperService = new ScraperService();
      
      let urls: string[];
      
      if (docMode) {
        // Use the documentation-specific URL extraction
        const result = await scraperService.extractDocumentationUrls(url);
        urls = result.extractedUrls
          .slice(0, maxUrls)
          .map(extractedUrl => extractedUrl.url);
      } else {
        // Use general URL extraction
        const result = await scraperService.extractUrls(url);
        urls = result.extractedUrls
          .slice(0, maxUrls)
          .map(extractedUrl => extractedUrl.url);
      }

      const urlList = urls.map((urlItem, index) => `${index + 1}. ${urlItem}`).join('\n');
      
      return {
        content: [
          {
            type: "text",
            text: `🔗 **URLs extraídas de: ${url}**

📊 **Resumen:**
• Total de URLs encontradas: ${urls.length}
• Modo documentación: ${docMode ? 'Sí' : 'No'}
• Límite aplicado: ${maxUrls}

📋 **Lista de URLs:**
${urlList}

---
*Extracción completada en: ${new Date().toISOString()}*`
          }
        ],
        _meta: {
          source: "scraper-service",
          extractedAt: new Date().toISOString(),
          totalUrls: urls.length,
          docMode: docMode,
          baseUrl: url
        }
      };
    } catch (error: any) {
      console.error("Error extracting URLs:", error);
      return {
        content: [
          {
            type: "text",
            text: `❌ Error al extraer URLs de ${url}: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
};
