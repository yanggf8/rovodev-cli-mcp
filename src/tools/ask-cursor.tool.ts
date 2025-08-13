import { z } from "zod";
import { UnifiedTool } from "./registry.js";
import { CURSOR_AGENT, ToolArguments } from "../constants.js";
import { executeCommand } from "../utils/commandExecutor.js";
import { cacheText } from "../utils/chunkCache.js";

export const askCursorTool: UnifiedTool = {
  name: "ask-cursor",
  description: "Ask Cursor Agent (configurable CLI) to perform an analysis or task. Use @file syntax to reference files if your CLI supports it.",
  zodSchema: z.object({
    prompt: z.string().min(1, "prompt is required").describe("Prompt or instruction for the agent"),
    model: z.string().optional().describe("Model identifier to use (if supported)"),
    args: z.array(z.string()).optional().describe("Extra raw args passed to the CLI"),
  }),
  prompt: {
    description: "Send a prompt to the Cursor Agent CLI",
  },
  async execute(args: ToolArguments, onProgress?: (newOutput: string) => void): Promise<string> {
    // Pagination-only mode removed for simplicity
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

    // Chunk if too large (fixed internal size)
    const CHUNK_SIZE = 20000;
    if (result.length > CHUNK_SIZE) {
      const { key, total } = cacheText(result, CHUNK_SIZE);
      return `Response too large; returning first chunk. Use next-chunk with cacheKey to continue.\ncacheKey: ${key}\nchunk: 1/${total}\n\n${result.slice(0, CHUNK_SIZE)}`;
    }
    return result;
  }
};
