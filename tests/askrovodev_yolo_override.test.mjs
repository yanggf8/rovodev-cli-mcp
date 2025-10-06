import assert from 'node:assert/strict';

process.env.ROVODEV_CLI_PATH = 'echo';
process.env.ROVODEV_SUBCOMMAND = 'rovodev run';
process.env.ROVODEV_HELP_FLAG = '--help';

(async () => {
  const tools = await import('../dist/tools/index.js');
  const { executeTool } = tools;

  const withDefault = await executeTool('ask-rovodev', { message: 'x' });
  assert.match(withDefault, /--yolo/);

  const disabled = await executeTool('ask-rovodev', { message: 'x', yolo: false });
  assert.doesNotMatch(disabled, /--yolo/);

  console.log('ask-rovodev yolo override test: OK');
})();
