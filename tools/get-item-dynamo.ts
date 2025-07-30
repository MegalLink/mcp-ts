import { z } from "zod";
import { ToolHandler } from "./types.js";
import { DynamoGateway } from "../gateway/dynamo.js";
import { fromIni } from "@aws-sdk/credential-providers";

interface GetItemParams {
  table_name: string;
  key: Record<string, any>;
  profile: string;
  region: string;
}

export const getItemDynamoTool: ToolHandler<GetItemParams> = {
  name: "get-item-dynamo",
  description: "tool to get a item from dynamo table",
  schema: {
    table_name: z.string().describe("table name example: usrv-card"),
    key: z.record(z.string(), z.any()).describe("key object for the item, e.g., { 'id': '123' } or { 'userId': 'abc', 'sortKey': 'xyz' }"),
    profile: z.string().describe("nombre del perfil en el archivo de credenciales de AWS"),
    region: z.string().describe("región de AWS a utilizar")
  },
  handler: async ({ table_name, key, profile, region }) => {
    const gateway = new DynamoGateway({ 
      region: region,
      credentials: fromIni({ profile })
    });
    try {
      const item = await gateway.getItem(table_name, key);

      if (item) {
        return {
          content: [
            {
              type: "text",
              text: `Item encontrado: ${JSON.stringify(item)}`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: `No se encontró ningún ítem con la clave proporcionada en la tabla ${table_name}.`,
            },
          ],
        };
      }
    } catch (error: any) {
      console.error("Error fetching item from DynamoDB:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error al obtener el ítem: ${error.message}`,
          },
        ],
      };
    }
  }
};