import { randomUUID, createHash } from "crypto";

interface CachedText {
  chunks: string[];
  createdAt: number;
}

const cache = new Map<string, CachedText>();

function splitTextIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

export function cacheText(text: string, chunkSize: number): { key: string; total: number } {
  const key = randomUUID();
  const chunks = splitTextIntoChunks(text, chunkSize);
  cache.set(key, { chunks, createdAt: Date.now() });
  return { key, total: chunks.length };
}

export function getCachedChunk(key: string, page: number): { chunk: string; total: number } | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  const total = entry.chunks.length;
  if (page < 1 || page > total) return undefined;
  return { chunk: entry.chunks[page - 1], total };
}

export function getCachedTotal(key: string): number | undefined {
  const entry = cache.get(key);
  return entry?.chunks.length;
}
