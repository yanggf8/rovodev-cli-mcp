import { Tool, Prompt } from "@modelcontextprotocol/sdk/types.js";
import { ZodTypeAny, ZodError } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ToolArguments } from "../constants.js";

export interface UnifiedTool {
  name: string;
  description: string;
  zodSchema: ZodTypeAny;
  prompt?: {
    description: string;
    arguments?: Array<{ name: string; description: string; required: boolean }>; 
  };
  execute: (args: ToolArguments, onProgress?: (newOutput: string) => void) => Promise<string>;
}

export const toolRegistry: UnifiedTool[] = [];
export function toolExists(name: string): boolean { return toolRegistry.some(t => t.name === name); }

export function getToolDefinitions(): Tool[] {
  return toolRegistry.map(t => {
    const raw = zodToJsonSchema(t.zodSchema, t.name) as any;
    const def = raw.definitions?.[t.name] ?? raw;
    return {
      name: t.name,
      description: t.description,
      inputSchema: {
        type: "object",
        properties: def.properties || {},
        required: def.required || [],
      }
    };
  });
}

export function getPromptDefinitions(): Prompt[] {
  return toolRegistry.filter(t => t.prompt).map(t => ({
    name: t.name,
    description: t.prompt!.description,
    arguments: t.prompt!.arguments || extractPromptArguments(t.zodSchema),
  }));
}

export function getPromptMessage(toolName: string, args: Record<string, any>): string {
  const tool = toolRegistry.find(t => t.name === toolName);
  if (!tool?.prompt) throw new Error(`No prompt defined for tool: ${toolName}`);
  const bits: string[] = [];
  if (args.prompt) bits.push(args.prompt);
  for (const [k, v] of Object.entries(args)) {
    if (k === "prompt" || v === undefined || v === null || v === false) continue;
    if (typeof v === "boolean") bits.push(`[${k}]`);
    else bits.push(`(${k}: ${v})`);
  }
  return `Use the ${toolName} tool${bits.length ? ": " + bits.join(" ") : ""}`;
}

export async function executeTool(toolName: string, args: ToolArguments, onProgress?: (newOutput: string) => void): Promise<string> {
  const tool = toolRegistry.find(t => t.name === toolName);
  if (!tool) throw new Error(`Unknown tool: ${toolName}`);
  try {
    const validated = tool.zodSchema.parse(args);
    return await tool.execute(validated, onProgress);
  } catch (err) {
    if (err instanceof ZodError) {
      const issues = err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new Error(`Invalid arguments for ${toolName}: ${issues}`);
    }
    throw err;
  }
}

function extractPromptArguments(zodSchema: ZodTypeAny): Array<{name: string; description: string; required: boolean}> {
  const json = zodToJsonSchema(zodSchema) as any;
  const props = json.properties || {};
  const req = json.required || [];
  return Object.entries(props).map(([name, prop]: [string, any]) => ({
    name,
    description: prop.description || `${name} parameter`,
    required: req.includes(name),
  }));
}
