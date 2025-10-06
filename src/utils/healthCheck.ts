import { spawn } from "child_process";
import { Logger } from "./logger.js";
import { ROVODEV } from "../constants.js";
import { sessionManager } from "./sessionManager.js";

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: Date;
  checks: {
    rovodevCli: CheckResult;
    sessionManager: CheckResult;
    environment: CheckResult;
  };
  uptime: number;
  version: string;
}

export interface CheckResult {
  status: "pass" | "warn" | "fail";
  message: string;
  duration?: number;
  details?: Record<string, unknown>;
}

class HealthChecker {
  private startTime = Date.now();

  async getHealthStatus(): Promise<HealthStatus> {
    Logger.debug("Running health checks");
    
    const [rovodevCli, sessionManagerCheck, environment] = await Promise.allSettled([
      this.checkRovodevCli(),
      this.checkSessionManager(),
      this.checkEnvironment()
    ]);

    const checks = {
      rovodevCli: this.getCheckResult(rovodevCli),
      sessionManager: this.getCheckResult(sessionManagerCheck),
      environment: this.getCheckResult(environment)
    };

    const overallStatus = this.determineOverallStatus(checks);
    
    return {
      status: overallStatus,
      timestamp: new Date(),
      checks,
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || "unknown"
    };
  }

  private async checkRovodevCli(): Promise<CheckResult> {
    const startTime = Date.now();
    
    return new Promise<CheckResult>((resolve) => {
      const child = spawn(ROVODEV.COMMAND, [...ROVODEV.SUBCOMMAND, ROVODEV.FLAGS.HELP], {
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 5000 // 5 second timeout for health check
      });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        const duration = Date.now() - startTime;
        
        if (code === 0) {
          resolve({
            status: "pass",
            message: "Rovodev CLI is accessible",
            duration,
            details: {
              command: `${ROVODEV.COMMAND} ${ROVODEV.SUBCOMMAND.join(" ")} ${ROVODEV.FLAGS.HELP}`,
              exitCode: code
            }
          });
        } else {
          resolve({
            status: "fail",
            message: `Rovodev CLI check failed with exit code ${code}`,
            duration,
            details: {
              command: `${ROVODEV.COMMAND} ${ROVODEV.SUBCOMMAND.join(" ")} ${ROVODEV.FLAGS.HELP}`,
              exitCode: code,
              stderr: stderr.trim(),
              stdout: stdout.trim()
            }
          });
        }
      });

      child.on("error", (error) => {
        const duration = Date.now() - startTime;
        resolve({
          status: "fail",
          message: `Failed to spawn Rovodev CLI: ${error.message}`,
          duration,
          details: {
            command: `${ROVODEV.COMMAND} ${ROVODEV.SUBCOMMAND.join(" ")} ${ROVODEV.FLAGS.HELP}`,
            error: error.message
          }
        });
      });
    });
  }

  private async checkSessionManager(): Promise<CheckResult> {
    const startTime = Date.now();
    
    try {
      const stats = sessionManager.getSessionStats();
      const activeCount = sessionManager.getActiveSessionCount();
      
      let status: "pass" | "warn" = "pass";
      let message = "Session manager is healthy";
      
      if (activeCount > 50) {
        status = "warn";
        message = `High number of active sessions: ${activeCount}`;
      }
      
      return {
        status,
        message,
        duration: Date.now() - startTime,
        details: {
          activeSessions: activeCount,
          totalSessions: stats.total,
          oldestSession: stats.oldest,
          newestSession: stats.newest
        }
      };
    } catch (error) {
      return {
        status: "fail",
        message: `Session manager check failed: ${error instanceof Error ? error.message : String(error)}`,
        duration: Date.now() - startTime,
        details: { error: String(error) }
      };
    }
  }

  private async checkEnvironment(): Promise<CheckResult> {
    const startTime = Date.now();
    
    const details: Record<string, unknown> = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      environment: {
        MCP_LOG_LEVEL: process.env.MCP_LOG_LEVEL,
        MCP_EXEC_TIMEOUT_MS: process.env.MCP_EXEC_TIMEOUT_MS,
        MCP_CWD: process.env.MCP_CWD,
        ROVODEV_CLI_PATH: process.env.ROVODEV_CLI_PATH,
        ROVODEV_CMD: process.env.ROVODEV_CMD
      }
    };

    let status: "pass" | "warn" = "pass";
    let message = "Environment is healthy";
    
    // Check memory usage
    const memUsage = process.memoryUsage();
    const memUsageMB = memUsage.rss / 1024 / 1024;
    
    if (memUsageMB > 500) {
      status = "warn";
      message = `High memory usage: ${Math.round(memUsageMB)}MB`;
    }
    
    // Keep environment details for diagnostics but avoid noisy warnings if defaults work
    
    return {
      status,
      message,
      duration: Date.now() - startTime,
      details
    };
  }

  private getCheckResult(settledResult: PromiseSettledResult<CheckResult>): CheckResult {
    if (settledResult.status === "fulfilled") {
      return settledResult.value;
    } else {
      return {
        status: "fail",
        message: `Health check failed: ${settledResult.reason}`,
        details: { error: String(settledResult.reason) }
      };
    }
  }

  private determineOverallStatus(checks: HealthStatus["checks"]): HealthStatus["status"] {
    const checkResults = Object.values(checks);
    
    if (checkResults.some(check => check.status === "fail")) {
      return "unhealthy";
    }
    
    if (checkResults.some(check => check.status === "warn")) {
      return "degraded";
    }
    
    return "healthy";
  }
}

// Export singleton instance
export const healthChecker = new HealthChecker();