# Rovodev CLI MCP

An MCP server wrapper that exposes Rovodev CLI as MCP tools. Modeled after `gemini-mcp-tool`.

## Install

```bash
npm install -g rovodev-cli-mcp
```

Or use with npx:

```bash
npx -y rovodev-cli-mcp
```

## Configure in Claude Desktop

```json
{
  "mcpServers": {
    "rovodev": {
      "command": "npx",
      "args": ["-y", "rovodev-cli-mcp"]
    }
  }
}
```

Environment variables to customize underlying CLI:
- `ROVODEV_CLI_PATH` or `ROVODEV_CMD` (default: `acli`)
- `ROVODEV_SUBCOMMAND` (default: `"rovodev run"`)
- `ROVODEV_CONFIG_FLAG` (default: `--config-file`)
- `ROVODEV_SHADOW_FLAG` (default: `--shadow`)
- `ROVODEV_VERBOSE_FLAG` (default: `--verbose`)
- `ROVODEV_RESTORE_FLAG` (default: `--restore`)
- `ROVODEV_YOLO_FLAG` (default: `--yolo`)
- `ROVODEV_HELP_FLAG` (default: `--help`)

Chunking configuration (for large responses):
- `MCP_CHUNK_SIZE` (preferred)
- `CURSOR_AGENT_CHUNK_SIZE` (compatibility)
- `ROVODEV_CHUNK_SIZE` (legacy)
The first one found is used; default is 20000 characters if none are set.

## Global setup for Claude Code (user scope)

Install the MCP server for your user so it’s available across projects in Claude Code.

- Add with npx (no global npm install required):
  ```bash
  claude mcp add -s user rovodev -- npx -y rovodev-cli-mcp
  ```

- Optional: use a globally installed binary instead of npx
  ```bash
  npm i -g rovodev-cli-mcp
  claude mcp add -s user rovodev rovodev-cli-mcp
  ```

- Optional: set environment overrides when adding
  ```bash
  claude mcp add -s user rovodev -- \
    npx -y rovodev-cli-mcp \
    -e ROVODEV_CLI_PATH=acli \
    -e ROVODEV_SUBCOMMAND="rovodev run" \
    -e ROVODEV_CONFIG_FLAG=--config-file \
    -e ROVODEV_SHADOW_FLAG=--shadow \
    -e ROVODEV_VERBOSE_FLAG=--verbose \
    -e ROVODEV_RESTORE_FLAG=--restore \
    -e ROVODEV_YOLO_FLAG=--yolo \
    -e ROVODEV_HELP_FLAG=--help
  ```

- Verify it’s connected:
  ```bash
  claude mcp list
  ```

- Remove from user scope (to update or uninstall):
  ```bash
  claude mcp remove -s user rovodev
  ```

## Local development with Claude Code

If you are iterating on this repo and want Claude Code to use your local build:

1) Install deps and build
```bash
npm i
npm run build
```

2) Point Claude Code at your local `dist/index.js`
```bash
claude mcp remove -s user rovodev || true
claude mcp add -s user rovodev -- node "$(pwd)/dist/index.js"
```

3) Verify connection
```bash
claude mcp list
```

4) Optional: quick smoke test (no Claude required)
```bash
node scripts/smoke.mjs
```

Notes:
- This server communicates over stdio. Do not print to stdout; only stderr is safe for logs.
- The server already routes logs to stderr; if you add logs, follow the same pattern.
- You can still register via `npx -y rovodev-cli-mcp`, but during development using `node dist/index.js` avoids npm network hiccups.

## Troubleshooting

- "Failed to connect" in `claude mcp list`
  - Ensure your Node is >= 18 (`node -v`).
  - Ensure no output is written to stdout (stdout is reserved for the MCP protocol). This repo’s logger writes to stderr only.
  - Try registering the local path: `claude mcp add -s user rovodev -- node "$(pwd)/dist/index.js"`.
  - If using WSL, register from the Linux side; Claude Code on Windows can discover WSL user-scoped config.

- Underlying CLI not found
  - The default command is `acli`. Install it or override:
  ```bash
  claude mcp add -s user rovodev -- \
    node "$(pwd)/dist/index.js" \
    -e ROVODEV_CLI_PATH=/path/to/your/cli
  ```

- Large responses
  - Use `ask-rovodev` first. If the response is chunked, call `next-chunk` repeatedly with the provided `cacheKey`. You can also fetch a specific page with `fetch-chunk`.
  - Tune chunk size with env vars (in order of precedence): `MCP_CHUNK_SIZE`, `CURSOR_AGENT_CHUNK_SIZE` (compat), then legacy `ROVODEV_CHUNK_SIZE`.

## Tools
- `ask-rovodev`: `{ message?: string, prompt?: string, configFile?: string, shadow?: boolean, verbose?: boolean, restore?: boolean, yolo?: boolean, args?: string[], pagechunksize?: number }`
  - Tip: If your message starts with dashes (e.g., `--example`), the underlying CLI may interpret it as a flag. Prefer clear text or quote appropriately. In a future version, the server will insert `--` before the message to prevent this.
- `hit-rovodev`: alias of `ask-rovodev`
- `next-chunk`: `{ cacheKey: string }` Fetch the next chunk sequentially from a cached large response
- `fetch-chunk`: `{ cacheKey: string, chunkIndex: number }` (optional) Fetch a specific chunk by index
- `Help`: show help from underlying CLI
- `Ping`: connectivity test

Server behavior and tuning via env vars:
- Logging level: `MCP_LOG_LEVEL` (debug | info | warn | error | silent)
- Exec timeout: `MCP_EXEC_TIMEOUT_MS` (kill underlying CLI after N ms; includes partial stdout tail in error)
- Working directory: `MCP_CWD` (set process cwd for the underlying CLI)
- Chunk cache TTL: `MCP_CHUNK_TTL_MS` (default 20 minutes)
- Chunk cache max entries: `MCP_CHUNK_MAX_ENTRIES` (default 500)

### Handling large responses (simple sequential flow)

- If the output is too large, the first `ask-rovodev` call returns page 1 plus a `cacheKey`:
  - Response header example: `cacheKey: <key>`, `chunk: 1/N`
- To continue, call `next-chunk` with the same `cacheKey` to get chunk 2, then 3, etc. until it reports no further chunks.
