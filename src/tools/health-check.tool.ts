import { z } from "zod";
import { healthChecker } from "../utils/healthCheck.js";
import { Logger } from "../utils/logger.js";
import { ToolArguments } from "../constants.js";

export const healthCheckSchema = {
  name: "health_check",
  description: "Check the health status of the Rovodev CLI MCP server, including Rovodev CLI availability, session manager status, and environment configuration.",
  inputSchema: z.object({
    detailed: z.boolean().optional().describe("Include detailed diagnostic information in the response (default: false)")
  })
};

export async function executeHealthCheck(args: ToolArguments, onProgress?: (newOutput: string) => void): Promise<string> {
  const typedArgs = args as z.infer<typeof healthCheckSchema.inputSchema>;
  Logger.debug("Running health check");
  
  try {
    const healthStatus = await healthChecker.getHealthStatus();
    
    // Format the response based on whether detailed info is requested
    if (typedArgs.detailed) {
      return JSON.stringify(healthStatus, null, 2);
    }
    
    // Simplified response for basic health check
    const summary = {
      status: healthStatus.status,
      timestamp: healthStatus.timestamp,
      uptime: Math.round(healthStatus.uptime / 1000), // Convert to seconds
      version: healthStatus.version,
      checks: Object.entries(healthStatus.checks).map(([name, check]) => ({
        name,
        status: check.status,
        message: check.message,
        duration: check.duration
      }))
    };
    
    return JSON.stringify(summary, null, 2);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    Logger.error("Health check failed:", error);
    
    return JSON.stringify({
      status: "unhealthy",
      timestamp: new Date(),
      error: message,
      message: `Health check failed: ${message}`
    }, null, 2);
  }
}