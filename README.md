# Cursor Agent MCP

An MCP server wrapper that exposes a generic CLI (defaulting to `cursor-agent`) as MCP tools. Modeled after `gemini-mcp-tool`.

## Install

```bash
npm install -g cursor-agent-mcp
```

Or use with npx:

```bash
npx -y cursor-agent-mcp
```

## Configure in Claude Desktop

```json
{
  "mcpServers": {
    "cursor-agent": {
      "command": "npx",
      "args": ["-y", "cursor-agent-mcp"]
    }
  }
}
```

Environment variables to customize underlying CLI:
- `CURSOR_AGENT_CMD` (default: `cursor-agent`)
- `CURSOR_AGENT_PROMPT_FLAG` (default: `-p`)
- `CURSOR_AGENT_MODEL_FLAG` (default: `--model`)
- `CURSOR_AGENT_HELP_FLAG` (default: `--help`)

## Global setup for Claude Code (user scope)

Install the MCP server for your user so it’s available across projects in Claude Code.

- Add with npx (no global npm install required):
  ```bash
  claude mcp add -s user cursor-agent -- npx -y cursor-agent-mcp
  ```

- Optional: use a globally installed binary instead of npx
  ```bash
  npm i -g cursor-agent-mcp
  claude mcp add -s user cursor-agent cursor-agent-mcp
  ```

- Optional: set environment overrides when adding
  ```bash
  claude mcp add -s user cursor-agent -- \
    npx -y cursor-agent-mcp \
    -e CURSOR_AGENT_CMD=cursor-agent \
    -e CURSOR_AGENT_PROMPT_FLAG=-p \
    -e CURSOR_AGENT_MODEL_FLAG=--model \
    -e CURSOR_AGENT_HELP_FLAG=--help
  ```

- Verify it’s connected:
  ```bash
  claude mcp list
  ```

- Remove from user scope (to update or uninstall):
  ```bash
  claude mcp remove -s user cursor-agent
  ```

## Tools
- `ask-cursor`: `{ prompt: string, model?: string, args?: string[] }`
- `hit-cursor`: alias of `ask-cursor`
- `Help`: show help from underlying CLI
- `Ping`: connectivity test
