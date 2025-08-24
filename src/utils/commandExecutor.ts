import { spawn } from "child_process";
import { Logger } from "./logger.js";
import { RetryManager, ErrorClassifier, formatErrorForUser } from "./errorHandler.js";
import { sessionManager, type SessionConfig } from "./sessionManager.js";
import { performanceMonitor } from "./performanceMonitor.js";

export interface ExecuteOptions {
  streaming?: boolean;
  maxStdoutBuffer?: number;
  sessionId?: string;
  retries?: number;
  backoffMs?: number;
}

export async function executeCommand(
  command: string,
  args: string[],
  onProgress?: (newOutput: string) => void,
  options?: ExecuteOptions
): Promise<string> {
  // Apply retry logic if specified
  if (options?.retries && options.retries > 1) {
    return RetryManager.withRetry(
      () => executeCommandOnce(command, args, onProgress, options),
      options.retries,
      options.backoffMs
    );
  }
  
  return executeCommandOnce(command, args, onProgress, options);
}

async function executeCommandOnce(
  command: string,
  args: string[],
  onProgress?: (newOutput: string) => void,
  options?: ExecuteOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    Logger.commandExecution(command, args, startTime);
    
    // Record command execution start for monitoring
    const executionId = performanceMonitor.recordCommandStart(command, args);

    const timeoutMs = Number.isFinite(Number(process.env.MCP_EXEC_TIMEOUT_MS)) ? Number(process.env.MCP_EXEC_TIMEOUT_MS) : undefined;
    
    // Determine working directory - session takes priority over global MCP_CWD
    let cwd = process.env.MCP_CWD && process.env.MCP_CWD.trim() !== "" ? process.env.MCP_CWD : undefined;
    
    if (options?.sessionId) {
      const session = sessionManager.getSession(options.sessionId);
      if (session) {
        cwd = session.workingDir;
        Logger.debug("Using session working directory:", cwd);
      } else {
        Logger.warn("Session not found, using default working directory:", options.sessionId);
      }
    }

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
          // Graceful termination first, then forceful
          child.kill("SIGTERM");
          setTimeout(() => {
            if (!child.killed) {
              child.kill("SIGKILL");
            }
          }, 2000); // Give 2 seconds for graceful shutdown
          Logger.error("process timeout:", { timeoutMs, pid: child.pid });
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
        Logger.warn("Output buffer exceeded, terminating process:", { maxBuffer, currentSize: stdout.length, pid: child.pid });
        child.kill("SIGTERM");
        setTimeout(() => {
          if (!child.killed) {
            child.kill("SIGKILL");
          }
        }, 1000);
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
        const classified = ErrorClassifier.classify(err);
        performanceMonitor.recordCommandEnd(command, false, classified.type);
        reject(new Error(`Failed to spawn command: ${classified.message}`));
      }
    });

    child.on("close", (code) => {
      if (!isResolved) {
        isResolved = true;
        if (timeout) clearTimeout(timeout);
        if (code === 0) {
          Logger.commandComplete(startTime, code, stdout.length);
          performanceMonitor.recordCommandEnd(command, true);
          resolve(stdout.trim());
        } else {
          Logger.commandComplete(startTime, code ?? -1);
          const outTail = stdout ? `\nSTDOUT (tail): ${(stdout.length > 2000 ? stdout.slice(-2000) : stdout)}` : "";
          const errorMessage = `Command failed with exit code ${code}: ${stderr.trim() || "Unknown error"}${outTail}`;
          const classified = ErrorClassifier.classify(new Error(errorMessage));
          performanceMonitor.recordCommandEnd(command, false, classified.type);
          reject(new Error(classified.message));
        }
      }
    });
  });
}
