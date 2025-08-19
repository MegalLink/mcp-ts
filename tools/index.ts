import { ToolHandler } from "./types.js";
import { getWeatherTool } from "./get-weather.js";

export const tools: ToolHandler<any>[] = [
  getWeatherTool,
];

export * from "./types.js";
export * from "./get-weather.js";