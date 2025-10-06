import { Logger } from "./logger.js";

export interface PerformanceMetrics {
  commandExecutions: {
    total: number;
    successful: number;
    failed: number;
    averageDurationMs: number;
    longestDurationMs: number;
    shortestDurationMs: number;
  };
  errorCounts: Record<string, number>;
  systemHealth: {
    memoryUsageMB: number;
    uptimeSeconds: number;
    cpuUsagePercent?: number;
  };
}

export interface CommandExecutionRecord {
  id: string;
  command: string;
  args: string[];
  startTime: number;
  endTime?: number;
  success: boolean;
  errorType?: string;
  durationMs?: number;
}

class PerformanceMonitor {
  private executions: CommandExecutionRecord[] = [];
  private errorCounts = new Map<string, number>();
  private readonly maxRecords = 1000; // Keep last 1000 executions

  recordCommandStart(command: string, args: string[]): string {
    const executionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const record: CommandExecutionRecord = {
      id: executionId,
      command,
      args,
      startTime: Date.now(),
      success: false
    };
    
    this.executions.push(record);
    
    // Cleanup old records to prevent memory leaks
    if (this.executions.length > this.maxRecords) {
      this.executions.splice(0, this.executions.length - this.maxRecords);
    }
    
    return executionId;
  }

  recordCommandEnd(executionId: string, success: boolean, errorType?: string): void {
    const record = this.executions.find(r => r.id === executionId && r.endTime === undefined);
    
    if (record) {
      record.endTime = Date.now();
      record.success = success;
      record.errorType = errorType;
      record.durationMs = record.endTime - record.startTime;
      
      if (!success && errorType) {
        const count = this.errorCounts.get(errorType) || 0;
        this.errorCounts.set(errorType, count + 1);
      }
      
      Logger.debug("Command execution recorded:", {
        id: record.id,
        command: record.command,
        success: record.success,
        durationMs: record.durationMs,
        errorType: record.errorType
      });
    }
  }

  getMetrics(): PerformanceMetrics {
    const completedExecutions = this.executions.filter(r => r.endTime !== undefined);
    const successful = completedExecutions.filter(r => r.success);
    const failed = completedExecutions.filter(r => !r.success);
    
    let averageDurationMs = 0;
    let longestDurationMs = 0;
    let shortestDurationMs = Infinity;
    
    if (completedExecutions.length > 0) {
      const durations = completedExecutions.map(r => r.durationMs!);
      averageDurationMs = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
      longestDurationMs = Math.max(...durations);
      shortestDurationMs = Math.min(...durations);
      
      if (shortestDurationMs === Infinity) {
        shortestDurationMs = 0;
      }
    }
    
    const memoryUsage = process.memoryUsage();
    
    return {
      commandExecutions: {
        total: completedExecutions.length,
        successful: successful.length,
        failed: failed.length,
        averageDurationMs: Math.round(averageDurationMs),
        longestDurationMs: Math.round(longestDurationMs),
        shortestDurationMs: Math.round(shortestDurationMs)
      },
      errorCounts: Object.fromEntries(this.errorCounts),
      systemHealth: {
        memoryUsageMB: Math.round(memoryUsage.rss / 1024 / 1024),
        uptimeSeconds: Math.round(process.uptime())
      }
    };
  }

  getRecentExecutions(limit: number = 10): CommandExecutionRecord[] {
    return this.executions
      .filter(r => r.endTime !== undefined)
      .slice(-limit)
      .reverse(); // Most recent first
  }

  clearMetrics(): void {
    this.executions.length = 0;
    this.errorCounts.clear();
    Logger.info("Performance metrics cleared");
  }

  getTopErrors(limit: number = 5): Array<{ errorType: string; count: number }> {
    return Array.from(this.errorCounts.entries())
      .map(([errorType, count]) => ({ errorType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();