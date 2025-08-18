import { z } from "zod";
import { ROVODEV, CHUNKING } from "../constants.js";
import { executeCommand } from "../utils/commandExecutor.js";
import { createStreamingCache, appendToStream, finalizeStream, getCachedChunk } from "../utils/chunkCache.js";
export const askRovodevTool = {
    name: "ask-rovodev",
    description: "Invoke Rovodev agent via 'acli rovodev run'. Always runs in yolo mode (non-interactive) for MCP usage. Supports flags like --config-file, --shadow, --verbose, --restore.",
    zodSchema: z.object({
        // Prefer 'message'; keep 'prompt' as backwards-compatible alias
        message: z.string().optional().describe("Initial instruction for the agent"),
        prompt: z.string().optional().describe("Alias for message"),
        // Common run flags
        configFile: z.string().optional().describe("Path to config file (maps to --config-file)"),
        shadow: z.boolean().optional().describe("Enable shadow mode (--shadow)"),
        verbose: z.boolean().optional().describe("Enable verbose tool output (--verbose)"),
        restore: z.boolean().optional().describe("Continue last session if available (--restore)"),
        // Extra passthrough args if needed
        args: z.array(z.string()).optional().describe("Extra raw args passed to the CLI after flags"),
        // Pagination control for very large outputs
        pagechunksize: z.number().int().positive().optional().describe("Optional chunk size (characters) for splitting large responses"),
    }),
    prompt: {
        description: "Send a message to the Rovodev CLI agent",
    },
    async execute(args, onProgress) {
        const argv = [];
        // Subcommand path: e.g., ["rovodev", "run"]
        argv.push(...ROVODEV.SUBCOMMAND);
        // Map flags
        if (typeof args.configFile === "string" && args.configFile) {
            argv.push(ROVODEV.FLAGS.CONFIG_FILE, String(args.configFile));
        }
        if (args.shadow)
            argv.push(ROVODEV.FLAGS.SHADOW);
        if (args.verbose)
            argv.push(ROVODEV.FLAGS.VERBOSE);
        if (args.restore)
            argv.push(ROVODEV.FLAGS.RESTORE);
        // Always enable yolo mode for MCP server usage (non-interactive mode)
        argv.push(ROVODEV.FLAGS.YOLO);
        // Extra raw args before the message
        if (Array.isArray(args.args) && args.args.length) {
            argv.push(...args.args);
        }
        // Determine message (alias: prompt)
        const msg = args.message ?? args.prompt;
        if (typeof msg === "string" && msg.length > 0) {
            // If the message looks like a flag (starts with '-') add a separator to prevent flag parsing
            if (msg.trim().startsWith("-")) {
                argv.push("--");
            }
            argv.push(msg);
        }
        // Streaming approach: build chunks incrementally to reduce memory pressure
        const CHUNK_SIZE = typeof args.pagechunksize === 'number'
            ? Number(args.pagechunksize)
            : CHUNKING.DEFAULT_CHARS;
        const { key } = createStreamingCache(CHUNK_SIZE);
        await executeCommand(ROVODEV.COMMAND, argv, (newOutput) => {
            appendToStream(key, newOutput);
            if (onProgress)
                onProgress(newOutput);
        }, {
            streaming: true,
            maxStdoutBuffer: Number.isFinite(Number(process.env.MCP_MAX_STDOUT_SIZE)) ? Number(process.env.MCP_MAX_STDOUT_SIZE) : undefined,
        });
        finalizeStream(key);
        // Decide whether to return chunked response header or the full content
        const first = getCachedChunk(key, 1);
        if (!first)
            return "";
        if (first.total > 1) {
            return `Response too large; returning first chunk. Use next-chunk with cacheKey to continue.\ncacheKey: ${key}\nchunk: 1/${first.total}\n\n${first.chunk}`;
        }
        return first.chunk;
    }
};
