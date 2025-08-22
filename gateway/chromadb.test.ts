import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { expect } from 'chai';
import { ChromaGateway } from './chromadb.js';
import { ChromaClient, Collection } from 'chromadb';

import chai from 'chai';
chai.use(sinonChai as any);

let sandbox: sinon.SinonSandbox;

describe('ChromaGateway', () => {
  let chromaGateway: ChromaGateway;
  let mockClient: {
    getOrCreateCollection: sinon.SinonStub;
    listCollections: sinon.SinonStub;
    deleteCollection: sinon.SinonStub;
  };
  let mockCollection: {
    add: sinon.SinonStub;
    query: sinon.SinonStub;
    get: sinon.SinonStub;
    delete: sinon.SinonStub;
    update: sinon.SinonStub;
    count: sinon.SinonStub;
  };
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Mock Collection methods
    mockCollection = {
      add: sandbox.stub(),
      query: sandbox.stub(),
      get: sandbox.stub(),
      delete: sandbox.stub(),
      update: sandbox.stub(),
      count: sandbox.stub()
    };
    
    // Mock ChromaClient methods
    mockClient = {
      getOrCreateCollection: sandbox.stub().resolves(mockCollection as any),
      listCollections: sandbox.stub(),
      deleteCollection: sandbox.stub()
    };
    
    // Stub ChromaClient constructor
    sandbox.stub(ChromaClient.prototype, 'getOrCreateCollection').callsFake(mockClient.getOrCreateCollection);
    sandbox.stub(ChromaClient.prototype, 'listCollections').callsFake(mockClient.listCollections);
    sandbox.stub(ChromaClient.prototype, 'deleteCollection').callsFake(mockClient.deleteCollection);
    
    chromaGateway = new ChromaGateway({
      host: 'localhost',
      port: 8000
    });
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('getOrCreateCollection', () => {
    it('should get or create a collection', async () => {
      const collectionName = 'test-collection';
      const metadata = { description: 'Test collection' };
      const mockCollectionObj = { name: collectionName } as Collection;
      
      mockClient.getOrCreateCollection.resolves(mockCollectionObj);
      
      const result = await chromaGateway.getOrCreateCollection(collectionName, metadata);
      
      expect(mockClient.getOrCreateCollection).to.have.been.calledOnceWith({
        name: collectionName,
        metadata
      });
      expect(result).to.equal(mockCollectionObj);
    });
    
    it('should get or create a collection without metadata', async () => {
      const collectionName = 'test-collection';
      const mockCollectionObj = { name: collectionName } as Collection;
      
      mockClient.getOrCreateCollection.resolves(mockCollectionObj);
      
      const result = await chromaGateway.getOrCreateCollection(collectionName);
      
      expect(mockClient.getOrCreateCollection).to.have.been.calledOnceWith({
        name: collectionName,
        metadata: undefined
      });
      expect(result).to.equal(mockCollectionObj);
    });
  });
  
  describe('listCollections', () => {
    it('should list all collections', async () => {
      const mockCollections = [
        { name: 'collection1' },
        { name: 'collection2' }
      ] as Collection[];
      
      mockClient.listCollections.resolves(mockCollections);
      
      const result = await chromaGateway.listCollections();
      
      expect(mockClient.listCollections).to.have.been.calledOnce;
      expect(result).to.deep.equal(mockCollections);
    });
  });
  
  describe('deleteCollection', () => {
    it('should delete a collection', async () => {
      const collectionName = 'test-collection';
      
      mockClient.deleteCollection.resolves();
      
      await chromaGateway.deleteCollection(collectionName);
      
      expect(mockClient.deleteCollection).to.have.been.calledOnceWith({
        name: collectionName
      });
    });
  });
  
  describe('addItems', () => {
    it('should add items to a collection', async () => {
      const collectionName = 'test-collection';
      const items = {
        ids: ['1', '2'],
        metadatas: [{ title: 'Doc 1' }, { title: 'Doc 2' }],
        documents: ['Content 1', 'Content 2']
      };
      
      mockCollection.add.resolves();
      
      await chromaGateway.addItems(collectionName, items);
      
      expect(mockClient.getOrCreateCollection).to.have.been.calledOnceWith({
        name: collectionName,
        metadata: undefined
      });
      expect(mockCollection.add).to.have.been.calledOnceWith(items);
    });
    
    it('should add items without metadatas and documents', async () => {
      const collectionName = 'test-collection';
      const items = {
        ids: ['1', '2']
      };
      
      mockCollection.add.resolves();
      
      await chromaGateway.addItems(collectionName, items);
      
      expect(mockClient.getOrCreateCollection).to.have.been.calledOnceWith({
        name: collectionName,
        metadata: undefined
      });
      expect(mockCollection.add).to.have.been.calledOnceWith(items);
    });
  });
  
  describe('queryItems', () => {
    it('should query items from a collection with text queries', async () => {
      const collectionName = 'test-collection';
      const query = {
        queryTexts: ['search term'],
        nResults: 5
      };
      const mockResults = {
        ids: [['1', '2']],
        documents: [['Doc 1', 'Doc 2']],
        metadatas: [[{ title: 'Title 1' }, { title: 'Title 2' }]],
        distances: [[0.1, 0.2]]
      };
      
      mockCollection.query.resolves(mockResults);
      
      const result = await chromaGateway.queryItems(collectionName, query);
      
      expect(mockClient.getOrCreateCollection).to.have.been.calledOnceWith({
        name: collectionName,
        metadata: undefined
      });
      expect(mockCollection.query).to.have.been.calledOnceWith(query);
      expect(result).to.deep.equal(mockResults);
    });
    
    it('should query items with embeddings and where clause', async () => {
      const collectionName = 'test-collection';
      const query = {
        queryEmbeddings: [[0.1, 0.2, 0.3]],
        nResults: 10,
        where: { category: 'docs' },
        whereDocument: { $contains: 'typescript' }
      };
      const mockResults = {
        ids: [['1']],
        documents: [['TypeScript Doc']],
        metadatas: [[{ category: 'docs' }]],
        distances: [[0.05]]
      };
      
      mockCollection.query.resolves(mockResults);
      
      const result = await chromaGateway.queryItems(collectionName, query);
      
      expect(mockCollection.query).to.have.been.calledOnceWith(query);
      expect(result).to.deep.equal(mockResults);
    });
  });
  
  describe('getItems', () => {
    it('should get items by IDs', async () => {
      const collectionName = 'test-collection';
      const options = {
        ids: ['1', '2']
      };
      const mockResults = {
        ids: ['1', '2'],
        documents: ['Doc 1', 'Doc 2'],
        metadatas: [{ title: 'Title 1' }, { title: 'Title 2' }]
      };
      
      mockCollection.get.resolves(mockResults);
      
      const result = await chromaGateway.getItems(collectionName, options);
      
      expect(mockClient.getOrCreateCollection).to.have.been.calledOnceWith({
        name: collectionName,
        metadata: undefined
      });
      expect(mockCollection.get).to.have.been.calledOnceWith(options);
      expect(result).to.deep.equal(mockResults);
    });
    
    it('should get items with where clause and pagination', async () => {
      const collectionName = 'test-collection';
      const options = {
        where: { category: 'docs' },
        limit: 10,
        offset: 5
      };
      const mockResults = {
        ids: ['3', '4'],
        documents: ['Doc 3', 'Doc 4'],
        metadatas: [{ category: 'docs' }, { category: 'docs' }]
      };
      
      mockCollection.get.resolves(mockResults);
      
      const result = await chromaGateway.getItems(collectionName, options);
      
      expect(mockCollection.get).to.have.been.calledOnceWith(options);
      expect(result).to.deep.equal(mockResults);
    });
  });
  
  describe('deleteItems', () => {
    it('should delete items by IDs', async () => {
      const collectionName = 'test-collection';
      const options = {
        ids: ['1', '2']
      };
      
      mockCollection.delete.resolves();
      
      await chromaGateway.deleteItems(collectionName, options);
      
      expect(mockClient.getOrCreateCollection).to.have.been.calledOnceWith({
        name: collectionName,
        metadata: undefined
      });
      expect(mockCollection.delete).to.have.been.calledOnceWith(options);
    });
    
    it('should delete items by where clause', async () => {
      const collectionName = 'test-collection';
      const options = {
        where: { category: 'deprecated' }
      };
      
      mockCollection.delete.resolves();
      
      await chromaGateway.deleteItems(collectionName, options);
      
      expect(mockCollection.delete).to.have.been.calledOnceWith(options);
    });
  });
  
  describe('updateItems', () => {
    it('should update items with new documents and metadatas', async () => {
      const collectionName = 'test-collection';
      const options = {
        ids: ['1', '2'],
        documents: ['Updated Doc 1', 'Updated Doc 2'],
        metadatas: [{ title: 'Updated Title 1' }, { title: 'Updated Title 2' }]
      };
      
      mockCollection.update.resolves();
      
      await chromaGateway.updateItems(collectionName, options);
      
      expect(mockClient.getOrCreateCollection).to.have.been.calledOnceWith({
        name: collectionName,
        metadata: undefined
      });
      expect(mockCollection.update).to.have.been.calledOnceWith(options);
    });
    
    it('should update items with embeddings', async () => {
      const collectionName = 'test-collection';
      const options = {
        ids: ['1'],
        embeddings: [[0.1, 0.2, 0.3]],
        metadatas: [{ updated: true }]
      };
      
      mockCollection.update.resolves();
      
      await chromaGateway.updateItems(collectionName, options);
      
      expect(mockCollection.update).to.have.been.calledOnceWith(options);
    });
  });
  
  describe('countItems', () => {
    it('should count items in a collection', async () => {
      const collectionName = 'test-collection';
      const mockCount = 42;
      
      mockCollection.count.resolves(mockCount);
      
      const result = await chromaGateway.countItems(collectionName);
      
      expect(mockClient.getOrCreateCollection).to.have.been.calledOnceWith({
        name: collectionName,
        metadata: undefined
      });
      expect(mockCollection.count).to.have.been.calledOnce;
      expect(result).to.equal(mockCount);
    });
    
    it('should return zero when collection is empty', async () => {
      const collectionName = 'empty-collection';
      const mockCount = 0;
      
      mockCollection.count.resolves(mockCount);
      
      const result = await chromaGateway.countItems(collectionName);
      
      expect(result).to.equal(0);
    });
  });
  
  describe('error handling', () => {
    it('should handle collection creation errors', async () => {
      const collectionName = 'test-collection';
      const error = new Error('Collection creation failed');
      
      mockClient.getOrCreateCollection.rejects(error);
      
      try {
        await chromaGateway.getOrCreateCollection(collectionName);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
    
    it('should handle query errors', async () => {
      const collectionName = 'test-collection';
      const query = { queryTexts: ['test'] };
      const error = new Error('Query failed');
      
      mockCollection.query.rejects(error);
      
      try {
        await chromaGateway.queryItems(collectionName, query);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
    
    it('should handle add items errors', async () => {
      const collectionName = 'test-collection';
      const items = { ids: ['1'] };
      const error = new Error('Add items failed');
      
      mockCollection.add.rejects(error);
      
      try {
        await chromaGateway.addItems(collectionName, items);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });
});
