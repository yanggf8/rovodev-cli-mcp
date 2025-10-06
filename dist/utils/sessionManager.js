import { randomUUID } from "crypto";
import { mkdir, rm, stat } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { Logger } from "./logger.js";
class SessionManager {
    sessions = new Map();
    cleanupTimer;
    baseSessionDir;
    defaultTimeoutMs = 30 * 60 * 1000; // 30 minutes
    constructor() {
        this.baseSessionDir = join(tmpdir(), "rovodev-mcp-sessions");
        this.ensureBaseDir();
        this.startPeriodicCleanup();
    }
    async ensureBaseDir() {
        try {
            await stat(this.baseSessionDir);
        }
        catch {
            try {
                await mkdir(this.baseSessionDir, { recursive: true });
                Logger.debug("Created session base directory:", this.baseSessionDir);
            }
            catch (error) {
                Logger.error("Failed to create session directory:", error);
            }
        }
    }
    async createSession(timeoutMs) {
        const id = randomUUID();
        const workingDir = join(this.baseSessionDir, id);
        try {
            await mkdir(workingDir, { recursive: true });
            const session = {
                id,
                workingDir,
                createdAt: new Date(),
                lastAccessedAt: new Date(),
                timeoutMs: timeoutMs ?? this.defaultTimeoutMs,
            };
            this.sessions.set(id, session);
            Logger.debug("Created session:", { id, workingDir });
            return session;
        }
        catch (error) {
            Logger.error("Failed to create session:", error);
            throw new Error(`Failed to create session: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    getSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.lastAccessedAt = new Date();
            return session;
        }
        return null;
    }
    async destroySession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        try {
            await rm(session.workingDir, { recursive: true, force: true });
            this.sessions.delete(sessionId);
            Logger.debug("Destroyed session:", sessionId);
        }
        catch (error) {
            Logger.error("Failed to destroy session:", error);
            // Still remove from memory even if cleanup failed
            this.sessions.delete(sessionId);
        }
    }
    async cleanupExpiredSessions() {
        const now = new Date();
        const expiredSessions = [];
        for (const [sessionId, session] of this.sessions) {
            const timeoutMs = session.timeoutMs ?? this.defaultTimeoutMs;
            const expirationTime = new Date(session.lastAccessedAt.getTime() + timeoutMs);
            if (now > expirationTime) {
                expiredSessions.push(sessionId);
            }
        }
        for (const sessionId of expiredSessions) {
            Logger.debug("Cleaning up expired session:", sessionId);
            await this.destroySession(sessionId);
        }
        if (expiredSessions.length > 0) {
            Logger.info(`Cleaned up ${expiredSessions.length} expired sessions`);
        }
    }
    startPeriodicCleanup() {
        // Run cleanup every 5 minutes
        this.cleanupTimer = setInterval(() => {
            this.cleanupExpiredSessions().catch((error) => {
                Logger.error("Session cleanup failed:", error);
            });
        }, 5 * 60 * 1000);
        // Don't keep the process alive just for cleanup
        this.cleanupTimer.unref();
    }
    async shutdown() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
        // Clean up all active sessions
        const sessionIds = Array.from(this.sessions.keys());
        await Promise.allSettled(sessionIds.map(sessionId => this.destroySession(sessionId)));
        Logger.debug("Session manager shut down");
    }
    getActiveSessionCount() {
        return this.sessions.size;
    }
    getSessionStats() {
        if (this.sessions.size === 0) {
            return { total: 0, oldest: null, newest: null };
        }
        let oldest = null;
        let newest = null;
        for (const session of this.sessions.values()) {
            if (!oldest || session.createdAt < oldest) {
                oldest = session.createdAt;
            }
            if (!newest || session.createdAt > newest) {
                newest = session.createdAt;
            }
        }
        return { total: this.sessions.size, oldest, newest };
    }
}
// Export singleton instance
export const sessionManager = new SessionManager();
// Graceful shutdown handling
process.on('SIGINT', async () => {
    await sessionManager.shutdown();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await sessionManager.shutdown();
    process.exit(0);
});
