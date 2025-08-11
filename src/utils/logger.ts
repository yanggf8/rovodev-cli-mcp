import chalk from "chalk";
import { LOG_PREFIX } from "../constants.js";

export const Logger = {
  debug: (...args: unknown[]) => console.debug(chalk.gray(LOG_PREFIX, ...args)),
  info: (...args: unknown[]) => console.log(chalk.cyan(LOG_PREFIX, ...args)),
  warn: (...args: unknown[]) => console.warn(chalk.yellow(LOG_PREFIX, ...args)),
  error: (...args: unknown[]) => console.error(chalk.red(LOG_PREFIX, ...args)),
  toolInvocation: (name: string, args?: unknown) =>
    console.log(chalk.magenta(`${LOG_PREFIX} → tool`), chalk.bold(name), args ?? ""),
  commandExecution: (cmd: string, argv: string[], start: number) =>
    console.log(chalk.gray(`${LOG_PREFIX} exec`), cmd, argv.join(" "), `at ${new Date(start).toISOString()}`),
  commandComplete: (start: number, code: number | null, bytes?: number) =>
    console.log(chalk.gray(`${LOG_PREFIX} done`), `code=${code}`, bytes != null ? `bytes=${bytes}` : "", `in ${Date.now() - start}ms`),
};
