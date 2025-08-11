export const LOG_PREFIX = "[CAMCP]";

export const PROTOCOL = {
  NOTIFICATIONS: {
    PROGRESS: "notifications/progress"
  },
  KEEPALIVE_INTERVAL: 25000
} as const;

export interface ToolArguments {
  prompt?: string;
  model?: string;
  args?: string[];
  message?: string;
  [key: string]: string | boolean | number | string[] | undefined;
}

export const CURSOR_AGENT = {
  COMMAND: process.env.CURSOR_AGENT_CMD || "cursor-agent",
  FLAGS: {
    PROMPT: process.env.CURSOR_AGENT_PROMPT_FLAG || "-p",
    MODEL: process.env.CURSOR_AGENT_MODEL_FLAG || "--model",
    HELP: process.env.CURSOR_AGENT_HELP_FLAG || "--help"
  }
} as const;
