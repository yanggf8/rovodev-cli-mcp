import assert from 'node:assert/strict';
import { executeCommand } from '../dist/utils/commandExecutor.js';

(async () => {
  let errorCaught = false;
  try {
    await executeCommand('node', ['-e', 'process.stderr.write("bad"); process.exit(2)']);
  } catch (e) {
    errorCaught = true;
    assert.match(e.message, /exit code 2/);
    assert.match(e.message, /bad/);
  }
  assert.equal(errorCaught, true);
  console.log('commandExecutor exit code test: OK');
})();
