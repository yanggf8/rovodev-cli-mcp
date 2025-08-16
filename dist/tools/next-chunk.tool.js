import { z } from "zod";
import { getNextChunk } from "../utils/chunkCache.js";
const inputSchema = z.object({
    cacheKey: z.string().describe("Cache key from a previous ask-rovodev response")
});
export const nextChunkTool = {
    name: "next-chunk",
    description: "Fetch the next chunk for a previously cached large response (from ask-rovodev)",
    zodSchema: inputSchema,
    prompt: {
        description: "Fetch the next chunk of a prior large response",
        arguments: [
            { name: "cacheKey", description: "Cache key returned earlier", required: true }
        ]
    },
    async execute(args) {
        const { cacheKey } = args;
        const next = getNextChunk(cacheKey);
        if (!next) {
            return `No further chunks available for key ${cacheKey}.`;
        }
        return `chunk: ${next.index}/${next.total} (cacheKey: ${cacheKey})\n\n${next.chunk}`;
    }
};
