// Simple smoke test for cursor-agent-mcp
process.env.CURSOR_AGENT_CMD = 'echo';
process.env.CURSOR_AGENT_PROMPT_FLAG = '-p';
process.env.CURSOR_AGENT_MODEL_FLAG = '--model';
process.env.CURSOR_AGENT_HELP_FLAG = '--help';

async function main() {
  const tools = await import('../dist/tools/index.js');
  const { getToolDefinitions, executeTool } = tools;

  const defs = getToolDefinitions();
  console.log('TOOLS:', defs.map(d => d.name).join(', '));

  const ping = await executeTool('Ping', {});
  console.log('PING:', ping);

  const help = await executeTool('Help', {});
  console.log('HELP:', help);

  const ask = await executeTool('ask-cursor', { prompt: 'hello @world', model: 'mistral', args: ['--foo'] });
  console.log('ASK:', ask);
}

main().catch(err => { console.error(err); process.exit(1); });
