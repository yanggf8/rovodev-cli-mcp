import { spawn } from "child_process";
import { Logger } from "./logger.js";

export async function executeCommand(
  command: string,
  args: string[],
  onProgress?: (newOutput: string) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    Logger.commandExecution(command, args, startTime);

    const child = spawn(command, args, {
      env: process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let isResolved = false;
    let lastReported = 0;

    child.stdout.on("data", (data) => {
      stdout += data.toString();
      if (onProgress && stdout.length > lastReported) {
        const newContent = stdout.substring(lastReported);
        lastReported = stdout.length;
        onProgress(newContent);
      }
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (err) => {
      if (!isResolved) {
        isResolved = true;
        Logger.error("process error:", err);
        reject(new Error(`Failed to spawn command: ${err.message}`));
      }
    });

    child.on("close", (code) => {
      if (!isResolved) {
        isResolved = true;
        if (code === 0) {
          Logger.commandComplete(startTime, code, stdout.length);
          resolve(stdout.trim());
        } else {
          Logger.commandComplete(startTime, code ?? -1);
          reject(new Error(`Command failed with exit code ${code}: ${stderr.trim() || "Unknown error"}`));
        }
      }
    });
  });
}
