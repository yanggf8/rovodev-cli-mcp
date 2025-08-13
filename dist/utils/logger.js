import chalk from "chalk";
import { LOG_PREFIX } from "../constants.js";
// IMPORTANT: Never write logs to stdout. Stdout is reserved for the MCP
// protocol stream. Send all logs to stderr instead.
export const Logger = {
    debug: (...args) => console.error(chalk.gray(LOG_PREFIX, ...args)),
    info: (...args) => console.error(chalk.cyan(LOG_PREFIX, ...args)),
    warn: (...args) => console.warn(chalk.yellow(LOG_PREFIX, ...args)),
    error: (...args) => console.error(chalk.red(LOG_PREFIX, ...args)),
    toolInvocation: (name, args) => console.error(chalk.magenta(`${LOG_PREFIX} → tool`), chalk.bold(name), args ?? ""),
    commandExecution: (cmd, argv, start) => console.error(chalk.gray(`${LOG_PREFIX} exec`), cmd, argv.join(" "), `at ${new Date(start).toISOString()}`),
    commandComplete: (start, code, bytes) => console.error(chalk.gray(`${LOG_PREFIX} done`), `code=${code}`, bytes != null ? `bytes=${bytes}` : "", `in ${Date.now() - start}ms`),
};
