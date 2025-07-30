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
  values: string;
}

interface PutParameterDynamoParams {
  environment: string;
  profile: string;  // This will be used as awsAccount
  usrv_name: string;  // e.g., 'usrv-card'
  short_name: string;  // e.g., 'TIMEOUT_TRANSACTIONS_TABLES'
  region: string;
  value?: string;
  values?: string;
  description?: string;
  lambdas?: string;
}

export const putParameterDynamoTool: ToolHandler<PutParameterDynamoParams> = {
  name: "put-parameter-dynamo",
  description: "Tool for updating or creating a parameter in DynamoDB",
  schema: {
    environment: z.enum(['qa', 'dev', 'prod']).describe("Environment of the microservice (qa, dev, prod)"),
    profile: z.string().describe("AWS credentials profile name (will be used as awsAccount)"),
    usrv_name: z.string().describe("Microservice name (e.g., 'usrv-card')"),
    short_name: z.string().describe("Short name in UPPER_SNAKE_CASE (e.g., 'TIMEOUT_TRANSACTIONS_TABLES')"),
    region: z.string().describe("AWS region to use"),
    value: z.string().optional().describe("Parameter value to set on value"),
    values: z.string().optional().describe("Parameter values to set on values"),
    description: z.string().optional().describe("Optional description for the parameter"),
    lambdas: z.string().optional().default("'ALL'").describe("Comma-separated list of lambdas or 'ALL'")
  },
  handler: async ({ environment, profile, usrv_name, short_name, region, value, values, description, lambdas }) => {
    const gateway = new DynamoGateway({ 
      region,
      credentials: fromIni({ profile })
    });

    const tableName = `usrv-parameters-manager-${environment}-parameters`;
    const scope = `/${environment}/${profile}/${usrv_name}`;
    
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const shortName = short_name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      const name = `${usrv_name}-${shortName}`;
      
      const parameterItem: ParameterItem = {
        name,
        scope,
        awsAccount: profile,
        config: { region },
        createdAt: timestamp,
        description: description || "",
        lambdas: lambdas || "'ALL'",
        shortName,
        stage: environment,
        updatedAt: timestamp,
        updatedBy: "mcp-aws-ts",
        value: value || "",
        values: values || ""
      };

      await gateway.putItem(tableName, parameterItem);

      return {
        content: [
          {
            type: "text",
            text: `Parameter successfully saved: ${JSON.stringify(parameterItem)}`
          }
        ]
      };
    } catch (error: any) {
      console.error("Error putting parameter in DynamoDB:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error saving parameter: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
};
