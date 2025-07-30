import { z } from "zod";
import { ToolHandler } from "./types.js";
import { DynamoGateway } from "../gateway/dynamo.js";
import { fromIni } from "@aws-sdk/credential-providers";

interface ListTablesParams {
  limit?: number;
  exclusive_start_table_name?: string;
  profile: string;
  region: string;
}

export const listTablesDynamoTool: ToolHandler<ListTablesParams> = {
  name: "list-tables-dynamo",
  description: "tool para listar todas las tablas de DynamoDB en una cuenta de AWS",
  schema: {
    limit: z.number().optional().describe("número máximo de tablas a retornar"),
    exclusive_start_table_name: z.string().optional().describe("nombre de la tabla desde donde comenzar la lista"),
    profile: z.string().describe("nombre del perfil en el archivo de credenciales de AWS"),
    region: z.string().describe("región de AWS a utilizar")
  },
  handler: async ({ limit, exclusive_start_table_name, profile, region }) => {
    const gateway = new DynamoGateway({ 
      region: region,
      credentials: fromIni({ profile })
    });
    try {
      const result = await gateway.listTables({
        limit,
        exclusiveStartTableName: exclusive_start_table_name
      });

      return {
        content: [
          {
            type: "text",
            text: `Tablas encontradas: ${JSON.stringify(result.tableNames)}${result.lastEvaluatedTableName ? '\nHay más tablas disponibles. Última tabla evaluada: ' + result.lastEvaluatedTableName : ''}`
          }
        ]
      };
    } catch (error: any) {
      console.error("Error listing DynamoDB tables:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error al listar las tablas: ${error.message}`
          }
        ]
      };
    }
  }
};