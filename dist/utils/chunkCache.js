import { randomUUID } from "crypto";
const cache = new Map();
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
