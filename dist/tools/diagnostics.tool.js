import { z } from "zod";
import { performanceMonitor } from "../utils/performanceMonitor.js";
import { healthChecker } from "../utils/healthCheck.js";
import { sessionManager } from "../utils/sessionManager.js";
import { Logger } from "../utils/logger.js";
export const diagnosticsSchema = {
    name: "diagnostics",
    description: "Get comprehensive diagnostics information including performance metrics, health status, session statistics, and system information.",
    inputSchema: z.object({
        includePerformance: z.boolean().optional().describe("Include performance metrics (default: true)"),
        includeHealth: z.boolean().optional().describe("Include health check results (default: true)"),
        includeSessions: z.boolean().optional().describe("Include session manager statistics (default: true)"),
        includeSystem: z.boolean().optional().describe("Include system information (default: true)"),
        includeRecentExecutions: z.boolean().optional().describe("Include recent command executions (default: false)"),
        recentLimit: z.number().int().min(1).max(50).optional().describe("Number of recent executions to include (1-50, default: 10)")
    })
};
export async function executeDiagnostics(args, onProgress) {
    const typedArgs = args;
    Logger.debug("Running comprehensive diagnostics");
    try {
        const diagnostics = {
            timestamp: new Date(),
            version: process.env.npm_package_version || "unknown"
        };
        // Performance metrics
        if (typedArgs.includePerformance !== false) {
            Logger.debug("Collecting performance metrics");
            const metrics = performanceMonitor.getMetrics();
            const topErrors = performanceMonitor.getTopErrors();
            diagnostics.performance = {
                ...metrics,
                topErrors,
                successRate: metrics.commandExecutions.total > 0
                    ? Math.round((metrics.commandExecutions.successful / metrics.commandExecutions.total) * 100)
                    : 0
            };
            if (typedArgs.includeRecentExecutions) {
                const limit = typedArgs.recentLimit || 10;
                diagnostics.performance.recentExecutions = performanceMonitor.getRecentExecutions(limit);
            }
        }
        // Health status
        if (typedArgs.includeHealth !== false) {
            Logger.debug("Running health checks");
            const healthStatus = await healthChecker.getHealthStatus();
            diagnostics.health = healthStatus;
        }
        // Session statistics
        if (typedArgs.includeSessions !== false) {
            Logger.debug("Collecting session statistics");
            const stats = sessionManager.getSessionStats();
            const activeCount = sessionManager.getActiveSessionCount();
            diagnostics.sessions = {
                active: activeCount,
                total: stats.total,
                oldestSession: stats.oldest,
                newestSession: stats.newest,
                status: activeCount > 50 ? "high-usage" : activeCount > 10 ? "moderate-usage" : "normal"
            };
        }
        // System information
        if (typedArgs.includeSystem !== false) {
            Logger.debug("Collecting system information");
            const memoryUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();
            diagnostics.system = {
                node: {
                    version: process.version,
                    platform: process.platform,
                    arch: process.arch,
                    uptime: Math.round(process.uptime()),
                    pid: process.pid
                },
                memory: {
                    rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
                    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
                    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
                    external: Math.round(memoryUsage.external / 1024 / 1024), // MB
                    arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024) // MB
                },
                cpu: {
                    user: Math.round(cpuUsage.user / 1000), // Convert microseconds to milliseconds
                    system: Math.round(cpuUsage.system / 1000)
                },
                environment: {
                    nodeEnv: process.env.NODE_ENV,
                    mcpLogLevel: process.env.MCP_LOG_LEVEL,
                    mcpExecTimeout: process.env.MCP_EXEC_TIMEOUT_MS,
                    mcpCwd: process.env.MCP_CWD,
                    rovodevCliPath: process.env.ROVODEV_CLI_PATH,
                    rovodevCmd: process.env.ROVODEV_CMD,
                    rovodevSubcommand: process.env.ROVODEV_SUBCOMMAND
                }
            };
        }
        // Add summary status
        const overallStatus = determineDiagnosticStatus(diagnostics);
        diagnostics.overallStatus = overallStatus;
        return JSON.stringify(diagnostics, null, 2);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        Logger.error("Diagnostics failed:", error);
        return JSON.stringify({
            timestamp: new Date(),
            status: "error",
            error: message,
            message: `Diagnostics collection failed: ${message}`
        }, null, 2);
    }
}
function determineDiagnosticStatus(diagnostics) {
    const issues = [];
    const recommendations = [];
    // Check health status
    if (diagnostics.health?.status === "unhealthy") {
        issues.push("Health checks failed");
        recommendations.push("Check health check details for specific issues");
    }
    else if (diagnostics.health?.status === "degraded") {
        issues.push("Some health checks have warnings");
        recommendations.push("Review health check warnings");
    }
    // Check performance metrics
    if (diagnostics.performance) {
        const successRate = diagnostics.performance.successRate;
        if (successRate < 50) {
            issues.push("Low command success rate");
            recommendations.push("Review error logs and top errors");
        }
        else if (successRate < 80) {
            issues.push("Moderate command failure rate");
            recommendations.push("Monitor error patterns");
        }
        if (diagnostics.performance.commandExecutions.averageDurationMs > 30000) {
            issues.push("High average command execution time");
            recommendations.push("Consider optimizing command performance or increasing timeout");
        }
    }
    // Check memory usage
    if (diagnostics.system?.memory?.rss > 500) {
        issues.push("High memory usage");
        recommendations.push("Monitor memory consumption and consider restarting if persistent");
    }
    // Check session count
    if (diagnostics.sessions?.active > 50) {
        issues.push("High number of active sessions");
        recommendations.push("Sessions may need cleanup or timeout adjustment");
    }
    let status = "healthy";
    if (issues.length > 0) {
        status = issues.some(issue => issue.includes("failed") ||
            issue.includes("Low") ||
            issue.includes("High memory")) ? "unhealthy" : "degraded";
    }
    return {
        status,
        issues,
        recommendations
    };
}
