import chalk from "chalk";
import { LOG_PREFIX } from "../constants.js";

// IMPORTANT: Never write logs to stdout. Stdout is reserved for the MCP
// protocol stream. Send all logs to stderr instead.
type LevelName = "debug" | "info" | "warn" | "error" | "silent";
const LEVELS: Record<LevelName, number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 50 };

function getLevel(): number {
  const raw = (process.env.MCP_LOG_LEVEL || "").toLowerCase() as LevelName;
  if (raw && raw in LEVELS) return LEVELS[raw];
  return LEVELS.info;
}

function shouldLog(level: LevelName): boolean { return LEVELS[level] >= getLevel() && getLevel() < LEVELS.silent; }

export const Logger = {
  debug: (...args: unknown[]) => { if (shouldLog("debug")) console.error(chalk.gray(LOG_PREFIX, ...args)); },
  info: (...args: unknown[]) => { if (shouldLog("info")) console.error(chalk.cyan(LOG_PREFIX, ...args)); },
  warn: (...args: unknown[]) => { if (shouldLog("warn")) console.warn(chalk.yellow(LOG_PREFIX, ...args)); },
  error: (...args: unknown[]) => { if (shouldLog("error")) console.error(chalk.red(LOG_PREFIX, ...args)); },
  toolInvocation: (name: string, args?: unknown) => { if (shouldLog("info")) console.error(chalk.magenta(`${LOG_PREFIX} → tool`), chalk.bold(name), args ?? ""); },
  commandExecution: (cmd: string, argv: string[], start: number) => { if (shouldLog("debug")) console.error(chalk.gray(`${LOG_PREFIX} exec`), cmd, argv.join(" "), `at ${new Date(start).toISOString()}`); },
  commandComplete: (start: number, code: number | null, bytes?: number) => { if (shouldLog("debug")) console.error(chalk.gray(`${LOG_PREFIX} done`), `code=${code}`,
      bytes != null ? `bytes=${bytes}` : "", `in ${Date.now() - start}ms`); },
};
