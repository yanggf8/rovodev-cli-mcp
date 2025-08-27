import { Logger } from "./logger.js";

export enum ErrorType {
  COMMAND_NOT_FOUND = "COMMAND_NOT_FOUND",
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR", 
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  PERMISSION_ERROR = "PERMISSION_ERROR",
  INVALID_ARGUMENTS = "INVALID_ARGUMENTS",
  ROVODEV_CLI_ERROR = "ROVODEV_CLI_ERROR",
  SESSION_ERROR = "SESSION_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR"
}

export interface ClassifiedError {
  type: ErrorType;
  message: string;
  originalError?: Error;
  suggestions: string[];
  isRetryable: boolean;
  retryAfterMs?: number;
}

export class RetryableError extends Error {
  constructor(
    message: string,
    public readonly retryAfterMs: number = 1000,
    public readonly maxRetries: number = 3
  ) {
    super(message);
    this.name = "RetryableError";
  }
}

export class ErrorClassifier {
  static classify(error: unknown): ClassifiedError {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const originalError = error instanceof Error ? error : undefined;

    // Check for command not found
    if (this.isCommandNotFoundError(errorMessage)) {
      return {
        type: ErrorType.COMMAND_NOT_FOUND,
        message: "Rovodev CLI command not found",
        originalError,
        suggestions: [
          "Install Rovodev CLI: npm install -g rovodev-cli",
          "Check ROVODEV_CLI_PATH environment variable",
          "Verify the command is in your PATH"
        ],
        isRetryable: false
      };
    }

    // Check for authentication errors
    if (this.isAuthenticationError(errorMessage)) {
      return {
        type: ErrorType.AUTHENTICATION_ERROR,
        message: "Authentication failed",
        originalError,
        suggestions: [
          "Run 'rovodev login' to authenticate",
          "Check your API credentials",
          "Verify your account permissions"
        ],
        isRetryable: false
      };
    }

    // Check for network errors
    if (this.isNetworkError(errorMessage)) {
      return {
        type: ErrorType.NETWORK_ERROR,
        message: "Network connection failed",
        originalError,
        suggestions: [
          "Check your internet connection",
          "Verify proxy settings if applicable",
          "Try again in a few moments"
        ],
        isRetryable: true,
        retryAfterMs: 2000
      };
    }

    // Check for timeout errors
    if (this.isTimeoutError(errorMessage)) {
      return {
        type: ErrorType.TIMEOUT_ERROR,
        message: "Command timed out",
        originalError,
        suggestions: [
          "Increase MCP_EXEC_TIMEOUT_MS environment variable",
          "Try breaking down the request into smaller parts",
          "Check if the service is responding normally"
        ],
        isRetryable: true,
        retryAfterMs: 5000
      };
    }

    // Check for permission errors
    if (this.isPermissionError(errorMessage)) {
      return {
        type: ErrorType.PERMISSION_ERROR,
        message: "Permission denied",
        originalError,
        suggestions: [
          "Check file and directory permissions",
          "Verify you have access to the working directory",
          "Try running with appropriate privileges"
        ],
        isRetryable: false
      };
    }

    // Check for invalid arguments
    if (this.isInvalidArgumentsError(errorMessage)) {
      return {
        type: ErrorType.INVALID_ARGUMENTS,
        message: "Invalid command arguments",
        originalError,
        suggestions: [
          "Check the command syntax and arguments",
          "Refer to Rovodev CLI documentation",
          "Try using --help flag for usage information"
        ],
        isRetryable: false
      };
    }

    // Check for session errors
    if (this.isSessionError(errorMessage)) {
      return {
        type: ErrorType.SESSION_ERROR,
        message: "Session management error",
        originalError,
        suggestions: [
          "Try creating a new session",
          "Check available disk space",
          "Verify temporary directory permissions"
        ],
        isRetryable: true,
        retryAfterMs: 1000
      };
    }

    // Check for Rovodev CLI specific errors
    if (this.isRovodevCliError(errorMessage)) {
      return {
        type: ErrorType.ROVODEV_CLI_ERROR,
        message: "Rovodev CLI execution error",
        originalError,
        suggestions: [
          "Check Rovodev CLI logs for details",
          "Verify CLI configuration",
          "Try updating to the latest version"
        ],
        isRetryable: true,
        retryAfterMs: 1000
      };
    }

    // Default to unknown error
    return {
      type: ErrorType.UNKNOWN_ERROR,
      message: errorMessage,
      originalError,
      suggestions: [
        "Check the error details above",
        "Try the operation again",
        "Report this issue if it persists"
      ],
      isRetryable: true,
      retryAfterMs: 2000
    };
  }

