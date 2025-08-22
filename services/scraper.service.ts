import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  metadata: {
    scrapedAt: string;
    contentLength: number;
    hasImages: boolean;
    hasLinks: boolean;
  };
}

export interface ExtractedUrl {
  url: string;
  text: string;
  title?: string;
  description?: string;
}

export interface UrlExtractionResult {
  baseUrl: string;
  extractedUrls: ExtractedUrl[];
  totalFound: number;
  scrapedAt: string;
}

export interface ScraperOptions {
  timeout?: number;
  userAgent?: string;
  maxContentLength?: number;
  selectors?: {
    main?: string;
    title?: string;
    content?: string[];
    ignore?: string[];
  };
}

export class ScraperService {
  private defaultOptions: Required<ScraperOptions> = {
    timeout: 10000,
    userAgent: 'Mozilla/5.0 (compatible; MCP-Scraper/1.0)',
    maxContentLength: 1000000, // 1MB - increased for documentation pages
    selectors: {
      main: 'main, article, .content, .post-content, .entry-content',
      title: 'title, h1, .title, .post-title',
      content: ['main', 'article', '.content', '.post-content', '.entry-content', 'body'],
      ignore: [
        'nav', 'header', 'footer', 'aside', '.sidebar', '.menu', 
        '.navigation', '.breadcrumb', '.comments', '.social-share',
        'script', 'style', '.ad', '.advertisement', '.popup'
      ]
    }
  };

