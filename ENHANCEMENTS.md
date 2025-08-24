# Rovodev CLI MCP Server Enhancements

This document describes the enhancements implemented based on the amazon-q-cli-mcp-server reference.

## Overview

The following enhancements have been implemented to improve the robustness, monitoring capabilities, and user experience of the Rovodev CLI MCP server:

## 1. Session Management

**Implementation**: `src/utils/sessionManager.ts`

- **Isolated Sessions**: Each session has its own working directory in `/tmp/rovodev-mcp-sessions/{uuid}`
- **Automatic Cleanup**: Sessions are automatically cleaned up after 30 minutes of inactivity
- **Session Persistence**: Sessions maintain context across multiple commands
- **Resource Management**: Proper cleanup of session directories and resources

**Usage**:
```bash
# Create a new session
session_manager --action create

# Use session in commands
ask-rovodev --sessionId {session-id} --message "your message"

# Clean up sessions
session_manager --action cleanup
```

## 2. Enhanced Error Handling

**Implementation**: `src/utils/errorHandler.ts`

- **Error Classification**: Categorizes errors into types (network, authentication, timeout, etc.)
- **Retry Logic**: Configurable retry mechanism with exponential backoff
- **User-Friendly Messages**: Provides actionable suggestions for common errors
- **Error Tracking**: Performance monitoring tracks error patterns

**Error Types**:
- `COMMAND_NOT_FOUND`: CLI binary not found
- `AUTHENTICATION_ERROR`: Auth failures
- `NETWORK_ERROR`: Connection issues
- `TIMEOUT_ERROR`: Command timeouts
- `PERMISSION_ERROR`: File/directory permissions
- `INVALID_ARGUMENTS`: Invalid command syntax
- `SESSION_ERROR`: Session management issues
- `ROVODEV_CLI_ERROR`: CLI-specific errors

**Usage**:
```bash
# Enable retries with custom backoff
ask-rovodev --retries 3 --backoffMs 2000 --message "your message"
```

## 3. Process Management Improvements

**Implementation**: `src/utils/commandExecutor.ts`

- **Graceful Termination**: SIGTERM followed by SIGKILL with 2-second grace period
- **Resource Monitoring**: Tracks process IDs and memory usage
- **Buffer Management**: Configurable output buffer limits with proper cleanup
- **Performance Tracking**: Monitors command execution times and success rates

## 4. Health Checks and Diagnostics

**Implementation**: `src/utils/healthCheck.ts`, `src/tools/health-check.tool.ts`

- **Comprehensive Health Checks**:
  - Rovodev CLI availability and version
  - Session manager status
  - Environment configuration validation
  - Memory usage monitoring
  
- **Health Status Levels**:
  - `healthy`: All checks pass
  - `degraded`: Some warnings present
  - `unhealthy`: Critical issues detected

**Usage**:
```bash
# Basic health check
health_check

# Detailed health information
health_check --detailed true
```

## 5. Performance Monitoring

**Implementation**: `src/utils/performanceMonitor.ts`, `src/tools/diagnostics.tool.ts`

- **Metrics Collection**:
  - Command execution counts (total, successful, failed)
  - Average, minimum, and maximum execution times
  - Error frequency and patterns
  - System resource usage

- **Comprehensive Diagnostics**:
  - Performance metrics
  - Health status
  - Session statistics
  - System information
  - Recent command executions

**Usage**:
```bash
# Full diagnostics report
diagnostics

# Performance metrics only
diagnostics --includePerformance true --includeHealth false --includeSessions false --includeSystem false

# Include recent executions
diagnostics --includeRecentExecutions true --recentLimit 20
```

## 6. Enhanced Tool Capabilities

All existing tools now benefit from:

- **Session Support**: Use `--sessionId` parameter for isolated execution
- **Retry Logic**: Configure retries with `--retries` and `--backoffMs`
- **Better Error Messages**: User-friendly error descriptions with suggestions
- **Progress Tracking**: Enhanced progress notifications with error context

## Tool Reference

### New Tools

1. **session_manager**: Manage isolated sessions
   - Actions: `create`, `destroy`, `list`, `get`, `cleanup`
   - Parameters: `sessionId`, `timeoutMs`

2. **health_check**: Check server health status
   - Parameters: `detailed` (boolean)

3. **diagnostics**: Get comprehensive system diagnostics
   - Parameters: `includePerformance`, `includeHealth`, `includeSessions`, `includeSystem`, `includeRecentExecutions`, `recentLimit`

### Enhanced Existing Tools

1. **ask-rovodev** / **tap-rovodev**: 
   - New parameters: `sessionId`, `retries`, `backoffMs`
   - Improved error handling and user feedback

## Environment Variables

New environment variables for configuration:

- `MCP_EXEC_TIMEOUT_MS`: Command execution timeout (default: system default)
- `MCP_MAX_STDOUT_SIZE`: Maximum output buffer size
- `MCP_LOG_LEVEL`: Logging level (debug, info, warn, error, silent)

## Benefits

1. **Reliability**: Retry logic and better error handling reduce transient failures
2. **Observability**: Health checks and diagnostics provide system visibility
3. **Resource Management**: Session isolation and cleanup prevent resource leaks
4. **User Experience**: Clear error messages with actionable suggestions
5. **Performance**: Monitoring helps identify bottlenecks and optimization opportunities

## Migration

The enhancements are backward compatible. Existing usage patterns continue to work, with new capabilities available through optional parameters.

To use the new features:

1. Update to the enhanced version
2. Use new tools (`session_manager`, `health_check`, `diagnostics`) as needed
3. Optionally add session management to workflows
4. Configure retry behavior for critical operations
5. Monitor system health with the new diagnostic tools