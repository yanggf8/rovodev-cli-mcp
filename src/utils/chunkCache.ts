import { randomUUID, createHash } from "crypto";

interface CachedText {
  chunks: string[];
  createdAt: number;
}

const cache = new Map<string, CachedText>();
const nextIndexByKey = new Map<string, number>();

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
  // First chunk is returned by the initial call; set next index to 2
  nextIndexByKey.set(key, Math.min(2, chunks.length + 1));
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

export function getNextChunk(key: string): { chunk: string; index: number; total: number } | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  const total = entry.chunks.length;
  const nextIndex = nextIndexByKey.get(key) ?? 1;
  if (nextIndex < 1 || nextIndex > total) return undefined;
  const chunk = entry.chunks[nextIndex - 1];
  nextIndexByKey.set(key, nextIndex + 1);
  return { chunk, index: nextIndex, total };
}

export function resetNextChunk(key: string): void {
  const entry = cache.get(key);
  if (!entry) return;
  nextIndexByKey.set(key, 1);
}
