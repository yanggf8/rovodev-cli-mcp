import { toolRegistry } from "./registry.js";
import { askRovodevTool } from "./ask-rovodev.tool.js";
import { pingTool, helpTool } from "./simple-tools.js";
import { fetchChunkTool } from "./fetch-chunk.tool.js";
import { nextChunkTool } from "./next-chunk.tool.js";
import { sessionManagerSchema, executeSessionManager } from "./session-manager.tool.js";
import { healthCheckSchema, executeHealthCheck } from "./health-check.tool.js";
import { diagnosticsSchema, executeDiagnostics } from "./diagnostics.tool.js";
// Create tool objects for new functionality
const sessionManagerTool = {
    name: sessionManagerSchema.name,
    description: sessionManagerSchema.description,
    zodSchema: sessionManagerSchema.inputSchema,
    execute: executeSessionManager
};
const healthCheckTool = {
    name: healthCheckSchema.name,
    description: healthCheckSchema.description,
    zodSchema: healthCheckSchema.inputSchema,
    execute: executeHealthCheck
};
const diagnosticsTool = {
    name: diagnosticsSchema.name,
    description: diagnosticsSchema.description,
    zodSchema: diagnosticsSchema.inputSchema,
    execute: executeDiagnostics
};
toolRegistry.push(askRovodevTool, pingTool, helpTool, fetchChunkTool, nextChunkTool, sessionManagerTool, healthCheckTool, diagnosticsTool);
// Alias: tap-rovodev behaves exactly like ask-rovodev
const tapRovodev = { ...askRovodevTool, name: "tap-rovodev" };
toolRegistry.push(tapRovodev);
export * from "./registry.js";
