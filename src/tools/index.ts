import { toolRegistry, UnifiedTool } from "./registry.js";
import { askRovodevTool } from "./ask-rovodev.tool.js";
import { pingTool, helpTool } from "./simple-tools.js";
import { fetchChunkTool } from "./fetch-chunk.tool.js";
import { nextChunkTool } from "./next-chunk.tool.js";
import { sessionManagerSchema, executeSessionManager } from "./session-manager.tool.js";
import { healthCheckSchema, executeHealthCheck } from "./health-check.tool.js";
import { diagnosticsSchema, executeDiagnostics } from "./diagnostics.tool.js";

// Create tool objects for new functionality
const sessionManagerTool: UnifiedTool = {
  name: sessionManagerSchema.name,
  description: sessionManagerSchema.description,
  zodSchema: sessionManagerSchema.inputSchema,
  execute: executeSessionManager
};

const healthCheckTool: UnifiedTool = {
  name: healthCheckSchema.name,
  description: healthCheckSchema.description,
  zodSchema: healthCheckSchema.inputSchema,
  execute: executeHealthCheck
};

const diagnosticsTool: UnifiedTool = {
  name: diagnosticsSchema.name,
  description: diagnosticsSchema.description,
  zodSchema: diagnosticsSchema.inputSchema,
  execute: executeDiagnostics
};

toolRegistry.push(askRovodevTool, pingTool, helpTool, fetchChunkTool, nextChunkTool, sessionManagerTool, healthCheckTool, diagnosticsTool);

// Backwards-compatible aliases for renamed tools
const pingAlias: UnifiedTool = { ...pingTool, name: "Ping" };
const helpAlias: UnifiedTool = { ...helpTool, name: "Help" };
const healthCheckAlias: UnifiedTool = { ...healthCheckTool, name: "health_check" };
const sessionManagerAlias: UnifiedTool = { ...sessionManagerTool, name: "session_manager" };

toolRegistry.push(pingAlias, helpAlias, healthCheckAlias, sessionManagerAlias);

// Alias: tap-rovodev behaves exactly like ask-rovodev
const tapRovodev: UnifiedTool = { ...askRovodevTool, name: "tap-rovodev" };
toolRegistry.push(tapRovodev);

export * from "./registry.js";
