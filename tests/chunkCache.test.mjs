import assert from 'node:assert/strict';
import { cacheText, getCachedChunk, getNextChunk, createStreamingCache, appendToStream, finalizeStream } from '../dist/utils/chunkCache.js';

// Basic unit tests for chunkCache

function testCacheText() {
  const text = 'abcdefghijklmnopqrstuvwxyz';
  const { key, total } = cacheText(text, 5);
  assert.equal(total, 6);
  const c1 = getCachedChunk(key, 1);
  assert.equal(c1.chunk, 'abcde');
  const c6 = getCachedChunk(key, 6);
  assert.equal(c6.chunk, 'z');
}

function testNextChunk() {
  const text = 'abcdefghij';
  const { key } = cacheText(text, 2);
  // Simulate that the first chunk was returned by the initial tool call
  const first = getCachedChunk(key, 1);
  assert.equal(first.chunk, 'ab');
  let seq = [];
  let part;
  while ((part = getNextChunk(key))) { seq.push(part.chunk); if (seq.length > 10) break; }
  assert.deepEqual(seq, ['cd','ef','gh','ij']);
}

function testStreaming() {
  const { key } = createStreamingCache(3);
  appendToStream(key, 'ab');
  appendToStream(key, 'cdef');
  finalizeStream(key);
  const first = getCachedChunk(key, 1);
  const second = getCachedChunk(key, 2);
  const third = getCachedChunk(key, 3);
  assert.equal(first.chunk, 'abc');
  assert.equal(second.chunk, 'def');
  assert.equal(third, undefined);
}

try {
  testCacheText();
  testNextChunk();
  testStreaming();
  console.log('chunkCache tests: OK');
} catch (e) {
  console.error('chunkCache tests failed:', e);
  process.exit(1);
}
