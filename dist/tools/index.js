import { toolRegistry } from "./registry.js";
import { askRovodevTool } from "./ask-rovodev.tool.js";
import { pingTool, helpTool } from "./simple-tools.js";
import { fetchChunkTool } from "./fetch-chunk.tool.js";
import { nextChunkTool } from "./next-chunk.tool.js";
toolRegistry.push(askRovodevTool, pingTool, helpTool, fetchChunkTool, nextChunkTool);
// Alias: tap-rovodev behaves exactly like ask-rovodev
const tapRovodev = { ...askRovodevTool, name: "tap-rovodev" };
toolRegistry.push(tapRovodev);
export * from "./registry.js";
