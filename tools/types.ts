import { z } from "zod";

export interface ToolHandler<T> {
  name: string;
  description: string;
  schema: Record<string, z.ZodType<any>>;
  handler: (params: T) => Promise<{
    content: Array<
      | { type: "text"; text: string; [x: string]: unknown }
      | { type: "image"; data: string; mimeType: string; [x: string]: unknown }
      | { type: "audio"; data: string; mimeType: string; [x: string]: unknown }
      | {
          type: "resource";
          resource:
            | { text: string; uri: string; mimeType?: string; [x: string]: unknown }
            | { uri: string; blob: string; mimeType?: string; [x: string]: unknown };
          [x: string]: unknown;
        }
    >;
    _meta?: { [key: string]: any };
    isError?: boolean;
    [x: string]: unknown;
  }>;
}