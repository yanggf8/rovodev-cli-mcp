import { toolRegistry } from "./registry.js";
import { askCursorTool } from "./ask-cursor.tool.js";
import { pingTool, helpTool } from "./simple-tools.js";
toolRegistry.push(askCursorTool, pingTool, helpTool);
// Alias: hit-cursor behaves exactly like ask-cursor
const hitCursor = { ...askCursorTool, name: "hit-cursor" };
toolRegistry.push(hitCursor);
export * from "./registry.js";