  constructor(private options: ScraperOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  async scrapeUrl(url: string): Promise<ScrapedContent> {
    try {
      // Validate URL
      const validUrl = this.validateAndNormalizeUrl(url);
      
      // Fetch content
      const response = await this.fetchContent(validUrl);
      
      // Parse and clean content
      const parsed = this.parseContent(response.data, validUrl);
      
      return parsed;
    } catch (error) {
      throw new Error(`Failed to scrape URL "${url}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async extractUrls(url: string, options?: {
    filterPattern?: RegExp;
    includeExternal?: boolean;
    maxUrls?: number;
    urlSelectors?: string[];
  }): Promise<UrlExtractionResult> {
    try {
      const validUrl = this.validateAndNormalizeUrl(url);
      const response = await this.fetchContent(validUrl);
      
      return this.parseUrls(response.data, validUrl, options);
    } catch (error) {
      throw new Error(`Failed to extract URLs from "${url}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async extractDocumentationUrls(url: string, options?: {
    docPathPattern?: RegExp;
    excludePatterns?: RegExp[];
    maxUrls?: number;
    includeCategories?: boolean;
  }): Promise<UrlExtractionResult> {
    const defaultOptions = {
      docPathPattern: /\/docs?\//i,
      excludePatterns: [
        /\.(pdf|zip|tar\.gz|exe|dmg)$/i,
        /#/,  // Skip anchor links
        /\/api\//i,  // Skip API endpoints
        /\/changelog/i,
        /\/blog/i
      ],
      maxUrls: 500,
      includeCategories: true,
      ...options
    };

    const extractionOptions = {
      filterPattern: defaultOptions.docPathPattern,
      includeExternal: false,
      maxUrls: defaultOptions.maxUrls,
      urlSelectors: [
        'a[href*="/docs"]',  // Documentation links
        'nav a[href]',       // Navigation links
        '.sidebar a[href]',  // Sidebar links
        '.toc a[href]',      // Table of contents
        '.menu a[href]',     // Menu links
        'main a[href]'       // Main content links
      ]
    };

    const result = await this.extractUrls(url, extractionOptions);
    
    // Additional filtering for documentation
    const filteredUrls = result.extractedUrls.filter(extracted => {
      // Apply exclude patterns
      const shouldExclude = defaultOptions.excludePatterns?.some(pattern => 
        pattern.test(extracted.url)
      );
      
      return !shouldExclude;
    });

    return {
      ...result,
      extractedUrls: filteredUrls,
      totalFound: filteredUrls.length
    };
  }

  private validateAndNormalizeUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are supported');
      }
      return parsedUrl.toString();
    } catch (error) {
      throw new Error(`Invalid URL: ${url}`);
    }
  }

  private async fetchContent(url: string): Promise<AxiosResponse<string>> {
    const response = await axios.get<string>(url, {
      timeout: this.options.timeout,
      headers: {
        'User-Agent': this.options.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      maxContentLength: this.options.maxContentLength,
      responseType: 'text'
    });

    return response;
  }

  private parseUrls(html: string, baseUrl: string, options?: {
    filterPattern?: RegExp;
    includeExternal?: boolean;
    maxUrls?: number;
    urlSelectors?: string[];
  }): UrlExtractionResult {
    const $ = cheerio.load(html);
    const extractedUrls: ExtractedUrl[] = [];
    const baseUrlObj = new URL(baseUrl);
    
    // Default selectors for finding links
    const selectors = options?.urlSelectors || ['a[href]'];
    
    // Extract all links
    selectors.forEach(selector => {
      $(selector).each((_, element) => {
        const href = $(element).attr('href');
        if (!href) return;
        
        try {
          // Resolve relative URLs
          const absoluteUrl = new URL(href, baseUrl).toString();
          const urlObj = new URL(absoluteUrl);
          
          // Skip if external URLs are not allowed
          if (!options?.includeExternal && urlObj.hostname !== baseUrlObj.hostname) {
            return;
          }
          
          // Apply filter pattern if provided
          if (options?.filterPattern && !options.filterPattern.test(absoluteUrl)) {
            return;
          }
          
          // Skip duplicates
          if (extractedUrls.some(existing => existing.url === absoluteUrl)) {
            return;
          }
          
          // Extract link text and additional info
          const linkText = $(element).text().trim();
          const title = $(element).attr('title') || $(element).attr('aria-label');
          
          // Try to get description from nearby text or data attributes
          const description = $(element).attr('data-description') || 
                            $(element).closest('[data-description]').attr('data-description') ||
                            $(element).next('p, .description, .summary').text().trim().substring(0, 200);
          
          extractedUrls.push({
            url: absoluteUrl,
            text: linkText,
            title: title || undefined,
            description: description || undefined
          });
          
        } catch (urlError) {
          // Skip invalid URLs
          console.warn(`Invalid URL found: ${href}`);
        }
      });
    });
    
    // Apply max URLs limit
    const finalUrls = options?.maxUrls 
      ? extractedUrls.slice(0, options.maxUrls)
      : extractedUrls;
    
    return {
      baseUrl,
      extractedUrls: finalUrls,
      totalFound: extractedUrls.length,
      scrapedAt: new Date().toISOString()
    };
  }

  private parseContent(html: string, url: string): ScrapedContent {
    const $ = cheerio.load(html);
    
    // Remove unwanted elements
    this.options.selectors!.ignore!.forEach(selector => {
      $(selector).remove();
    });

    // Extract title
    const title = this.extractTitle($);
    
    // Extract main content
    const content = this.extractMainContent($);
    
    // Create metadata
    const metadata = {
      scrapedAt: new Date().toISOString(),
      contentLength: content.length,
      hasImages: $('img').length > 0,
      hasLinks: $('a').length > 0
    };

    return {
      url,
      title,
      content,
      metadata
    };
  }

  private extractTitle($: ReturnType<typeof cheerio.load>): string {
    const titleSelectors = this.options.selectors!.title!.split(', ');
    
    for (const selector of titleSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        const title = element.text().trim();
        if (title) {
          return this.cleanText(title);
        }
      }
    }
    
    return 'Untitled';
  }

  private extractMainContent($: ReturnType<typeof cheerio.load>): string {
    const contentSelectors = this.options.selectors!.content!;
    
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        const rawText = element.text();
        if (rawText && rawText.trim().length > 100) { // Ensure meaningful content
          return this.cleanText(rawText);
        }
      }
    }
    
    // Fallback to body if no main content found
    const bodyText = $('body').text();
    return this.cleanText(bodyText);
  }

  private cleanText(text: string): string {
    return text
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove common navigation text
      .replace(/Next\s*→/gi, '')
      .replace(/←\s*Previous/gi, '')
      .replace(/Edit this page on GitHub/gi, '')
      .replace(/Share on Twitter/gi, '')
      .replace(/Share on Facebook/gi, '')
      .replace(/Copy link/gi, '')
      // Remove common footer/header patterns
      .replace(/Copyright\s*©.*$/gim, '')
      .replace(/All rights reserved\.?/gi, '')
      .replace(/Terms of Service/gi, '')
      .replace(/Privacy Policy/gi, '')
      // Remove excessive punctuation
      .replace(/\.{3,}/g, '...')
      .replace(/\?{2,}/g, '?')
      .replace(/!{2,}/g, '!')
      // Clean up spacing
      .trim();
  }

  async scrapeMultipleUrls(urls: string[]): Promise<ScrapedContent[]> {
    const results = await Promise.allSettled(
      urls.map(url => this.scrapeUrl(url))
    );

    return results
      .map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.warn(`Failed to scrape URL ${urls[index]}: ${result.reason}`);
          return null;
        }
      })
      .filter((result): result is ScrapedContent => result !== null);
  }

  // Utility method to check if a URL is scrapeable
  async isScrapeable(url: string): Promise<boolean> {
    try {
      const validUrl = this.validateAndNormalizeUrl(url);
      const response = await axios.head(validUrl, {
        timeout: this.options.timeout,
        headers: { 'User-Agent': this.options.userAgent }
      });
      
      const contentType = response.headers['content-type'] || '';
      return contentType.includes('text/html');
    } catch {
      return false;
    }
  }
}

// Export a default instance
export const defaultScraper = new ScraperService();

// Export factory function for custom configurations
export function createScraper(options?: ScraperOptions): ScraperService {
  return new ScraperService(options);
}
