import { z } from "zod";
import { ToolHandler } from "./types.js";
import { DynamoGateway } from "../gateway/dynamo.js";
import { fromIni } from "@aws-sdk/credential-providers";

interface ScanTableParams {
  table_name: string;
  limit?: number;
  profile: string;
  region: string;
}

export const scanTableDynamoTool: ToolHandler<ScanTableParams> = {
  name: "scan-table-dynamo",
  description: "tool para escanear una tabla de DynamoDB y obtener sus elementos",
  schema: {
    table_name: z.string().describe("nombre de la tabla a escanear"),
    limit: z.number().optional().describe("número máximo de elementos a retornar"),
    profile: z.string().describe("nombre del perfil en el archivo de credenciales de AWS"),
    region: z.string().describe("región de AWS a utilizar")
  },
  handler: async ({ table_name, limit, profile, region }) => {
    const gateway = new DynamoGateway({ 
      region: region,
      credentials: fromIni({ profile })
    });
    try {
      const result = await gateway.scan(table_name, { limit });

      return {
        content: [
          {
            type: "text",
            text: `Elementos encontrados: ${JSON.stringify(result.items)}\nTotal de elementos: ${result.count}${result.lastEvaluatedKey ? '\nHay más elementos disponibles. Última clave evaluada: ' + JSON.stringify(result.lastEvaluatedKey) : ''}`
          }
        ]
      };
    } catch (error: any) {
      console.error("Error scanning DynamoDB table:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error al escanear la tabla: ${error.message}`
          }
        ]
      };
    }
  }
};