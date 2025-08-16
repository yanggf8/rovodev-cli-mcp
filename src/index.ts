#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  CallToolRequest,
  ListToolsRequest,
  ListPromptsRequest,
  GetPromptRequest,
  Tool,
  Prompt,
  GetPromptResult,
  CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import { Logger } from "./utils/logger.js";
import { PROTOCOL, ToolArguments } from "./constants.js";
import { getToolDefinitions, getPromptDefinitions, executeTool, toolExists, getPromptMessage } from "./tools/index.js";

const server = new Server(
  { name: "rovodev-cli-mcp", version: "0.1.0" },
  { capabilities: { tools: {}, prompts: {}, notifications: {}, logging: {} } },
);

// Track progress per request (supports concurrent tool calls)
const progressContexts = new Map<string | number, { interval: NodeJS.Timeout; opName: string; latestChunk: string; idx: number; ticks: number }>();

async function sendNotification(method: string, params: any) {
  try { await server.notification({ method, params }); } catch (err) { Logger.error("notification failed:", err); }
}

async function sendProgressNotification(progressToken: string | number | undefined, progress: number, total?: number, message?: string) {
  if (!progressToken) return;
  try {
    const params: any = { progressToken, progress };
    if (total !== undefined) params.total = total;
    if (message) params.message = message;
    await server.notification({ method: PROTOCOL.NOTIFICATIONS.PROGRESS, params });
  } catch (err) { Logger.error("Failed to send progress notification:", err); }
}

function startProgressUpdates(operationName: string, progressToken?: string | number) {
  if (!progressToken) return;
  const messages = [
    `🧠 ${operationName} - processing...`,
    `📊 ${operationName} - working...`,
    `✨ ${operationName} - preparing output...`,
    `⏱️ ${operationName} - might take a while...`,
    `🔍 ${operationName} - still running...`,
  ];
  let idx = 0; let ticks = 0;
  sendProgressNotification(progressToken, 0, undefined, `🔍 Starting ${operationName}`);
  const interval = setInterval(async () => {
    const ctx = progressContexts.get(progressToken);
    if (!ctx) { clearInterval(interval); return; }
    ticks += 1;
    const base = messages[idx % messages.length];
    const preview = ctx.latestChunk?.slice(-150).trim();
    const msg = preview ? `${base}\n📝 Output: ...${preview}` : base;
    await sendProgressNotification(progressToken, ticks, undefined, msg);
    idx++;
  }, PROTOCOL.KEEPALIVE_INTERVAL);
  progressContexts.set(progressToken, { interval, opName: operationName, latestChunk: "", idx, ticks });
}

function updateProgressLatestChunk(progressToken: string | number | undefined, newChunk: string) {
  if (!progressToken) return;
  const ctx = progressContexts.get(progressToken);
  if (ctx) ctx.latestChunk = newChunk;
}

function stopProgressUpdates(progressToken: string | number | undefined, success: boolean = true) {
  if (!progressToken) return;
  const ctx = progressContexts.get(progressToken);
  if (!ctx) return;
  clearInterval(ctx.interval);
  sendProgressNotification(progressToken, 100, 100, success ? `✅ ${ctx.opName} completed successfully` : `❌ ${ctx.opName} failed`);
  progressContexts.delete(progressToken);
}

server.setRequestHandler(ListToolsRequestSchema, async (_req: ListToolsRequest): Promise<{ tools: Tool[] }> => ({ tools: getToolDefinitions() as unknown as Tool[] }));

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest): Promise<CallToolResult> => {
  const toolName = request.params.name;
  if (!toolExists(toolName)) throw new Error(`Unknown tool: ${toolName}`);

  const progressToken = (request.params as any)._meta?.progressToken;
  startProgressUpdates(toolName, progressToken);
  try {
    const args: ToolArguments = (request.params.arguments as ToolArguments) || {};
    Logger.toolInvocation(toolName, request.params.arguments);
    const result = await executeTool(toolName, args, (newOutput) => { updateProgressLatestChunk(progressToken, newOutput); });
    stopProgressUpdates(progressToken, true);
    return { content: [{ type: "text", text: result }], isError: false };
  } catch (error) {
    stopProgressUpdates(progressToken, false);
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: "text", text: `Error executing ${toolName}: ${message}` }], isError: true };
  }
});

server.setRequestHandler(ListPromptsRequestSchema, async (_req: ListPromptsRequest): Promise<{ prompts: Prompt[] }> => ({ prompts: getPromptDefinitions() as unknown as Prompt[] }));

server.setRequestHandler(GetPromptRequestSchema, async (request: GetPromptRequest): Promise<GetPromptResult> => {
  const promptName = request.params.name; const args = request.params.arguments || {}; const message = getPromptMessage(promptName, args);
  return { messages: [{ role: "user" as const, content: { type: "text" as const, text: message } }] };
});

async function main() {
  Logger.debug("init rovodev-cli-mcp");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  Logger.debug("rovodev-cli-mcp listening on stdio");
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main().catch((err) => { Logger.error("Fatal error:", err); process.exit(1); });
