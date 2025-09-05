import type {
  MeruClientConfig,
  RetryConfig,
  RequestOptions,
  ApiResponse,
  ApiErrorResponse,
} from '../types/client.js';
import {
  MeruException,
  AuthenticationException,
  ValidationException,
  RateLimitException,
} from '../exceptions/index.js';
import { SecureLogger } from '../utils/logger.js';
import { InputValidator } from '../security/input-validator.js';
import { UrlValidator } from '../security/url-validator.js';
import { 
  SECURITY_LIMITS, 
  RATE_LIMIT_DEFAULTS
} from '../security/constants.js';

/**
 * HTTP client with comprehensive security, retry logic and error handling
 */
export class HttpClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retryConfig: Required<RetryConfig>;
  private readonly apiToken: string;
  private readonly logger: SecureLogger;
  private readonly maxResponseSize: number;

  constructor(config: MeruClientConfig) {
    // Validate API token
    if (!config.apiToken || typeof config.apiToken !== 'string') {
      throw new ValidationException('API token is required and must be a string');
    }
    
    // Validate base URL if provided
    const baseUrl = config.baseUrl ?? 'https://api.meruhook.com';
    const baseUrlValidation = UrlValidator.validateUrl(
      baseUrl, 
      'Base URL', 
      { allowHttp: process.env.NODE_ENV === 'development' }
    );
    if (!baseUrlValidation.isValid) {
      throw new ValidationException(`Invalid base URL: ${baseUrlValidation.errors.join(', ')}`);
    }
    
    // Validate timeout
    const timeout = config.timeout ?? 30000;
    const timeoutValidation = InputValidator.validateTimeout(timeout);
    if (!timeoutValidation.isValid) {
      throw new ValidationException(`Invalid timeout: ${timeoutValidation.errors.join(', ')}`);
    }

    this.apiToken = config.apiToken;
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.maxResponseSize = config.maxResponseSize ?? SECURITY_LIMITS.MAX_RESPONSE_SIZE;
    
    this.logger = new SecureLogger({
      enabled: config.debug ?? false,
      level: 'debug',
      redactSensitive: true,
      includeTimestamp: true,
    });
    
    this.retryConfig = {
      times: config.retry?.times ?? 3,
      delay: config.retry?.delay ?? 100,
      maxDelay: Math.min(config.retry?.maxDelay ?? 5000, RATE_LIMIT_DEFAULTS.MAX_DELAY),
      backoffMultiplier: config.retry?.backoffMultiplier ?? RATE_LIMIT_DEFAULTS.BACKOFF_MULTIPLIER,
    };
  }

  /**
   * Make an HTTP request with comprehensive security and retry logic
   */
  async request<T = unknown>(options: RequestOptions): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    const url = this.buildUrl(options.endpoint, options.query);
    const headers = this.buildHeaders(options.headers);

    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= this.retryConfig.times + 1; attempt++) {
      try {
        this.logger.logRequest(options.method, url, attempt > 1 ? attempt : undefined, this.retryConfig.times + 1);

        const response = await this.makeRequest<T>(url, {
          method: options.method,
          headers,
          body: options.body ? JSON.stringify(options.body) : null,
        });

        const duration = Date.now() - startTime;
        this.logger.logResponse(options.method, url, response.status, duration);

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on authentication or validation errors
        if (error instanceof AuthenticationException || error instanceof ValidationException) {
          throw error;
        }

        // Handle rate limiting with Retry-After header
        if (error instanceof RateLimitException) {
          const retryAfter = error.getRetryAfterSeconds();
          if (retryAfter && retryAfter <= RATE_LIMIT_DEFAULTS.MAX_RETRY_AFTER) {
            this.logger.logRateLimit(retryAfter);
            if (attempt <= this.retryConfig.times) {
              await this.sleep(retryAfter * 1000);
              continue;
            }
          }
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt > this.retryConfig.times) {
          break;
        }

        // Calculate delay for next attempt
        const delay = Math.min(
          this.retryConfig.delay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
          this.retryConfig.maxDelay
        );

        this.logger.logRetry('Request failed', delay, attempt, this.retryConfig.times);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Make the actual HTTP request with comprehensive security measures
   */
  private async makeRequest<T>(url: string, init: RequestInit): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => (controller as any).abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...init,
        signal: (controller as any).signal,
      });

      clearTimeout(timeoutId);

      // Check response size before processing
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > this.maxResponseSize) {
        throw new MeruException(
          `Response size ${contentLength} exceeds maximum allowed size of ${this.maxResponseSize} bytes`
        );
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key.toLowerCase()] = value;
      });

      let data: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        const text = await this.readResponseWithSizeLimit(response);
        if (text) {
          // Validate JSON before parsing to prevent JSON bombs
          const jsonValidation = InputValidator.validateJsonString(text);
          if (!jsonValidation.isValid) {
            throw new MeruException(`Invalid JSON response: ${jsonValidation.errors.join(', ')}`);
          }
          data = JSON.parse(text);
        } else {
          data = null as T;
        }
      } else {
        const text = await this.readResponseWithSizeLimit(response);
        data = text as unknown as T;
      }

      const apiResponse: ApiResponse<T> = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      };

      // Handle HTTP errors
      if (!response.ok) {
        this.handleHttpError(apiResponse as ApiResponse<ApiErrorResponse>);
      }

      return apiResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new MeruException('Network error occurred', undefined, error);
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new MeruException(`Request timeout after ${this.timeout}ms`, undefined, error);
      }

      throw error;
    }
  }

  /**
   * Handle HTTP error responses
   */
  private handleHttpError(response: ApiResponse<ApiErrorResponse>): never {
    switch (response.status) {
      case 401:
        throw AuthenticationException.fromResponse(response);
      case 422:
        throw ValidationException.fromResponse(response);
      case 429:
        throw RateLimitException.fromResponse(response);
      default:
        throw MeruException.fromResponse(response);
    }
  }

  /**
   * Build the full URL with query parameters
   */
  private buildUrl(endpoint: string, query?: Record<string, string | number | boolean> | null): string {
    const url = new URL(endpoint, this.baseUrl);
    
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
    }

    return url.toString();
  }

  /**
   * Build request headers with security validation
   */
  private buildHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiToken}`,
      'User-Agent': '@meruhook/node-sdk/1.0.0',
    };

    // Validate and sanitize custom headers
    if (customHeaders) {
      for (const [key, value] of Object.entries(customHeaders)) {
        // Validate header name
        if (!key || typeof key !== 'string') {
          this.logger.logValidationError('header name', ['Header name must be a non-empty string']);
          continue;
        }

        // Validate header value for injection attacks
        const validation = InputValidator.validateHeaderValue(value, key);
        if (!validation.isValid) {
          this.logger.logValidationError(`header ${key}`, validation.errors);
          throw new ValidationException(`Invalid header value for '${key}': ${validation.errors.join(', ')}`);
        }

        // Prevent overriding critical headers
        const normalizedKey = key.toLowerCase();
        if (['authorization', 'user-agent', 'host'].includes(normalizedKey)) {
          this.logger.warn(`Ignoring attempt to override critical header: ${key}`);
          continue;
        }

        headers[key] = InputValidator.sanitizeString(value, SECURITY_LIMITS.MAX_HEADER_VALUE_LENGTH);
      }
    }

    return headers;
  }

  /**
   * Read response text with size limit protection
   */
  private async readResponseWithSizeLimit(response: Response): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      return '';
    }

    let totalSize = 0;
    const chunks: Uint8Array[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          totalSize += value.length;
          if (totalSize > this.maxResponseSize) {
            throw new MeruException(
              `Response size exceeds maximum allowed size of ${this.maxResponseSize} bytes`
            );
          }
          chunks.push(value);
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Combine chunks and decode
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    return new TextDecoder().decode(combined);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}