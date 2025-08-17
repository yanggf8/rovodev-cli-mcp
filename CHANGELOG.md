# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **BREAKING**: `ask-rovodev` and `tap-rovodev` tools now enable `--yolo` mode by default for non-interactive MCP usage
- Updated tool descriptions to reflect default yolo mode behavior
- Users can still disable yolo mode by explicitly setting `yolo: false`

### Improved
- MCP server now works seamlessly without requiring users to remember the yolo flag
- Better user experience for automated/scripted usage
- Maintains backward compatibility for users who need interactive mode

## [0.1.0] - 2025-08-17

### Added
- Initial release of Rovodev CLI MCP server
- Support for `ask-rovodev` and `tap-rovodev` tools
- Chunking support for large responses with `next-chunk` and `fetch-chunk`
- `Ping` and `Help` utility tools
- Streaming output support
- Configurable environment variables for CLI customization
