import { toolRegistry } from "./registry.js";
import { askCursorTool } from "./ask-cursor.tool.js";
import { pingTool, helpTool } from "./simple-tools.js";
import { fetchChunkTool } from "./fetch-chunk.tool.js";
import { nextChunkTool } from "./next-chunk.tool.js";
toolRegistry.push(askCursorTool, pingTool, helpTool, fetchChunkTool, nextChunkTool);
// Alias: hit-cursor behaves exactly like ask-cursor
const hitCursor = { ...askCursorTool, name: "hit-cursor" };
toolRegistry.push(hitCursor);
export * from "./registry.js";
