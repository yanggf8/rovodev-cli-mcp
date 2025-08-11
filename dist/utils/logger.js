import chalk from "chalk";
import { LOG_PREFIX } from "../constants.js";
export const Logger = {
    debug: (...args) => console.debug(chalk.gray(LOG_PREFIX, ...args)),
    info: (...args) => console.log(chalk.cyan(LOG_PREFIX, ...args)),
    warn: (...args) => console.warn(chalk.yellow(LOG_PREFIX, ...args)),
    error: (...args) => console.error(chalk.red(LOG_PREFIX, ...args)),
    toolInvocation: (name, args) => console.log(chalk.magenta(`${LOG_PREFIX} → tool`), chalk.bold(name), args ?? ""),
    commandExecution: (cmd, argv, start) => console.log(chalk.gray(`${LOG_PREFIX} exec`), cmd, argv.join(" "), `at ${new Date(start).toISOString()}`),
    commandComplete: (start, code, bytes) => console.log(chalk.gray(`${LOG_PREFIX} done`), `code=${code}`, bytes != null ? `bytes=${bytes}` : "", `in ${Date.now() - start}ms`),
};
