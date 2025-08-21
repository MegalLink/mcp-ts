import { RagService } from "../services/rag.service.js";
import { z } from "zod";
import { ToolHandler } from "./types.js";

const RagMetadataSchema = z.object({
  sourceURI: z.string().url().or(z.string()).describe("The source URI of the content, either a URL for web pages or a file path for local code."),
  sourceType: z.enum(["documentation", "source_code", "web_page"]).describe("The type of the source content."),
  libraryName: z.string().toLowerCase().describe("The name of the library the content is related to (e.g., 'tailwindcss', 'react')."),
  version: z.string().describe("The version of the library (e.g., '3.4.1', '18.2.0')."),
  language: z.string().toLowerCase().optional().describe("The programming language of the content, if applicable (e.g., 'typescript', 'javascript')."),
});

const RagSchema = {
  rawText: z.string().describe("The raw text content to be indexed."),
  metadata: RagMetadataSchema,
};

const RagInput = z.object(RagSchema);

export const createRagInformationTool: ToolHandler<z.infer<typeof RagInput>> = {
  name: "create-rag-information",
  description: "Tool para crear información RAG (simulada)",
  schema: RagSchema,
  handler: async ({ rawText, metadata }) => {
    let message = "";
    try {
      const ragService = new RagService();
      await ragService.addDocument(rawText, metadata);
      message = "Document added to RAG successfully";
    } catch (error) {
      console.error("Failed to add document to RAG:", error);
      message = "Failed to add document to RAG";
    }
    return {
      content: [
        {
          type: "text",
          text: message
        }
      ]
    };
  }
};
