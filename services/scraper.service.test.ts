import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { expect } from 'chai';
import axios from 'axios';
import { ScraperService, ScrapedContent, UrlExtractionResult } from './scraper.service.js';

import chai from 'chai';
chai.use(sinonChai as any);

let sandbox: sinon.SinonSandbox;

describe('ScraperService', () => {
  let scraperService: ScraperService;
  let axiosStub: sinon.SinonStub;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    axiosStub = sandbox.stub(axios, 'get');
    scraperService = new ScraperService();
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('scrapeUrl', () => {
    it('should scrape content from a valid URL', async () => {
      const url = 'https://example.com/test';
      const mockHtml = `
        <html>
          <head><title>Test Page</title></head>
          <body>
            <main>
              <h1>Main Title</h1>
              <p>This is test content for scraping.</p>
              <img src="test.jpg" alt="Test image">
              <a href="/link1">Link 1</a>
            </main>
          </body>
        </html>
      `;
      
      axiosStub.resolves({
        data: mockHtml,
        status: 200,
        headers: { 'content-type': 'text/html' }
      });
      
      const result = await scraperService.scrapeUrl(url);
      
      expect(axiosStub).to.have.been.calledOnce;
      expect(result).to.be.an('object');
      expect(result.url).to.equal(url);
      expect(result.title).to.equal('Test Page');
      expect(result.content).to.include('This is test content for scraping');
      expect(result.metadata.hasImages).to.be.true;
      expect(result.metadata.hasLinks).to.be.true;
      expect(result.metadata.contentLength).to.be.greaterThan(0);
      expect(result.metadata.scrapedAt).to.be.a('string');
    });
    
    it('should handle URLs with query parameters and fragments', async () => {
      const url = 'https://example.com/test?param=value#section';
      const mockHtml = '<html><head><title>Test</title></head><body><p>Content</p></body></html>';
      
      axiosStub.resolves({ data: mockHtml });
      
      const result = await scraperService.scrapeUrl(url);
      
      expect(result.url).to.equal(url);
      expect(axiosStub.firstCall.args[0]).to.equal(url);
    });
    
    it('should reject invalid URLs', async () => {
      const invalidUrl = 'not-a-url';
      
      try {
        await scraperService.scrapeUrl(invalidUrl);
        expect.fail('Should have thrown an error for invalid URL');
      } catch (error) {
        expect(error).to.be.an('error');
        expect((error as Error).message).to.include('Invalid URL');
      }
    });
    
    it('should reject non-HTTP protocols', async () => {
      const ftpUrl = 'ftp://example.com/file.txt';
      
      try {
        await scraperService.scrapeUrl(ftpUrl);
        expect.fail('Should have thrown an error for FTP URL');
      } catch (error) {
        expect(error).to.be.an('error');
        expect((error as Error).message).to.include('Failed to scrape URL');
      }
    });
    
    it('should handle network errors', async () => {
      const url = 'https://example.com/test';
      const networkError = new Error('Network Error');
      
      axiosStub.rejects(networkError);
      
      try {
        await scraperService.scrapeUrl(url);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.an('error');
        expect((error as Error).message).to.include('Failed to scrape URL');
      }
    });
    
    it('should clean content by removing navigation elements', async () => {
      const url = 'https://example.com/test';
      const mockHtml = `
        <html>
          <head><title>Test Page</title></head>
          <body>
            <nav>Navigation menu</nav>
            <header>Header content</header>
            <main>
              <p>Main content to keep</p>
            </main>
            <footer>Footer content</footer>
            <script>console.log('script');</script>
            <style>.test { color: red; }</style>
          </body>
        </html>
      `;
      
      axiosStub.resolves({ data: mockHtml });
      
      const result = await scraperService.scrapeUrl(url);
      
      expect(result.content).to.include('Main content to keep');
      expect(result.content).to.not.include('Navigation menu');
      expect(result.content).to.not.include('Header content');
      expect(result.content).to.not.include('Footer content');
      expect(result.content).to.not.include('console.log');
      expect(result.content).to.not.include('.test { color: red; }');
    });
  });
  
  describe('extractUrls', () => {
    it('should extract URLs from HTML content', async () => {
      const baseUrl = 'https://example.com/';
      const mockHtml = `
        <html>
          <body>
            <a href="/page1">Page 1</a>
            <a href="/page2" title="Page 2 Title">Page 2</a>
            <a href="https://external.com">External Link</a>
            <a href="#anchor">Anchor Link</a>
          </body>
        </html>
      `;
      
      axiosStub.resolves({ data: mockHtml });
      
      const result = await scraperService.extractUrls(baseUrl);
      
      expect(result).to.be.an('object');
      expect(result.baseUrl).to.equal(baseUrl);
      expect(result.extractedUrls).to.be.an('array');
      expect(result.extractedUrls).to.have.length.greaterThan(0);
      expect(result.totalFound).to.be.a('number');
      expect(result.scrapedAt).to.be.a('string');
      
      const urls = result.extractedUrls.map(u => u.url);
      // Note: URLs are normalized by the URL constructor, so trailing slashes may be added
      expect(urls.some(url => url.includes('/page1'))).to.be.true;
      expect(urls.some(url => url.includes('/page2'))).to.be.true;
    });
    
    it('should filter URLs by pattern', async () => {
      const baseUrl = 'https://example.com';
      const mockHtml = `
        <html>
          <body>
            <a href="/docs/page1">Docs Page 1</a>
            <a href="/blog/post1">Blog Post 1</a>
            <a href="/docs/page2">Docs Page 2</a>
          </body>
        </html>
      `;
      
      axiosStub.resolves({ data: mockHtml });
      
      const result = await scraperService.extractUrls(baseUrl, {
        filterPattern: /\/docs\//,
        maxUrls: 10
      });
      
      const urls = result.extractedUrls.map(u => u.url);
      expect(urls).to.include('https://example.com/docs/page1');
      expect(urls).to.include('https://example.com/docs/page2');
      expect(urls).to.not.include('https://example.com/blog/post1');
    });
    
    it('should exclude external URLs by default', async () => {
      const baseUrl = 'https://example.com';
      const mockHtml = `
        <html>
          <body>
            <a href="/internal">Internal Link</a>
            <a href="https://external.com">External Link</a>
          </body>
        </html>
      `;
      
      axiosStub.resolves({ data: mockHtml });
      
      const result = await scraperService.extractUrls(baseUrl, {
        includeExternal: false
      });
      
      const urls = result.extractedUrls.map(u => u.url);
      expect(urls).to.include('https://example.com/internal');
      expect(urls).to.not.include('https://external.com');
    });
    
    it('should include external URLs when specified', async () => {
      const baseUrl = 'https://example.com';
      const mockHtml = `
        <html>
          <body>
            <a href="/internal">Internal Link</a>
            <a href="https://external.com">External Link</a>
          </body>
        </html>
      `;
      
      axiosStub.resolves({ data: mockHtml });
      
      const result = await scraperService.extractUrls(baseUrl, {
        includeExternal: true
      });
      
      const urls = result.extractedUrls.map(u => u.url);
      expect(urls.some(url => url.includes('/internal'))).to.be.true;
      expect(urls.some(url => url.includes('external.com'))).to.be.true;
    });
    
    it('should respect maxUrls limit', async () => {
      const baseUrl = 'https://example.com';
      const mockHtml = `
        <html>
          <body>
            <a href="/page1">Page 1</a>
            <a href="/page2">Page 2</a>
            <a href="/page3">Page 3</a>
            <a href="/page4">Page 4</a>
            <a href="/page5">Page 5</a>
          </body>
        </html>
      `;
      
      axiosStub.resolves({ data: mockHtml });
      
      const result = await scraperService.extractUrls(baseUrl, {
        maxUrls: 3
      });
      
      expect(result.extractedUrls).to.have.length(3);
    });
  });
  
  describe('extractDocumentationUrls', () => {
    it('should extract documentation URLs with default patterns', async () => {
      const baseUrl = 'https://example.com/docs';
      const mockHtml = `
        <html>
          <body>
            <nav>
              <a href="/docs/getting-started">Getting Started</a>
              <a href="/docs/api/reference">API Reference</a>
              <a href="/blog/news">Blog Post</a>
              <a href="/docs/guide.pdf">PDF Guide</a>
            </nav>
          </body>
        </html>
      `;
      
      axiosStub.resolves({ data: mockHtml });
      
      const result = await scraperService.extractDocumentationUrls(baseUrl);
      
      const urls = result.extractedUrls.map(u => u.url);
      expect(urls).to.include('https://example.com/docs/getting-started');
      expect(urls).to.not.include('https://example.com/blog/news');
      expect(urls).to.not.include('https://example.com/docs/guide.pdf');
    });
    
    it('should use custom documentation patterns', async () => {
      const baseUrl = 'https://example.com';
      const mockHtml = `
        <html>
          <body>
            <a href="/documentation/intro">Introduction</a>
            <a href="/docs/guide">Guide</a>
            <a href="/help/faq">FAQ</a>
          </body>
        </html>
      `;
      
      axiosStub.resolves({ data: mockHtml });
      
      const result = await scraperService.extractDocumentationUrls(baseUrl, {
        docPathPattern: /\/(documentation|help)\//,
        maxUrls: 10
      });
      
      const urls = result.extractedUrls.map(u => u.url);
      console.log('Extracted URLs:', urls);
      expect(urls.some(url => url.includes('/documentation/intro'))).to.be.true;
      expect(urls.some(url => url.includes('/help/faq'))).to.be.true;
      expect(urls.some(url => url.includes('/docs/guide'))).to.be.false;
    });
    
    it('should exclude patterns like changelog and blog', async () => {
      const baseUrl = 'https://example.com/docs';
      const mockHtml = `
        <html>
          <body>
            <a href="/docs/intro">Introduction</a>
            <a href="/docs/changelog">Changelog</a>
            <a href="/blog/updates">Blog Updates</a>
          </body>
        </html>
      `;
      
      axiosStub.resolves({ data: mockHtml });
      
      const result = await scraperService.extractDocumentationUrls(baseUrl);
      
      const urls = result.extractedUrls.map(u => u.url);
      expect(urls).to.include('https://example.com/docs/intro');
      expect(urls).to.not.include('https://example.com/docs/changelog');
      expect(urls).to.not.include('https://example.com/blog/updates');
    });
  });
  
  describe('isScrapeable', () => {
    let axiosHeadStub: sinon.SinonStub;
    
    beforeEach(() => {
      axiosHeadStub = sandbox.stub(axios, 'head');
    });
    
    it('should return true for HTML content', async () => {
      const url = 'https://example.com/page';
      
      axiosHeadStub.resolves({
        headers: { 'content-type': 'text/html; charset=utf-8' }
      });
      
      const result = await scraperService.isScrapeable(url);
      
      expect(result).to.be.true;
      expect(axiosHeadStub).to.have.been.calledOnceWith(url, sinon.match.object);
    });
    
    it('should return false for non-HTML content', async () => {
      const url = 'https://example.com/file.pdf';
      
      axiosHeadStub.resolves({
        headers: { 'content-type': 'application/pdf' }
      });
      
      const result = await scraperService.isScrapeable(url);
      
      expect(result).to.be.false;
    });
    
    it('should return false when request fails', async () => {
      const url = 'https://example.com/nonexistent';
      
      axiosHeadStub.rejects(new Error('Not found'));
      
      const result = await scraperService.isScrapeable(url);
      
      expect(result).to.be.false;
    });
    
    it('should return false for invalid URLs', async () => {
      const invalidUrl = 'not-a-url';
      
      const result = await scraperService.isScrapeable(invalidUrl);
      
      expect(result).to.be.false;
      expect(axiosHeadStub).to.not.have.been.called;
    });
  });
  
  describe('scrapeMultipleUrls', () => {
    it('should scrape multiple URLs successfully', async () => {
      const urls = ['https://example.com/page1', 'https://example.com/page2'];
      const mockHtml1 = '<html><head><title>Page 1</title></head><body><p>Content 1</p></body></html>';
      const mockHtml2 = '<html><head><title>Page 2</title></head><body><p>Content 2</p></body></html>';
      
      axiosStub.onFirstCall().resolves({ data: mockHtml1 });
      axiosStub.onSecondCall().resolves({ data: mockHtml2 });
      
      const results = await scraperService.scrapeMultipleUrls(urls);
      
      expect(results).to.have.length(2);
      expect(results[0].title).to.equal('Page 1');
      expect(results[1].title).to.equal('Page 2');
      expect(results[0].content).to.include('Content 1');
      expect(results[1].content).to.include('Content 2');
    });
    
    it('should handle mixed success and failure', async () => {
      const urls = ['https://example.com/good', 'https://example.com/bad'];
      const mockHtml = '<html><head><title>Good Page</title></head><body><p>Content</p></body></html>';
      
      axiosStub.onFirstCall().resolves({ data: mockHtml });
      axiosStub.onSecondCall().rejects(new Error('Network error'));
      
      const results = await scraperService.scrapeMultipleUrls(urls);
      
      expect(results).to.have.length(1);
      expect(results[0].title).to.equal('Good Page');
    });
    
    it('should return empty array when all URLs fail', async () => {
      const urls = ['https://example.com/bad1', 'https://example.com/bad2'];
      
      axiosStub.rejects(new Error('Network error'));
      
      const results = await scraperService.scrapeMultipleUrls(urls);
      
      expect(results).to.have.length(0);
    });
  });
  
  describe('constructor with custom options', () => {
    it('should use custom options', () => {
      const customOptions = {
        timeout: 5000,
        userAgent: 'Custom Bot 1.0',
        maxContentLength: 500000
      };
      
      const customScraper = new ScraperService(customOptions);
      
      // Test that custom options are applied by making a request
      const url = 'https://example.com/test';
      const mockHtml = '<html><body><p>Test</p></body></html>';
      
      axiosStub.resolves({ data: mockHtml });
      
      return customScraper.scrapeUrl(url).then(() => {
        const axiosCall = axiosStub.firstCall;
        expect(axiosCall.args[1].timeout).to.equal(5000);
        expect(axiosCall.args[1].headers['User-Agent']).to.equal('Custom Bot 1.0');
        expect(axiosCall.args[1].maxContentLength).to.equal(500000);
      });
    });
  });
});
