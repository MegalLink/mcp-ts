import { DOC_TYPES } from './constants.js';
import { WhereCondition, WhereClause, DocType } from './types.js';

/**
 * Build a where clause with proper $and structure for ChromaDB compatibility
 * @param baseCondition Base condition (usually docType)
 * @param additionalConditions Additional conditions to add
 * @returns Properly structured where clause
 */
export function buildWhereClause(
  baseCondition: WhereCondition,
  ...additionalConditions: (WhereCondition | undefined)[]
): WhereClause {
  const conditions: WhereCondition[] = [baseCondition];
  
  // Add only non-undefined conditions
  additionalConditions.forEach(condition => {
    if (condition && Object.keys(condition).length > 0) {
      conditions.push(condition);
    }
  });
  
  // Return simple object if only one condition, otherwise use $and
  return conditions.length === 1 ? conditions[0] : { $and: conditions };
}

/**
 * Create a base document type condition
 * @param docType Document type to filter by
 * @returns Base where condition
 */
export function createDocTypeCondition(docType: DocType): WhereCondition {
  return { docType };
}

/**
 * Create library filter condition
 * @param libraryName Library name to filter by
 * @returns Library filter condition or undefined
 */
export function createLibraryCondition(libraryName?: string): WhereCondition | undefined {
  return libraryName ? { libraryName: libraryName.toLowerCase() } : undefined;
}

/**
 * Create version filter condition
 * @param version Version to filter by
 * @returns Version filter condition or undefined
 */
export function createVersionCondition(version?: string): WhereCondition | undefined {
  return version ? { version } : undefined;
}

/**
 * Create category filter condition
 * @param category Category to filter by
 * @returns Category filter condition or undefined
 */
export function createCategoryCondition(category?: string): WhereCondition | undefined {
  return category ? { category: category.toLowerCase() } : undefined;
}

/**
 * Build where clause for URL document queries
 * @param options Query options
 * @returns Properly structured where clause
 */
export function buildUrlDocumentWhere(options: {
  libraryName?: string;
  version?: string;
  category?: string;
}): WhereClause {
  return buildWhereClause(
    createDocTypeCondition(DOC_TYPES.URL_DOCUMENT),
    createLibraryCondition(options.libraryName),
    createVersionCondition(options.version),
    createCategoryCondition(options.category)
  );
}

/**
 * Convert keywords array to ChromaDB-compatible string
 * @param keywords Array of keywords
 * @returns Comma-separated string
 */
export function formatKeywordsForStorage(keywords: string[]): string {
  return keywords.join(', ');
}

/**
 * Parse keywords string back to array
 * @param keywordsString Comma-separated keywords string
 * @returns Array of keywords
 */
export function parseKeywordsFromStorage(keywordsString: string): string[] {
  return keywordsString ? keywordsString.split(', ').filter(k => k.trim()) : [];
}

/**
 * Generate searchable text for URL documents
 * @param metadata Document metadata
 * @returns Lowercase searchable text
 */
export function generateSearchableText(metadata: {
  libraryName: string;
  version: string;
  category: string;
  keywords: string[];
  title: string;
}): string {
  return `${metadata.libraryName} ${metadata.version} ${metadata.category} ${metadata.keywords.join(' ')} ${metadata.title}`.toLowerCase();
}
