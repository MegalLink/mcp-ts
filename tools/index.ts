import { ToolHandler } from "./types.js";
import { listTablesDynamoTool } from "./list-tables-dynamo.js";
import { getItemDynamoTool } from "./get-item-dynamo.js";
import { scanTableDynamoTool } from "./scan-table-dynamo.js";
import { queryParametersDynamoTool } from "./query-parameters-dynamo.js";
import { putParameterDynamoTool } from "./put-parameter-dynamo.js";
import { getWeatherTool } from "./get-weather.js";

export const tools: ToolHandler<any>[] = [
  listTablesDynamoTool,
  getItemDynamoTool,
  scanTableDynamoTool,
  queryParametersDynamoTool,
  putParameterDynamoTool,
  getWeatherTool,
];

export * from "./types.js";
export * from "./list-tables-dynamo.js";
export * from "./get-item-dynamo.js";
export * from "./scan-table-dynamo.js";
export * from "./query-parameters-dynamo.js";
export * from "./put-parameter-dynamo.js";
export * from "./get-weather.js";