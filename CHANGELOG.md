# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- `ask-rovodev` and `tap-rovodev` tools now enable `--yolo` mode by default for non-interactive MCP usage
- Users can disable yolo mode by explicitly setting `yolo: false`

### Improved
- Error messages now include exit codes and note when the max output buffer was exceeded
- Streaming mode reduces memory usage by keeping only a rolling output tail
- Performance metrics correlate executions by ID for accurate concurrency tracking
- Health check no longer warns about unset env when defaults work
- MCP server works seamlessly without requiring users to remember the yolo flag
- Better user experience for automated/scripted usage
- Backward compatible defaults

## [0.1.0] - 2025-08-17

### Added
- Initial release of Rovodev CLI MCP server
- Support for `ask-rovodev` and `tap-rovodev` tools
- Chunking support for large responses with `next-chunk` and `fetch-chunk`
- `Ping` and `Help` utility tools
- Streaming output support
- Configurable environment variables for CLI customization
