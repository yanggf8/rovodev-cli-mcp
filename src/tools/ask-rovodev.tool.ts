import { z } from "zod";
import { UnifiedTool } from "./registry.js";
import { ROVODEV, ToolArguments, CHUNKING } from "../constants.js";
import { executeCommand } from "../utils/commandExecutor.js";
import { cacheText } from "../utils/chunkCache.js";

export const askRovodevTool: UnifiedTool = {
  name: "ask-rovodev",
  description: "Invoke Rovodev agent via 'acli rovodev run'. Supports flags like --config-file, --shadow, --verbose, --restore, --yolo.",
  zodSchema: z.object({
    // Prefer 'message'; keep 'prompt' as backwards-compatible alias
    message: z.string().optional().describe("Initial instruction for the agent"),
    prompt: z.string().optional().describe("Alias for message"),

    // Common run flags
    configFile: z.string().optional().describe("Path to config file (maps to --config-file)"),
    shadow: z.boolean().optional().describe("Enable shadow mode (--shadow)"),
    verbose: z.boolean().optional().describe("Enable verbose tool output (--verbose)"),
    restore: z.boolean().optional().describe("Continue last session if available (--restore)"),
    yolo: z.boolean().optional().describe("Run without confirmations (--yolo)"),

    // Extra passthrough args if needed
    args: z.array(z.string()).optional().describe("Extra raw args passed to the CLI after flags"),

    // Pagination control for very large outputs
    pagechunksize: z.number().int().positive().optional().describe("Optional chunk size (characters) for splitting large responses"),
  }),
  prompt: {
    description: "Send a message to the Rovodev CLI agent",
  },
  async execute(args: ToolArguments, onProgress?: (newOutput: string) => void): Promise<string> {
    const argv: string[] = [];

    // Subcommand path: e.g., ["rovodev", "run"]
    argv.push(...ROVODEV.SUBCOMMAND);

    // Map flags
    if (typeof (args as any).configFile === "string" && (args as any).configFile) {
      argv.push(ROVODEV.FLAGS.CONFIG_FILE, String((args as any).configFile));
    }
    if ((args as any).shadow) argv.push(ROVODEV.FLAGS.SHADOW);
    if ((args as any).verbose) argv.push(ROVODEV.FLAGS.VERBOSE);
    if ((args as any).restore) argv.push(ROVODEV.FLAGS.RESTORE);
    if ((args as any).yolo) argv.push(ROVODEV.FLAGS.YOLO);

    // Extra raw args before the message
    if (Array.isArray((args as any).args) && (args as any).args.length) {
      argv.push(...(args as any).args);
    }

    // Determine message (alias: prompt)
    const msg = (args as any).message ?? (args as any).prompt;
    if (typeof msg === "string" && msg.length > 0) {
      argv.push(msg);
    }

    const result = await executeCommand(ROVODEV.COMMAND, argv, onProgress);

    // Chunk if too large (configurable per request via pagechunksize)
    const CHUNK_SIZE = typeof (args as any).pagechunksize === 'number'
      ? Number((args as any).pagechunksize)
      : CHUNKING.DEFAULT_CHARS;
    if (result.length > CHUNK_SIZE) {
      const { key, total } = cacheText(result, CHUNK_SIZE);
      return `Response too large; returning first chunk. Use next-chunk with cacheKey to continue.\ncacheKey: ${key}\nchunk: 1/${total}\n\n${result.slice(0, CHUNK_SIZE)}`;
    }
    return result;
  }
};
