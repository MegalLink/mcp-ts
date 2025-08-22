import { ChromaGateway, Where, WhereDocument } from '../gateway/chromadb.js';
import { v4 as uuidv4 } from 'uuid';
import { COLLECTION_NAME, DOC_TYPES, METADATA_FIELDS } from '../shared/constants.js';
import { StandardUrlMetadata, UrlDocumentInput, WhereClause } from '../shared/types.js';
import { 
  buildUrlDocumentWhere, 
  buildWhereClause, 
  createDocTypeCondition,
  formatKeywordsForStorage,
  generateSearchableText 
} from '../shared/query-helpers.js';
import { ScraperService } from './scraper.service.js';

export interface DocumentResult {
  ids: string[];
  documents: (string | null)[];
  metadatas: (Record<string, any> | null)[];
  distances?: (number | null)[];
}

export interface QueryOptions {
  queryTexts?: string[];
  queryEmbeddings?: number[][];
  nResults?: number;
  where?: Where | WhereClause;
  whereDocument?: WhereDocument;
}

export interface GetOptions {
  ids?: string[];
  where?: Where | WhereClause;
  limit?: number;
  offset?: number;
}

export interface UrlDocumentMetadata {
  url: string;
  title: string;
  libraryName: string;
  version: string;
  category: string;
  keywords: string[];
  description?: string;
  section?: string;
  lastUpdated?: string;
}

export class RagService {
  private chroma: ChromaGateway;
  private scraperService: ScraperService;

  constructor() {
    this.chroma = new ChromaGateway({ host: 'chromadb', port: 8000 });
    this.scraperService = new ScraperService();
  }

