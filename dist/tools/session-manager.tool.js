import { z } from "zod";
import { sessionManager } from "../utils/sessionManager.js";
import { Logger } from "../utils/logger.js";
export const sessionManagerSchema = {
    name: "session-manager",
    description: "Manage isolated sessions for Rovodev CLI operations. Each session has its own working directory and can be used to maintain context across multiple commands.",
    inputSchema: z.object({
        action: z.enum(["create", "destroy", "list", "get", "cleanup"], {
            description: "Action to perform: create new session, destroy existing session, list all sessions, get session details, or cleanup expired sessions"
        }),
        sessionId: z.string().optional().describe("Session ID (required for destroy and get actions)"),
        timeoutMs: z.number().optional().describe("Session timeout in milliseconds (only used with create action, defaults to 30 minutes)")
    })
};
export async function executeSessionManager(args, onProgress) {
    const typedArgs = args;
    Logger.debug("Session manager action:", typedArgs.action);
    try {
        switch (typedArgs.action) {
            case "create": {
                const session = await sessionManager.createSession(typedArgs.timeoutMs);
                {
                    const json = JSON.stringify({
                        success: true,
                        session: {
                            id: session.id,
                            workingDir: session.workingDir,
                            createdAt: session.createdAt,
                            timeoutMs: session.timeoutMs
                        },
                        message: `Created session ${session.id}`
                    }, null, 2);
                    return `Session manager: CREATED\n\n\u0060\u0060\u0060json\n${json}\n\u0060\u0060\u0060`;
                }
            }
            case "destroy": {
                if (!typedArgs.sessionId) {
                    throw new Error("Session ID is required for destroy action");
                }
                await sessionManager.destroySession(typedArgs.sessionId);
                {
                    const json = JSON.stringify({
                        success: true,
                        message: `Destroyed session ${typedArgs.sessionId}`
                    }, null, 2);
                    return `Session manager: DESTROYED\n\n\u0060\u0060\u0060json\n${json}\n\u0060\u0060\u0060`;
                }
            }
            case "list": {
                const stats = sessionManager.getSessionStats();
                {
                    const json = JSON.stringify({
                        success: true,
                        stats: {
                            totalSessions: stats.total,
                            oldestSession: stats.oldest,
                            newestSession: stats.newest
                        },
                        message: `Found ${stats.total} active sessions`
                    }, null, 2);
                    return `Session manager: LIST\n\n\u0060\u0060\u0060json\n${json}\n\u0060\u0060\u0060`;
                }
            }
            case "get": {
                if (!typedArgs.sessionId) {
                    throw new Error("Session ID is required for get action");
                }
                const session = sessionManager.getSession(typedArgs.sessionId);
                if (!session) {
                    const json = JSON.stringify({
                        success: false,
                        message: `Session ${typedArgs.sessionId} not found`
                    }, null, 2);
                    return `Session manager: NOT FOUND\n\n\u0060\u0060\u0060json\n${json}\n\u0060\u0060\u0060`;
                }
                {
                    const json = JSON.stringify({
                        success: true,
                        session: {
                            id: session.id,
                            workingDir: session.workingDir,
                            createdAt: session.createdAt,
                            lastAccessedAt: session.lastAccessedAt,
                            timeoutMs: session.timeoutMs
                        },
                        message: `Retrieved session ${session.id}`
                    }, null, 2);
                    return `Session manager: GET\n\n\u0060\u0060\u0060json\n${json}\n\u0060\u0060\u0060`;
                }
            }
            case "cleanup": {
                // The cleanup happens automatically, but we can trigger it manually
                const beforeStats = sessionManager.getSessionStats();
                // Since cleanup is automatic via periodic timer, we just report current stats
                const afterStats = sessionManager.getSessionStats();
                {
                    const json = JSON.stringify({
                        success: true,
                        cleanup: {
                            before: beforeStats.total,
                            after: afterStats.total,
                            removed: beforeStats.total - afterStats.total
                        },
                        message: "Session cleanup completed"
                    }, null, 2);
                    return `Session manager: CLEANUP\n\n\u0060\u0060\u0060json\n${json}\n\u0060\u0060\u0060`;
                }
            }
            default:
                throw new Error(`Unknown action: ${typedArgs.action}`);
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        Logger.error("Session manager error:", error);
        const json = JSON.stringify({
            success: false,
            error: message,
            message: `Session manager operation failed: ${message}`
        }, null, 2);
        return `Session manager: ERROR\n\n\u0060\u0060\u0060json\n${json}\n\u0060\u0060\u0060`;
    }
}
