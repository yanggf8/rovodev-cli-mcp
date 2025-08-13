export const LOG_PREFIX = "[CAMCP]";
export const PROTOCOL = {
    NOTIFICATIONS: {
        PROGRESS: "notifications/progress"
    },
    KEEPALIVE_INTERVAL: 25000
};
export const CURSOR_AGENT = {
    COMMAND: process.env.CURSOR_AGENT_CMD || "cursor-agent",
    FLAGS: {
        PROMPT: process.env.CURSOR_AGENT_PROMPT_FLAG || "-p",
        MODEL: process.env.CURSOR_AGENT_MODEL_FLAG || "--model",
        HELP: process.env.CURSOR_AGENT_HELP_FLAG || "--help"
    }
};
// Global chunking configuration for large tool outputs
// Prefer `MCP_CHUNK_SIZE`, fallback to `CURSOR_AGENT_CHUNK_SIZE`, then default
export const CHUNKING = {
    DEFAULT_CHARS: Number.parseInt(process.env.MCP_CHUNK_SIZE ?? process.env.CURSOR_AGENT_CHUNK_SIZE ?? "20000", 10)
};
