#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { Logger } from "./utils/logger.js";
import { PROTOCOL } from "./constants.js";
import { getToolDefinitions, getPromptDefinitions, executeTool, toolExists, getPromptMessage } from "./tools/index.js";
import { formatErrorForUser } from "./utils/errorHandler.js";
const server = new Server({ name: "rovodev-cli-mcp", version: "0.1.0" }, { capabilities: { tools: {}, prompts: {}, notifications: {}, logging: {} } });
// Track progress per request (supports concurrent tool calls)
const progressContexts = new Map();
async function sendNotification(method, params) {
    try {
        await server.notification({ method, params });
    }
    catch (err) {
        Logger.error("notification failed:", err);
    }
}
async function sendProgressNotification(progressToken, progress, total, message) {
    if (!progressToken)
        return;
    try {
        const params = { progressToken, progress };
        if (total !== undefined)
            params.total = total;
        if (message)
            params.message = message;
        await server.notification({ method: PROTOCOL.NOTIFICATIONS.PROGRESS, params });
    }
    catch (err) {
        Logger.error("Failed to send progress notification:", err);
    }
}
function startProgressUpdates(operationName, progressToken) {
    if (!progressToken)
        return;
    const messages = [
        `🧠 ${operationName} - processing...`,
        `📊 ${operationName} - working...`,
        `✨ ${operationName} - preparing output...`,
        `⏱️ ${operationName} - might take a while...`,
        `🔍 ${operationName} - still running...`,
    ];
    let idx = 0;
    let ticks = 0;
    sendProgressNotification(progressToken, 0, undefined, `🔍 Starting ${operationName}`);
    const interval = setInterval(async () => {
        const ctx = progressContexts.get(progressToken);
        if (!ctx) {
            clearInterval(interval);
            return;
        }
        ticks += 1;
        const base = messages[idx % messages.length];
        const preview = ctx.latestChunk?.slice(-150).trim();
        const msg = preview ? `${base}\n📝 Output: ...${preview}` : base;
        await sendProgressNotification(progressToken, ticks, undefined, msg);
        idx++;
    }, PROTOCOL.KEEPALIVE_INTERVAL);
    progressContexts.set(progressToken, { interval, opName: operationName, latestChunk: "", idx, ticks });
}
function updateProgressLatestChunk(progressToken, newChunk) {
    if (!progressToken)
        return;
    const ctx = progressContexts.get(progressToken);
    if (ctx)
        ctx.latestChunk = newChunk;
}
function stopProgressUpdates(progressToken, success = true) {
    if (!progressToken)
        return;
    const ctx = progressContexts.get(progressToken);
    if (!ctx)
        return;
    clearInterval(ctx.interval);
    sendProgressNotification(progressToken, 100, 100, success ? `✅ ${ctx.opName} completed successfully` : `❌ ${ctx.opName} failed`);
    progressContexts.delete(progressToken);
}
server.setRequestHandler(ListToolsRequestSchema, async (_req) => ({ tools: getToolDefinitions() }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    if (!toolExists(toolName))
        throw new Error(`Unknown tool: ${toolName}`);
    const progressToken = request.params._meta?.progressToken;
    startProgressUpdates(toolName, progressToken);
    try {
        const args = request.params.arguments || {};
        Logger.toolInvocation(toolName, request.params.arguments);
        const result = await executeTool(toolName, args, (newOutput) => { updateProgressLatestChunk(progressToken, newOutput); });
        stopProgressUpdates(progressToken, true);
        return { content: [{ type: "text", text: result }], isError: false };
    }
    catch (error) {
        stopProgressUpdates(progressToken, false);
        const message = error instanceof Error ? error.message : String(error);
        // Use enhanced error formatting for user-facing error messages
        const userFriendlyError = formatErrorForUser(error);
        return { content: [{ type: "text", text: userFriendlyError }], isError: true };
    }
});
server.setRequestHandler(ListPromptsRequestSchema, async (_req) => ({ prompts: getPromptDefinitions() }));
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const promptName = request.params.name;
    const args = request.params.arguments || {};
    const message = getPromptMessage(promptName, args);
    return { messages: [{ role: "user", content: { type: "text", text: message } }] };
});
async function main() {
    Logger.debug("init rovodev-cli-mcp");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    Logger.debug("rovodev-cli-mcp listening on stdio");
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
main().catch((err) => { Logger.error("Fatal error:", err); process.exit(1); });
