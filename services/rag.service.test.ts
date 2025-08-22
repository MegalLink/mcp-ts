import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { expect } from 'chai';
import { RagService, DocumentResult } from './rag.service.js';
import { ChromaGateway } from '../gateway/chromadb.js';
import { ScraperService } from './scraper.service.js';
import { COLLECTION_NAME, DOC_TYPES, METADATA_FIELDS } from '../shared/constants.js';

import chai from 'chai';
chai.use(sinonChai as any);

let sandbox: sinon.SinonSandbox;

describe('RagService', () => {
  let ragService: RagService;
  let mockChromaGateway: {
    addItems: sinon.SinonStub;
    queryItems: sinon.SinonStub;
    getItems: sinon.SinonStub;
    deleteItems: sinon.SinonStub;
    countItems: sinon.SinonStub;
  };
  let mockScraperService: {
    scrapeUrl: sinon.SinonStub;
  };
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Mock ChromaGateway methods
    mockChromaGateway = {
      addItems: sandbox.stub(),
      queryItems: sandbox.stub(),
      getItems: sandbox.stub(),
      deleteItems: sandbox.stub(),
      countItems: sandbox.stub()
    };
    
    // Mock ScraperService methods
    mockScraperService = {
      scrapeUrl: sandbox.stub()
    };
    
    // Stub constructors
    sandbox.stub(ChromaGateway.prototype, 'addItems').callsFake(mockChromaGateway.addItems);
    sandbox.stub(ChromaGateway.prototype, 'queryItems').callsFake(mockChromaGateway.queryItems);
    sandbox.stub(ChromaGateway.prototype, 'getItems').callsFake(mockChromaGateway.getItems);
    sandbox.stub(ChromaGateway.prototype, 'deleteItems').callsFake(mockChromaGateway.deleteItems);
    sandbox.stub(ChromaGateway.prototype, 'countItems').callsFake(mockChromaGateway.countItems);
    
    sandbox.stub(ScraperService.prototype, 'scrapeUrl').callsFake(mockScraperService.scrapeUrl);
    
    ragService = new RagService();
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('addUrlDocument', () => {
    it('should add URL document without content extraction', async () => {
      const metadata = {
        url: 'https://example.com/docs/test',
        title: 'Test Documentation',
        libraryName: 'testlib',
        version: '1.0.0',
        category: 'documentation',
        keywords: ['test', 'docs', 'example'],
        description: 'Test documentation page',
        section: 'getting-started'
      };
      
      mockChromaGateway.addItems.resolves();
      
      const result = await ragService.addUrlDocument(metadata, false);
      
      expect(result).to.be.a('string');
      expect(mockChromaGateway.addItems).to.have.been.calledOnceWith(
        COLLECTION_NAME,
        sinon.match({
          ids: sinon.match.array,
          metadatas: sinon.match.array,
          documents: sinon.match.array
        })
      );
      
      // Verify metadata structure
      const call = mockChromaGateway.addItems.firstCall;
      const addedMetadata = call.args[1].metadatas[0];
      expect(addedMetadata[METADATA_FIELDS.URL]).to.equal(metadata.url);
      expect(addedMetadata[METADATA_FIELDS.TITLE]).to.equal(metadata.title);
      expect(addedMetadata[METADATA_FIELDS.LIBRARY_NAME]).to.equal(metadata.libraryName);
      expect(addedMetadata[METADATA_FIELDS.VERSION]).to.equal(metadata.version);
      expect(addedMetadata[METADATA_FIELDS.CATEGORY]).to.equal(metadata.category);
      expect(addedMetadata[METADATA_FIELDS.KEYWORDS]).to.equal('test, docs, example');
      expect(addedMetadata[METADATA_FIELDS.DOC_TYPE]).to.equal(DOC_TYPES.URL_DOCUMENT);
      expect(addedMetadata[METADATA_FIELDS.CONTENT_EXTRACTED]).to.be.false;
      expect(addedMetadata[METADATA_FIELDS.ADDED_AT]).to.be.a('string');
    });
    
    it('should add URL document with content extraction', async () => {
      const metadata = {
        url: 'https://example.com/docs/test',
        title: 'Test Documentation',
        libraryName: 'testlib',
        version: '1.0.0',
        category: 'documentation',
        keywords: ['test', 'docs']
      };
      
      const scrapedContent = {
        url: metadata.url,
        title: metadata.title,
        content: 'This is the scraped content from the webpage.',
        metadata: {
          scrapedAt: new Date().toISOString(),
          contentLength: 45,
          hasImages: false,
          hasLinks: true
        }
      };
      
      mockScraperService.scrapeUrl.resolves(scrapedContent);
      mockChromaGateway.addItems.resolves();
      
      const result = await ragService.addUrlDocument(metadata, true);
      
      expect(result).to.be.a('string');
      expect(mockScraperService.scrapeUrl).to.have.been.calledOnceWith(metadata.url);
      expect(mockChromaGateway.addItems).to.have.been.calledOnce;
      
      // Verify that scraped content is included in document
      const call = mockChromaGateway.addItems.firstCall;
      const document = call.args[1].documents[0];
      expect(document).to.include('This is the scraped content from the webpage');
      
      const addedMetadata = call.args[1].metadatas[0];
      expect(addedMetadata[METADATA_FIELDS.CONTENT_EXTRACTED]).to.be.true;
    });
    
    it('should fallback to metadata-only when scraping fails', async () => {
      const metadata = {
        url: 'https://example.com/docs/test',
        title: 'Test Documentation',
        libraryName: 'testlib',
        version: '1.0.0',
        category: 'documentation',
        keywords: ['test']
      };
      
      mockScraperService.scrapeUrl.rejects(new Error('Scraping failed'));
      mockChromaGateway.addItems.resolves();
      
      const result = await ragService.addUrlDocument(metadata, true);
      
      expect(result).to.be.a('string');
      expect(mockScraperService.scrapeUrl).to.have.been.calledOnce;
      expect(mockChromaGateway.addItems).to.have.been.calledOnce;
      
      // Should still add document with metadata only
      const call = mockChromaGateway.addItems.firstCall;
      const document = call.args[1].documents[0];
      expect(document).to.include(metadata.title);
      expect(document).to.not.include('scraped content');
    });
    
    it('should handle ChromaDB errors', async () => {
      const metadata = {
        url: 'https://example.com/docs/test',
        title: 'Test Documentation',
        libraryName: 'testlib',
        version: '1.0.0',
        category: 'documentation',
        keywords: ['test']
      };
      
      const chromaError = new Error('ChromaDB connection failed');
      mockChromaGateway.addItems.rejects(chromaError);
      
      try {
        await ragService.addUrlDocument(metadata);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.equal(chromaError);
      }
    });
  });
  
  describe('addDocument (legacy)', () => {
    it('should add legacy document', async () => {
      const rawText = 'This is raw text content';
      const metadata = { source: 'legacy', type: 'text' };
      
      mockChromaGateway.addItems.resolves();
      
      const result = await ragService.addDocument(rawText, metadata);
      
      expect(result).to.be.an('array');
      expect(result).to.have.length(1);
      expect(mockChromaGateway.addItems).to.have.been.calledOnceWith(
        COLLECTION_NAME,
        sinon.match({
          ids: sinon.match.array,
          metadatas: sinon.match.array,
          documents: [rawText]
        })
      );
      
      const call = mockChromaGateway.addItems.firstCall;
      const addedMetadata = call.args[1].metadatas[0];
      expect(addedMetadata.source).to.equal('legacy');
      expect(addedMetadata[METADATA_FIELDS.DOC_TYPE]).to.equal(DOC_TYPES.LEGACY_DOCUMENT);
    });
  });
  
  describe('searchByLibrary', () => {
    it('should search documents by library name', async () => {
      const libraryName = 'react';
      const version = '18.0.0';
      const mockResults = {
        ids: [['doc1', 'doc2']],
        documents: [['React docs 1', 'React docs 2']],
        metadatas: [[{ libraryName: 'react' }, { libraryName: 'react' }]],
        distances: [[0.1, 0.2]]
      };
      
      mockChromaGateway.queryItems.resolves(mockResults);
      
      const result = await ragService.searchByLibrary(libraryName, version, 5);
      
      expect(mockChromaGateway.queryItems).to.have.been.calledOnceWith(
        COLLECTION_NAME,
        sinon.match({
          queryTexts: [libraryName],
          nResults: 5,
          where: sinon.match.object
        })
      );
      
      expect(result.ids).to.deep.equal(['doc1', 'doc2']);
      expect(result.documents).to.deep.equal(['React docs 1', 'React docs 2']);
    });
    
    it('should search without version filter', async () => {
      const libraryName = 'vue';
      const mockResults = {
        ids: [['doc1']],
        documents: [['Vue docs']],
        metadatas: [[{ libraryName: 'vue' }]],
        distances: [[0.1]]
      };
      
      mockChromaGateway.queryItems.resolves(mockResults);
      
      await ragService.searchByLibrary(libraryName);
      
      expect(mockChromaGateway.queryItems).to.have.been.calledOnce;
    });
  });
  
  describe('searchByCategory', () => {
    it('should search documents by category', async () => {
      const category = 'components';
      const libraryName = 'react';
      const mockResults = {
        ids: [['comp1']],
        documents: [['Component docs']],
        metadatas: [[{ category: 'components' }]],
        distances: [[0.1]]
      };
      
      mockChromaGateway.queryItems.resolves(mockResults);
      
      const result = await ragService.searchByCategory(category, libraryName, 10);
      
      expect(mockChromaGateway.queryItems).to.have.been.calledOnceWith(
        COLLECTION_NAME,
        sinon.match({
          queryTexts: [category],
          nResults: 10,
          where: sinon.match.object
        })
      );
      
      expect(result.ids).to.deep.equal(['comp1']);
    });
  });
  
  describe('searchByKeywords', () => {
    it('should search documents by keywords', async () => {
      const keywords = ['typescript', 'interface', 'generic'];
      const mockResults = {
        ids: [['ts1']],
        documents: [['TypeScript docs']],
        metadatas: [[{ keywords: 'typescript, interface, generic' }]],
        distances: [[0.1]]
      };
      
      mockChromaGateway.queryItems.resolves(mockResults);
      
      const result = await ragService.searchByKeywords(keywords, 15);
      
      expect(mockChromaGateway.queryItems).to.have.been.calledOnceWith(
        COLLECTION_NAME,
        sinon.match({
          queryTexts: ['typescript interface generic'],
          nResults: 15,
          where: sinon.match.object
        })
      );
      
      expect(result.ids).to.deep.equal(['ts1']);
    });
  });
  
  describe('getLibraryUrls', () => {
    it('should get all URLs for a library', async () => {
      const libraryName = 'angular';
      const version = '15.0.0';
      const mockResults = {
        ids: ['url1', 'url2'],
        documents: ['Angular doc 1', 'Angular doc 2'],
        metadatas: [
          { libraryName: 'angular', version: '15.0.0' },
          { libraryName: 'angular', version: '15.0.0' }
        ]
      };
      
      mockChromaGateway.getItems.resolves(mockResults);
      
      const result = await ragService.getLibraryUrls(libraryName, version);
      
      expect(mockChromaGateway.getItems).to.have.been.calledOnceWith(
        COLLECTION_NAME,
        sinon.match({
          where: sinon.match.object
        })
      );
      
      expect(result.ids).to.deep.equal(['url1', 'url2']);
    });
  });
  
  describe('query', () => {
    it('should perform general query with options', async () => {
      const queryOptions = {
        queryTexts: ['search term'],
        nResults: 5,
        where: { category: 'docs' }
      };
      
      const mockResults = {
        ids: [['result1']],
        documents: [['Search result']],
        metadatas: [[{ category: 'docs' }]],
        distances: [[0.2]]
      };
      
      mockChromaGateway.queryItems.resolves(mockResults);
      
      const result = await ragService.query(queryOptions);
      
      expect(mockChromaGateway.queryItems).to.have.been.calledOnceWith(
        COLLECTION_NAME,
        sinon.match({
          queryTexts: queryOptions.queryTexts,
          nResults: queryOptions.nResults,
          where: queryOptions.where
        })
      );
      
      expect(result.ids).to.deep.equal(['result1']);
      expect(result.documents).to.deep.equal(['Search result']);
      expect(result.distances).to.deep.equal([0.2]);
    });
    
    it('should handle query with embeddings', async () => {
      const queryOptions = {
        queryEmbeddings: [[0.1, 0.2, 0.3]],
        nResults: 3
      };
      
      const mockResults = {
        ids: [['emb1']],
        documents: [['Embedding result']],
        metadatas: [[{}]],
        distances: [[0.1]]
      };
      
      mockChromaGateway.queryItems.resolves(mockResults);
      
      const result = await ragService.query(queryOptions);
      
      expect(result.ids).to.deep.equal(['emb1']);
    });
    
    it('should handle query errors', async () => {
      const queryOptions = { queryTexts: ['test'] };
      const queryError = new Error('Query failed');
      
      mockChromaGateway.queryItems.rejects(queryError);
      
      try {
        await ragService.query(queryOptions);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.equal(queryError);
      }
    });
  });
  
  describe('getDocuments', () => {
    it('should get documents by IDs', async () => {
      const options = {
        ids: ['doc1', 'doc2'],
        limit: 10
      };
      
      const mockResults = {
        ids: ['doc1', 'doc2'],
        documents: ['Document 1', 'Document 2'],
        metadatas: [{}, {}]
      };
      
      mockChromaGateway.getItems.resolves(mockResults);
      
      const result = await ragService.getDocuments(options);
      
      expect(mockChromaGateway.getItems).to.have.been.calledOnceWith(
        COLLECTION_NAME,
        sinon.match({
          ids: options.ids,
          limit: options.limit
        })
      );
      
      expect(result.ids).to.deep.equal(['doc1', 'doc2']);
    });
    
    it('should get documents with where clause', async () => {
      const options = {
        where: { libraryName: 'svelte' },
        offset: 5
      };
      
      const mockResults = {
        ids: ['svelte1'],
        documents: ['Svelte doc'],
        metadatas: [{ libraryName: 'svelte' }]
      };
      
      mockChromaGateway.getItems.resolves(mockResults);
      
      const result = await ragService.getDocuments(options);
      
      expect(result.ids).to.deep.equal(['svelte1']);
    });
  });
  
  describe('deleteDocuments', () => {
    it('should delete documents by IDs', async () => {
      const options = { ids: ['doc1', 'doc2'] };
      
      mockChromaGateway.deleteItems.resolves();
      
      await ragService.deleteDocuments(options);
      
      expect(mockChromaGateway.deleteItems).to.have.been.calledOnceWith(
        COLLECTION_NAME,
        sinon.match({
          ids: options.ids
        })
      );
    });
    
    it('should delete documents by where clause', async () => {
      const options = { where: { category: 'deprecated' } };
      
      mockChromaGateway.deleteItems.resolves();
      
      await ragService.deleteDocuments(options);
      
      expect(mockChromaGateway.deleteItems).to.have.been.calledOnceWith(
        COLLECTION_NAME,
        sinon.match({
          where: options.where
        })
      );
    });
    
    it('should handle delete errors', async () => {
      const options = { ids: ['doc1'] };
      const deleteError = new Error('Delete failed');
      
      mockChromaGateway.deleteItems.rejects(deleteError);
      
      try {
        await ragService.deleteDocuments(options);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.equal(deleteError);
      }
    });
  });
  
  describe('getDocumentCount', () => {
    it('should return document count', async () => {
      const expectedCount = 42;
      
      mockChromaGateway.countItems.resolves(expectedCount);
      
      const result = await ragService.getDocumentCount();
      
      expect(mockChromaGateway.countItems).to.have.been.calledOnceWith(COLLECTION_NAME);
      expect(result).to.equal(expectedCount);
    });
    
    it('should handle count errors', async () => {
      const countError = new Error('Count failed');
      
      mockChromaGateway.countItems.rejects(countError);
      
      try {
        await ragService.getDocumentCount();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.equal(countError);
      }
    });
  });
});
