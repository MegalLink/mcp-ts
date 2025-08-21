import { ChromaGateway, Where, WhereDocument } from '../gateway/chromadb.js';
import { v4 as uuidv4 } from 'uuid';
import { COLLECTION_NAME } from '../shared/constants.js';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

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
  where?: Where;
  whereDocument?: WhereDocument;
}

export interface GetOptions {
  ids?: string[];
  where?: Where;
  limit?: number;
  offset?: number;
}

export class RagService {
  private chroma: ChromaGateway;
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.chroma = new ChromaGateway({ host: 'chromadb', port: 8000 });
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
  }

  async addDocument(rawText: string, metadata: Record<string, any>): Promise<string[]> {
    try {
      const chunks = await this.textSplitter.splitText(rawText);
      const ids = chunks.map(() => uuidv4());
      const metadatas = chunks.map((_, index) => ({
        ...metadata,
        chunkNumber: index + 1,
        totalChunks: chunks.length,
        addedAt: new Date().toISOString(),
      }));

      await this.chroma.addItems(COLLECTION_NAME, {
        ids,
        metadatas,
        documents: chunks,
      });

      console.log(`Added ${chunks.length} document chunks to collection '${COLLECTION_NAME}'`);
      return ids;
    } catch (error) {
      console.error('Failed to add document to ChromaDB:', error);
      throw error;
    }
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
