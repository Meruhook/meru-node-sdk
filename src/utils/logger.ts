import { TOKEN_REDACTION } from '../security/constants.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  method?: string;
  url?: string;
  status?: number;
  duration?: number;
  attempt?: number;
  maxAttempts?: number;
  [key: string]: any;
}

export interface SecureLoggerOptions {
  enabled: boolean;
  level: LogLevel;
  redactSensitive: boolean;
  includeTimestamp: boolean;
}

export class SecureLogger {
  private readonly options: SecureLoggerOptions;

  constructor(options: Partial<SecureLoggerOptions> = {}) {
    this.options = {
      enabled: options.enabled ?? true,
      level: options.level ?? 'info',
      redactSensitive: options.redactSensitive ?? true,
      includeTimestamp: options.includeTimestamp ?? true,
    };
  }

  /**
   * Log debug information
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Log informational message
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Log error message
   */
  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  /**
   * Log an HTTP request
   */
  logRequest(method: string, url: string, attempt?: number, maxAttempts?: number): void {
    const safeUrl = this.redactUrl(url);
    const context: LogContext = { method, url: safeUrl };
    
    if (attempt !== undefined && maxAttempts !== undefined) {
      context.attempt = attempt;
      context.maxAttempts = maxAttempts;
    }

    const message = attempt && attempt > 1 
      ? `HTTP Request (Retry ${attempt}/${maxAttempts}): ${method} ${safeUrl}`
      : `HTTP Request: ${method} ${safeUrl}`;
      
    this.debug(message, context);
  }

  /**
   * Log an HTTP response
   */
  logResponse(method: string, url: string, status: number, duration?: number): void {
    const safeUrl = this.redactUrl(url);
    const context: LogContext = { method, url: safeUrl, status };
    
    if (duration !== undefined) {
      context.duration = duration;
    }

    const durationStr = duration ? ` (${duration}ms)` : '';
    const message = `HTTP Response: ${method} ${safeUrl} - ${status}${durationStr}`;
    
    this.debug(message, context);
  }

  /**
   * Log a retry attempt
   */
  logRetry(message: string, delay: number, attempt: number, maxAttempts: number): void {
    const context: LogContext = { delay, attempt, maxAttempts };
    this.debug(`${message} - Retrying in ${delay}ms (${attempt}/${maxAttempts})`, context);
  }

  /**
   * Log rate limiting
   */
  logRateLimit(retryAfter?: number): void {
    const context: LogContext = { retryAfter };
    const message = retryAfter 
      ? `Rate limit exceeded - Retry after ${retryAfter}s`
      : 'Rate limit exceeded';
    this.warn(message, context);
  }

  /**
   * Log validation error
   */
  logValidationError(field: string, errors: string[]): void {
    const context: LogContext = { field, errors };
    this.error(`Validation failed for ${field}: ${errors.join(', ')}`, context);
  }

