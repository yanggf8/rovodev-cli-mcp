import { z } from "zod";
import { UnifiedTool } from "./registry.js";
import { CURSOR_AGENT, ToolArguments } from "../constants.js";
import { executeCommand } from "../utils/commandExecutor.js";
import { cacheText, getCachedChunk } from "../utils/chunkCache.js";

export const askCursorTool: UnifiedTool = {
  name: "ask-cursor",
  description: "Ask Cursor Agent (configurable CLI) to perform an analysis or task. Use @file syntax to reference files if your CLI supports it.",
  zodSchema: z.object({
    prompt: z.string().min(1, "prompt is required").optional().describe("Prompt or instruction for the agent"),
    model: z.string().optional().describe("Model identifier to use (if supported)"),
    args: z.array(z.string()).optional().describe("Extra raw args passed to the CLI"),
    page: z.number().int().positive().optional().describe("If provided with cacheKey, returns that page of the prior response (1-based)"),
    cacheKey: z.string().optional().describe("Cache key returned from a prior large response"),
    maxChunkChars: z.number().int().positive().default(20000).describe("Chunk size for large responses (characters)"),
  }).refine(v => Boolean(v.prompt) || (Boolean(v.cacheKey) && Boolean(v.page)), {
    message: "Provide either prompt, or both cacheKey and page",
    path: ["prompt"],
  }),
  prompt: {
    description: "Send a prompt to the Cursor Agent CLI",
  },
  async execute(args: ToolArguments, onProgress?: (newOutput: string) => void): Promise<string> {
    // If user asks for a specific page from a cached large response
    if (args.cacheKey && args.page) {
      const cached = getCachedChunk(String(args.cacheKey), Number(args.page));
      if (!cached) {
        return `No cached page ${args.page} for key ${args.cacheKey}.`;
      }
      return `Page ${args.page}/${cached.total} (cacheKey: ${args.cacheKey})\n\n${cached.chunk}`;
    }
    const argv: string[] = [];
    if (args.model) {
      argv.push(CURSOR_AGENT.FLAGS.MODEL, String(args.model));
    }

    // Quote prompt if it contains @ to keep shells happy on Windows
    const needsQuote = typeof args.prompt === 'string' && args.prompt.includes('@') && !/^".*"$/.test(args.prompt);
    const finalPrompt = needsQuote ? `"${args.prompt}"` : String(args.prompt);
    argv.push(CURSOR_AGENT.FLAGS.PROMPT, finalPrompt);

    if (Array.isArray(args.args) && args.args.length) {
      argv.push(...args.args);
    }

    const result = await executeCommand(CURSOR_AGENT.COMMAND, argv, onProgress);

    // Chunk if too large
    const maxChunk = typeof args.maxChunkChars === 'number' ? args.maxChunkChars : 20000;
    if (result.length > maxChunk) {
      const { key, total } = cacheText(result, maxChunk);
      return `Response too large; returning first page. Use page:+1 with cacheKey to paginate.\ncacheKey: ${key}\npage: 1/${total}\n\n${result.slice(0, maxChunk)}`;
    }
    return result;
  }
};
