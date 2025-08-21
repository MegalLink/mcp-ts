import { ChromaClient, Collection, type Where, type WhereDocument } from 'chromadb';

export type { Where, WhereDocument };

export class ChromaGateway {
  private client: ChromaClient;

  constructor(config: { host?: string, port?: number } = {}) {
    const { host, port } = config;

    this.client = new ChromaClient({ host,port });
  }

  async getOrCreateCollection(name: string, metadata?: Record<string, any>): Promise<Collection> {
    return this.client.getOrCreateCollection({ name, metadata });
  }

  async listCollections(): Promise<Collection[]> {
    return this.client.listCollections();
  }

  async deleteCollection(name: string): Promise<void> {
    await this.client.deleteCollection({ name });
  }

  async addItems(collectionName: string, items: { ids: string[]; metadatas?: Record<string, any>[]; documents?: string[] }): Promise<void> {
    const collection = await this.getOrCreateCollection(collectionName);
    await collection.add(items);
  }

  async queryItems(collectionName: string, query: { queryEmbeddings?: number[][]; queryTexts?: string[]; nResults?: number; where?: Where; whereDocument?: WhereDocument; }) {
    const collection = await this.getOrCreateCollection(collectionName);
    return collection.query(query);
  }

  async getItems(collectionName: string, options: { ids?: string[]; where?: Where; limit?: number; offset?: number; }) {
    const collection = await this.getOrCreateCollection(collectionName);
    return collection.get(options);
  }

  async deleteItems(
    collectionName: string, 
    options: { ids?: string[]; where?: Where }
  ): Promise<void> {
    const collection = await this.getOrCreateCollection(collectionName);
    await collection.delete(options);
  }

  async updateItems(
    collectionName: string, 
    options: {
      ids: string[];
      embeddings?: number[][];
      metadatas?: Record<string, any>[];
      documents?: string[];
    }
  ): Promise<void> {
    const collection = await this.getOrCreateCollection(collectionName);
    await collection.update(options);
  }

  async countItems(collectionName: string): Promise<number> {
    const collection = await this.getOrCreateCollection(collectionName);
    return collection.count();
  }
}