  /**
   * Add a URL document with rich metadata to the collection
   * @param metadata URL document metadata
   * @param extractContent Whether to extract and store the actual content
   * @returns Document ID
   */
  async addUrlDocument(metadata: UrlDocumentInput, extractContent: boolean = false): Promise<string> {
    try {
      const docId = uuidv4();
      
      // Create the document content - either just metadata or include scraped content
      let documentContent = `${metadata.title}\n${metadata.description || ''}\n${metadata.keywords.join(' ')}`;
      
      if (extractContent) {
        try {
          const scrapedData = await this.scraperService.scrapeUrl(metadata.url);
          documentContent = `${metadata.title}\n${scrapedData.content}\n${metadata.keywords.join(' ')}`;
        } catch (error) {
          console.warn(`Failed to extract content from ${metadata.url}, using metadata only:`, error);
        }
      }

      const enrichedMetadata: StandardUrlMetadata = {
        [METADATA_FIELDS.URL]: metadata.url,
        [METADATA_FIELDS.TITLE]: metadata.title,
        [METADATA_FIELDS.LIBRARY_NAME]: metadata.libraryName,
        [METADATA_FIELDS.VERSION]: metadata.version,
        [METADATA_FIELDS.CATEGORY]: metadata.category,
        [METADATA_FIELDS.KEYWORDS]: formatKeywordsForStorage(metadata.keywords),
        [METADATA_FIELDS.DESCRIPTION]: metadata.description || '',
        [METADATA_FIELDS.SECTION]: metadata.section || '',
        [METADATA_FIELDS.LAST_UPDATED]: metadata.lastUpdated || '',
        [METADATA_FIELDS.DOC_TYPE]: DOC_TYPES.URL_DOCUMENT,
        [METADATA_FIELDS.CONTENT_EXTRACTED]: extractContent,
        [METADATA_FIELDS.ADDED_AT]: new Date().toISOString(),
        [METADATA_FIELDS.SEARCHABLE_TEXT]: generateSearchableText(metadata),
      };

      await this.chroma.addItems(COLLECTION_NAME, {
        ids: [docId],
        metadatas: [enrichedMetadata],
        documents: [documentContent],
      });

      console.log(`Added URL document to collection '${COLLECTION_NAME}': ${metadata.url}`);
      return docId;
    } catch (error) {
      console.error('Failed to add URL document to ChromaDB:', error);
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  async addDocument(rawText: string, metadata: Record<string, any>): Promise<string[]> {
    try {
      const docId = uuidv4();
      const enrichedMetadata = {
        ...metadata,
        [METADATA_FIELDS.DOC_TYPE]: DOC_TYPES.LEGACY_DOCUMENT,
        [METADATA_FIELDS.ADDED_AT]: new Date().toISOString(),
      };

      await this.chroma.addItems(COLLECTION_NAME, {
        ids: [docId],
        metadatas: [enrichedMetadata],
        documents: [rawText],
      });

      console.log(`Added legacy document to collection '${COLLECTION_NAME}'`);
      return [docId];
    } catch (error) {
      console.error('Failed to add document to ChromaDB:', error);
      throw error;
    }
  }

  /**
   * Search URLs by library name and version
   */
  async searchByLibrary(libraryName: string, version?: string, nResults: number = 10): Promise<DocumentResult> {
    const where = buildUrlDocumentWhere({ libraryName, version });

    return this.query({
      queryTexts: [libraryName],
      nResults,
      where
    });
  }

  /**
   * Search URLs by category
   */
  async searchByCategory(category: string, libraryName?: string, nResults: number = 10): Promise<DocumentResult> {
    const where = buildUrlDocumentWhere({ category, libraryName });

    return this.query({
      queryTexts: [category],
      nResults,
      where
    });
  }

  /**
   * Search URLs by keywords
   */
  async searchByKeywords(keywords: string[], nResults: number = 10): Promise<DocumentResult> {
    const searchText = keywords.join(' ');
    const where = createDocTypeCondition(DOC_TYPES.URL_DOCUMENT);
    
    return this.query({
      queryTexts: [searchText],
      nResults,
      where
    });
  }

  /**
   * Get all URL documents for a specific library
   */
  async getLibraryUrls(libraryName: string, version?: string): Promise<DocumentResult> {
    const where = buildUrlDocumentWhere({ libraryName, version });

    return this.getDocuments({ where });
  }

  /**
   * Query documents using text or embeddings
   * @param options Query options including query texts or embeddings
   * @returns Matching documents with their metadata and similarity scores
   */
  async query(options: QueryOptions): Promise<DocumentResult> {
    try {
      const result = await this.chroma.queryItems(COLLECTION_NAME, {
        queryTexts: options.queryTexts,
        queryEmbeddings: options.queryEmbeddings,
        nResults: options.nResults || 5,
        where: options.where,
        whereDocument: options.whereDocument,
      });

      return {
        ids: (result.ids || []).flat().filter((id): id is string => id !== null),
        documents: (result.documents || []).flat(),
        metadatas: (result.metadatas || []).flat(),
        distances: (result.distances || []).flat(),
      };
    } catch (error) {
      console.error('Failed to query documents:', error);
      throw error;
    }
  }

  /**
   * Get documents by IDs or filter criteria
   * @param options Get options including IDs or where clause
   * @returns Matching documents with their metadata
   */
  async getDocuments(options: GetOptions): Promise<DocumentResult> {
    try {
      const result = await this.chroma.getItems(COLLECTION_NAME, {
        ids: options.ids,
        where: options.where,
        limit: options.limit,
        offset: options.offset,
      });

      return {
        ids: result.ids || [],
        documents: result.documents || [],
        metadatas: result.metadatas || [],
      };
    } catch (error) {
      console.error('Failed to get documents:', error);
      throw error;
    }
  }

  /**
   * Delete documents by IDs or filter criteria
   * @param options Delete options including IDs or where clause
   */
  async deleteDocuments(options: { ids?: string[]; where?: Record<string, any> }): Promise<void> {
    try {
      await this.chroma.deleteItems(COLLECTION_NAME, {
        ids: options.ids,
        where: options.where,
      });
      console.log(`Successfully deleted documents from collection '${COLLECTION_NAME}'`);
    } catch (error) {
      console.error('Failed to delete documents:', error);
      throw error;
    }
  }

  /**
   * Get the total number of documents in the collection
   */
  async getDocumentCount(): Promise<number> {
    try {
      return await this.chroma.countItems(COLLECTION_NAME);
    } catch (error) {
      console.error('Failed to get document count:', error);
      throw error;
    }
  }
}
