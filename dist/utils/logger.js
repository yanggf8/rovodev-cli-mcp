import chalk from "chalk";
import { LOG_PREFIX } from "../constants.js";
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 50 };
function getLevel() {
    const raw = (process.env.MCP_LOG_LEVEL || "").toLowerCase();
    if (raw && raw in LEVELS)
        return LEVELS[raw];
    return LEVELS.info;
}
function shouldLog(level) { return LEVELS[level] >= getLevel() && getLevel() < LEVELS.silent; }
export const Logger = {
    debug: (...args) => { if (shouldLog("debug"))
        console.error(chalk.gray(LOG_PREFIX, ...args)); },
    info: (...args) => { if (shouldLog("info"))
        console.error(chalk.cyan(LOG_PREFIX, ...args)); },
    warn: (...args) => { if (shouldLog("warn"))
        console.warn(chalk.yellow(LOG_PREFIX, ...args)); },
    error: (...args) => { if (shouldLog("error"))
        console.error(chalk.red(LOG_PREFIX, ...args)); },
    toolInvocation: (name, args) => { if (shouldLog("info"))
        console.error(chalk.magenta(`${LOG_PREFIX} → tool`), chalk.bold(name), args ?? ""); },
    commandExecution: (cmd, argv, start) => { if (shouldLog("debug"))
        console.error(chalk.gray(`${LOG_PREFIX} exec`), cmd, argv.join(" "), `at ${new Date(start).toISOString()}`); },
    commandComplete: (start, code, bytes) => {
        if (shouldLog("debug"))
            console.error(chalk.gray(`${LOG_PREFIX} done`), `code=${code}`, bytes != null ? `bytes=${bytes}` : "", `in ${Date.now() - start}ms`);
    },
};
