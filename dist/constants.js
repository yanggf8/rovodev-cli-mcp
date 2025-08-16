export const LOG_PREFIX = "[ROVODEV-MCP]";
export const PROTOCOL = {
    NOTIFICATIONS: {
        PROGRESS: "notifications/progress"
    },
    KEEPALIVE_INTERVAL: 25000
};
export const ROVODEV = {
    // Base executable for Rovodev CLI host
    COMMAND: process.env.ROVODEV_CLI_PATH || process.env.ROVODEV_CMD || "acli",
    // Subcommand chain to invoke run
    SUBCOMMAND: (process.env.ROVODEV_SUBCOMMAND || "rovodev run").split(" "),
    FLAGS: {
        CONFIG_FILE: process.env.ROVODEV_CONFIG_FLAG || "--config-file",
        SHADOW: process.env.ROVODEV_SHADOW_FLAG || "--shadow",
        VERBOSE: process.env.ROVODEV_VERBOSE_FLAG || "--verbose",
        RESTORE: process.env.ROVODEV_RESTORE_FLAG || "--restore",
        YOLO: process.env.ROVODEV_YOLO_FLAG || "--yolo",
        HELP: process.env.ROVODEV_HELP_FLAG || process.env.CURSOR_AGENT_HELP_FLAG || "--help"
    }
};
// Global chunking configuration for large tool outputs
// Prefer `MCP_CHUNK_SIZE`, fallback to `CURSOR_AGENT_CHUNK_SIZE`, then default
export const CHUNKING = {
    DEFAULT_CHARS: Number.parseInt(
    // Prefer MCP_CHUNK_SIZE, then CURSOR_AGENT_CHUNK_SIZE for compatibility, then legacy ROVODEV_CHUNK_SIZE, else default
    process.env.MCP_CHUNK_SIZE
        ?? process.env.CURSOR_AGENT_CHUNK_SIZE
        ?? process.env.ROVODEV_CHUNK_SIZE
        ?? "20000", 10)
};
