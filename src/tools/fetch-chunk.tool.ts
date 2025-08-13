import { z } from "zod";
import { UnifiedTool } from "./registry.js";
import { getCachedChunk } from "../utils/chunkCache.js";

const inputSchema = z.object({
  cacheKey: z.string().describe("Cache key from a previous ask-cursor response"),
  chunkIndex: z.number().int().min(1).describe("Which chunk to retrieve (1-based index)")
});

export const fetchChunkTool: UnifiedTool = {
  name: "fetch-chunk",
  description: "Fetch a specific chunk from a previously cached large response",
  zodSchema: inputSchema,
  prompt: {
    description: "Fetch a specific chunk of a prior large response",
    arguments: [
      { name: "cacheKey", description: "Cache key returned earlier", required: true },
      { name: "chunkIndex", description: "1-based index of the chunk", required: true }
    ]
  },
  async execute(args: any): Promise<string> {
    const { cacheKey, chunkIndex } = args;
    const cached = getCachedChunk(cacheKey, chunkIndex);
    if (!cached) {
      return `No cached chunk ${chunkIndex} for key ${cacheKey}.`;
    }
    return `Page ${chunkIndex}/${cached.total} (cacheKey: ${cacheKey})\n\n${cached.chunk}`;
  }
};
