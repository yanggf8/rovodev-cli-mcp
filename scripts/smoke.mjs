// Simple smoke test for rovodev-cli-mcp
process.env.ROVODEV_CLI_PATH = 'echo';
process.env.ROVODEV_SUBCOMMAND = 'rovodev run';
process.env.ROVODEV_HELP_FLAG = '--help';

async function main() {
  const tools = await import('../dist/tools/index.js');
  const { getToolDefinitions, executeTool } = tools;

  const defs = getToolDefinitions();
  console.log('TOOLS:', defs.map(d => d.name).join(', '));

  const ping = await executeTool('Ping', {});
  console.log('PING:', ping);

  const help = await executeTool('Help', {});
  console.log('HELP:', help);

  const ask = await executeTool('ask-rovodev', { message: 'hello @world', args: ['--foo'] });
  console.log('ASK:', ask);
}

main().catch(err => { console.error(err); process.exit(1); });
