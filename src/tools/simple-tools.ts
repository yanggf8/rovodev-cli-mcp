import { z } from "zod";
import { UnifiedTool } from "./registry.js";
import { ROVODEV } from "../constants.js";
import { executeCommand } from "../utils/commandExecutor.js";

export const pingTool: UnifiedTool = {
  name: "Ping",
  description: "Echo back a message for testing",
  zodSchema: z.object({ message: z.string().optional().describe("Message to echo back") }),
  async execute(args) {
    return args.message ? String(args.message) : "pong";
  },
  prompt: {
    description: "Ping the server",
  },
};

export const helpTool: UnifiedTool = {
  name: "Help",
  description: "Show underlying Rovodev CLI help output",
  zodSchema: z.object({}),
  async execute() {
    const output = await executeCommand(ROVODEV.COMMAND, [...ROVODEV.SUBCOMMAND, ROVODEV.FLAGS.HELP]);
    return output;
  },
  prompt: {
    description: "Display help for the underlying CLI",
  },
};