  /**
   * Main logging method
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.options.enabled || !this.shouldLog(level)) {
      return;
    }

    const timestamp = this.options.includeTimestamp 
      ? new Date().toISOString() 
      : '';

    const prefix = `[Meru SDK${timestamp ? ` ${timestamp}` : ''}]`;
    const safeMessage = this.options.redactSensitive 
      ? this.redactSensitiveData(message)
      : message;

    let logContext = '';
    if (context && Object.keys(context).length > 0) {
      const safeContext = this.options.redactSensitive
        ? this.redactContextData(context)
        : context;
      logContext = ` ${JSON.stringify(safeContext)}`;
    }

    const fullMessage = `${prefix} ${safeMessage}${logContext}`;

    // Use appropriate console method based on level
    switch (level) {
      case 'debug':
        console.debug(fullMessage);
        break;
      case 'info':
        console.info(fullMessage);
        break;
      case 'warn':
        console.warn(fullMessage);
        break;
      case 'error':
        console.error(fullMessage);
        break;
    }
  }

  /**
   * Check if we should log at the given level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    return levels[level] >= levels[this.options.level];
  }

  /**
   * Redact sensitive data from strings
   */
  private redactSensitiveData(data: string): string {
    let redacted = data;

    // Redact tokens in URLs (Bearer tokens in query params, etc.)
    redacted = redacted.replace(
      /([?&](?:token|api_key|key|secret|password)=)[^&\s]*/gi,
      '$1[REDACTED]'
    );

    // Redact Bearer tokens
    redacted = redacted.replace(
      /Bearer\s+[^\s]+/gi,
      'Bearer [REDACTED]'
    );

    // Redact Authorization headers
    redacted = redacted.replace(
      /(Authorization:\s*)[^\r\n,]+/gi,
      '$1[REDACTED]'
    );

    // Redact common secret patterns
    redacted = redacted.replace(
      /(api[_-]?key|secret|password|token)["':\s=]+[^\s"',}]+/gi,
      '$1: [REDACTED]'
    );

    return redacted;
  }

  /**
   * Redact URL to hide sensitive information
   */
  private redactUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      
      // Remove authentication info
      parsedUrl.username = '';
      parsedUrl.password = '';
      
      // Redact sensitive query parameters
      const sensitiveParams = ['token', 'api_key', 'key', 'secret', 'password'];
      for (const param of sensitiveParams) {
        if (parsedUrl.searchParams.has(param)) {
          parsedUrl.searchParams.set(param, '[REDACTED]');
        }
      }

      return parsedUrl.toString();
    } catch {
      // If URL parsing fails, apply string-based redaction
      return this.redactSensitiveData(url);
    }
  }

  /**
   * Redact sensitive data from context objects
   */
  private redactContextData(context: LogContext): LogContext {
    const redacted: LogContext = {};

    for (const [key, value] of Object.entries(context)) {
      if (this.isSensitiveKey(key)) {
        redacted[key] = this.redactValue(value);
      } else if (typeof value === 'string') {
        redacted[key] = this.redactSensitiveData(value);
      } else if (typeof value === 'object' && value !== null) {
        redacted[key] = this.redactObjectValues(value);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }

  /**
   * Check if a key name suggests sensitive data
   */
  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = [
      'token', 'apitoken', 'api_token', 'apikey', 'api_key',
      'secret', 'password', 'auth', 'authorization', 'bearer',
      'key', 'private', 'credential'
    ];

    const lowerKey = key.toLowerCase();
    return sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));
  }

  /**
   * Redact a value based on its type
   */
  private redactValue(value: any): string {
    if (typeof value === 'string' && value.length > 0) {
      if (value.length <= TOKEN_REDACTION.SHOW_CHARS * 2) {
        return TOKEN_REDACTION.REPLACEMENT.repeat(value.length);
      }
      
      const start = value.substring(0, TOKEN_REDACTION.SHOW_CHARS);
      const end = value.substring(value.length - TOKEN_REDACTION.SHOW_CHARS);
      const middle = TOKEN_REDACTION.REPLACEMENT.repeat(
        Math.max(8, value.length - TOKEN_REDACTION.SHOW_CHARS * 2)
      );
      
      return `${start}${middle}${end}`;
    }
    
    return '[REDACTED]';
  }

  /**
   * Recursively redact values in objects
   */
  private redactObjectValues(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => 
        typeof item === 'object' && item !== null 
          ? this.redactObjectValues(item)
          : item
      );
    }

    if (typeof obj === 'object' && obj !== null) {
      const redacted: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (this.isSensitiveKey(key)) {
          redacted[key] = this.redactValue(value);
        } else if (typeof value === 'object' && value !== null) {
          redacted[key] = this.redactObjectValues(value);
        } else {
          redacted[key] = value;
        }
      }
      return redacted;
    }

    return obj;
  }
}

// Default logger instance
export const defaultLogger = new SecureLogger({
  enabled: false, // Disabled by default
  level: 'debug',
  redactSensitive: true,
  includeTimestamp: true,
});