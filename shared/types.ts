import { DOC_TYPES, SEARCH_TYPES, GROUP_BY_OPTIONS, DOC_CATEGORIES } from './constants.js';

// Type definitions derived from constants
export type DocType = typeof DOC_TYPES[keyof typeof DOC_TYPES];
export type SearchType = typeof SEARCH_TYPES[keyof typeof SEARCH_TYPES];
export type GroupByOption = typeof GROUP_BY_OPTIONS[keyof typeof GROUP_BY_OPTIONS];
export type DocCategory = typeof DOC_CATEGORIES[keyof typeof DOC_CATEGORIES];

// Common where clause structure for ChromaDB queries
export interface BaseWhereClause {
  docType: DocType;
  libraryName?: string;
  version?: string;
  category?: string;
}

// Standardized metadata structure for URL documents
export interface StandardUrlMetadata {
  url: string;
  title: string;
  libraryName: string;
  version: string;
  category: string;
  keywords: string; // Stored as comma-separated string for ChromaDB compatibility
  description?: string;
  section?: string;
  lastUpdated?: string;
  docType: DocType;
  contentExtracted: boolean;
  addedAt: string;
  searchableText: string;
}

// Input metadata structure (before processing)
export interface UrlDocumentInput {
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

// Helper function types for consistent where clause building
export type WhereCondition = Record<string, any>;
export type WhereClause = WhereCondition | { $and: WhereCondition[] };