  private static isCommandNotFoundError(message: string): boolean {
    const indicators = [
      "command not found",
      "ENOENT",
      "spawn",
      "ENOTDIR"
    ];
    return indicators.some(indicator => message.toLowerCase().includes(indicator.toLowerCase()));
  }

  private static isAuthenticationError(message: string): boolean {
    const indicators = [
      "authentication failed",
      "unauthorized",
      "401",
      "invalid credentials",
      "access denied",
      "login required"
    ];
    return indicators.some(indicator => message.toLowerCase().includes(indicator.toLowerCase()));
  }

  private static isNetworkError(message: string): boolean {
    const indicators = [
      "network",
      "connection",
      "ECONNREFUSED",
      "ECONNRESET",
      "ENOTFOUND",
      "ETIMEDOUT"
    ];
    return indicators.some(indicator => message.toLowerCase().includes(indicator.toLowerCase()));
  }

  private static isTimeoutError(message: string): boolean {
    const indicators = [
      "timed out",
      "timeout",
      "ETIMEDOUT"
    ];
    return indicators.some(indicator => message.toLowerCase().includes(indicator.toLowerCase()));
  }

  private static isPermissionError(message: string): boolean {
    const indicators = [
      "permission denied",
      "EACCES",
      "EPERM",
      "access denied"
    ];
    return indicators.some(indicator => message.toLowerCase().includes(indicator.toLowerCase()));
  }

  private static isInvalidArgumentsError(message: string): boolean {
    const indicators = [
      "invalid argument",
      "invalid option",
      "unknown flag",
      "usage:",
      "error: unknown command"
    ];
    return indicators.some(indicator => message.toLowerCase().includes(indicator.toLowerCase()));
  }

  private static isSessionError(message: string): boolean {
    const indicators = [
      "session",
      "Failed to create session",
      "session directory",
      "working directory"
    ];
    return indicators.some(indicator => message.toLowerCase().includes(indicator.toLowerCase()));
  }

  private static isRovodevCliError(message: string): boolean {
    const indicators = [
      "rovodev error",
      "CLI error",
      "execution failed"
    ];
    return indicators.some(indicator => message.toLowerCase().includes(indicator.toLowerCase()));
  }
}

export class RetryManager {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    let lastError: unknown;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        const classified = ErrorClassifier.classify(error);
        
        if (!classified.isRetryable || attempt === maxRetries) {
          Logger.error(`Operation failed (attempt ${attempt}/${maxRetries}):`, {
            error: classified.message,
            type: classified.type,
            isRetryable: classified.isRetryable
          });
          throw error;
        }
        
        const delayMs = classified.retryAfterMs ?? backoffMs * Math.pow(2, attempt - 1);
        Logger.warn(`Operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms:`, {
          error: classified.message,
          type: classified.type
        });
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    throw lastError;
  }
}

export function formatErrorForUser(error: unknown): string {
  const classified = ErrorClassifier.classify(error);
  
  let message = `❌ ${classified.message}`;
  
  if (classified.suggestions.length > 0) {
    message += "\n\n💡 Suggestions:";
    classified.suggestions.forEach((suggestion, index) => {
      message += `\n  ${index + 1}. ${suggestion}`;
    });
  }
  
  if (classified.isRetryable) {
    message += "\n\n🔄 This error might be temporary - you can try again.";
  }
  
  return message;
}