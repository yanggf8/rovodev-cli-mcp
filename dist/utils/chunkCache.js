import { randomUUID } from "crypto";
const cache = new Map();
const nextIndexByKey = new Map();
// TTL and cleanup configuration
const DEFAULT_TTL_MS = Number.parseInt(process.env.MCP_CHUNK_TTL_MS ?? "1200000", 10); // 20 minutes
const MAX_CACHE_ENTRIES = Number.isFinite(Number(process.env.MCP_CHUNK_MAX_ENTRIES)) ? Number(process.env.MCP_CHUNK_MAX_ENTRIES) : 500;
function cleanupExpired(now = Date.now()) {
    // Remove expired
    for (const [key, entry] of cache.entries()) {
        if (now - entry.createdAt > DEFAULT_TTL_MS) {
            cache.delete(key);
            nextIndexByKey.delete(key);
        }
    }
    // Enforce max entries (simple FIFO-ish based on createdAt)
    if (cache.size > MAX_CACHE_ENTRIES) {
        const entries = Array.from(cache.entries());
        entries.sort((a, b) => a[1].createdAt - b[1].createdAt);
        const toDelete = entries.slice(0, cache.size - MAX_CACHE_ENTRIES);
        for (const [key] of toDelete) {
            cache.delete(key);
            nextIndexByKey.delete(key);
        }
    }
}
// periodic cleanup every ~TTL/2 (min 60s)
const CLEANUP_INTERVAL = Math.max(60000, Math.floor(DEFAULT_TTL_MS / 2));
setInterval(() => cleanupExpired(), CLEANUP_INTERVAL).unref?.();
function splitTextIntoChunks(text, chunkSize) {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
}
export function cacheText(text, chunkSize) {
    const key = randomUUID();
    const chunks = splitTextIntoChunks(text, chunkSize);
    cache.set(key, { chunks, createdAt: Date.now() });
    // First chunk is returned by the initial call; set next index to 2
    nextIndexByKey.set(key, Math.min(2, chunks.length + 1));
    return { key, total: chunks.length };
}
export function getCachedChunk(key, page) {
    const entry = cache.get(key);
    if (!entry)
        return undefined;
    const total = entry.chunks.length;
    if (page < 1 || page > total)
        return undefined;
    return { chunk: entry.chunks[page - 1], total };
}
export function getCachedTotal(key) {
    const entry = cache.get(key);
    return entry?.chunks.length;
}
export function getNextChunk(key) {
    const entry = cache.get(key);
    if (!entry)
        return undefined;
    const total = entry.chunks.length;
    const nextIndex = nextIndexByKey.get(key) ?? 1;
    if (nextIndex < 1 || nextIndex > total)
        return undefined;
    const chunk = entry.chunks[nextIndex - 1];
    nextIndexByKey.set(key, nextIndex + 1);
    return { chunk, index: nextIndex, total };
}
export function resetNextChunk(key) {
    const entry = cache.get(key);
    if (!entry)
        return;
    nextIndexByKey.set(key, 1);
}
