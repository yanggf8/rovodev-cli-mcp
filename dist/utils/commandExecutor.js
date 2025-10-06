import { spawn } from "child_process";
import { Logger } from "./logger.js";
import { RetryManager, ErrorClassifier } from "./errorHandler.js";
import { sessionManager } from "./sessionManager.js";
import { performanceMonitor } from "./performanceMonitor.js";
export async function executeCommand(command, args, onProgress, options) {
    // Apply retry logic if specified
    if (options?.retries && options.retries > 1) {
        return RetryManager.withRetry(() => executeCommandOnce(command, args, onProgress, options), options.retries, options.backoffMs);
    }
    return executeCommandOnce(command, args, onProgress, options);
}
async function executeCommandOnce(command, args, onProgress, options) {
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
            }
            else {
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
        let bufferExceeded = false;
        let tailBuffer = ""; // rolling buffer for tail when streaming
        let timeout;
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
            timeout.unref?.();
        }
        child.stdout.on("data", (data) => {
            const chunk = data.toString();
            if (streaming) {
                // forward chunk immediately
                if (onProgress)
                    onProgress(chunk);
                // maintain only a rolling tail for diagnostics
                tailBuffer += chunk;
                if (tailBuffer.length > 65536) {
                    tailBuffer = tailBuffer.slice(-65536);
                }
                // optionally keep full stdout only if needed (avoid for memory pressure)
            }
            else {
                stdout += chunk;
                if (onProgress && stdout.length > lastReported) {
                    const newContent = stdout.substring(lastReported);
                    lastReported = stdout.length;
                    onProgress(newContent);
                }
            }
            const currentSize = streaming ? tailBuffer.length : stdout.length;
            if (maxBuffer && currentSize > maxBuffer) {
                bufferExceeded = true;
                Logger.warn("Output buffer exceeded, terminating process:", { maxBuffer, currentSize, pid: child.pid });
                child.kill("SIGTERM");
                setTimeout(() => {
                    if (!child.killed) {
                        child.kill("SIGKILL");
                    }
                }, 1000);
            }
        });
        child.stderr.on("data", (data) => {
            const chunk = data.toString();
            stderr += chunk;
            // Check for authentication errors and fail fast
            const authErrorPatterns = [
                /api.?key/i,
                /auth/i,
                /unauthorized/i,
                /forbidden/i,
                /invalid/i,
                /expired/i,
                /token/i
            ];
            if (authErrorPatterns.some(pattern => pattern.test(chunk))) {
                Logger.error("Authentication error detected:", chunk.trim());
            }
        });
        child.on("error", (err) => {
            if (!isResolved) {
                isResolved = true;
                if (timeout)
                    clearTimeout(timeout);
                Logger.error("process error:", err);
                const classified = ErrorClassifier.classify(err);
                performanceMonitor.recordCommandEnd(executionId, false, classified.type);
                reject(new Error(`Failed to spawn command: ${classified.message}`));
            }
        });
        child.on("close", (code) => {
            if (!isResolved) {
                isResolved = true;
                if (timeout)
                    clearTimeout(timeout);
                if (code === 0) {
                    const bytes = streaming ? (tailBuffer.length) : stdout.length;
                    Logger.commandComplete(startTime, code, bytes);
                    performanceMonitor.recordCommandEnd(executionId, true);
                    const output = streaming ? tailBuffer : stdout;
                    resolve(output.trim());
                }
                else {
                    Logger.commandComplete(startTime, code ?? -1);
                    const tailSrc = streaming ? tailBuffer : stdout;
                    const outTail = tailSrc ? `\nSTDOUT (tail): ${(tailSrc.length > 2000 ? tailSrc.slice(-2000) : tailSrc)}` : "";
                    // Enhance error message for common issues
                    let errorMessage = `Command failed with exit code ${code ?? -1}. ` + (stderr.trim() || "Unknown error");
                    // Check for specific error types and provide clearer messages
                    if (/api.?key/i.test(stderr) || /auth/i.test(stderr) || /unauthorized/i.test(stderr)) {
                        errorMessage = `Authentication Error: ${stderr.trim()}\n\nPlease check your rovodev CLI API key configuration.`;
                    }
                    else if (/not.found/i.test(stderr) || /command.not.found/i.test(stderr)) {
                        errorMessage = `Command Error: ${stderr.trim()}\n\nPlease ensure rovodev CLI is installed and accessible in your PATH.`;
                    }
                    if (bufferExceeded && maxBuffer) {
                        errorMessage += `\nOutput buffer exceeded (max: ${maxBuffer} bytes).`;
                    }
                    const classified = ErrorClassifier.classify(new Error(errorMessage));
                    performanceMonitor.recordCommandEnd(executionId, false, classified.type);
                    reject(new Error(errorMessage + outTail));
                }
            }
        });
    });
}
