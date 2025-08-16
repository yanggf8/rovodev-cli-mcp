import { spawn } from "child_process";
import { Logger } from "./logger.js";

export async function executeCommand(
  command: string,
  args: string[],
  onProgress?: (newOutput: string) => void,
  options?: { streaming?: boolean; maxStdoutBuffer?: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    Logger.commandExecution(command, args, startTime);

    const timeoutMs = Number.isFinite(Number(process.env.MCP_EXEC_TIMEOUT_MS)) ? Number(process.env.MCP_EXEC_TIMEOUT_MS) : undefined;
    const cwd = process.env.MCP_CWD && process.env.MCP_CWD.trim() !== "" ? process.env.MCP_CWD : undefined;

    const child = spawn(command, args, {
      env: process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      cwd,
    });

    let stdout = "";
    let stderr = "";
    let isResolved = false;
    let lastReported = 0;
    const streaming = options?.streaming === true;
    const maxBuffer = Number.isFinite(Number(options?.maxStdoutBuffer)) ? Number(options?.maxStdoutBuffer) : undefined;

    let timeout: NodeJS.Timeout | undefined;
    if (timeoutMs && timeoutMs > 0) {
      timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          child.kill("SIGKILL");
          Logger.error("process timeout:", { timeoutMs });
          const tail = stdout.length > 2000 ? stdout.slice(-2000) : stdout;
          reject(new Error(`Command timed out after ${timeoutMs}ms. Partial output (tail): ${tail}`));
        }
      }, timeoutMs);
      // Prevent keeping the event loop alive solely for the timer
      (timeout as any).unref?.();
    }

    child.stdout.on("data", (data) => {
      const chunk = data.toString();
      if (streaming) {
        // forward chunk immediately and do not buffer entire output
        stdout += chunk; // still keep full for tail and success return; can be further optimized later
        if (onProgress) onProgress(chunk);
      } else {
        stdout += chunk;
        if (onProgress && stdout.length > lastReported) {
          const newContent = stdout.substring(lastReported);
          lastReported = stdout.length;
          onProgress(newContent);
        }
      }
      if (maxBuffer && stdout.length > maxBuffer) {
        child.kill("SIGKILL");
      }
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (err) => {
      if (!isResolved) {
        isResolved = true;
        if (timeout) clearTimeout(timeout);
        Logger.error("process error:", err);
        reject(new Error(`Failed to spawn command: ${err.message}`));
      }
    });

    child.on("close", (code) => {
      if (!isResolved) {
        isResolved = true;
        if (timeout) clearTimeout(timeout);
        if (code === 0) {
          Logger.commandComplete(startTime, code, stdout.length);
          resolve(stdout.trim());
        } else {
          Logger.commandComplete(startTime, code ?? -1);
          const outTail = stdout ? `\nSTDOUT (tail): ${(stdout.length > 2000 ? stdout.slice(-2000) : stdout)}` : "";
          reject(new Error(`Command failed with exit code ${code}: ${stderr.trim() || "Unknown error"}${outTail}`));
        }
      }
    });
  });
}
