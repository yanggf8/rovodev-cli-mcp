import assert from 'node:assert/strict';
import { executeCommand } from '../dist/utils/commandExecutor.js';

async function testSuccess() {
  const out = await executeCommand('node', ['-e', 'console.log("ok")']);
  assert.equal(out.trim(), 'ok');
}

async function testFailureIncludesTail() {
  let errorCaught = false;
  try {
    await executeCommand('node', ['-e', 'process.stderr.write("bad"); process.exit(2)']);
  } catch (e) {
    errorCaught = true;
    assert.match(e.message, /exit code 2/);
    assert.match(e.message, /bad/);
  }
  assert.equal(errorCaught, true);
}

async function testTimeout() {
  process.env.MCP_EXEC_TIMEOUT_MS = '200';
  let errorCaught = false;
  try {
    await executeCommand('node', ['-e', 'setTimeout(()=>{}, 10000)']);
  } catch (e) {
    errorCaught = true;
    assert.match(e.message, /timed out/);
  }
  assert.equal(errorCaught, true);
  delete process.env.MCP_EXEC_TIMEOUT_MS;
}

(async () => {
  try {
    await testSuccess();
    await testFailureIncludesTail();
    await testTimeout();
    console.log('commandExecutor tests: OK');
  } catch (e) {
    console.error('commandExecutor tests failed:', e);
    process.exit(1);
  }
})();
