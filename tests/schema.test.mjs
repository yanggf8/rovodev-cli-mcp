import assert from 'node:assert/strict';
import { getToolDefinitions, getPromptDefinitions } from '../dist/tools/index.js';

(function testSchemas() {
  const tools = getToolDefinitions();
  const names = tools.map(t => t.name);
  // Expect core tools to be present
  for (const n of ['ask-rovodev','tap-rovodev','Ping','Help','fetch-chunk','next-chunk']) {
    if (!names.includes(n)) throw new Error('Missing tool ' + n);
  }
  // Check that ask-rovodev has input schema with properties
  const ask = tools.find(t => t.name === 'ask-rovodev');
  if (!ask.inputSchema || !ask.inputSchema.properties) throw new Error('Invalid ask-rovodev schema');
  // Prompt defs should exist for tools with prompt metadata
  const prompts = getPromptDefinitions();
  if (!Array.isArray(prompts) || prompts.length === 0) throw new Error('No prompts');
  console.log('schema tests: OK');
})();
