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
  { name: "cursor-agent-mcp", version: "0.1.0" },
  { capabilities: { tools: {}, prompts: {}, notifications: {}, logging: {} } },
);

let isProcessing = false; let currentOperationName = ""; let latestOutput = "";

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
  isProcessing = true; currentOperationName = operationName; latestOutput = "";
  const messages = [
    `🧠 ${operationName} - processing...`,
    `📊 ${operationName} - working...`,
    `✨ ${operationName} - preparing output...`,
    `⏱️ ${operationName} - might take a while...`,
    `🔍 ${operationName} - still running...`,
  ];
  let idx = 0; let progress = 0;
  if (progressToken) sendProgressNotification(progressToken, 0, undefined, `🔍 Starting ${operationName}`);
  const interval = setInterval(async () => {
    if (isProcessing && progressToken) {
      progress += 1;
      const base = messages[idx % messages.length];
      const preview = latestOutput.slice(-150).trim();
      const msg = preview ? `${base}\n📝 Output: ...${preview}` : base;
      await sendProgressNotification(progressToken, progress, undefined, msg);
      idx++;
    } else if (!isProcessing) { clearInterval(interval); }
  }, PROTOCOL.KEEPALIVE_INTERVAL);
  return { interval, progressToken };
}

function stopProgressUpdates(progressData: { interval: NodeJS.Timeout; progressToken?: string | number }, success: boolean = true) {
  const op = currentOperationName; isProcessing = false; currentOperationName = ""; clearInterval(progressData.interval);
  if (progressData.progressToken) sendProgressNotification(progressData.progressToken, 100, 100, success ? `✅ ${op} completed successfully` : `❌ ${op} failed`);
}

server.setRequestHandler(ListToolsRequestSchema, async (_req: ListToolsRequest): Promise<{ tools: Tool[] }> => ({ tools: getToolDefinitions() as unknown as Tool[] }));

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest): Promise<CallToolResult> => {
  const toolName = request.params.name;
  if (!toolExists(toolName)) throw new Error(`Unknown tool: ${toolName}`);

  const progressToken = (request.params as any)._meta?.progressToken;
  const progressData = startProgressUpdates(toolName, progressToken);
  try {
    const args: ToolArguments = (request.params.arguments as ToolArguments) || {};
    Logger.toolInvocation(toolName, request.params.arguments);
    const result = await executeTool(toolName, args, (newOutput) => { latestOutput = newOutput; });
    stopProgressUpdates(progressData, true);
    return { content: [{ type: "text", text: result }], isError: false };
  } catch (error) {
    stopProgressUpdates(progressData, false);
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
  Logger.debug("init cursor-agent-mcp");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  Logger.debug("cursor-agent-mcp listening on stdio");
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main().catch((err) => { Logger.error("Fatal error:", err); process.exit(1); });
