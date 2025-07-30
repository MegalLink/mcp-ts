import { z } from "zod";
import { ToolHandler } from "./types.js";
import { DynamoGateway } from "../gateway/dynamo.js";
import { fromIni } from "@aws-sdk/credential-providers";

interface ParameterConfig {
  region: string;
}

interface ParameterItem {
  name: string;
  scope: string;
  awsAccount: string;
  config: ParameterConfig;
  createdAt: number;
  description: string;
  lambdas: string;
  shortName: string;
  stage: string;
  updatedAt: number;
  updatedBy: string;
  value: string;
}

interface QueryParametersParams {
  environment: string;
  profile: string;
  usrv_name: string;
  region: string;
}

export const queryParametersDynamoTool: ToolHandler<QueryParametersParams> = {
  name: "query-parameters-dynamo",
  description: "tool para consultar parámetros de una tabla de DynamoDB usando el scope",
  schema: {
    environment: z.string().describe("ambiente del microservicio (qa, dev, prod)"),
    profile: z.string().describe("nombre del perfil en el archivo de credenciales de AWS"),
    usrv_name: z.string().describe("nombre del microservicio"),
    region: z.string().describe("región de AWS a utilizar")
  },
  handler: async ({ environment, profile, usrv_name, region }) => {
    const gateway = new DynamoGateway({ 
      region: region,
      credentials: fromIni({ profile })
    });

    const tableName = `usrv-parameters-manager-${environment}-parameters`;
    const scope = `/${environment}/${profile}/${usrv_name}`;

    try {
      const result = await gateway.query<ParameterItem>(
        tableName,
        "#scope = :scope",
        {
          indexName: "scopeIndex",
          expressionAttributeNames: {
            "#scope": "scope"
          },
          expressionAttributeValues: {
            ":scope": scope
          }
        }
      );

      if (result.items && result.items.length > 0) {
        const formattedItems = result.items;

        return {
          content: [
            {
              type: "text",
              text: `Parámetros encontrados (${result.count}):\n${JSON.stringify(formattedItems, null, 2)}`
            }
          ]
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: `No se encontraron parámetros para el scope ${scope} en la tabla ${tableName}.`
            }
          ]
        };
      }
    } catch (error: any) {
      console.error("Error querying DynamoDB parameters:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error al consultar los parámetros: ${error.message}`
          }
        ]
      };
    }
  }
};