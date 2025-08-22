// Collection name for ChromaDB
export const COLLECTION_NAME = 'rag-collection';

// Document types
export const DOC_TYPES = {
  URL_DOCUMENT: 'url-document',
  LEGACY_DOCUMENT: 'legacy-document',
} as const;

// Search types for documentation
export const SEARCH_TYPES = {
  GENERAL: 'general',
  LIBRARY: 'library', 
  CATEGORY: 'category',
  KEYWORDS: 'keywords',
} as const;

// Grouping options for listing documentation
export const GROUP_BY_OPTIONS = {
  ALL: 'all',
  LIBRARY: 'library',
  CATEGORY: 'category',
} as const;

// Common categories for documentation
export const DOC_CATEGORIES = {
  DOCUMENTATION: 'documentation',
  API: 'api',
  COMPONENTS: 'components',
  UTILITIES: 'utilities',
  LAYOUT: 'layout',
  STYLING: 'styling',
  GUIDES: 'guides',
  REFERENCE: 'reference',
  EXAMPLES: 'examples',
  TUTORIALS: 'tutorials',
} as const;

// Metadata field names for consistency
export const METADATA_FIELDS = {
  URL: 'url',
  TITLE: 'title',
  LIBRARY_NAME: 'libraryName',
  VERSION: 'version',
  CATEGORY: 'category',
  KEYWORDS: 'keywords',
  DESCRIPTION: 'description',
  SECTION: 'section',
  LAST_UPDATED: 'lastUpdated',
  DOC_TYPE: 'docType',
  CONTENT_EXTRACTED: 'contentExtracted',
  ADDED_AT: 'addedAt',
  SEARCHABLE_TEXT: 'searchableText',
} as const;