#!/usr/bin/env node
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const testsDir = join(process.cwd(), 'tests');
const files = readdirSync(testsDir).filter(f => f.endsWith('.test.mjs'));

if (files.length === 0) {
  console.error('No test files found in tests/*.test.mjs');
  process.exit(1);
}

let pass = 0;
let fail = 0;

for (const file of files) {
  await new Promise((resolve) => {
    const child = spawn(process.execPath, [join(testsDir, file)], { stdio: 'inherit' });
    child.on('close', (code) => {
      if (code === 0) pass++; else fail++;
      resolve();
    });
  });
}

console.error(`\nTest summary: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
