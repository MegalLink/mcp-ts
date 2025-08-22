import { ToolHandler } from "./types.js";
import { searchDocumentationTool } from "./search-documentation.js";
import { listDocumentationTool } from "./list-documentation.js";
import { getUrlsFromUrlTool } from "./get-urls-from-url.js";
import { bulkAddUrlsTool } from "./bulk-add-urls.js";
import { searchSpecificDocumentationTool } from "./search-specific-documentation.js";

export const tools: ToolHandler<any>[] = [
  searchDocumentationTool,
  listDocumentationTool,
  getUrlsFromUrlTool,
  bulkAddUrlsTool,
  searchSpecificDocumentationTool,
];

